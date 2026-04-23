import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wardrobe } from '../types';

const DB_VERSION_KEY = 'db_version';
const CURRENT_DB_VERSION = 2; // 递增以触发迁移

let dbInstance: SQLite.SQLiteDatabase | null = null;

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
    console.log(`[DB Migration] Checking ${table}.${column}, exists: ${exists}`);
    if (!exists) {
      try {
        await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`[DB Migration] Added column ${column} to ${table}`);
      } catch (e: any) {
        console.error(`[DB Migration] Failed to add column ${column} to ${table}:`, e?.message || e);
      }
    } else {
      console.log(`[DB Migration] Column ${table}.${column} already exists`);
    }
  };

  await addColumnIfNotExists('outfits', 'itemPositions', 'TEXT DEFAULT "{}"');
  await addColumnIfNotExists('outfits', 'canvasData', 'TEXT DEFAULT "{}"');
  await addColumnIfNotExists('outfits', 'style', 'TEXT DEFAULT ""');
  await addColumnIfNotExists('outfits', 'thumbnailUri', 'TEXT DEFAULT ""');
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
  if (dbInstance) {
    // 即使数据库已打开，也确保所有列存在（迁移）
    await ensureOutfitsColumns(dbInstance);
    return dbInstance;
  }

  dbInstance = SQLite.openDatabaseSync('wardrobe.db');

  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // 创建衣服表（最新完整 schema）
  await execSQL(dbInstance, `
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
  await execSQL(dbInstance, `
    CREATE TABLE IF NOT EXISTS outfits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      itemIds TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // 创建衣橱表
  await execSQL(dbInstance, `
    CREATE TABLE IF NOT EXISTS wardrobes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '👗',
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    )
  `);

  // 创建穿着记录表
  await execSQL(dbInstance, `
    CREATE TABLE IF NOT EXISTS wear_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clothingId INTEGER NOT NULL,
      wornDate TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (clothingId) REFERENCES clothing_items(id) ON DELETE CASCADE
    )
  `);

  // 创建穿着记录表索引
  await execSQL(dbInstance, `CREATE INDEX IF NOT EXISTS idx_wear_records_clothing ON wear_records(clothingId)`);
  await execSQL(dbInstance, `CREATE INDEX IF NOT EXISTS idx_wear_records_date ON wear_records(wornDate)`);

  // 迁移：确保所有必要列存在
  const addColumnIfNotExists = async (table: string, column: string, definition: string) => {
    if (!(await columnExists(dbInstance!, table, column))) {
      try {
        await dbInstance!.runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      } catch (e) {
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
  await addColumnIfNotExists('clothing_items', 'wardrobeId', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfNotExists('clothing_items', 'isDraft', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists('clothing_items', 'originalImageUri', 'TEXT DEFAULT ""');

  // 确保 wardrobes 表存在
  await ensureWardrobesTable(dbInstance!);

  // 确保默认衣橱存在
  await ensureDefaultWardrobe(dbInstance!);

  return dbInstance;
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

// 本地日期字符串
function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
