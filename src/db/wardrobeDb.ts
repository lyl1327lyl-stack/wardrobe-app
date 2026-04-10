import { getDatabase } from './database';
import { Wardrobe } from '../types';

// 本地日期字符串
function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getAllWardrobes(): Promise<Wardrobe[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<any>('SELECT * FROM wardrobes ORDER BY isDefault DESC, createdAt ASC');
  return result.map(row => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    isDefault: row.isDefault === 1,
    createdAt: row.createdAt,
  }));
}

export async function getWardrobeById(id: number): Promise<Wardrobe | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<any>('SELECT * FROM wardrobes WHERE id = ?', [id]);
  if (!result) return null;
  return {
    id: result.id,
    name: result.name,
    icon: result.icon,
    isDefault: result.isDefault === 1,
    createdAt: result.createdAt,
  };
}

export async function getDefaultWardrobe(): Promise<Wardrobe | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<any>('SELECT * FROM wardrobes WHERE isDefault = 1 LIMIT 1');
  if (!result) return null;
  return {
    id: result.id,
    name: result.name,
    icon: result.icon,
    isDefault: true,
    createdAt: result.createdAt,
  };
}

export async function addWardrobe(name: string, icon: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO wardrobes (name, icon, isDefault, createdAt) VALUES (?, ?, 0, ?)',
    [name, icon, localDateString()]
  );
  return result.lastInsertRowId;
}

export async function updateWardrobe(id: number, name: string, icon: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE wardrobes SET name = ?, icon = ? WHERE id = ?', [name, icon, id]);
}

export async function deleteWardrobe(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM wardrobes WHERE id = ?', [id]);
}

export async function setDefaultWardrobe(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE wardrobes SET isDefault = 0');
  await db.runAsync('UPDATE wardrobes SET isDefault = 1 WHERE id = ?', [id]);
}

export async function getClothingCountInWardrobe(wardrobeId: number): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM clothing_items WHERE wardrobeId = ? AND deletedAt IS NULL AND soldAt IS NULL',
    [wardrobeId]
  );
  return result?.count ?? 0;
}

// 删除衣橱时移动衣物到目标衣橱
export async function moveClothingToWardrobe(fromWardrobeId: number, toWardrobeId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE clothing_items SET wardrobeId = ? WHERE wardrobeId = ?',
    [toWardrobeId, fromWardrobeId]
  );
}

// 删除衣橱时移动衣物到废衣篓
export async function moveClothingToTrash(wardrobeId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE clothing_items SET deletedAt = ?, discardReason = '衣橱删除' WHERE wardrobeId = ? AND deletedAt IS NULL AND soldAt IS NULL`,
    [localDateString(), wardrobeId]
  );
}

// 删除衣橱时彻底删除衣物
export async function permanentlyDeleteClothingInWardrobe(wardrobeId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM clothing_items WHERE wardrobeId = ?', [wardrobeId]);
}
