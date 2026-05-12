import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wardrobe } from '../types';

const DB_VERSION_KEY = 'db_version';
const CURRENT_DB_VERSION = 4; // 递增以触发迁移（v4: 强制重建 wear_records 移除 CASCADE）

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// 检查列是否存在
async function columnExists(db: SQLite.SQLiteDatabase, table: string, column: string): Promise<boolean> {
  try {
    const result = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    return result.some(col => col.name === column);
  } catch {
    return false;
  }
}

// 迁移：确保outfits表的所有列存在
async function ensureOutfitsColumns(db: SQLite.SQLiteDatabase): Promise<void> {
  const addColumnIfNotExists = async (table: string, column: string, definition: string) => {
    const exists = await columnExists(db, table, column);
    if (!exists) {
      try {
        await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      } catch (e: any) {
        // 重复列名表明并发添加已成功，忽略
        if (e?.message && e.message.includes('duplicate column name')) return;
        console.error(`[DB Migration] Failed to add column ${column} to ${table}:`, e?.message || e);
      }
    }
  };

  await addColumnIfNotExists('outfits', 'itemPositions', 'TEXT DEFAULT "{}"');
  await addColumnIfNotExists('outfits', 'canvasData', 'TEXT DEFAULT "{}"');
  await addColumnIfNotExists('outfits', 'style', 'TEXT DEFAULT ""');
  await addColumnIfNotExists('outfits', 'thumbnailUri', 'TEXT DEFAULT ""');
  await addColumnIfNotExists('outfits', 'seasons', 'TEXT DEFAULT "[]"');
  await addColumnIfNotExists('outfits', 'styles', 'TEXT DEFAULT "[]"');
}

// 确保 wear_records 表的列存在
async function ensureWearRecordsColumns(db: SQLite.SQLiteDatabase): Promise<void> {
  const add = async (column: string, definition: string) => {
    if (await columnExists(db, 'wear_records', column)) return;
    try {
      await db.runAsync(`ALTER TABLE wear_records ADD COLUMN ${column} ${definition}`);
    } catch (e: any) {
      if (e?.message && e.message.includes('duplicate column name')) return;
      console.error(`[DB Migration] Failed to add column ${column} to wear_records:`, e?.message || e);
    }
  };
  await add('clothingThumbnailUri', 'TEXT DEFAULT ""');
  await add('clothingType', 'TEXT DEFAULT ""');
}

