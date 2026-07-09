# 穿着记录日历页 美化与功能增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `WearCalendarScreen` 上增加 今日穿搭Hero卡 / 连续打卡+本月进度 / 月-年视图切换(年度热力图) / 月度智能洞察 四个模块，让页面更丰富。

**Architecture:** 纯计算逻辑（streak、progress、insights、tint）抽到 `src/utils/calendarStats.ts`；4 个新展示组件放 `src/components/`；`MonthCalendar` 增加可选 `cellTint` prop 做格子着色；`WearCalendarScreen` 负责数据加载、状态与组装。

**Tech Stack:** React Native (Expo) + TypeScript + Zustand + expo-sqlite (穿着记录 via `src/db/wearRecords.ts`)。

**测试约定（重要）：** 本项目**无 JS 测试框架**（无 jest/vitest，无 `*.test.*` 文件）。因此每个任务的"验证"步骤为：
1. `npx tsc --noEmit`（必须零错误）
2. `npx expo start` 手动运行后在日历页目视确认（详见各任务"手动验证"）
纯函数已隔离到 `calendarStats.ts`，便于将来接入测试框架后补单测。

**设计依据：** `docs/superpowers/specs/2026-07-09-wear-calendar-enrichment-design.md`

---

## File Structure

| 文件 | 责任 | 动作 |
|---|---|---|
| `src/utils/calendarStats.ts` | 纯函数：`getCurrentSeason`、`tintForCount`、`computeStreak`、`computeMonthProgress`、`computeInsights` | 新建 |
| `src/components/MonthCalendar.tsx` | 月份日历；新增可选 `cellTint` prop 按件数着色 | 改 |
| `src/components/TodayOutfitHero.tsx` | A 今日 Hero 卡（已记录/未记录两态） | 新建 |
| `src/components/StreakProgressCard.tsx` | B 连续记录 + 本月进度 | 新建 |
| `src/components/YearHeatmap.tsx` | C 年度热力图（12 月块） | 新建 |
| `src/components/CalendarInsights.tsx` | D 洞察条目（纯渲染） | 新建 |
| `src/screens/WearCalendarScreen.tsx` | 数据加载、`viewMode` 状态、组装所有模块 | 改 |

依赖顺序：Task 1（纯函数）→ Task 2（MonthCalendar）→ Task 3-6（4 组件，彼此独立）→ Task 7（屏幕组装）→ Task 8（整体验证）。

---

### Task 1: 纯计算逻辑 `calendarStats.ts`

**Files:**
- Create: `src/utils/calendarStats.ts`

- [ ] **Step 1: 创建文件，写入全部纯函数**

