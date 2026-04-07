import { getDatabase } from './database';
import { ClothingItem } from '../types';

// 本地日期字符串，避免时区偏移
function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getAllClothing(): Promise<ClothingItem[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<ClothingItem>('SELECT * FROM clothing_items WHERE deletedAt IS NULL AND soldAt IS NULL ORDER BY createdAt DESC');
  return result.map(item => ({
    ...item,
    seasons: JSON.parse(item.seasons as unknown as string || '[]'),
    occasions: JSON.parse(item.occasions as unknown as string || '[]'),
    styles: JSON.parse((item as any).styles || '[]'),
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
    styles: JSON.parse((result as any).styles || '[]'),
  };
}

export async function addClothing(item: Omit<ClothingItem, 'id'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO clothing_items (imageUri, thumbnailUri, type, color, brand, size, remarks, seasons, occasions, styles, purchaseDate, price, wearCount, lastWornAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.imageUri,
      item.thumbnailUri,
      item.type,
      item.color,
      item.brand,
      item.size,
      item.remarks || '',
      JSON.stringify(item.seasons),
      JSON.stringify(item.occasions),
      JSON.stringify(item.styles || []),
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
      imageUri = ?, thumbnailUri = ?, type = ?, color = ?, brand = ?, size = ?, remarks = ?,
      seasons = ?, occasions = ?, styles = ?, purchaseDate = ?, price = ?, wearCount = ?, lastWornAt = ?,
      soldAt = ?, soldPrice = ?, soldPlatform = ?
     WHERE id = ?`,
    [
      item.imageUri,
      item.thumbnailUri,
      item.type,
      item.color,
      item.brand,
      item.size,
      item.remarks || '',
      JSON.stringify(item.seasons),
      JSON.stringify(item.occasions),
      JSON.stringify(item.styles || []),
      item.purchaseDate,
      item.price,
      item.wearCount,
      item.lastWornAt,
      item.soldAt || null,
      item.soldPrice || null,
      item.soldPlatform || null,
      item.id,
    ]
  );
}

export async function deleteClothing(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM clothing_items WHERE id = ?', [id]);
}

export async function softDeleteClothing(id: number, reason: string = ''): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE clothing_items SET deletedAt = ?, discardReason = ? WHERE id = ?',
    [localDateString(), reason, id]
  );
}

export async function restoreClothing(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE clothing_items SET deletedAt = NULL, soldAt = NULL, soldPrice = NULL, soldPlatform = NULL WHERE id = ?',
    [id]
  );
}

export async function getTrashClothing(): Promise<ClothingItem[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<ClothingItem>(
    'SELECT * FROM clothing_items WHERE deletedAt IS NOT NULL AND soldAt IS NULL ORDER BY deletedAt DESC'
  );
  return result.map(item => ({
    ...item,
    seasons: JSON.parse(item.seasons as unknown as string || '[]'),
    occasions: JSON.parse(item.occasions as unknown as string || '[]'),
    styles: JSON.parse((item as any).styles || '[]'),
  }));
}

export async function getSoldClothing(): Promise<ClothingItem[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<ClothingItem>(
    'SELECT * FROM clothing_items WHERE soldAt IS NOT NULL ORDER BY soldAt DESC'
  );
  return result.map(item => ({
    ...item,
    seasons: JSON.parse(item.seasons as unknown as string || '[]'),
    occasions: JSON.parse(item.occasions as unknown as string || '[]'),
    styles: JSON.parse((item as any).styles || '[]'),
  }));
}

export async function sellClothing(id: number, soldPrice: number, soldPlatform: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE clothing_items SET soldAt = ?, soldPrice = ?, soldPlatform = ?, deletedAt = NULL, discardReason = NULL WHERE id = ?',
    [localDateString(), soldPrice, soldPlatform, id]
  );
}

export async function restoreSoldClothing(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE clothing_items SET soldAt = NULL, soldPrice = NULL, soldPlatform = NULL WHERE id = ?',
    [id]
  );
}

export async function permanentDeleteClothing(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM clothing_items WHERE id = ?', [id]);
}

export async function incrementWearCount(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE clothing_items SET wearCount = wearCount + 1, lastWornAt = ? WHERE id = ?',
    [localDateString(), id]
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
