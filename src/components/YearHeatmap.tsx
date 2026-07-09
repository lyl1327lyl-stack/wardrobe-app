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
