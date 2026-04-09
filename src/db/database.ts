import * as SQLite from 'expo-sqlite';

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

// 执行 SQL，忽略错误（用于 CREATE TABLE IF NOT EXISTS）
async function execSQL(db: SQLite.SQLiteDatabase, sql: string): Promise<void> {
  try {
    await db.runAsync(sql);
  } catch (e) {
    // 忽略错误
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

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

  return dbInstance;
}

export async function closeDatabase() {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}
