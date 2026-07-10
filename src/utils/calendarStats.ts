// src/utils/calendarStats.ts
import { ClothingItem, Season } from '../types';

const SEASON_BUFFER_DAYS = 45;
// 各季节核心区间（day-of-year，气象季节：春3/1-5/31 夏6/1-8/31 秋9/1-11/30 冬跨年末）
const SEASON_CORES: { name: Season; start: number; end: number }[] = [
  { name: '春', start: 60, end: 151 },
  { name: '夏', start: 152, end: 243 },
  { name: '秋', start: 244, end: 334 },
];

/**
 * 指定日期的「活跃季节」集合：每个季节核心区间前后各 SEASON_BUFFER_DAYS 天缓冲内即算活跃。
 * 例如 7 月初仍落在春季缓冲内 → ['春','夏']。默认取今天。
 */
export function getActiveSeasons(date = new Date()): Season[] {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((+date - +yearStart) / 86400000) + 1; // 1..365/366
  const result: Season[] = [];
  for (const s of SEASON_CORES) {
    if (dayOfYear >= s.start - SEASON_BUFFER_DAYS && dayOfYear <= s.end + SEASON_BUFFER_DAYS) {
      result.push(s.name);
    }
  }
  // 冬：核心 day 335-365 与 1-59；±45 缓冲 → day >= 290 或 day <= 104
  if (dayOfYear >= 335 - SEASON_BUFFER_DAYS || dayOfYear <= 59 + SEASON_BUFFER_DAYS) {
    result.push('冬');
  }
  return result;
}

/** 把 Date 格式化为 YYYY-MM-DD（本地，无时区偏移） */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 按当天是否有穿着记录返回背景色（二元：有=着色，无=不着色）。
 * count <= 0 → undefined（不着色）；否则返回 primary + '40'。
 */
export function tintForCount(count: number, primary: string): string | undefined {
  if (count <= 0) return undefined;
  return primary + '40';
}

/**
 * 连续记录天数：从今天往前数连续有记录的天数。
 * 今天尚无记录则从昨天起算（不因当天未记录而断链）。
 */
export function computeStreak(recordedDates: Set<string>, today: string): number {
  if (recordedDates.size === 0) return 0;
  const parse = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const cursor = parse(today);
  if (!recordedDates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (recordedDates.has(formatDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 本月已记录天数 / 月总天数 */
export function computeMonthProgress(
  recordedDates: Set<string>,
  year: number,
  month: number
): { recorded: number; total: number } {
  const total = new Date(year, month, 0).getDate();
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  let recorded = 0;
  for (let d = 1; d <= total; d++) {
    if (recordedDates.has(prefix + String(d).padStart(2, '0'))) recorded++;
  }
  return { recorded, total };
}

export interface IdleItem {
  itemId: number;
  thumb: string;
  name: string;
  days: number;
}

export interface Insight {
  emoji: string;
  text: string;
  /** 闲置提醒：当季最久未穿的衣物（最多3件），用于缩略图展示与点击跳转 */
  items?: IdleItem[];
}

/**
 * 月度智能洞察（最多 3 条，按优先级）。
 * wearData：当前查看月份的 日期→衣物 列表。
 * allClothingMap：全量衣物（衣柜+废衣篓+已卖出）id→item，用于取 color/seasons/lastWornAt。
 */
export function computeInsights(opts: {
  wearData: Record<string, ClothingItem[]>;
  allClothingMap: Map<number, ClothingItem>;
  activeSeasons: Season[];
  warnDays?: number;
}): Insight[] {
  const { wearData, allClothingMap, activeSeasons, warnDays = 30 } = opts;
  const out: Insight[] = [];

  // 当月被穿衣物（去重）
  const wornIds = new Set<number>();
  Object.values(wearData).forEach(arr => arr.forEach(c => wornIds.add(c.id)));

  // 1. 颜色偏好
  const colorMap: Record<string, number> = {};
  let coloredCount = 0;
  wornIds.forEach(id => {
    const c = allClothingMap.get(id);
    if (!c) return;
    const col = (c.color || '').trim();
    if (col) { colorMap[col] = (colorMap[col] || 0) + 1; coloredCount++; }
  });
  if (coloredCount >= 3) {
    const top = Object.entries(colorMap).sort((a, b) => b[1] - a[1])[0];
    const pct = Math.round((top[1] / coloredCount) * 100);
    if (pct >= 30) out.push({ emoji: '🖤', text: `本月最爱穿 ${top[0]}，占 ${pct}%` });
  }

  // 2. 周末 vs 工作日（日均件数）
  const recordedDays = Object.keys(wearData).filter(d => (wearData[d] || []).length > 0);
  let weCount = 0, weDays = 0, wdCount = 0, wdDays = 0;
  recordedDays.forEach(d => {
    const dow = new Date(d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const n = wearData[d].length;
    if (isWeekend) { weCount += n; weDays++; } else { wdCount += n; wdDays++; }
  });
  const weAvg = weDays > 0 ? weCount / weDays : 0;
  const wdAvg = wdDays > 0 ? wdCount / wdDays : 0;
  if (weDays >= 2 && wdAvg > 0 && weAvg / wdAvg >= 1.5) {
    out.push({ emoji: '📅', text: `周末穿搭比工作日丰富 ${Math.round(weAvg / wdAvg)} 倍` });
  }

  // 3. 闲置提醒（仅当季、超过 warnDays 未穿）Top 3
  const now = new Date();
  const idle: { item: ClothingItem; days: number }[] = [];
  for (const c of allClothingMap.values()) {
    if (!c.lastWornAt) continue;
    // 只统计当季衣物（命中任一活跃季节即可）
    if (!c.seasons || !c.seasons.some(s => activeSeasons.includes(s))) continue;
    const days = Math.floor((now.getTime() - new Date(c.lastWornAt).getTime()) / 86400000);
    if (days > warnDays) idle.push({ item: c, days });
  }
  if (idle.length > 0) {
    idle.sort((a, b) => b.days - a.days);
    const items = idle.slice(0, 3).map(({ item, days }) => ({
      itemId: item.id,
      thumb: item.thumbnailUri || item.imageUri,
      name: item.type || item.remarks || '该衣物',
      days,
    }));
    out.push({ emoji: '💤', text: '当季闲置未穿', items });
  }

  return out.slice(0, 3);
}
