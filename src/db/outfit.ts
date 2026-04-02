import { getDatabase } from './database';
import { Outfit } from '../types';

export async function getAllOutfits(): Promise<Outfit[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Outfit>('SELECT * FROM outfits ORDER BY createdAt DESC');
  return result.map(item => ({
    ...item,
    itemIds: JSON.parse(item.itemIds as unknown as string || '[]'),
  }));
}

export async function addOutfit(outfit: Omit<Outfit, 'id'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO outfits (name, itemIds, createdAt) VALUES (?, ?, ?)',
    [outfit.name, JSON.stringify(outfit.itemIds), outfit.createdAt]
  );
  return result.lastInsertRowId;
}

export async function deleteOutfit(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM outfits WHERE id = ?', [id]);
}
