import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ClothingItem, WearRecord } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { useWardrobeStore } from '../store/wardrobeStore';
import * as wearRecordsDb from '../db/wearRecords';
import { MonthCalendar, getDaysInMonth } from '../components/MonthCalendar';
import { WearCalendarSheet } from '../components/WearCalendarSheet';
import { TodayOutfitHero } from '../components/TodayOutfitHero';
import { StreakProgressCard } from '../components/StreakProgressCard';
import { YearHeatmap } from '../components/YearHeatmap';
import { CalendarInsights } from '../components/CalendarInsights';
import {
  tintForCount, computeStreak, computeMonthProgress, computeInsights, getCurrentSeason, formatDate,
} from '../utils/calendarStats';

// 穿着记录 → ClothingItem（命中实时数据用实时，否则用记录里的缩略图回退）
function recordToClothingItem(r: WearRecord, map: Map<number, ClothingItem>): ClothingItem {
  const live = map.get(r.clothingId);
  if (live) return live;
  return {
    id: r.clothingId,
    imageUri: r.clothingThumbnailUri || '',
    thumbnailUri: r.clothingThumbnailUri || '',
    originalImageUri: '',
    type: r.clothingType || '已删除',
    parentType: '',
    color: '',
    brand: '',
    size: '',
    remarks: '',
    seasons: [],
    tags: [],
    fit: '',
    thickness: '',
    purchaseDate: '',
    price: 0,
    wearCount: 0,
    lastWornAt: null,
    createdAt: '',
    wardrobeId: 0,
  };
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    // 顶栏
    header: {
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
      backgroundColor: theme.colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: theme.colors.card,
      ...theme.shadows.sm,
    },
    headerTitleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    headerTitleIcon: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17, fontWeight: '600', color: theme.colors.text, letterSpacing: 0.3,
    },
    headerRight: { width: 36 },
    todayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: theme.colors.primary + '15',
    },
    todayBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primary,
    },

    // Card
    cardDot: {
      width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary,
    },
    // 月度概览统计卡片（N3）
    statsCard: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 18,
      ...theme.shadows.sm,
    },
    statsHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
    },
    statsTitle: {
      fontSize: 14, fontWeight: '600', color: theme.colors.text,
    },
    statsRow: {
      flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14,
    },
    statsItem: {
      alignItems: 'center', flex: 1,
    },
    statsValue: {
      fontSize: 22, fontWeight: '700', color: theme.colors.text,
    },
    statsDesc: {
      fontSize: 11, color: theme.colors.textTertiary, marginTop: 2,
    },
    statsDivider: {
      width: 1, height: 32, backgroundColor: theme.colors.border, alignSelf: 'center',
    },
    statsTopLabel: {
      fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8,
    },
    topItemRow: {
      flexDirection: 'row', gap: 10,
    },
    topItem: {
      flex: 1, alignItems: 'center',
    },
    topItemThumb: {
      width: 48, height: 48, borderRadius: 8, backgroundColor: theme.colors.borderLight,
    },
    topItemName: {
      fontSize: 11, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center',
    },
    topItemCount: {
      fontSize: 10, color: theme.colors.textTertiary, marginTop: 1,
    },
    statsEmpty: {
      fontSize: 12, color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: 8,
    },
  });

