import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('wardrobe.db');
  await initDatabase(db);
  return db;
}

async function initDatabase(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS clothing_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imageUri TEXT NOT NULL,
      thumbnailUri TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      brand TEXT DEFAULT '',
      size TEXT DEFAULT '',
      seasons TEXT DEFAULT '[]',
      occasions TEXT DEFAULT '[]',
      purchaseDate TEXT,
      price REAL DEFAULT 0,
      wearCount INTEGER DEFAULT 0,
      lastWornAt TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outfits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      itemIds TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);
}

export async function closeDatabase() {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
