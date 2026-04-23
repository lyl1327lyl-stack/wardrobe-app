import { getDatabase } from './database';
import { Outfit } from '../types';
import { CanvasItem } from '../store/outfitStore';

export interface OutfitRow {
  id: number;
  name: string;
  itemIds: string;
  itemPositions: string;
  canvasData?: string;
  style?: string;
  thumbnailUri?: string;
  createdAt: string;
}

export async function getAllOutfits(): Promise<Outfit[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<OutfitRow>('SELECT * FROM outfits ORDER BY createdAt DESC');
  return result.map(item => ({
    ...item,
    id: Number(item.id),
    itemIds: JSON.parse(item.itemIds || '[]'),
    itemPositions: JSON.parse(item.itemPositions || '{}'),
    canvasData: item.canvasData ? JSON.parse(item.canvasData) : undefined,
    style: item.style || '',
    thumbnailUri: item.thumbnailUri,
  }));
}

export async function addOutfit(
  outfit: Omit<Outfit, 'id'> & { canvasData?: CanvasItem[]; style?: string; thumbnailUri?: string }
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO outfits (name, itemIds, itemPositions, canvasData, style, thumbnailUri, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      outfit.name,
      JSON.stringify(outfit.itemIds),
      JSON.stringify(outfit.itemPositions || {}),
      outfit.canvasData ? JSON.stringify(outfit.canvasData) : '{}',
      outfit.style || '',
      outfit.thumbnailUri || '',
      outfit.createdAt,
    ]
  );
  return result.lastInsertRowId;
}

export async function deleteOutfit(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM outfits WHERE id = ?', [id]);
}

export async function updateOutfit(
  outfit: Outfit & { canvasData?: CanvasItem[]; style?: string; thumbnailUri?: string }
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE outfits SET name = ?, itemIds = ?, itemPositions = ?, canvasData = ?, style = ?, thumbnailUri = ? WHERE id = ?',
    [
      outfit.name,
      JSON.stringify(outfit.itemIds),
      JSON.stringify(outfit.itemPositions || {}),
      outfit.canvasData ? JSON.stringify(outfit.canvasData) : '{}',
      outfit.style || '',
      outfit.thumbnailUri || '',
      outfit.id,
    ]
  );
}
