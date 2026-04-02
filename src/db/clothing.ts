import { getDatabase } from './database';
import { ClothingItem } from '../types';

export async function getAllClothing(): Promise<ClothingItem[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<ClothingItem>('SELECT * FROM clothing_items ORDER BY createdAt DESC');
  return result.map(item => ({
    ...item,
    seasons: JSON.parse(item.seasons as unknown as string || '[]'),
    occasions: JSON.parse(item.occasions as unknown as string || '[]'),
  }));
}

export async function getClothingById(id: number): Promise<ClothingItem | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<ClothingItem>('SELECT * FROM clothing_items WHERE id = ?', [id]);
  if (!result) return null;
  return {
    ...result,
    seasons: JSON.parse(result.seasons as unknown as string || '[]'),
    occasions: JSON.parse(result.occasions as unknown as string || '[]'),
  };
}

export async function addClothing(item: Omit<ClothingItem, 'id'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO clothing_items (imageUri, thumbnailUri, type, color, brand, size, seasons, occasions, purchaseDate, price, wearCount, lastWornAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.imageUri,
      item.thumbnailUri,
      item.type,
      item.color,
      item.brand,
      item.size,
      JSON.stringify(item.seasons),
      JSON.stringify(item.occasions),
      item.purchaseDate,
      item.price,
      item.wearCount,
      item.lastWornAt,
      item.createdAt,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateClothing(item: ClothingItem): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE clothing_items SET
      imageUri = ?, thumbnailUri = ?, type = ?, color = ?, brand = ?, size = ?,
      seasons = ?, occasions = ?, purchaseDate = ?, price = ?, wearCount = ?, lastWornAt = ?
     WHERE id = ?`,
    [
      item.imageUri,
      item.thumbnailUri,
      item.type,
      item.color,
      item.brand,
      item.size,
      JSON.stringify(item.seasons),
      JSON.stringify(item.occasions),
      item.purchaseDate,
      item.price,
      item.wearCount,
      item.lastWornAt,
      item.id,
    ]
  );
}

export async function deleteClothing(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM clothing_items WHERE id = ?', [id]);
}

export async function incrementWearCount(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE clothing_items SET wearCount = wearCount + 1, lastWornAt = ? WHERE id = ?',
    [new Date().toISOString(), id]
  );
}

export async function getClothingStats(): Promise<{ total: number; byType: Record<string, number> }> {
  const items = await getAllClothing();
  const byType: Record<string, number> = {};
  items.forEach(item => {
    byType[item.type] = (byType[item.type] || 0) + 1;
  });
  return { total: items.length, byType };
}
