# 记录穿搭全屏页面 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将「记录穿搭」从底部弹窗升级为独立全屏页面，支持选单品/选搭配双模式、日期切换、搜索筛选。

**Architecture:** 新建 RecordWearScreen 全屏页面，从 WearCalendarScreen 抽取 MonthCalendar 组件供双方复用，ClothingPickerModal 保留不动（其他场景可能仍用弹窗）。

**Tech Stack:** React Native + TypeScript + expo-router/react-navigation + expo-vector-icons

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `src/components/MonthCalendar.tsx` | 月历卡片组件（从 WearCalendarScreen 抽取） |
| 新建 | `src/screens/RecordWearScreen.tsx` | 记录穿搭全屏页面 |
| 修改 | `src/screens/WearCalendarScreen.tsx` | 改用 MonthCalendar，删除重复代码 |
| 修改 | `App.tsx` | 注册 RecordWear 路由 |
| 修改 | `src/screens/HomeScreen.tsx` | 「记录穿搭」按钮跳转目标改为 RecordWear |

---

### Task 1: 抽取 MonthCalendar 组件

**Files:**
- Create: `src/components/MonthCalendar.tsx`
- Modify: `src/screens/WearCalendarScreen.tsx`

- [ ] **Step 1: 创建 MonthCalendar.tsx**

从 `WearCalendarScreen.tsx` 提取月历渲染逻辑为独立组件。抽走：常量（CELL_SIZE 等）、日历样式、`renderCalendarDays` 逻辑、图例、月份导航。

新文件 `src/components/MonthCalendar.tsx`：

```tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClothingItem } from '../types';
import { Theme } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 18;
const CELL_MARGIN = 4;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 40 - CARD_PADDING * 2 - CELL_MARGIN * 6) / 7);

export interface MonthCalendarProps {
  year: number;
  month: number;
  today: string;
  wearData: Record<string, ClothingItem[]>;
  onSelectDate: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  theme: Theme;
  /** 搭配匹配信息：dateStr → { outfitId, outfitName, outfitThumb } */
  outfitMatchMap?: Record<string, { outfitId: number; outfitName: string; outfitThumb: string }>;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: CARD_PADDING,
      ...theme.shadows.sm,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    monthBtn: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    monthText: {
      fontSize: 16, fontWeight: '600', color: theme.colors.text,
    },
    weekDaysRow: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      paddingVertical: 8,
      marginBottom: 6,
    },
    weekDay: {
      width: CELL_SIZE,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.textTertiary,
      marginRight: CELL_MARGIN,
    },
    weekDayLast: { marginRight: 0 },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: CELL_SIZE,
      height: CELL_SIZE + 14,
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      padding: 4,
    },
    dayCellToday: {
      backgroundColor: theme.colors.primary + '25',
    },
    dayCellEmpty: {
      backgroundColor: 'transparent',
    },
    dayCellHasRecords: {
      backgroundColor: theme.colors.primary + '10',
    },
    dayCellPlanned: {
      backgroundColor: theme.colors.accent + '20',
    },
    dayNumber: {
      fontSize: 10, fontWeight: '600', color: theme.colors.text,
    },
    dayNumberRow: {
      flexDirection: 'row', alignItems: 'center', marginBottom: 1, position: 'relative',
    },
    dayNumberToday: {
      color: theme.colors.primary, fontWeight: '700',
    },
    todayMarker: {
      position: 'absolute', top: 1, right: 1,
    },
    dayNumberEmpty: {
      color: theme.colors.textTertiary,
    },
    thumbnailsGrid: {
      flexDirection: 'column', gap: 2,
    },
    thumbnailRow: {
      flexDirection: 'row', gap: 2,
    },
    thumbnailWrap: {
      width: Math.floor((CELL_SIZE - 10) / 2),
      height: Math.floor((CELL_SIZE - 10) / 2),
      borderRadius: 3, overflow: 'hidden',
    },
    thumbnail: {
      width: '100%', height: '100%',
    },
    overflowBadge: {
      position: 'absolute', top: 2, right: 2,
      backgroundColor: theme.colors.primary,
      borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2,
      minWidth: 18, alignItems: 'center',
    },
    overflowText: {
      fontSize: 9, color: theme.colors.white, fontWeight: '700',
    },
    cellOutfitThumb: {
      flex: 1,
      borderRadius: 6,
      backgroundColor: 'transparent',
    },
    dayNumberOverlayText: {
      fontSize: 10, fontWeight: '600', color: theme.colors.text,
    },
    legend: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      marginTop: 14, paddingTop: 14, gap: 20,
      borderTopWidth: 1, borderTopColor: theme.colors.border,
    },
    legendItem: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    legendDot: {
      width: 8, height: 8, borderRadius: 4,
    },
    legendText: {
      fontSize: 12, color: theme.colors.textTertiary,
    },
  });

export function MonthCalendar({
  year,
  month,
  today,
  wearData,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  theme,
  outfitMatchMap,
}: MonthCalendarProps) {
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells: React.ReactNode[] = [];

  for (let i = 0; i < firstDay; i++) {
    const weekIndex = i % 7;
    const isSunday = weekIndex === 6;
    cells.push(
      <View
        key={`empty-${i}`}
        style={[
          styles.dayCell,
          styles.dayCellEmpty,
          !isSunday && { marginRight: CELL_MARGIN },
          { marginBottom: CELL_MARGIN },
        ]}
      />
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayRecords = wearData[dateStr] || [];
    const isToday = dateStr === today;
    const hasRecords = dayRecords.length > 0;
    const isFuture = dateStr > today;
    const weekIndex = (firstDay + day - 1) % 7;
    const isSunday = weekIndex === 6;
    const match = outfitMatchMap?.[dateStr];
    const showOutfitThumb = match && match.outfitThumb;

    cells.push(
      <TouchableOpacity
        key={dateStr}
        style={[
          styles.dayCell,
          isToday && styles.dayCellToday,
          hasRecords && !isToday && (isFuture ? styles.dayCellPlanned : styles.dayCellHasRecords),
          !isSunday && { marginRight: CELL_MARGIN },
          { marginBottom: CELL_MARGIN },
          showOutfitThumb && { overflow: 'hidden' },
        ]}
        onPress={() => onSelectDate(dateStr)}
        activeOpacity={0.7}
      >
        {showOutfitThumb ? (
          <>
            <View style={styles.dayNumberRow}>
              <Text style={styles.dayNumberOverlayText}>{day}</Text>
              {isToday && (
                <Ionicons name="star" size={11} color={theme.colors.primary} style={{ marginLeft: 2 }} />
              )}
            </View>
            <Image source={{ uri: match.outfitThumb }} style={styles.cellOutfitThumb} resizeMode="cover" />
          </>
        ) : (
          <>
            <View style={styles.dayNumberRow}>
              <Text
                style={[
                  styles.dayNumber,
                  isToday && styles.dayNumberToday,
                  hasRecords && !isToday && styles.dayNumberEmpty,
                ]}
              >
                {day}
              </Text>
              {isToday && (
                <Ionicons name="star" size={12} color={theme.colors.primary} style={styles.todayMarker} />
              )}
            </View>
            {hasRecords && (
              <View style={styles.thumbnailsGrid}>
                <View style={styles.thumbnailRow}>
                  {dayRecords.slice(0, 2).map((item) => (
                    <View key={item.id} style={styles.thumbnailWrap}>
                      {(item.thumbnailUri || item.imageUri) ? (
                        <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.thumbnail} resizeMode="cover" />
                      ) : (
                        <View style={[styles.thumbnail, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.borderLight }]}>
                          <Ionicons name="image-outline" size={8} color={theme.colors.textTertiary} />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
                <View style={styles.thumbnailRow}>
                  {dayRecords.slice(2, 4).map((item) => (
                    <View key={item.id} style={styles.thumbnailWrap}>
                      {(item.thumbnailUri || item.imageUri) ? (
                        <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.thumbnail} resizeMode="cover" />
                      ) : (
                        <View style={[styles.thumbnail, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.borderLight }]}>
                          <Ionicons name="image-outline" size={8} color={theme.colors.textTertiary} />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
                {dayRecords.length > 4 && (
                  <View style={styles.overflowBadge}>
                    <Text style={styles.overflowText}>+{dayRecords.length - 4}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.monthBtn} onPress={onPrevMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{year}年{month}月</Text>
        <TouchableOpacity style={styles.monthBtn} onPress={onNextMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekDaysRow}>
        {weekDays.map((day, idx) => (
          <Text key={day} style={[styles.weekDay, idx === 6 && styles.weekDayLast]}>{day}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {cells}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.primary + '40' }]} />
          <Text style={styles.legendText}>已穿着</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.accent + '50' }]} />
          <Text style={styles.legendText}>计划穿着</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="star" size={12} color={theme.colors.primary} />
          <Text style={styles.legendText}>今天</Text>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: 修改 WearCalendarScreen.tsx 使用 MonthCalendar**

在 `WearCalendarScreen.tsx` 中：
1. 添加 `import { MonthCalendar } from '../components/MonthCalendar';`
2. 删除本地常量：`CARD_HORIZONTAL`, `CARD_PADDING`, `CARD_GAP`, `CELL_MARGIN`, `CARD_INNER`, `CELL_SIZE`
3. 删除 `renderCalendarDays` 函数
4. 删除所有日历样式（从 `card` 到 `legendText`，保留 `recentRow` 之后的样式）
5. 将 JSX 中的日历 Card 替换为：

```tsx
<MonthCalendar
  year={currentYear}
  month={currentMonth}
  today={today}
  wearData={wearData}
  onSelectDate={handleDayPress}
  onPrevMonth={goToPrevMonth}
  onNextMonth={goToNextMonth}
  theme={theme}
  outfitMatchMap={outfitMatchMap}
