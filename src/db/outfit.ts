import { getDatabase } from './database';
import { Outfit } from '../types';
import { CanvasItem, CanvasBackground } from '../store/outfitStore';

export interface OutfitRow {
  id: number;
  name: string;
  itemIds: string;
  itemPositions: string;
  canvasData?: string;
  canvasBackground?: string;
  style?: string;
  groupId?: number;
  thumbnailUri?: string;
  notes?: string;
  seasons: string;
  styles: string;
  createdAt: string;
}

export async function getAllOutfits(): Promise<Outfit[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<OutfitRow>('SELECT * FROM outfits ORDER BY createdAt DESC');
  return result.map(item => ({
    ...item,
    id: Number(item.id),
    itemIds: JSON.parse(item.itemIds || '[]'),
    // itemPositions 已废弃，保留读取以兼容旧数据
    itemPositions: JSON.parse(item.itemPositions || '{}'),
    canvasData: item.canvasData ? JSON.parse(item.canvasData) : undefined,
    canvasBackground: item.canvasBackground ? JSON.parse(item.canvasBackground) : undefined,
    style: item.style || '',
    groupId: item.groupId || 0,
    thumbnailUri: item.thumbnailUri,
    notes: item.notes || '',
    seasons: JSON.parse(item.seasons || '[]'),
    styles: JSON.parse(item.styles || '[]'),
  }));
}

export async function addOutfit(
  outfit: Omit<Outfit, 'id'> & { canvasData?: CanvasItem[]; canvasBackground?: CanvasBackground; style?: string; groupId: number; thumbnailUri?: string }
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO outfits (name, itemIds, itemPositions, canvasData, canvasBackground, style, groupId, thumbnailUri, notes, seasons, styles, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      outfit.name,
      JSON.stringify(outfit.itemIds),
      // itemPositions 已废弃，写入空对象
      '{}',
      outfit.canvasData ? JSON.stringify(outfit.canvasData) : '{}',
      outfit.canvasBackground ? JSON.stringify(outfit.canvasBackground) : '{}',
      outfit.style || '',
      outfit.groupId,
      outfit.thumbnailUri || '',
      (outfit as any).notes || '',
      (outfit as any).seasons ? JSON.stringify((outfit as any).seasons) : '[]',
      (outfit as any).styles ? JSON.stringify((outfit as any).styles) : '[]',
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
  outfit: Outfit & { canvasData?: CanvasItem[]; canvasBackground?: CanvasBackground; style?: string; groupId: number; thumbnailUri?: string }
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE outfits SET name = ?, itemIds = ?, itemPositions = ?, canvasData = ?, canvasBackground = ?, style = ?, groupId = ?, thumbnailUri = ?, notes = ?, seasons = ?, styles = ? WHERE id = ?',
    [
      outfit.name,
      JSON.stringify(outfit.itemIds),
      // itemPositions 已废弃，写入空对象
      '{}',
      outfit.canvasData ? JSON.stringify(outfit.canvasData) : '{}',
      outfit.canvasBackground ? JSON.stringify(outfit.canvasBackground) : '{}',
      outfit.style || '',
      outfit.groupId,
      outfit.thumbnailUri || '',
      (outfit as any).notes || '',
      (outfit as any).seasons ? JSON.stringify((outfit as any).seasons) : '[]',
      (outfit as any).styles ? JSON.stringify((outfit as any).styles) : '[]',
      outfit.id,
    ]
  );
}