export function WearCalendarScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const clothing = useWardrobeStore(s => s.clothing);
  const trashClothing = useWardrobeStore(s => s.trashClothing);
  const soldClothing = useWardrobeStore(s => s.soldClothing);
  const outfits = useWardrobeStore(s => s.outfits);
  const { loadData } = useWardrobeStore();

  // 合并所有衣物来源（衣柜 + 废衣篓 + 已卖出），用于日历中查找穿着记录
  const allClothingMap = useMemo(() => {
    const map = new Map<number, ClothingItem>();
    for (const c of clothing) map.set(c.id, c);
    for (const c of trashClothing) map.set(c.id, c);
    for (const c of soldClothing) map.set(c.id, c);
    return map;
  }, [clothing, trashClothing, soldClothing]);

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [wearData, setWearData] = useState<Record<string, ClothingItem[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [todayItems, setTodayItems] = useState<ClothingItem[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [monthProgress, setMonthProgress] = useState({ recorded: 0, total: 0 });
  const [yearCountMap, setYearCountMap] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // 为每天找到匹配的搭配（搭配所有衣物都在当天记录中）
  const outfitMatchMap = useMemo(() => {
    const map: Record<string, { outfitId: number; outfitName: string; outfitThumb: string; extraItemIds: number[] }> = {};
    for (const [dateStr, items] of Object.entries(wearData)) {
      const itemIds = new Set(items.map(i => i.id));
      for (const outfit of outfits) {
        if (outfit.itemIds.length === 0) continue;
        if (outfit.itemIds.every(cid => itemIds.has(cid))) {
          const extraItemIds = items.filter(i => !outfit.itemIds.includes(i.id)).map(i => i.id);
          map[dateStr] = {
            outfitId: outfit.id,
            outfitName: outfit.name,
            outfitThumb: outfit.thumbnailUri || '',
            extraItemIds,
          };
          break; // 每日期只取第一个匹配的搭配
        }
      }
    }
    return map;
  }, [wearData, outfits]);

  // 月度概览统计（N3）
  const monthStats = useMemo(() => {
    const daysWithRecords = Object.entries(wearData).filter(([_, items]) => items.length > 0);
    const wearingDays = daysWithRecords.length;
    const allIds = daysWithRecords.flatMap(([_, items]) => items.map(i => i.id));
    const uniqueItems = new Set(allIds).size;
    const freq = new Map<number, number>();
    allIds.forEach(id => freq.set(id, (freq.get(id) || 0) + 1));
    let maxFreq = 0;
    freq.forEach(v => { if (v > maxFreq) maxFreq = v; });
    const topItems = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ item: allClothingMap.get(id), count }))
      .filter(e => e.item);
    return { wearingDays, uniqueItems, maxFreq, topItems };
  }, [wearData, allClothingMap]);

  // 月度智能洞察（跟随当前查看月）
  const insights = useMemo(() => {
    return computeInsights({
      wearData,
      allClothingMap,
      currentSeason: getCurrentSeason(),
    });
  }, [wearData, allClothingMap]);

  const loadMonthData = useCallback(async () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    // 单次范围查询替代逐天查询（N10）
    const allRecords = await wearRecordsDb.getWearRecordsByDateRange(startDate, endDate);
    const newData: Record<string, ClothingItem[]> = {};
    for (const r of allRecords) {
      if (!newData[r.wornDate]) newData[r.wornDate] = [];
      newData[r.wornDate].push(recordToClothingItem(r, allClothingMap));
    }
    setWearData(newData);
  }, [currentYear, currentMonth, allClothingMap]);

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

  const reloadAll = useCallback(async () => {
    await Promise.all([loadMonthData(), loadTodayAndStreak()]);
  }, [loadMonthData, loadTodayAndStreak]);

  useFocusEffect(
    useCallback(() => {
      reloadAll();
    }, [reloadAll])
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (viewMode === 'year' && Object.keys(yearCountMap).length === 0) {
      loadYearCountMap(currentYear);
    }
  }, [viewMode, currentYear, yearCountMap, loadYearCountMap]);

  // 月份切换时只重载当月数据；最近一周/今日连续在 useFocusEffect(reloadAll) 中刷新
  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isViewingOtherMonth = (() => {
    const d = new Date();
    return currentYear !== d.getFullYear() || currentMonth !== d.getMonth() + 1;
  })();

  const goToToday = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth() + 1);
  };

  const handleDayPress = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowSheet(true);
  };

  const handleAddRecord = () => {
    if (selectedDate) {
      setShowSheet(false);
      navigation.navigate('RecordWear' as any, { date: selectedDate });
    }
  };

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === todayStr) return '今天';
    if (dateStr === yesterdayStr) return '昨天';
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}/${d.getDate()} ${weekDays[d.getDay()]}`;
  };

  return (
    <View style={styles.container}>
      {/* 顶栏 */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTitleIcon}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.headerTitle}>穿着记录</Text>
          </View>
          {isViewingOtherMonth ? (
            <TouchableOpacity style={styles.todayBtn} onPress={goToToday} activeOpacity={0.7}>
              <Ionicons name="today-outline" size={13} color={theme.colors.primary} />
              <Text style={styles.todayBtnText}>今天</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRight} />
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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
            legendItems={[
              { label: '少穿', color: theme.colors.primary + '22' },
              { label: '多穿', color: theme.colors.primary + '66' },
              { label: '今天', icon: 'star', iconColor: theme.colors.primary },
            ]}
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

        {/* 月度概览统计卡片（N3） */}
        {monthStats.wearingDays > 0 && (
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <View style={styles.cardDot} />
              <Text style={styles.statsTitle}>{currentMonth}月概览</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{monthStats.wearingDays}</Text>
                <Text style={styles.statsDesc}>穿着天数</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{monthStats.uniqueItems}</Text>
                <Text style={styles.statsDesc}>穿着件数</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{monthStats.maxFreq}</Text>
                <Text style={styles.statsDesc}>最高频次</Text>
              </View>
            </View>
            {monthStats.topItems.length > 0 && (
              <>
                <Text style={styles.statsTopLabel}>最常穿 Top {monthStats.topItems.length}</Text>
                <View style={styles.topItemRow}>
                  {monthStats.topItems.map(({ item, count }) => (
                    <View key={item!.id} style={styles.topItem}>
                      {(item!.thumbnailUri || item!.imageUri) ? (
                        <Image
                          source={{ uri: item!.thumbnailUri || item!.imageUri }}
                          style={styles.topItemThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.topItemThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="shirt-outline" size={18} color={theme.colors.textTertiary} />
                        </View>
                      )}
                      <Text style={styles.topItemName} numberOfLines={1}>{item!.type || item!.remarks || '--'}</Text>
                      <Text style={styles.topItemCount}>{count} 次</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <CalendarInsights insights={insights} />
      </ScrollView>

      {/* 日期详情 Sheet */}
      {selectedDate && (
        <WearCalendarSheet
          visible={showSheet}
          onClose={() => setShowSheet(false)}
          date={selectedDate}
          onAddRecord={handleAddRecord}
        />
      )}
    </View>
  );
}