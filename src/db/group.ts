import { getDatabase } from './database';
import { OutfitGroup } from '../types';

export interface GroupRow {
  id: number;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
}

function toGroup(row: GroupRow): OutfitGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    sortOrder: row.sortOrder || 0,
    createdAt: row.createdAt,
  };
}

export async function getAllGroups(): Promise<OutfitGroup[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GroupRow>(
    'SELECT * FROM outfit_groups ORDER BY sortOrder ASC, createdAt ASC'
  );
  return rows.map(toGroup);
}

export async function addGroup(name: string, description: string): Promise<number> {
  const db = await getDatabase();
  // 获取最大 sortOrder
  const maxSort = await db.getFirstAsync<{ maxSort: number }>(
    'SELECT MAX(sortOrder) as maxSort FROM outfit_groups'
  );
  const nextSort = (maxSort?.maxSort ?? 0) + 1;
  const result = await db.runAsync(
    'INSERT INTO outfit_groups (name, description, sortOrder, createdAt) VALUES (?, ?, ?, ?)',
    [name, description, nextSort, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function updateGroup(id: number, name: string, description: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE outfit_groups SET name = ?, description = ? WHERE id = ?',
    [name, description, id]
  );
}

export async function deleteGroup(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM outfit_groups WHERE id = ?', [id]);
}

export async function moveOutfitsToGroup(fromGroupId: number, toGroupId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE outfits SET groupId = ? WHERE groupId = ?',
    [toGroupId, fromGroupId]
  );
}

export async function deleteOutfitsByGroup(groupId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM outfits WHERE groupId = ?', [groupId]);
}
