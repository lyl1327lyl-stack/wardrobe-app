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

    // Card
    card: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 18,
      ...theme.shadows.sm,
    },
    cardHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
    },
    cardDot: {
      width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary,
    },
    cardTitle: {
      fontSize: 14, fontWeight: '600', color: theme.colors.text,
    },

    // 最近一周
    recentRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 10, paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 6, gap: 10, height: 56,
      backgroundColor: theme.colors.background,
    },
    recentDateCol: { minWidth: 72 },
    recentDateLabel: {
      fontSize: 13, fontWeight: '600', color: theme.colors.text,
    },
    recentThumbsScroll: { flex: 1 },
    recentThumb: {
      width: 36, height: 36, borderRadius: 8, marginRight: 6,
    },
    recentEmpty: {
      fontSize: 13, flex: 1, color: theme.colors.textTertiary,
    },
    recentCount: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
      backgroundColor: theme.colors.borderLight,
    },
    recentCountText: {
      fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary,
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
  const { addWearRecords, deleteWearRecord, loadData } = useWardrobeStore();

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
  const [recentWeek, setRecentWeek] = useState<{ date: string; items: ClothingItem[] }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);

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

  const loadRecentWeek = useCallback(async () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // 单次范围查询替代逐天查询（N10）
    const allRecords = await wearRecordsDb.getWearRecordsByDateRange(startDate, endDate);
    const byDate = new Map<string, ClothingItem[]>();
    for (const r of allRecords) {
      if (!byDate.has(r.wornDate)) byDate.set(r.wornDate, []);
      byDate.get(r.wornDate)!.push(recordToClothingItem(r, allClothingMap));
    }
    const result: { date: string; items: ClothingItem[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      result.push({ date: dateStr, items: byDate.get(dateStr) || [] });
    }
    setRecentWeek(result);
  }, [allClothingMap]);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadMonthData(), loadRecentWeek()]);
  }, [loadMonthData, loadRecentWeek]);

  useFocusEffect(
    useCallback(() => {
      reloadAll();
    }, [reloadAll])
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMonthData();
    loadRecentWeek();
  }, [loadMonthData, loadRecentWeek]);

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

  const handleDayPress = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowSheet(true);
  };

  const handleDeleteRecord = async (recordId: number) => {
    await deleteWearRecord(recordId);
    reloadAll();
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
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <MonthCalendar
          year={currentYear}
          month={currentMonth}
          today={today}
          wearData={wearData}
          onSelectDate={handleDayPress}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          outfitMatchMap={outfitMatchMap}
        />

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

        {/* Recent Week Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardDot} />
            <Text style={styles.cardTitle}>最近一周</Text>
          </View>
          {recentWeek.map(({ date: dateStr, items }) => (
            <TouchableOpacity
              key={dateStr}
              style={styles.recentRow}
              onPress={() => handleDayPress(dateStr)}
              activeOpacity={0.7}
            >
              <View style={styles.recentDateCol}>
                <Text style={styles.recentDateLabel}>{getDayLabel(dateStr)}</Text>
              </View>
              {items.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentThumbsScroll}>
                  {items.map(item => (
                    (item.thumbnailUri || item.imageUri) ? (
                      <Image
                        key={item.id}
                        source={{ uri: item.thumbnailUri || item.imageUri }}
                        style={styles.recentThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View key={item.id} style={[styles.recentThumb, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.borderLight }]}>
                        <Ionicons name="image-outline" size={14} color={theme.colors.textTertiary} />
                      </View>
                    )
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.recentEmpty}>无记录</Text>
              )}
              {items.length > 0 && (
                <View style={styles.recentCount}>
                  <Text style={styles.recentCountText}>{items.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 日期详情 Sheet */}
      {selectedDate && (
        <WearCalendarSheet
          visible={showSheet}
          onClose={() => setShowSheet(false)}
          date={selectedDate}
          onDeleteRecord={handleDeleteRecord}
          onAddRecord={handleAddRecord}
        />
      )}
    </View>
  );
}