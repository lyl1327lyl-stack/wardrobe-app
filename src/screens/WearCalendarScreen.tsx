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
import { useNavigation } from '@react-navigation/native';
import { ClothingItem } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { useWardrobeStore } from '../store/wardrobeStore';
import * as wearRecordsDb from '../db/wearRecords';
import { MonthCalendar } from '../components/MonthCalendar';
import { WearCalendarSheet } from '../components/WearCalendarSheet';

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

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

  const loadMonthData = useCallback(async () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const newData: Record<string, ClothingItem[]> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const records = await wearRecordsDb.getWearRecordsByDate(dateStr);
      const items = records
        .map(r => allClothingMap.get(r.clothingId) || {
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
        } as ClothingItem)
        .filter((c): c is ClothingItem => c !== undefined);
      if (items.length > 0) {
        newData[dateStr] = items;
      }
    }

    setWearData(newData);
  }, [currentYear, currentMonth, allClothingMap]);

  const loadRecentWeek = useCallback(async () => {
    const result: { date: string; items: ClothingItem[] }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const records = await wearRecordsDb.getWearRecordsByDate(dateStr);
      const items = records
        .map(r => allClothingMap.get(r.clothingId) || {
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
        } as ClothingItem);
      result.push({ date: dateStr, items });
    }
    setRecentWeek(result);
  }, [allClothingMap]);

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
    loadMonthData();
  };

  const handleAddRecord = () => {
    loadMonthData();
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
          theme={theme}
          outfitMatchMap={outfitMatchMap}
        />

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