/>
```

6. 删除不再需要的 imports：`Image`, `Dimensions`, `ClothingItem`（如果不再直接使用）

- [ ] **Step 3: TypeScript 编译验证**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: 提交**

```bash
git add src/components/MonthCalendar.tsx src/screens/WearCalendarScreen.tsx
git commit -m "refactor: 抽取 MonthCalendar 组件，WearCalendarScreen 复用"
```

---

### Task 2: 创建 RecordWearScreen

**Files:**
- Create: `src/screens/RecordWearScreen.tsx`

- [ ] **Step 1: 创建 RecordWearScreen.tsx**

新建 `src/screens/RecordWearScreen.tsx`：

```tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { ClothingItem, Season, CategoryFilter, Outfit, WearRecord } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { MonthCalendar } from '../components/MonthCalendar';
import * as wearRecordsDb from '../db/wearRecords';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 6;
const CELL_W = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;
const CELL_H = CELL_W * 1.25;

const SEASONS: ('全部' | Season)[] = ['全部', '春', '夏', '秋', '冬'];
const SEASON_EMOJI: Record<Season, string> = { '春': '🌸', '夏': '☀️', '秋': '🍂', '冬': '❄️' };

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    // 顶栏
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
      backgroundColor: theme.colors.background,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: theme.colors.card,
      ...theme.shadows.sm,
    },
    headerTitle: {
      fontSize: 17, fontWeight: '600', color: theme.colors.text,
    },
    dateBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: theme.colors.primary + '15',
      borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5,
    },
    dateBtnText: {
      fontSize: 12, fontWeight: '500', color: theme.colors.primary,
    },

    // 模式切换
    modeRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: theme.colors.borderLight,
      borderRadius: 12,
      padding: 3,
    },
    modeTab: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeTabActive: {
      backgroundColor: theme.colors.card,
      ...theme.shadows.sm,
    },
    modeTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textTertiary,
    },
    modeTabTextActive: {
      color: theme.colors.text,
    },

    // 搜索
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.borderLight,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      padding: 0,
    },

    // 分类标签
    tabSection: {
      paddingHorizontal: 16,
      marginBottom: 4,
    },
    tabRow: {
      flexDirection: 'row',
      gap: 6,
      paddingBottom: 6,
    },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      backgroundColor: theme.colors.borderLight,
      borderRadius: 14,
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.white,
    },

    // 网格
    gridHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    gridCount: {
      fontSize: 11,
      color: theme.colors.textTertiary,
    },
    gridSelected: {
      fontSize: 11,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    gridRow: {
      flexDirection: 'row',
      gap: GRID_GAP,
      paddingHorizontal: GRID_PADDING,
    },
    itemCard: {
      width: CELL_W,
      height: CELL_H,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderLight,
      marginBottom: GRID_GAP,
    },
    itemCardActive: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    itemImage: {
      width: '100%',
      height: '100%',
    },
    checkmark: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // 搭配卡片
    outfitGrid: {
      paddingHorizontal: 16,
    },
    outfitCard: {
      width: (SCREEN_WIDTH - 32 - 8) / 2,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    outfitCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '08',
    },
    outfitThumbs: {
      flexDirection: 'row',
      gap: 3,
      marginBottom: 8,
    },
    outfitThumb: {
      width: (SCREEN_WIDTH - 32 - 8) / 2 / 4 - 3,
      aspectRatio: 0.75,
      borderRadius: 4,
      backgroundColor: theme.colors.borderLight,
    },
    outfitName: {
      fontSize: 12, fontWeight: '600', color: theme.colors.text, marginBottom: 2,
    },
    outfitMeta: {
      fontSize: 10, color: theme.colors.textTertiary,
    },
    emptyList: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyText: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginTop: 8,
    },

    // 底栏
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    selectedThumbs: {
      flex: 1,
      flexDirection: 'row',
      gap: 4,
    },
    selectedThumb: {
      width: 38,
      height: 38,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
    },
    footerCount: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginRight: 8,
    },
    clearBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.borderLight,
      marginRight: 8,
    },
    clearBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    confirmBtn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
    },
    confirmBtnDisabled: {
      backgroundColor: theme.colors.borderLight,
    },
    confirmBtnText: {
      color: theme.colors.white,
      fontSize: 14,
      fontWeight: '700',
    },

    // 日期弹窗
    dateModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    dateModalCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: 16,
      ...theme.shadows.lg,
    },
    dateModalClose: {
      alignSelf: 'flex-end',
      padding: 4,
    },
  });