// 执行 SQL，忽略错误（用于 CREATE TABLE IF NOT EXISTS）
async function execSQL(db: SQLite.SQLiteDatabase, sql: string): Promise<void> {
  try {
    await db.runAsync(sql);
  } catch (e) {
    // 忽略错误
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  // 已初始化完成，直接返回
  if (dbInstance) {
    await ensureOutfitsColumns(dbInstance);
    await ensureWearRecordsColumns(dbInstance);
    await execSQL(dbInstance, `
      CREATE TABLE IF NOT EXISTS outfit_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        sortOrder INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    `);
    await migrateStyleToGroup(dbInstance);
    await migrateWearRecordsNoCascade(dbInstance);
    return dbInstance;
  }

  // 正在初始化中，等待同一个 promise
  if (dbInitPromise) {
    return dbInitPromise;
  }

  // 创建初始化 promise，防止并发初始化
  dbInitPromise = (async () => {
    const db = SQLite.openDatabaseSync('wardrobe.db');

    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);

    // 创建衣服表（最新完整 schema）
    await execSQL(db, `
      CREATE TABLE IF NOT EXISTS clothing_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imageUri TEXT NOT NULL,
        thumbnailUri TEXT NOT NULL,
        type TEXT NOT NULL,
        color TEXT NOT NULL,
        brand TEXT DEFAULT '',
        size TEXT DEFAULT '',
        remarks TEXT DEFAULT '',
        seasons TEXT DEFAULT '[]',
        occasions TEXT DEFAULT '[]',
        purchaseDate TEXT,
        price REAL DEFAULT 0,
        wearCount INTEGER DEFAULT 0,
        lastWornAt TEXT,
        createdAt TEXT NOT NULL,
        deletedAt TEXT,
        discardReason TEXT DEFAULT ''
      )
    `);

    // 创建搭配表
    await execSQL(db, `
      CREATE TABLE IF NOT EXISTS outfits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        itemIds TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

    // 创建衣橱表
    await execSQL(db, `
      CREATE TABLE IF NOT EXISTS wardrobes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '👗',
        isDefault INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    `);

    // 创建穿着记录表（不使用外键级联删除，保留已删除单品的穿着历史）
    await execSQL(db, `
      CREATE TABLE IF NOT EXISTS wear_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clothingId INTEGER NOT NULL,
        wornDate TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        clothingThumbnailUri TEXT DEFAULT '',
        clothingType TEXT DEFAULT ''
      )
    `);

    // 创建穿着记录表索引
    await execSQL(db, `CREATE INDEX IF NOT EXISTS idx_wear_records_clothing ON wear_records(clothingId)`);
    await execSQL(db, `CREATE INDEX IF NOT EXISTS idx_wear_records_date ON wear_records(wornDate)`);

    // 迁移：确保所有必要列存在
    const addColumnIfNotExists = async (table: string, column: string, definition: string) => {
      if (!(await columnExists(db, table, column))) {
        try {
          await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        } catch (e: any) {
          // 重复列名表明并发添加已成功，忽略
          if (e?.message && e.message.includes('duplicate column name')) return;
          console.warn(`Failed to add column ${column} to ${table}:`, e);
        }
      }
    };

    await addColumnIfNotExists('clothing_items', 'remarks', 'TEXT DEFAULT ""');
    await addColumnIfNotExists('clothing_items', 'deletedAt', 'TEXT');
    await addColumnIfNotExists('clothing_items', 'discardReason', 'TEXT DEFAULT ""');
    await addColumnIfNotExists('clothing_items', 'soldAt', 'TEXT');
    await addColumnIfNotExists('clothing_items', 'soldPrice', 'REAL');
    await addColumnIfNotExists('clothing_items', 'soldPlatform', 'TEXT');
    await addColumnIfNotExists('clothing_items', 'styles', 'TEXT DEFAULT "[]"');
    await addColumnIfNotExists('clothing_items', 'parentType', 'TEXT DEFAULT ""');
    await addColumnIfNotExists('outfits', 'itemPositions', 'TEXT DEFAULT "{}"');
    await addColumnIfNotExists('outfits', 'canvasData', 'TEXT DEFAULT "{}"');
    await addColumnIfNotExists('outfits', 'style', 'TEXT DEFAULT ""');
    await addColumnIfNotExists('outfits', 'thumbnailUri', 'TEXT DEFAULT ""');
    await addColumnIfNotExists('outfits', 'canvasBackground', 'TEXT DEFAULT "{}"');
    await addColumnIfNotExists('outfits', 'groupId', 'INTEGER');
    await addColumnIfNotExists('clothing_items', 'wardrobeId', 'INTEGER NOT NULL DEFAULT 1');
    await addColumnIfNotExists('clothing_items', 'isDraft', 'INTEGER NOT NULL DEFAULT 0');
    await addColumnIfNotExists('clothing_items', 'originalImageUri', 'TEXT DEFAULT ""');
    await addColumnIfNotExists('clothing_items', 'fit', 'TEXT DEFAULT ""');
    await addColumnIfNotExists('clothing_items', 'thickness', 'TEXT DEFAULT ""');
    await addColumnIfNotExists('outfits', 'notes', 'TEXT DEFAULT ""');
    await addColumnIfNotExists('outfits', 'seasons', 'TEXT DEFAULT "[]"');
    await addColumnIfNotExists('outfits', 'styles', 'TEXT DEFAULT "[]"');
    // wear_records 列由 migrateWearRecordsNoCascade 处理（首次）或 ensureWearRecordsColumns（缓存路径）

    // 确保 wardrobes 表存在
    await ensureWardrobesTable(db);

    // 创建分组表
    await execSQL(db, `
      CREATE TABLE IF NOT EXISTS outfit_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        sortOrder INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    `);

    // 数据迁移：style → group
    await migrateStyleToGroup(db);

    // 确保默认衣橱存在
    await ensureDefaultWardrobe(db);

    // 迁移：移除 wear_records 的外键级联删除
    await migrateWearRecordsNoCascade(db);

    // 只在所有迁移完成后才设置 dbInstance
    dbInstance = db;
    dbInitPromise = null;
    return db;
  })();

  return dbInitPromise;
}

export async function closeDatabase() {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

// 确保 wardrobes 表存在
async function ensureWardrobesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const result = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='wardrobes'"
    );
    if (!result) {
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS wardrobes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT NOT NULL DEFAULT '👗',
          isDefault INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL
        )
      `);
    }
  } catch (e) {
    console.error('ensureWardrobesTable error:', e);
  }
}

// 确保默认衣橱存在
async function ensureDefaultWardrobe(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM wardrobes');
  if (!result || result.count === 0) {
    await db.runAsync(
      'INSERT INTO wardrobes (name, icon, isDefault, createdAt) VALUES (?, ?, ?, ?)',
      ['我的衣橱', 'grid-outline', 1, localDateString()]
    );
  }
}