```ts
// src/utils/calendarStats.ts
import { ClothingItem, Season } from '../types';

/** 当前季节（按月份） */
export function getCurrentSeason(): Season {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return '春';
  if (m >= 6 && m <= 8) return '夏';
  if (m >= 9 && m <= 11) return '秋';
  return '冬';
}

/** 把 Date 格式化为 YYYY-MM-DD（本地，无时区偏移） */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 按当天穿着件数返回背景色（primary 的不同 alpha）。
 * 0 → undefined（不着色）；1-2 浅；3-4 中；≥5 深。
 */
export function tintForCount(count: number, primary: string): string | undefined {
  if (count <= 0) return undefined;
  if (count <= 2) return primary + '22';
  if (count <= 4) return primary + '44';
  return primary + '66';
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

export interface Insight {
  emoji: string;
  text: string;
}

/**
 * 月度智能洞察（最多 3 条，按优先级）。
 * wearData：当前查看月份的 日期→衣物 列表。
 * allClothingMap：全量衣物（衣柜+废衣篓+已卖出）id→item，用于取 color/seasons/lastWornAt。
 */
export function computeInsights(opts: {
  wearData: Record<string, ClothingItem[]>;
  allClothingMap: Map<number, ClothingItem>;
  currentSeason: Season;
  warnDays?: number;
}): Insight[] {
  const { wearData, allClothingMap, currentSeason, warnDays = 30 } = opts;
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

  // 3. 闲置提醒（当季、超过 warnDays 未穿的最久一件）
  const now = new Date();
  let worst: { item: ClothingItem; days: number } | null = null;
  allClothingMap.forEach(c => {
    if (!c.lastWornAt) return;
    if (!c.seasons || !c.seasons.includes(currentSeason)) return;
    const days = Math.floor((now.getTime() - new Date(c.lastWornAt).getTime()) / 86400000);
    if (days > warnDays && (!worst || days > worst.days)) worst = { item: c, days };
  });
  if (worst) {
    const name = worst.item.type || worst.item.remarks || '该衣物';
    out.push({ emoji: '💤', text: `${name} 已 ${worst.days} 天没穿` });
  }

  return out.slice(0, 3);
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无输出（零错误）。若报 `Season`/`ClothingItem` 导入错误，确认 `src/types/index.ts` 导出这两个类型（已存在）。

- [ ] **Step 3: 提交**

```bash
git add src/utils/calendarStats.ts
git commit -m "feat(calendar): 新增 calendarStats 纯函数(streak/progress/insights/tint)"
```

---

### Task 2: MonthCalendar 增加可选 `cellTint` 着色

**Files:**
- Modify: `src/components/MonthCalendar.tsx`（接口在 27-38 行，渲染在 217-245 行附近）

- [ ] **Step 1: 给 Props 接口加可选字段**

在 `MonthCalendarProps`（`src/components/MonthCalendar.tsx:27`）的 `legendItems?: LegendItem[];` 之后追加一行：

```ts
  /** 可选：按当天件数返回格子背景色（用于活跃度着色）。返回 undefined 则用默认样式。 */
  cellTint?: (dateStr: string, count: number) => string | undefined;
```

- [ ] **Step 2: 解构 prop**

在函数签名（`src/components/MonthCalendar.tsx:180`）的解构中，`legendItems,` 之后追加：

```ts
  cellTint,
```

- [ ] **Step 3: 在 day cell 样式数组中应用着色**

找到 for 循环内 `cells.push(<TouchableOpacity ... />)`（约 `src/components/MonthCalendar.tsx:230`），其 `style={[ ... ]}` 数组中，在 `showOutfitThumb && { overflow: 'hidden' },` 之后、数组闭合 `]}` 之前，追加：

```ts
          cellTint && !isToday && hasRecords && cellTint(dateStr, dayRecords.length)
            ? { backgroundColor: cellTint(dateStr, dayRecords.length) }
            : null,
```

（`!isToday` 保证今天仍用 `dayCellToday` 高亮不被覆盖；`hasRecords` 保证空格不着色。）

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit`
Expected: 零错误。

- [ ] **Step 5: 提交**

```bash
git add src/components/MonthCalendar.tsx
git commit -m "feat(calendar): MonthCalendar 支持可选 cellTint 按件数着色"
```

---

### Task 3: TodayOutfitHero 组件（A）

**Files:**
- Create: `src/components/TodayOutfitHero.tsx`

- [ ] **Step 1: 创建组件文件**

