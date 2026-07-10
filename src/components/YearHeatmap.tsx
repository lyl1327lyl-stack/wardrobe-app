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
  /** 单格尺寸（宽=高）。不传则默认 16。 */
  cellSize?: number;
}

interface Cell { dateStr: string; month: number; day: number; firstOfMonth: boolean; }

/** 构建一个连续的"半年"周列网格：列=周(周一起), 行=周一..周日 */
function buildHalf(year: number, startMonth: number, endMonth: number, today: string) {
  const start = new Date(year, startMonth - 1, 1);
  const end = new Date(year, endMonth, 0); // endMonth 月最后一天
  const firstMon = (start.getDay() + 6) % 7; // 0=周一
  const daysCount = Math.floor((+end - +start) / 86400000) + 1;
  const numCols = Math.ceil((daysCount + firstMon) / 7);
  const grid: (Cell | null)[][] = Array.from({ length: numCols }, () =>
    Array<Cell | null>(7).fill(null)
  );
  let todayCol = -1;
  for (let off = 0; off < daysCount; off++) {
    const d = new Date(year, startMonth - 1, 1 + off);
    const col = Math.floor((off + firstMon) / 7);
    const row = (off + firstMon) % 7;
    const dateStr = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    grid[col][row] = {
      dateStr,
      month: d.getMonth() + 1,
      day: d.getDate(),
      firstOfMonth: d.getDate() === 1,
    };
    if (dateStr === today) todayCol = col;
  }
  const colLabels: string[] = grid.map((col) => {
    for (const cell of col) {
      if (cell && cell.firstOfMonth) return `${cell.month}月`;
    }
    return '';
  });
  return { grid, colLabels, todayCol };
}

export function YearHeatmap({ year, countMap, today, onSelectDate, cellSize }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const cs = cellSize ?? 16;

  const halves = [
    { label: '上半年', ...buildHalf(year, 1, 6, today) },
    { label: '下半年', ...buildHalf(year, 7, 12, today) },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.legendRow}>
        <View style={[styles.legendCell, { backgroundColor: theme.colors.borderLight }]} />
        <Text style={styles.legendText}>未穿</Text>
        <View style={[styles.legendCell, { backgroundColor: theme.colors.primary + '40' }]} />
        <Text style={styles.legendText}>已穿</Text>
      </View>
      {halves.map((half, hi) => {
        const initialX = half.todayCol >= 0 ? Math.max(half.todayCol * (cs + 2) - 40, 0) : 0;
        return (
          <View key={hi} style={styles.halfBlock}>
            <Text style={styles.halfLabel}>{half.label}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: initialX, y: 0 }}
            >
              <View style={styles.grid}>
                {half.grid.map((col, ci) => (
                  <View key={ci} style={styles.col}>
                    <View style={styles.labelBox}>
                      <Text style={styles.labelText} numberOfLines={1}>{half.colLabels[ci]}</Text>
                    </View>
                    {col.map((cell, ri) => {
                      if (!cell) {
                        return <View key={ri} style={[styles.cell, { width: cs, height: cs }, styles.cellPad]} />;
                      }
                      const count = countMap[cell.dateStr] || 0;
                      const isFuture = cell.dateStr > today;
                      const bg = isFuture
                        ? theme.colors.borderLight
                        : (tintForCount(count, theme.colors.primary) || theme.colors.borderLight);
                      const isToday = cell.dateStr === today;
                      return (
                        <TouchableOpacity
                          key={ri}
                          disabled={isFuture}
                          onPress={() => onSelectDate(cell.dateStr)}
                          style={[styles.cell, { width: cs, height: cs, backgroundColor: bg }, isToday && styles.cellToday]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { paddingTop: 6 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginBottom: 8 },
    legendCell: { width: 10, height: 10, borderRadius: 2 },
    legendText: { fontSize: 9, color: theme.colors.textTertiary },
    halfBlock: { marginBottom: 10 },
    halfLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.textTertiary, marginBottom: 4 },
    grid: { flexDirection: 'row' },
    col: { flexDirection: 'column', marginHorizontal: 1 },
    labelBox: { height: 12, justifyContent: 'center' },
    labelText: { fontSize: 8, fontWeight: '600', color: theme.colors.textSecondary },
    cell: { borderRadius: 3, marginVertical: 1 },
    cellPad: { backgroundColor: 'transparent' },
    cellToday: { borderWidth: 1.5, borderColor: theme.colors.primary },
  });
