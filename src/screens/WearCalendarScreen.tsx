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
// 7列等分：左右各留16padding，6个间距(每行6个gap)
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 32 - 24) / 7);
const CELL_MARGIN = 4;

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
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitleIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    headerRight: {
      width: 36,
    },
    // 月份导航
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    monthBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
    },
    monthText: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
    },
    // 星期标题
    weekDaysRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 4,
    },
    weekDay: {
      width: CELL_SIZE,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.textTertiary,
      marginRight: CELL_MARGIN,
    },
    weekDayLast: {
      marginRight: 0,
    },
    // 日历网格 - 手动marginRight控制间距
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
    },
    dayCell: {
      width: CELL_SIZE,
      height: CELL_SIZE + 22,
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      padding: 4,
    },
    dayCellToday: {
      backgroundColor: theme.colors.primary + '35',
    },
    dayCellEmpty: {
      backgroundColor: 'transparent',
    },
    dayCellHasRecords: {
      backgroundColor: theme.colors.primary + '10', // 10% opacity primary
    },
    // 未来计划穿着 - 用另一种颜色区分
    dayCellPlanned: {
      backgroundColor: theme.colors.accent + '25',
    },
    dayNumber: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.text,
    },
    dayNumberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 1,
      position: 'relative',
    },
    dayNumberToday: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    todayMarker: {
      position: 'absolute',
      top: 3,
      right: 3,
    },
    dayNumberEmpty: {
      color: theme.colors.textTertiary,
    },
    // 缩略图网格 - 固定2行2列，每格四等分
    thumbnailsGrid: {
      flexDirection: 'column',
      gap: 2,
    },
    thumbnailRow: {
      flexDirection: 'row',
      gap: 2,
    },
    thumbnailWrap: {
      // 四等分：格子宽度 - padding - gap， 除2
      width: Math.floor((CELL_SIZE - 10) / 2),
      height: Math.floor((CELL_SIZE - 10) / 2),
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderLight,
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    overflowBadge: {
      position: 'absolute',
      top: 2,
      right: 2,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
      minWidth: 18,
      alignItems: 'center',
    },
    overflowText: {
      fontSize: 10,
      color: theme.colors.white,
      fontWeight: '700',
    },
    // 图例说明
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 20,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    legendText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    // 空状态
    emptyHint: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    emptyHintText: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

export function WearCalendarScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { clothing, addWearRecords, deleteWearRecord } = useWardrobeStore();

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [wearData, setWearData] = useState<Record<string, ClothingItem[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

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

      cells.push(
        <TouchableOpacity
          key={dateStr}
          style={[
            styles.dayCell,
            isToday && styles.dayCellToday,
            hasRecords && !isToday && (isFuture ? styles.dayCellPlanned : styles.dayCellHasRecords),
            !isSunday && { marginRight: CELL_MARGIN },
            { marginBottom: CELL_MARGIN },
          ]}
          onPress={() => handleDayPress(dateStr)}
          activeOpacity={0.7}
        >
          <View style={styles.dayNumberRow}>
            <Text style={[styles.dayNumber, isToday && styles.dayNumberToday, hasRecords && !isToday && styles.dayNumberEmpty]}>
              {day}
            </Text>
            {isToday && <Ionicons name="star" size={10} color={theme.colors.primary} style={styles.todayMarker} />}
          </View>
          {hasRecords && (
            <View style={styles.thumbnailsGrid}>
              <View style={styles.thumbnailRow}>
                {dayRecords.slice(0, 2).map((item) => (
                  <View key={item.id} style={styles.thumbnailWrap}>
                    <Image
                      source={{ uri: item.thumbnailUri || item.imageUri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
              <View style={styles.thumbnailRow}>
                {dayRecords.slice(2, 4).map((item) => (
                  <View key={item.id} style={styles.thumbnailWrap}>
                    <Image
                      source={{ uri: item.thumbnailUri || item.imageUri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
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
        </TouchableOpacity>
      );
    }

    return cells;
  };

  const formatMonthYear = () => `${currentYear}年${currentMonth}月`;

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
            <View style={[styles.legendDot, { backgroundColor: theme.colors.primary + '30' }]} />
            <Text style={styles.legendText}>已穿着</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.accent + '40' }]} />
            <Text style={styles.legendText}>计划穿着</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="star" size={12} color={theme.colors.primary} />
            <Text style={styles.legendText}>今天</Text>
          </View>
        </View>

        {/* 提示 */}
        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintText}>点击日期查看或编辑当天穿着记录</Text>
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