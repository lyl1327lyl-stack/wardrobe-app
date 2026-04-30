import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ClothingItem } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { useWardrobeStore } from '../store/wardrobeStore';
import * as wearRecordsDb from '../db/wearRecords';
import { WearCalendarSheet } from '../components/WearCalendarSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HORIZONTAL = 20;
const CARD_PADDING = 18;
const CARD_GAP = 4;
const CELL_MARGIN = 4;
// 7列：卡片内可用宽度 = 屏幕 - 卡片margin*2 - 卡片padding*2 - 6个间距
const CARD_INNER = SCREEN_WIDTH - CARD_HORIZONTAL * 2 - CARD_PADDING * 2;
const CELL_SIZE = Math.floor((CARD_INNER - CELL_MARGIN * 6) / 7);

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
      marginHorizontal: CARD_HORIZONTAL,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: CARD_PADDING,
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

    // 月份导航
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
    // 星期标题
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
    // 日历网格
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
    // 缩略图
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
    // 搭配缩略图（占满日期数字下方）
    cellOutfitThumb: {
      flex: 1,
      borderRadius: 6,
    },
    dayNumberOverlayText: {
      fontSize: 10, fontWeight: '600', color: theme.colors.text,
    },
    // 图例
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
      backgroundColor: theme.colors.borderLight,
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
  });

export function WearCalendarScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { clothing, outfits, addWearRecords, deleteWearRecord } = useWardrobeStore();

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

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  // 返回0-6，0=周一，6=周日
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month - 1, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const loadMonthData = useCallback(async () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const newData: Record<string, ClothingItem[]> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const records = await wearRecordsDb.getWearRecordsByDate(dateStr);
      const items = records
        .map(r => clothing.find(c => c.id === r.clothingId))
        .filter((c): c is ClothingItem => c !== undefined);
      if (items.length > 0) {
        newData[dateStr] = items;
      }
    }

    setWearData(newData);
  }, [currentYear, currentMonth, clothing]);

  const loadRecentWeek = useCallback(async () => {
    const result: { date: string; items: ClothingItem[] }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const records = await wearRecordsDb.getWearRecordsByDate(dateStr);
      const items = records
        .map(r => clothing.find(c => c.id === r.clothingId))
        .filter((c): c is ClothingItem => c !== undefined);
      result.push({ date: dateStr, items });
    }
    setRecentWeek(result);
  }, [clothing]);

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
    loadMonthData();
  };

  const handleAddRecord = () => {
    loadMonthData();
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const cells: React.ReactNode[] = [];

    // firstDay: 0=周一, 6=周日，需要在第一天前放 firstDay 个空格子
    for (let i = 0; i < firstDay; i++) {
      const weekIndex = i % 7;
      const isSunday = weekIndex === 6;
      cells.push(<View key={`empty-${i}`} style={[styles.dayCell, styles.dayCellEmpty, !isSunday && { marginRight: CELL_MARGIN }, { marginBottom: CELL_MARGIN }]} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRecords = wearData[dateStr] || [];
      const isToday = dateStr === today;
      const hasRecords = dayRecords.length > 0;
      // 判断是否未来日期
      const isFuture = dateStr > today;
      // 周日 (每行第7格，index 6) 不需要右边距
      const weekIndex = (firstDay + day - 1) % 7;
      const isSunday = weekIndex === 6;
      const match = outfitMatchMap[dateStr];
      const showOutfitThumb = match && match.outfitThumb;

      cells.push(
        <TouchableOpacity
          key={dateStr}
          style={[
            styles.dayCell,
            isToday && !showOutfitThumb && styles.dayCellToday,
            hasRecords && !isToday && !showOutfitThumb && (isFuture ? styles.dayCellPlanned : styles.dayCellHasRecords),
            !isSunday && { marginRight: CELL_MARGIN },
            { marginBottom: CELL_MARGIN },
            showOutfitThumb && { overflow: 'hidden' },
          ]}
          onPress={() => handleDayPress(dateStr)}
          activeOpacity={0.7}
        >
          {showOutfitThumb ? (
            <>
              <View style={styles.dayNumberRow}>
                <Text style={styles.dayNumberOverlayText}>{day}</Text>
                {isToday && <Ionicons name="star" size={11} color={theme.colors.primary} style={{ marginLeft: 2 }} />}
              </View>
              <Image source={{ uri: match.outfitThumb }} style={styles.cellOutfitThumb} resizeMode="cover" />
            </>
          ) : (
            <>
              <View style={styles.dayNumberRow}>
                <Text style={[styles.dayNumber, isToday && styles.dayNumberToday, hasRecords && !isToday && styles.dayNumberEmpty]}>
                  {day}
                </Text>
                {isToday && <Ionicons name="star" size={12} color={theme.colors.primary} style={styles.todayMarker} />}
              </View>
              {hasRecords && (
                <View style={styles.thumbnailsGrid}>
                  <View style={styles.thumbnailRow}>
                    {dayRecords.slice(0, 2).map((item) => (
                      <View key={item.id} style={styles.thumbnailWrap}>
                        <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.thumbnail} resizeMode="cover" />
                      </View>
                    ))}
                  </View>
                  <View style={styles.thumbnailRow}>
                    {dayRecords.slice(2, 4).map((item) => (
                      <View key={item.id} style={styles.thumbnailWrap}>
                        <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.thumbnail} resizeMode="cover" />
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

    return cells;
  };

  const formatMonthYear = () => `${currentYear}年${currentMonth}月`;

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
        {/* Calendar Card */}
        <View style={styles.card}>
          {/* 月份导航 */}
          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.monthBtn} onPress={goToPrevMonth} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{formatMonthYear()}</Text>
            <TouchableOpacity style={styles.monthBtn} onPress={goToNextMonth} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* 星期标题 */}
          <View style={styles.weekDaysRow}>
            {weekDays.map((day, idx) => (
              <Text key={day} style={[styles.weekDay, idx === 6 && styles.weekDayLast]}>{day}</Text>
            ))}
          </View>

          {/* 日历网格 */}
          <View style={styles.calendarGrid}>
            {renderCalendarDays()}
          </View>

          {/* 图例 */}
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
                    <Image
                      key={item.id}
                      source={{ uri: item.thumbnailUri || item.imageUri }}
                      style={styles.recentThumb}
                      resizeMode="cover"
                    />
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