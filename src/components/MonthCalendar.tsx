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
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 18;
const CELL_MARGIN = 4;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 40 - CARD_PADDING * 2 - CELL_MARGIN * 6) / 7);

export interface LegendItem {
  label: string;
  color?: string;
  icon?: string;
  iconColor?: string;
}

export interface MonthCalendarProps {
  year: number;
  month: number;
  today: string;
  wearData: Record<string, ClothingItem[]>;
  onSelectDate: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  outfitMatchMap?: Record<string, { outfitId: number; outfitName: string; outfitThumb: string; extraItemIds?: number[] }>;
  disableFuture?: boolean;
  legendItems?: LegendItem[];
  /** 可选：按当天件数返回格子背景色（用于活跃度着色）。返回 undefined 则用默认样式。 */
  cellTint?: (dateStr: string, count: number) => string | undefined;
}

export function getDaysInMonth(year: number, month: number): number {
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
    weekDayWeekend: {
      color: theme.colors.accent,
    },
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
    dayNumberWeekend: {
      color: theme.colors.accent,
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
  outfitMatchMap,
  disableFuture,
  legendItems,
  cellTint,
}: MonthCalendarProps) {
  const { theme } = useTheme();
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
    const isFutureDisabled = disableFuture && isFuture;
    const weekIndex = (firstDay + day - 1) % 7;
    const isSunday = weekIndex === 6;
    const isWeekend = weekIndex >= 5; // 周六/周日
    const match = outfitMatchMap?.[dateStr];
    const showOutfitThumb = match && match.outfitThumb;

    cells.push(
      <TouchableOpacity
        key={dateStr}
        style={[
          styles.dayCell,
          isToday && styles.dayCellToday,
          hasRecords && !isToday && (isFuture ? styles.dayCellPlanned : styles.dayCellHasRecords),
          isFutureDisabled && styles.dayCellEmpty,
          !isSunday && { marginRight: CELL_MARGIN },
          { marginBottom: CELL_MARGIN },
          showOutfitThumb && { overflow: 'hidden' },
          cellTint && !isToday && hasRecords && cellTint(dateStr, dayRecords.length)
            ? { backgroundColor: cellTint(dateStr, dayRecords.length) }
            : null,
        ]}
        onPress={() => { if (!isFutureDisabled) onSelectDate(dateStr); }}
        disabled={isFutureDisabled}
        activeOpacity={0.7}
      >
        {showOutfitThumb ? (
          <>
            <View style={styles.dayNumberRow}>
              <Text style={[styles.dayNumberOverlayText, isWeekend && !isToday && styles.dayNumberWeekend]}>{day}</Text>
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
                  isToday
                    ? styles.dayNumberToday
                    : isWeekend
                      ? styles.dayNumberWeekend
                      : hasRecords
                        ? styles.dayNumberEmpty
                        : undefined,
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
          <Text key={day} style={[styles.weekDay, idx >= 5 && styles.weekDayWeekend, idx === 6 && styles.weekDayLast]}>{day}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {cells}
      </View>

      <View style={styles.legend}>
        {(legendItems && legendItems.length > 0 ? legendItems : [
          { label: '已穿着', color: theme.colors.primary + '40' },
          { label: '计划穿着', color: theme.colors.accent + '50' },
          { label: '今天', icon: 'star', iconColor: theme.colors.primary },
        ]).map((item, idx) => (
          <View key={idx} style={styles.legendItem}>
            {item.icon ? (
              <Ionicons name={item.icon as any} size={12} color={item.iconColor || theme.colors.primary} />
            ) : (
              <View style={[styles.legendDot, { backgroundColor: item.color || theme.colors.primary }]} />
            )}
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
