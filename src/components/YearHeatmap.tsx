// src/components/YearHeatmap.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { tintForCount } from '../utils/calendarStats';

interface Props {
  year: number;
  /** 日期(YYYY-MM-DD) → 当天件数。可只含本年。 */
  countMap: Record<string, number>;
  today: string;
  /** 单格尺寸（宽=高）。不传则默认 16。 */
  cellSize?: number;
}

interface Cell { dateStr: string; month: number; day: number; firstOfMonth: boolean; }

export function YearHeatmap({ year, countMap, today, cellSize }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const cs = cellSize ?? 16;

  // 连续全年网格：列=周(周一起), 行=周一..周日
  const firstMon = (new Date(year, 0, 1).getDay() + 6) % 7;
  const daysInYear = Math.floor((+new Date(year, 11, 31) - +new Date(year, 0, 1)) / 86400000) + 1;
  const numCols = Math.ceil((daysInYear + firstMon) / 7);
  const grid: (Cell | null)[][] = Array.from({ length: numCols }, () =>
    Array<Cell | null>(7).fill(null)
  );
  let todayCol = -1;
  for (let off = 0; off < daysInYear; off++) {
    const d = new Date(year, 0, 1 + off);
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
  const initialX = todayCol >= 0 ? Math.max(todayCol * (cs + 2) - 40, 0) : 0;

  // 月度活跃：每月有穿着记录的天数
  const monthlyDays = Array(12).fill(0);
  Object.entries(countMap).forEach(([date, count]) => {
    if (count > 0 && date.startsWith(`${year}-`)) {
      const m = parseInt(date.slice(5, 7), 10);
      if (m >= 1 && m <= 12) monthlyDays[m - 1]++;
    }
  });
  const maxMonthDays = Math.max(1, ...monthlyDays);

  return (
    <View style={styles.wrap}>
      <View style={styles.legendRow}>
        <View style={[styles.legendCell, { backgroundColor: theme.colors.borderLight }]} />
        <Text style={styles.legendText}>未穿</Text>
        <View style={[styles.legendCell, { backgroundColor: theme.colors.primary + '40' }]} />
        <Text style={styles.legendText}>已穿</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: initialX, y: 0 }}
        style={styles.stripScroll}
      >
        <View style={styles.grid}>
          {grid.map((col, ci) => (
            <View key={ci} style={styles.col}>
              <View style={styles.labelBox}>
                <Text style={styles.labelText} numberOfLines={1}>{colLabels[ci]}</Text>
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
                  <View
                    key={ri}
                    style={[styles.cell, { width: cs, height: cs, backgroundColor: bg }, isToday && styles.cellToday]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 月度活跃柱状图（填满剩余高度） */}
      <View style={styles.barSection}>
        <Text style={styles.barTitle}>月度活跃（穿着天数）</Text>
        <View style={styles.barRow}>
          {monthlyDays.map((days, mi) => {
            const pct = (days / maxMonthDays) * 100;
            return (
              <View key={mi} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max(days > 0 ? 8 : 0, pct)}%`,
                        backgroundColor: days > 0 ? theme.colors.primary : theme.colors.borderLight,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{mi + 1}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { paddingTop: 6, flex: 1 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginBottom: 8 },
    legendCell: { width: 10, height: 10, borderRadius: 2 },
    legendText: { fontSize: 9, color: theme.colors.textTertiary },
    stripScroll: { flexGrow: 0 },
    grid: { flexDirection: 'row' },
    col: { flexDirection: 'column', marginHorizontal: 1 },
    labelBox: { height: 12, justifyContent: 'center' },
    labelText: { fontSize: 8, fontWeight: '600', color: theme.colors.textSecondary },
    cell: { borderRadius: 3, marginVertical: 1 },
    cellPad: { backgroundColor: theme.colors.borderLight },
    cellToday: { borderWidth: 1.5, borderColor: theme.colors.primary },
    barSection: { flex: 1, marginTop: 14 },
    barTitle: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 },
    barRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
    barCol: { flex: 1, alignItems: 'center' },
    barTrack: { width: '70%', flex: 1, justifyContent: 'flex-end' },
    barFill: { width: '100%', borderRadius: 3, minHeight: 2 },
    barLabel: { fontSize: 9, color: theme.colors.textTertiary, marginTop: 4 },
  });
