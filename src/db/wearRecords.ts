import { getDatabase } from './database';
import { WearRecord } from '../types';

// 本地日期字符串，避免时区偏移
function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 添加单条穿着记录
export async function addWearRecord(clothingId: number, date: string): Promise<number> {
  const db = await getDatabase();
  // 检查是否已存在同一天的记录
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM wear_records WHERE clothingId = ? AND wornDate = ?',
    [clothingId, date]
  );
  if (existing) {
    return existing.id; // 已存在，返回现有记录ID
  }
  const result = await db.runAsync(
    'INSERT INTO wear_records (clothingId, wornDate, createdAt) VALUES (?, ?, ?)',
    [clothingId, date, localDateString()]
  );
  return result.lastInsertRowId;
}

// 批量添加穿着记录（多件衣服同一天）
// 返回实际新增记录数量（不含已存在的）
export async function addWearRecords(clothingIds: number[], date: string): Promise<number> {
  let newCount = 0;
  for (const clothingId of clothingIds) {
    const id = await addWearRecord(clothingId, date);
    if (id) newCount++;
  }
  return newCount;
}

// 获取某件衣物的所有穿着记录
export async function getWearRecordsByClothing(clothingId: number): Promise<WearRecord[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<WearRecord>(
    'SELECT * FROM wear_records WHERE clothingId = ? ORDER BY wornDate DESC',
    [clothingId]
  );
  return result;
}

// 获取某日期的所有穿着记录
export async function getWearRecordsByDate(date: string): Promise<WearRecord[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<WearRecord>(
    'SELECT * FROM wear_records WHERE wornDate = ? ORDER BY createdAt DESC',
    [date]
  );
  return result;
}

// 获取某件衣物在某年某月的所有穿着日期
export async function getWearDatesByMonth(clothingId: number, year: number, month: number): Promise<string[]> {
  const db = await getDatabase();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const result = await db.getAllAsync<{ wornDate: string }>(
    'SELECT DISTINCT wornDate FROM wear_records WHERE clothingId = ? AND wornDate >= ? AND wornDate < ? ORDER BY wornDate',
    [clothingId, startDate, endDate]
  );
  return result.map(r => r.wornDate);
}

// 获取单条穿着记录（用于删除时查找 clothingId）
export async function getWearRecordById(id: number): Promise<WearRecord | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<WearRecord>(
    'SELECT * FROM wear_records WHERE id = ?',
    [id]
  );
  return result || null;
}

// 删除单条穿着记录
export async function deleteWearRecord(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM wear_records WHERE id = ?', [id]);
}

// 删除某件衣物的所有穿着记录
export async function deleteAllWearRecords(clothingId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM wear_records WHERE clothingId = ?', [clothingId]);
}

// 获取穿着次数统计（从穿着记录计算）
export async function getWearCountFromRecords(clothingId: number): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM wear_records WHERE clothingId = ?',
    [clothingId]
  );
  return result?.count ?? 0;
}

// 获取最后穿着日期（从穿着记录计算）
export async function getLastWornDateFromRecords(clothingId: number): Promise<string | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ wornDate: string }>(
    'SELECT wornDate FROM wear_records WHERE clothingId = ? ORDER BY wornDate DESC LIMIT 1',
    [clothingId]
  );
  return result?.wornDate ?? null;
}