// 数据迁移：将现有搭配的 style 字符串迁移为 groupId
async function migrateStyleToGroup(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // 检查是否已有分组数据（避免重复迁移）
    const groupCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM outfit_groups'
    );
    if (groupCount && groupCount.count > 0) return;

    // 检查 groupId 列是否存在
    const hasGroupId = await columnExists(db, 'outfits', 'groupId');
    if (!hasGroupId) return;

    // 检查是否有已设置 groupId 的搭配（迁移完成标志）
    const migrated = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM outfits WHERE groupId IS NOT NULL'
    );
    if (migrated && migrated.count > 0) return;

    // 读取所有搭配的 style 值
    const hasStyle = await columnExists(db, 'outfits', 'style');
    if (!hasStyle) return;
    const rows = await db.getAllAsync<{ id: number; style: string }>(
      'SELECT id, style FROM outfits'
    );

    // 收集去重的 style 并创建分组
    const styles = [...new Set(rows.map(r => r.style || '').filter(s => s.trim() !== ''))];
    const groupMap: Record<string, number> = {};

    for (const style of styles) {
      const result = await db.runAsync(
        'INSERT INTO outfit_groups (name, description, sortOrder, createdAt) VALUES (?, ?, ?, ?)',
        [style, '', String(0), new Date().toISOString()]
      );
      groupMap[style] = result.lastInsertRowId;
    }

    // 创建"未分组"默认分组
    const defaultResult = await db.runAsync(
      'INSERT INTO outfit_groups (name, description, sortOrder, createdAt) VALUES (?, ?, ?, ?)',
      ['未分组', '', String(999), new Date().toISOString()]
    );
    const defaultGroupId = defaultResult.lastInsertRowId;

    // 更新搭配的 groupId
    for (const row of rows) {
      const style = row.style || '';
      const groupId = groupMap[style] || defaultGroupId;
      await db.runAsync('UPDATE outfits SET groupId = ? WHERE id = ?', [String(groupId), String(row.id)]);
    }
  } catch (e) {
    console.error('[DB Migration] migrateStyleToGroup error:', e);
  }
}

// 迁移：移除 wear_records 表的外键级联删除，保留已删除单品的穿着历史
async function migrateWearRecordsNoCascade(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const storedVersion = await AsyncStorage.getItem(DB_VERSION_KEY);
    const currentVersion = storedVersion ? parseInt(storedVersion, 10) : 1;

    if (currentVersion < 4) {
      // 重建表：移除 CASCADE 约束 + 添加缩略图/类型冗余列
      await db.runAsync('PRAGMA foreign_keys = OFF');
      await db.runAsync('DROP TABLE IF EXISTS wear_records_new');

      await db.runAsync(
        `CREATE TABLE IF NOT EXISTS wear_records_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clothingId INTEGER NOT NULL,
          wornDate TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          clothingThumbnailUri TEXT DEFAULT '',
          clothingType TEXT DEFAULT ''
        )`
      );

      await db.runAsync(
        `INSERT INTO wear_records_new (id, clothingId, wornDate, createdAt)
         SELECT id, clothingId, wornDate, createdAt FROM wear_records`
      );

      await db.runAsync('DROP TABLE wear_records');
      await db.runAsync('ALTER TABLE wear_records_new RENAME TO wear_records');
      await db.runAsync('CREATE INDEX IF NOT EXISTS idx_wear_records_clothing ON wear_records(clothingId)');
      await db.runAsync('CREATE INDEX IF NOT EXISTS idx_wear_records_date ON wear_records(wornDate)');

      await db.runAsync('PRAGMA foreign_keys = ON');

      // 回填已有记录的缩略图和类型（仅首次迁移时执行）
      await db.runAsync(
        `UPDATE wear_records SET
          clothingThumbnailUri = COALESCE(
            (SELECT thumbnailUri FROM clothing_items WHERE id = wear_records.clothingId),
            (SELECT imageUri FROM clothing_items WHERE id = wear_records.clothingId),
            clothingThumbnailUri
          ),
          clothingType = COALESCE(
            (SELECT type FROM clothing_items WHERE id = wear_records.clothingId),
            clothingType
          )
         WHERE clothingThumbnailUri = '' OR clothingType = ''`
      );

      await AsyncStorage.setItem(DB_VERSION_KEY, String(CURRENT_DB_VERSION));
      console.log('[DB Migration] wear_records migration v4 complete');
    }
  } catch (e) {
    console.error('[DB Migration] migrateWearRecordsNoCascade error:', e);
    try { await db.runAsync('PRAGMA foreign_keys = ON'); } catch (_) {}
  }
}

// 本地日期字符串
function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
