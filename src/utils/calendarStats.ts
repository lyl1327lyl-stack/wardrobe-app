// src/utils/calendarStats.ts
import { ClothingItem, Season } from '../types';

// 节气边界（近似 day-of-year）：立春~2/4(35) 立夏~5/5(125) 立秋~8/7(219) 立冬~11/7(311)
// 各季 core = [节气, 下一节气前一天]；冬跨年(311→34)。core 连续不重叠，覆盖全年。
const SEASON_CORES: { name: Season; start: number; end: number }[] = [
  { name: '春', start: 35, end: 124 },
  { name: '夏', start: 125, end: 218 },
  { name: '秋', start: 219, end: 310 },
  { name: '冬', start: 311, end: 34 },
];

/** 圆形区间判定（start>end 表示跨年，如冬） */
const inWindow = (d: number, ws: number, we: number) =>
  ws <= we ? d >= ws && d <= we : d >= ws || d <= we;

/**
 * 指定日期所在季节（按节气边界，单一季节，无缓冲）。
 * 例如盛夏(7月) → ['夏']，只限定夏季衣物。默认取今天。
 */
export function getActiveSeasons(date = new Date()): Season[] {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  let dayOfYear = Math.floor((+date - +yearStart) / 86400000) + 1;
  if (dayOfYear > 365) dayOfYear = 365; // 闰年末压回，误差≤1天
  for (const s of SEASON_CORES) {
    if (inWindow(dayOfYear, s.start, s.end)) return [s.name];
  }
  return [];
}

/**
 * 换季提醒：若指定日期刚进入某季节（节气后 withinDays 天内），返回 { season, daysSinceStart }；否则 null。
 */
export function getSeasonTransition(date = new Date(), withinDays = 7): { season: Season; daysSinceStart: number } | null {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  let dayOfYear = Math.floor((+date - +yearStart) / 86400000) + 1;
  if (dayOfYear > 365) dayOfYear = 365;
  for (const s of SEASON_CORES) {
    let diff = dayOfYear - s.start;
    if (diff < 0) diff += 365; // 跨年(如初春 vs 冬至start)
    if (diff <= withinDays) return { season: s.name, daysSinceStart: diff };
  }
  return null;
}

export interface IdleEntry { item: ClothingItem; days: number; neverWorn: boolean; }

/**
 * 当季闲置衣物（仅在库 + 当季 + 超 warnDays；纳入从未穿过；新衣物 14 天宽限）。
 * 按闲置天数降序返回，调用方自行 slice。
 */
export function getIdleItems(
  wardrobeItems: ClothingItem[],
  activeSeasons: Season[],
  warnDays = 30
): IdleEntry[] {
  const now = new Date();
  const GRACE_DAYS = 14;
  const daysSince = (iso: string) => Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
  const idle: IdleEntry[] = [];
  for (const c of wardrobeItems) {
    if (!c.seasons || !c.seasons.some(s => activeSeasons.includes(s))) continue;
    if (c.purchaseDate && daysSince(c.purchaseDate) < GRACE_DAYS) continue;
    let days: number;
    let neverWorn = false;
    if (c.lastWornAt) {
      days = daysSince(c.lastWornAt);
    } else if (c.purchaseDate) {
      days = daysSince(c.purchaseDate);
      neverWorn = true;
    } else if (c.createdAt) {
      days = daysSince(c.createdAt);
      neverWorn = true;
    } else {
      continue;
    }
    if (days > warnDays) idle.push({ item: c, days, neverWorn });
  }
  idle.sort((a, b) => b.days - a.days);
  return idle;
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
  /** 从未穿过（按购买/创建日算闲置时长） */
  neverWorn?: boolean;
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
  /** 当前在库衣物（排除已卖出/废衣篓），用于闲置提醒 */
  wardrobeItems: ClothingItem[];
  activeSeasons: Season[];
  warnDays?: number;
}): Insight[] {
  const { wearData, allClothingMap, wardrobeItems, activeSeasons, warnDays = 30 } = opts;
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

  // 3. 闲置提醒：复用 getIdleItems（仅在库+当季+超阈值，含从未穿，新衣物14天宽限）
  const idle = getIdleItems(wardrobeItems, activeSeasons, warnDays);
  if (idle.length > 0) {
    const items = idle.slice(0, 3).map(({ item, days, neverWorn }) => ({
      itemId: item.id,
      thumb: item.thumbnailUri || item.imageUri,
      name: item.type || item.remarks || '该衣物',
      days,
      neverWorn,
    }));
    out.push({ emoji: '💤', text: '当季闲置未穿', items });
  }

  return out.slice(0, 3);
}