```tsx
// src/components/TodayOutfitHero.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LinearGradient from 'expo-linear-gradient';
import { ClothingItem } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  /** 今日穿着的衣物（已记录则有，未记录为空数组） */
  items: ClothingItem[];
  /** 今日日期串 YYYY-MM-DD */
  today: string;
  /** 点击整卡（已记录态） */
  onPress: () => void;
  /** 未记录态点 CTA */
  onRecord: () => void;
}

export function TodayOutfitHero({ items, today, onPress, onRecord }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const recorded = items.length > 0;

  const label = (() => {
    const d = new Date(today);
    const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return `今日 · ${d.getMonth() + 1}月${d.getDate()}日 ${wd}`;
  })();

  return (
    <TouchableOpacity
      activeOpacity={recorded ? 0.85 : 0.9}
      onPress={recorded ? onPress : onRecord}
      disabled={false}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.left}>
          <Text style={styles.dateLabel}>{label}</Text>
          <Text style={styles.title}>{recorded ? '今日穿搭' : '今天还没记录穿搭'}</Text>
        </View>
        {recorded ? (
          <View style={styles.thumbRow}>
            {items.slice(0, 3).map((it, idx) => {
              const extra = idx === 2 && items.length > 3 ? items.length - 3 : 0;
              return (
                <View key={it.id} style={styles.thumbWrap}>
                  {(it.thumbnailUri || it.imageUri) ? (
                    <Image source={{ uri: it.thumbnailUri || it.imageUri }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="shirt-outline" size={14} color="#fff" />
                    </View>
                  )}
                  {extra > 0 && (
                    <View style={styles.moreBadge}>
                      <Text style={styles.moreText}>+{extra}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.cta}>
            <Ionicons name="add-outline" size={15} color={theme.colors.primary} />
            <Text style={[styles.ctaText, { color: theme.colors.primary }]}>记录今日穿搭</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 76,
    },
    left: { flex: 1, marginRight: 10 },
    dateLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
    title: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 3 },
    thumbRow: { flexDirection: 'row' },
    thumbWrap: { width: 40, height: 40, marginRight: 6, borderRadius: 10, overflow: 'hidden' },
    thumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)' },
    thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    moreBadge: {
      position: 'absolute', right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8,
      paddingHorizontal: 4, minWidth: 16, alignItems: 'center',
    },
    moreText: { fontSize: 9, color: '#fff', fontWeight: '700' },
    cta: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: '#fff', borderRadius: 16,
      paddingHorizontal: 12, paddingVertical: 8,
    },
    ctaText: { fontSize: 12, fontWeight: '700' },
  });
```

- [ ] **Step 2: 确认依赖**

确认 `expo-linear-gradient` 已装（项目中其他卡如 `OutfitRecommendationCard` 已用）。若未装：`npx expo install expo-linear-gradient`。确认 `theme.colors.primaryDark` 存在；若主题无此字段，组件已用 `|| theme.colors.primary` 兜底。

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: 零错误。

- [ ] **Step 4: 提交**

```bash
git add src/components/TodayOutfitHero.tsx
git commit -m "feat(calendar): 新增 TodayOutfitHero 今日穿搭 Hero 卡"
```

---

### Task 4: StreakProgressCard 组件（B）

**Files:**
- Create: `src/components/StreakProgressCard.tsx`

- [ ] **Step 1: 创建组件**

```tsx
// src/components/StreakProgressCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  streakDays: number;
  recorded: number;
  total: number;
}

export function StreakProgressCard({ streakDays, recorded, total }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const pct = total > 0 ? Math.min(recorded / total, 1) : 0;

  return (
    <View style={styles.row}>
      <View style={[styles.card, { flex: 1 }]}>
        <Text style={styles.fire}>{streakDays > 0 ? '🔥' : '💧'}</Text>
        <View>
          <Text style={styles.streakNum}>
            {streakDays}
            <Text style={styles.streakUnit}> 天</Text>
          </Text>
          <Text style={styles.subLabel}>连续记录</Text>
        </View>
      </View>
      <View style={[styles.card, { flex: 1.4 }]}>
        <View style={styles.progressHead}>
          <Text style={styles.subLabel}>本月进度</Text>
          <Text style={styles.progressNum}>
            {recorded}<Text style={styles.progressTotal}>/{total}</Text>
          </Text>
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 10 },
    card: {
      backgroundColor: theme.colors.card, borderRadius: 14, padding: 12,
      flexDirection: 'row', alignItems: 'center', gap: 9,
      ...theme.shadows.sm,
    },
    fire: { fontSize: 18 },
    streakNum: { fontSize: 16, fontWeight: '800', color: theme.colors.primary, lineHeight: 18 },
    streakUnit: { fontSize: 10, color: theme.colors.textTertiary, fontWeight: '500' },
    subLabel: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 2 },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' },
    progressNum: { fontSize: 14, fontWeight: '800', color: theme.colors.primary },
    progressTotal: { fontSize: 10, color: theme.colors.textTertiary, fontWeight: '500' },
    barBg: { height: 6, backgroundColor: theme.colors.borderLight, borderRadius: 3, marginTop: 8 },
    barFill: { height: 6, borderRadius: 3, backgroundColor: theme.colors.primary },
  });
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 零错误。

- [ ] **Step 3: 提交**

```bash
git add src/components/StreakProgressCard.tsx
git commit -m "feat(calendar): 新增 StreakProgressCard 连续记录+本月进度"
```

---

### Task 5: YearHeatmap 组件（C 年视图）

**Files:**
- Create: `src/components/YearHeatmap.tsx`

**说明：** 12 个月块纵向排列；每块内「1 号置于首行首列」，列数 = ceil(当月天数/7)；颜色用 `tintForCount`。

- [ ] **Step 1: 创建组件**

```tsx
// src/components/YearHeatmap.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { tintForCount } from '../utils/calendarStats';

