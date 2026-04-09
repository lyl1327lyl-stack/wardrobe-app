import { getDatabase } from './database';
import { Outfit } from '../types';

export async function getAllOutfits(): Promise<Outfit[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<any>('SELECT * FROM outfits ORDER BY createdAt DESC');
  return result.map(item => ({
    ...item,
    id: Number(item.id),
    itemIds: JSON.parse(item.itemIds || '[]'),
    itemPositions: JSON.parse(item.itemPositions || '{}'),
  }));
}

export async function addOutfit(outfit: Omit<Outfit, 'id'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO outfits (name, itemIds, itemPositions, createdAt) VALUES (?, ?, ?, ?)',
    [outfit.name, JSON.stringify(outfit.itemIds), JSON.stringify(outfit.itemPositions || {}), outfit.createdAt]
  );
  return result.lastInsertRowId;
}

export async function deleteOutfit(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM outfits WHERE id = ?', [id]);
}

export async function updateOutfit(outfit: Outfit): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE outfits SET name = ?, itemIds = ?, itemPositions = ? WHERE id = ?',
    [outfit.name, JSON.stringify(outfit.itemIds), JSON.stringify(outfit.itemPositions || {}), outfit.id]
  );
}
