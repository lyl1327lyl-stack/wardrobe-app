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

interface Cell { dateStr: string; month: number; day: number; firstOfMonth: boolean; }

export function YearHeatmap({ year, countMap, today, onSelectDate }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  // 构建 GitHub 风格连续网格：列=周，行=周一..周日（周一起）
  const firstMon = (new Date(year, 0, 1).getDay() + 6) % 7; // 0=周一
  const daysInYear = Math.floor((+new Date(year, 11, 31) - +new Date(year, 0, 1)) / 86400000) + 1;
  const numCols = Math.ceil((daysInYear + firstMon) / 7);
  const grid: (Cell | null)[][] = Array.from({ length: numCols }, () =>
    Array<Cell | null>(7).fill(null)
  );
  for (let off = 0; off < daysInYear; off++) {
    const d = new Date(year, 0, 1 + off);
    const col = Math.floor((off + firstMon) / 7);
    const row = (off + firstMon) % 7;
    grid[col][row] = {
      dateStr: `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      month: d.getMonth() + 1,
      day: d.getDate(),
      firstOfMonth: d.getDate() === 1,
    };
  }
  // 每列顶部月份标签：列内首个"某月1号"显示该月
  const colLabels: string[] = grid.map((col) => {
    for (const cell of col) {
      if (cell && cell.firstOfMonth) return `${cell.month}月`;
    }
    return '';
  });
  // 今天所在列（用于初始滚动定位）
  const todayCol = (() => {
    if (!today.startsWith(`${year}-`)) return -1;
    const [ty, tm, td] = today.split('-').map(Number);
    const t = new Date(ty, tm - 1, td);
    const off = Math.round((+t - +new Date(year, 0, 1)) / 86400000);
    if (off < 0 || off >= daysInYear) return -1;
    return Math.floor((off + firstMon) / 7);
  })();
  const initialX = todayCol >= 0 ? Math.max(todayCol * 15 - 40, 0) : 0;

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: initialX, y: 0 }}
      >
        <View style={styles.grid}>
          {grid.map((col, ci) => (
            <View key={ci} style={styles.col}>
              <View style={styles.labelBox}>
                <Text style={styles.labelText} numberOfLines={1}>{colLabels[ci]}</Text>
              </View>
              {col.map((cell, ri) => {
                if (!cell) {
                  return <View key={ri} style={[styles.cell, styles.cellPad]} />;
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
                    style={[styles.cell, { backgroundColor: bg }, isToday && styles.cellToday]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { paddingTop: 6 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginBottom: 8 },
    legendCell: { width: 10, height: 10, borderRadius: 2 },
    legendText: { fontSize: 9, color: theme.colors.textTertiary },
    grid: { flexDirection: 'row' },
    col: { flexDirection: 'column', marginHorizontal: 1 },
    labelBox: { height: 14, justifyContent: 'center' },
    labelText: { fontSize: 9, fontWeight: '600', color: theme.colors.textSecondary },
    cell: { width: 13, height: 13, borderRadius: 3, marginVertical: 1 },
    cellPad: { backgroundColor: 'transparent' },
    cellToday: { borderWidth: 2, borderColor: theme.colors.primary },
  });