interface Props {
  year: number;
  /** 日期(YYYY-MM-DD) → 当天件数。可只含本年。 */
  countMap: Record<string, number>;
  today: string;
  onSelectDate: (dateStr: string) => void;
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export function YearHeatmap({ year, countMap, today, onSelectDate }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const months = [];
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    const cols = Math.ceil(daysInMonth / 7);
    const cells = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const count = countMap[dateStr] || 0;
      const isFuture = dateStr > today;
      const bg = isFuture ? theme.colors.borderLight : (tintForCount(count, theme.colors.primary) || theme.colors.borderLight);
      const isToday = dateStr === today;
      cells.push(
        <TouchableOpacity
          key={dateStr}
          disabled={isFuture}
          onPress={() => onSelectDate(dateStr)}
          style={[styles.cell, { backgroundColor: bg }, isToday && styles.cellToday]}
        />
      );
      // 补齐最后一列空白
      const isLastInMonth = day === daysInMonth;
      const cellsInLastCol = daysInMonth - (cols - 1) * 7;
      if (isLastInMonth) {
        for (let p = 0; p < 7 - cellsInLastCol; p++) {
          cells.push(<View key={`pad-${m}-${p}`} style={[styles.cell, styles.cellPad]} />);
        }
      }
    }
    months.push(
      <View key={m} style={styles.monthBlock}>
        <Text style={styles.monthLabel}>{MONTH_LABELS[m - 1]}</Text>
        <View style={[styles.grid, { flexDirection: 'column', flexWrap: 'wrap', alignContent: 'flex-start' }]}>
          {cells}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>少</Text>
        <View style={[styles.legendCell, { backgroundColor: theme.colors.borderLight }]} />
        <View style={[styles.legendCell, { backgroundColor: theme.colors.primary + '22' }]} />
        <View style={[styles.legendCell, { backgroundColor: theme.colors.primary + '44' }]} />
        <View style={[styles.legendCell, { backgroundColor: theme.colors.primary + '66' }]} />
        <Text style={styles.legendText}>多</Text>
      </View>
      <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
        {months}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { paddingHorizontal: 4, paddingTop: 6 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginBottom: 8 },
    legendCell: { width: 10, height: 10, borderRadius: 2 },
    legendText: { fontSize: 9, color: theme.colors.textTertiary },
    monthBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    monthLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, width: 30, marginTop: 2 },
    grid: { width: 7 * 16, height: undefined }, // 7 行 × (cell+gap)
    cell: { width: 13, height: 13, borderRadius: 3, margin: 1.5 },
    cellPad: { backgroundColor: 'transparent' },
    cellToday: { borderWidth: 2, borderColor: theme.colors.primary },
  });