export function RecordWearScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const clothing = useWardrobeStore(s => s.clothing);
  const outfits = useWardrobeStore(s => s.outfits);
  const addWearRecords = useWardrobeStore(s => s.addWearRecords);
  const deleteWearRecordsByDate = useWardrobeStore(s => s.deleteWearRecordsByDate);
  const categories = useCustomOptionsStore(s => s.categories);
  const getParents = useCustomOptionsStore(s => s.getParents);
  const getChildrenOf = useCustomOptionsStore(s => s.getChildrenOf);

  const [mode, setMode] = useState<'items' | 'outfit'>('items');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayDateStr());
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>({});
  const [selectedSeason, setSelectedSeason] = useState<'全部' | Season>('全部');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateWearData, setDateWearData] = useState<Record<string, ClothingItem[]>>({});

  // 日期选择器状态
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const today = todayDateStr();

  // 加载月份穿着数据
  const loadMonthData = useCallback(async () => {
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const newData: Record<string, ClothingItem[]> = {};
    const allClothingMap = new Map<number, ClothingItem>();
    for (const c of clothing) allClothingMap.set(c.id, c);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const records = await wearRecordsDb.getWearRecordsByDate(dateStr);
      const items = records
        .map(r => allClothingMap.get(r.clothingId))
        .filter((c): c is ClothingItem => c !== undefined);
      if (items.length > 0) {
        newData[dateStr] = items;
      }
    }
    setDateWearData(newData);
  }, [calYear, calMonth, clothing]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  // 当打开日期选择器或切换月份时重新加载
  useEffect(() => {
    if (showDatePicker) {
      loadMonthData();
    }
  }, [showDatePicker, calYear, calMonth]);

  // 当日期改变，加载该日已有记录并预选
  useEffect(() => {
    (async () => {
      const records = await wearRecordsDb.getWearRecordsByDate(selectedDate);
      const ids = records.map(r => r.clothingId);
      setSelectedIds(ids);
    })();
  }, [selectedDate]);

  // 单品过滤
  const filteredClothing = useMemo(() => {
    return clothing.filter(item => {
      if (item.deletedAt) return false;
      if (selectedCategory.child) {
        if (item.type !== selectedCategory.child) return false;
      } else if (selectedCategory.parent) {
        const children = getChildrenOf(selectedCategory.parent);
        if (!children.includes(item.type)) return false;
      }
      if (selectedSeason !== '全部' && !item.seasons.includes(selectedSeason as Season)) return false;
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const match =
          item.brand.toLowerCase().includes(kw) ||
          item.color.toLowerCase().includes(kw) ||
          item.remarks.toLowerCase().includes(kw) ||
          item.tags.some(t => t.toLowerCase().includes(kw));
        if (!match) return false;
      }
      return true;
    });
  }, [clothing, selectedCategory, selectedSeason, searchKeyword, getChildrenOf]);

  // 搭配过滤（名字匹配搜索）
  const filteredOutfits = useMemo(() => {
    if (!searchKeyword) return outfits;
    const kw = searchKeyword.toLowerCase();
    return outfits.filter(o => o.name.toLowerCase().includes(kw));
  }, [outfits, searchKeyword]);

  const selectedItems = useMemo(() => {
    return clothing.filter(c => selectedIds.includes(c.id));
  }, [clothing, selectedIds]);

  const toggleItem = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectOutfit = (outfit: Outfit) => {
    setSelectedIds([...outfit.itemIds]);
  };

  const handleModeChange = (newMode: 'items' | 'outfit') => {
    if (newMode === mode) return;
    if (newMode === 'outfit' && selectedIds.length > 0) {
      // 从单品切到搭配，清空已选（搭配是成套选的）
      setSelectedIds([]);
    }
    // 从搭配切回单品，保留搭配选中的单品 IDs（可继续增减）
    setMode(newMode);
  };

  const handleConfirm = async () => {
    if (selectedIds.length < 2) {
      Alert.alert('提示', '请至少选择 2 件单品');
      return;
    }
    await deleteWearRecordsByDate(selectedDate);
    await addWearRecords(selectedIds, selectedDate);
    navigation.goBack();
  };

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowDatePicker(false);
  };

  const renderItemCard = (item: ClothingItem) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.itemCard, isSelected && styles.itemCardActive]}
        onPress={() => toggleItem(item.id)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.thumbnailUri }} style={styles.itemImage} />
        {isSelected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={12} color={theme.colors.white} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderOutfitCard = (outfit: Outfit) => {
    const isActive = outfit.itemIds.length === selectedIds.length &&
      outfit.itemIds.every(id => selectedIds.includes(id));
    const outfitItems = outfit.itemIds
      .map(id => clothing.find(c => c.id === id))
      .filter(Boolean)
      .slice(0, 4);
    const catSet = new Set(outfitItems.map(i => i!.parentType || i!.type));
    return (
      <TouchableOpacity
        style={[styles.outfitCard, isActive && styles.outfitCardActive]}
        onPress={() => handleSelectOutfit(outfit)}
        activeOpacity={0.7}
      >
        <View style={styles.outfitThumbs}>
          {outfitItems.map(item => (
            <Image
              key={item!.id}
              source={{ uri: item!.thumbnailUri }}
              style={styles.outfitThumb}
              resizeMode="cover"
            />
          ))}
        </View>
        <Text style={styles.outfitName} numberOfLines={1}>{outfit.name}</Text>
        <Text style={styles.outfitMeta}>{outfit.itemIds.length}件 · {[...catSet].join('+')}</Text>
      </TouchableOpacity>
    );
  };

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === today) return '今天';
    const d = new Date(dateStr);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}/${d.getDate()} ${weekDays[d.getDay()]}`;
  };

  return (
    <View style={styles.container}>
      {/* 顶栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>记录穿搭</Text>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => {
            // 打开日期选择器时重置到所选日期所在月份
            const d = new Date(selectedDate);
            setCalYear(d.getFullYear());
            setCalMonth(d.getMonth() + 1);
            setShowDatePicker(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.dateBtnText}>{formatDateLabel(selectedDate)}</Text>
          <Ionicons name="chevron-down" size={12} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 模式切换 */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'items' && styles.modeTabActive]}
          onPress={() => handleModeChange('items')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeTabText, mode === 'items' && styles.modeTabTextActive]}>👔 选单品</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'outfit' && styles.modeTabActive]}
          onPress={() => handleModeChange('outfit')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeTabText, mode === 'outfit' && styles.modeTabTextActive]}>📦 选搭配</Text>
        </TouchableOpacity>
      </View>

      {/* 搜索 */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={theme.colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            placeholder="搜索品牌/颜色/标签..."
            placeholderTextColor={theme.colors.textTertiary}
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity onPress={() => setSearchKeyword('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 分类 + 季节筛选（仅选单品模式） */}
      {mode === 'items' && (
        <>
          <View style={styles.tabSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, !selectedCategory.parent && !selectedCategory.child && styles.tabActive]}
                onPress={() => setSelectedCategory({})}
              >
                <Text style={[styles.tabText, !selectedCategory.parent && !selectedCategory.child && styles.tabTextActive]}>
                  全部
                </Text>
              </TouchableOpacity>
              {getParents().map(parent => {
                const isActive = selectedCategory.parent === parent && !selectedCategory.child;
                return (
                  <TouchableOpacity
                    key={parent}
                    style={[styles.tab, isActive && styles.tabActive]}
                    onPress={() => setSelectedCategory({ parent })}
                  >
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{parent}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {selectedCategory.parent && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabRow, { marginTop: 0 }]}>
                {getChildrenOf(selectedCategory.parent).map(child => {
                  const isActive = selectedCategory.child === child;
                  return (
                    <TouchableOpacity
                      key={child}
                      style={[styles.tab, isActive && styles.tabActive]}
                      onPress={() => setSelectedCategory({ parent: selectedCategory.parent, child })}
                    >
                      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{child}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.tabSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {SEASONS.map(season => (
                <TouchableOpacity
                  key={season}
                  style={[styles.tab, selectedSeason === season && styles.tabActive]}
                  onPress={() => setSelectedSeason(season)}
                >
                  <Text style={[styles.tabText, selectedSeason === season && styles.tabTextActive]}>
                    {season === '全部' ? season : `${SEASON_EMOJI[season as Season]} ${season}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}

      {/* 内容区 */}
      <View style={styles.gridHeader}>
        <Text style={styles.gridCount}>
          {mode === 'items' ? `共 ${filteredClothing.length} 件` : `共 ${filteredOutfits.length} 套搭配`}
        </Text>
        <Text style={styles.gridSelected}>已选 {selectedIds.length} 件</Text>
      </View>

      {mode === 'items' ? (
        <FlatList
          data={filteredClothing}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => renderItemCard(item)}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="shirt-outline" size={40} color={theme.colors.border} />
              <Text style={styles.emptyText}>没有符合条件的单品</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredOutfits}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => renderOutfitCard(item)}
          numColumns={2}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="grid-outline" size={40} color={theme.colors.border} />
              <Text style={styles.emptyText}>{searchKeyword ? '没有匹配的搭配' : '暂无搭配，去「搭配」tab 创建吧'}</Text>
            </View>
          }
        />
      )}

      {/* 底栏 */}
      {selectedIds.length > 0 && (
        <View style={styles.footer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedThumbs}>
            {selectedItems.map(item => (
              <Image
                key={item.id}
                source={{ uri: item.thumbnailUri }}
                style={styles.selectedThumb}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          <Text style={styles.footerCount}>{selectedIds.length} 件</Text>
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedIds([])} activeOpacity={0.7}>
            <Text style={styles.clearBtnText}>清空</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, selectedIds.length < 2 && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={selectedIds.length < 2}
            activeOpacity={0.7}
          >
            <Text style={styles.confirmBtnText}>
              {mode === 'outfit' ? '记录这套搭配' : `记录 (${selectedIds.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 日期选择器弹窗 */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity
          style={styles.dateModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.dateModalCard}>
            <TouchableOpacity
              style={styles.dateModalClose}
              onPress={() => setShowDatePicker(false)}
            >
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <MonthCalendar
              year={calYear}
              month={calMonth}
              today={today}
              wearData={dateWearData}
              onSelectDate={handleDateSelect}
              onPrevMonth={() => {
                if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
                else { setCalMonth(calMonth - 1); }
              }}
              onNextMonth={() => {
                if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
                else { setCalMonth(calMonth + 1); }
              }}
              theme={theme}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
```

- [ ] **Step 2: TypeScript 编译验证**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: 提交**

```bash
git add src/screens/RecordWearScreen.tsx
git commit -m "feat: 新建 RecordWearScreen 记录穿搭全屏页面"
```

---

### Task 3: 注册路由并更新入口

**Files:**
- Modify: `App.tsx`
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: App.tsx 注册 RecordWear 路由**

在 `App.tsx` 中：
1. 添加 import：`import { RecordWearScreen } from './src/screens/RecordWearScreen';`
2. 在 RootStack.Navigator 内添加（位置在 WearCalendar 旁边）：

```tsx
<RootStack.Screen
  name="RecordWear"
  component={RecordWearScreen}
  options={{
    headerShown: false,
    presentation: 'card',
  }}
/>
```

- [ ] **Step 2: HomeScreen.tsx 修改快捷入口跳转目标**

在 `HomeScreen.tsx` 中修改「记录穿搭」按钮：

将:
```tsx
<TouchableOpacity style={styles.quickAction} onPress={() => setShowWearPicker(true)} activeOpacity={0.7}>
```

改为:
```tsx
<TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('RecordWear')} activeOpacity={0.7}>
```

移除不再需要的状态和导入：
- 删除 `const [showWearPicker, setShowWearPicker] = useState(false);`
- 删除 `import { ClothingPickerModal } from '../components/ClothingPickerModal';`
- 删除 `handleManualWear` callback
- 删除末尾的 `<ClothingPickerModal ... />` JSX

- [ ] **Step 3: TypeScript 编译验证**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: 提交**

```bash
git add App.tsx src/screens/HomeScreen.tsx
git commit -m "feat: 注册 RecordWear 路由，首页快捷入口接入"
```

---

### Task 4: 集成验证

- [ ] **Step 1: 验证完整功能链**

1. 确认 HomeScreen「记录穿搭」按钮能正确跳转 RecordWearScreen
2. 确认 RecordWearScreen 默认日期为今天
3. 确认选单品模式：分类/季节筛选 + 搜索 + 多选 + 底栏缩略图
4. 确认选搭配模式：搭配卡片 + 单选 + 自动填入单品 IDs
5. 确认日期弹窗：点击日期 → MonthCalendar → 选日期 → 回填该日已有记录
6. 确认确认记录：写入 DB，返回首页刷新

- [ ] **Step 2: 提交（如有修改）**

```bash
git add -A
git commit -m "chore: 集成验证通过"
```