```

**关于 grid 布局：** RN 用 `flexDirection:'column', flexWrap:'wrap'` + 固定 `width` 实现按列填充；`width: 7*16` 容纳约 7 行。若渲染异常，调整为 `numColumns` 风格的手动分列（按 `day` 计算行列）。每格 13px + margin 3px ≈ 16px 步进。

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 零错误。

- [ ] **Step 3: 手动验证（运行后）**

`npx expo start` → 日历页（需 Task 7 接入后可见）。切到「年」视图：应见 12 个月块、格子深浅随件数、今天格子有描边、未来日期不可点。

- [ ] **Step 4: 提交**

```bash
git add src/components/YearHeatmap.tsx
git commit -m "feat(calendar): 新增 YearHeatmap 年度热力图"
```

---

### Task 6: CalendarInsights 组件（D）

**Files:**
- Create: `src/components/CalendarInsights.tsx`

- [ ] **Step 1: 创建组件（纯渲染）**

```tsx
// src/components/CalendarInsights.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { Insight } from '../utils/calendarStats';

interface Props {
  insights: Insight[];
}

export function CalendarInsights({ insights }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  if (insights.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {insights.map((ins, idx) => (
        <View key={idx} style={styles.row}>
          <Text style={styles.emoji}>{ins.emoji}</Text>
          <Text style={styles.text} numberOfLines={2}>{ins.text}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { marginHorizontal: 16, marginTop: 10, gap: 8 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 9,
      backgroundColor: theme.colors.card, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12,
      ...theme.shadows.sm,
    },
    emoji: { fontSize: 15 },
    text: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  });
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 零错误。

- [ ] **Step 3: 提交**

```bash
git add src/components/CalendarInsights.tsx
git commit -m "feat(calendar): 新增 CalendarInsights 月度洞察渲染"
```

---

### Task 7: WearCalendarScreen 组装全部模块

**Files:**
- Modify: `src/screens/WearCalendarScreen.tsx`

**改动点：** ① 新增 imports；② 新增 state（`todayItems`、`streakDays`、`monthProgress`、`yearCountMap`、`viewMode`、`insights`）；③ 新增/扩展数据加载（today、近 60 天 streak、本月进度、懒加载全年 countMap）；④ 顶部渲染 `TodayOutfitHero` + `StreakProgressCard`；⑤ 日历卡标题行加 月/年 切换 + 渲染 `MonthCalendar`(带 cellTint) 或 `YearHeatmap`；⑥ 月度概览后渲染 `CalendarInsights`。

- [ ] **Step 1: 新增 imports（文件顶部 import 区）**

在 `WearCalendarScreen.tsx` 现有 import 之后追加：

```ts
import { TodayOutfitHero } from '../components/TodayOutfitHero';
import { StreakProgressCard } from '../components/StreakProgressCard';
import { YearHeatmap } from '../components/YearHeatmap';
import { CalendarInsights } from '../components/CalendarInsights';
import {
  tintForCount, computeStreak, computeMonthProgress, computeInsights, getCurrentSeason, formatDate,
} from '../utils/calendarStats';
```

- [ ] **Step 2: 新增 state（在现有 `const [showSheet, setShowSheet] = useState(false);` 之后）**

```ts
  const [todayItems, setTodayItems] = useState<ClothingItem[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [monthProgress, setMonthProgress] = useState({ recorded: 0, total: 0 });
  const [yearCountMap, setYearCountMap] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
```

- [ ] **Step 3: 新增 today / streak / 本月进度 加载函数（放在 `loadRecentWeek` 之后）**

```ts
  // 加载"今天/连续/本月进度"相关数据（恒定指向今天所在月，不随翻页变）
  const loadTodayAndStreak = useCallback(async () => {
    const now = new Date();
    const todayStr = formatDate(now);
    // 近 60 天记录 → streak
    const start60 = new Date(now); start60.setDate(start60.getDate() - 59);
    const startStr = formatDate(start60);
    const recs60 = await wearRecordsDb.getWearRecordsByDateRange(startStr, todayStr);
    const recordedDates = new Set<string>();
    const todayArr: ClothingItem[] = [];
    for (const r of recs60) {
      recordedDates.add(r.wornDate);
      if (r.wornDate === todayStr) todayArr.push(recordToClothingItem(r, allClothingMap));
    }
    setTodayItems(todayArr);
    setStreakDays(computeStreak(recordedDates, todayStr));
    // 本月进度（today 所在月）
    const prog = computeMonthProgress(recordedDates, now.getFullYear(), now.getMonth() + 1);
    setMonthProgress(prog);
  }, [allClothingMap]);

  // 懒加载全年 countMap（仅切到「年」时调用）
  const loadYearCountMap = useCallback(async (year: number) => {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const recs = await wearRecordsDb.getWearRecordsByDateRange(start, end);
    const m: Record<string, number> = {};
    for (const r of recs) m[r.wornDate] = (m[r.wornDate] || 0) + 1;
    setYearCountMap(m);
  }, []);
```

- [ ] **Step 4: 把 `loadTodayAndStreak` 并入 `reloadAll` 与 focus 刷新**

把现有：
```ts
  const reloadAll = useCallback(async () => {
    await Promise.all([loadMonthData(), loadRecentWeek()]);
  }, [loadMonthData, loadRecentWeek]);
```
改为：
```ts
  const reloadAll = useCallback(async () => {
    await Promise.all([loadMonthData(), loadRecentWeek(), loadTodayAndStreak()]);
  }, [loadMonthData, loadRecentWeek, loadTodayAndStreak]);
```

并把现有：
```ts
  useEffect(() => {
    loadMonthData();
    loadRecentWeek();
  }, [loadMonthData, loadRecentWeek]);
```
改为：
```ts
  useEffect(() => {
    loadMonthData();
    loadRecentWeek();
    loadTodayAndStreak();
  }, [loadMonthData, loadRecentWeek, loadTodayAndStreak]);
```

- [ ] **Step 5: 切到年视图时懒加载（在 `viewMode` 变化时）**

在 `useEffect(() => { loadData(); }, []);` 之后新增：

```ts
  useEffect(() => {
    if (viewMode === 'year' && yearCountMap && Object.keys(yearCountMap).length === 0) {
      loadYearCountMap(currentYear);
    }
  }, [viewMode, currentYear, yearCountMap, loadYearCountMap]);
```

- [ ] **Step 6: 计算 insights（在 `monthStats` memo 之后新增 memo）**

```ts
  // 月度智能洞察（跟随当前查看月）
  const insights = useMemo(() => {
    return computeInsights({
      wearData,
      allClothingMap,
      currentSeason: getCurrentSeason(),
    });
  }, [wearData, allClothingMap]);
```

- [ ] **Step 7: 顶部渲染 Hero + 进度（在 `<ScrollView ...>` 之后、`<MonthCalendar .../>` 之前插入）**

```tsx
        <TodayOutfitHero
          items={todayItems}
          today={today}
          onPress={() => handleDayPress(today)}
          onRecord={() => navigation.navigate('RecordWear' as any, { date: today })}
        />
        <StreakProgressCard
          streakDays={streakDays}
          recorded={monthProgress.recorded}
          total={monthProgress.total}
        />
```

- [ ] **Step 8: 日历卡 月/年 切换 + 渲染分支**

把现有 `<MonthCalendar ... />`（单标签）替换为：

```tsx
        {/* 月/年 视图切换 */}
        <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <View style={{ flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: 8, padding: 3 }}>
            {(['month', 'year'] as const).map(vm => (
              <TouchableOpacity
                key={vm}
                onPress={() => setViewMode(vm)}
                style={{
                  paddingVertical: 5, paddingHorizontal: 14, borderRadius: 6,
                  backgroundColor: viewMode === vm ? theme.colors.primary : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: viewMode === vm ? '#fff' : theme.colors.textTertiary }}>
                  {vm === 'month' ? '月' : '年'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {viewMode === 'month' ? (
          <MonthCalendar
            year={currentYear}
            month={currentMonth}
            today={today}
            wearData={wearData}
            onSelectDate={handleDayPress}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
            outfitMatchMap={outfitMatchMap}
            cellTint={(dateStr, count) => tintForCount(count, theme.colors.primary)}
          />
        ) : (
          <View style={{ marginHorizontal: 20, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, ...theme.shadows.sm }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>
              {currentYear}年 全年穿着
            </Text>
            <YearHeatmap
              year={currentYear}
              countMap={yearCountMap}
              today={today}
              onSelectDate={handleDayPress}
            />
          </View>
        )}
```

> **注意：** 切到「年」视图后，`MonthCalendar` 的翻月按钮不可见，`currentYear` 由月视图翻动决定。年视图中若需切年，可翻回月视图翻月；本期不单独做年切换器（YAGNI）。

- [ ] **Step 9: 月度概览后渲染洞察（在「月度概览统计卡片」`</View>` 闭合、即 `{/* Recent Week Card ... */}` 之前插入）**

找到 `{/* Recent Week Card（横排 7 列） */}` 注释，在其**之前**插入：

```tsx
        <CalendarInsights insights={insights} />
```

- [ ] **Step 10: 类型检查**

Run: `npx tsc --noEmit`
Expected: 零错误。常见报错：`formatDate` 未导入（Step1 已含）、`viewMode` 未声明（Step2 已含）。

- [ ] **Step 11: 提交**

```bash
git add src/screens/WearCalendarScreen.tsx
git commit -m "feat(calendar): WearCalendarScreen 接入 今日Hero/连续进度/月年切换/洞察"
```

---

### Task 8: 整体手动验证

**Files:** 无（运行验证）

- [ ] **Step 1: 启动应用**

Run: `npx expo start`
在模拟器/真机打开「日历」页（穿着记录）。

- [ ] **Step 2: 逐项核对**

- [ ] 顶部出现今日 Hero：已记录→显示搭配缩略图（点开当天 Sheet）；未记录→白色「记录今日穿搭」按钮（点开 RecordWear）。
- [ ] Hero 下方连续记录 + 本月进度两卡；数值随实际记录变化（可在 RecordWear 记一笔后返回刷新）。
- [ ] 日历卡上方「月/年」切换；默认月视图，格子按件数有浅/中/深着色，今天仍为高亮。
- [ ] 切「年」→ 出现全年热力图（懒加载，首次切有短暂加载）；今天格子有描边；未来日期不可点；点有记录的格子出当天 Sheet；切回「月」正常。
- [ ] 月度概览卡之后出现 1-3 条洞察（数据不足时该区块隐藏，无空白卡）。
- [ ] 翻到历史月：Hero/进度仍为「今天/本月」；洞察与概览为该历史月数据。
- [ ] `npx tsc --noEmit` 零错误。

- [ ] **Step 3: 若全部通过，标记完成**

无需提交（无代码改动）；如发现 bug，回到对应 Task 修复后单独提交。

---

## Self-Review（已完成）

**Spec 覆盖：**
- A 今日 Hero → Task 3 + Task 7 Step7 ✓
- B 连续 + 进度 → Task 4 + Task 7 Step3/7 ✓
- C 月/年切换 + 热力图 → Task 5 + Task 7 Step8；月视图着色 Task 2 ✓
- D 洞察 → Task 6 + Task 7 Step6/9 ✓
- 组件拆分（4 组件 + calendarStats + MonthCalendar prop）✓
- 数据流/懒加载/空状态 → Task 7 Step3-5 + Task 8 ✓

**类型一致性：** `cellTint(dateStr, count)` 签名在 Task1(tintForCount 内部未用 cellTint，但 Task2 定义的 prop 签名) 与 Task7 Step8 调用一致；`Insight` 接口 Task1 定义、Task6 导入、Task7 computeInsights 返回一致；`countMap: Record<string,number>` Task5 props 与 Task7 Step3 `yearCountMap` 一致。

**无占位符：** 所有步骤含完整代码/命令；YearHeatmap 布局已给出 flexwrap 方案与降级说明。
