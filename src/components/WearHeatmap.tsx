import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface WearHeatmapProps {
  /** 已穿日期集合，'YYYY-MM-DD' */
  wornDates: Set<string>;
  /** 回溯月数，默认 6 */
  months?: number;
  /** 今天，'YYYY-MM-DD' */
  today: string;
}

const CELL = 14;
const GAP = 3;
const ROWS = 7; // 周一..周日
const STRIDE = CELL + GAP;

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 18,
      ...theme.shadows.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginLeft: 2,
    },
    scroll: {
      paddingVertical: 4,
    },
    monthLabelRow: {
      height: 14,
      marginBottom: 4,
      position: 'relative',
    },
    monthLabel: {
      position: 'absolute',
      fontSize: 10,
      color: theme.colors.textTertiary,
    },
    grid: {
      flexDirection: 'row',
    },
    col: {
      marginRight: GAP,
    },
    cell: {
      width: CELL,
      height: CELL,
      borderRadius: 3,
      marginBottom: GAP,
      backgroundColor: theme.colors.borderLight,
    },
    cellWorn: {
      backgroundColor: theme.colors.primary,
    },
    cellToday: {
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
    },
    cellFuture: {
      backgroundColor: 'transparent',
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    legendText: {
      fontSize: 11,
      color: theme.colors.textTertiary,
    },
    legendCell: {
      width: 11,
      height: 11,
      borderRadius: 2,
      backgroundColor: theme.colors.borderLight,
    },
    legendCellWorn: {
      backgroundColor: theme.colors.primary,
    },
    totalText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginLeft: 8,
    },
  });

export function WearHeatmap({ wornDates, months = 6, today }: WearHeatmapProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { columns, monthLabels, recentCount } = useMemo(() => {
    const todayD = parseDate(today);
    const start = new Date(todayD);
    start.setDate(start.getDate() - months * 30);
    // 对齐到周一：getDay 0=Sun..6=Sat → Mon 为 0
    const dow = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dow);

    const cols: { key: string; worn: boolean; isToday: boolean; isFuture: boolean }[][] = [];
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    let count = 0;
    const cur = new Date(start);
    let colIdx = 0;

    while (cur <= todayD) {
      const col: { key: string; worn: boolean; isToday: boolean; isFuture: boolean }[] = [];
      for (let r = 0; r < ROWS; r++) {
        const key = toKey(cur);
        const isFuture = cur > todayD;
        const worn = !isFuture && wornDates.has(key);
        if (worn) count++;
        col.push({ key: `${key}-${r}`, worn, isToday: key === today, isFuture });
        cur.setDate(cur.getDate() + 1);
      }
      // 月份标签：以本列首日所在月份为准
      const firstMonth = parseDate(col[0].key.slice(0, 10)).getMonth();
      if (firstMonth !== lastMonth) {
        labels.push({ col: colIdx, label: `${firstMonth + 1}月` });
        lastMonth = firstMonth;
      }
      cols.push(col);
      colIdx++;
      if (colIdx > 300) break; // 安全上限
    }
    return { columns: cols, monthLabels: labels, recentCount: count };
  }, [wornDates, months, today]);

  const gridWidth = columns.length * STRIDE;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.title}>穿着频次</Text>
        <Text style={styles.subtitle}>近 {months} 个月</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={{ width: gridWidth }}>
          <View style={styles.monthLabelRow}>
            {monthLabels.map((ml, i) => (
              <Text key={i} style={[styles.monthLabel, { left: ml.col * STRIDE }]}>{ml.label}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {columns.map((col, ci) => (
              <View key={ci} style={styles.col}>
                {col.map((cell) => (
                  <View
                    key={cell.key}
                    style={[
                      styles.cell,
                      cell.isFuture && styles.cellFuture,
                      cell.worn && styles.cellWorn,
                      cell.isToday && styles.cellToday,
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendCell} />
        <Text style={styles.legendText}>未穿</Text>
        <View style={[styles.legendCell, styles.legendCellWorn]} />
        <Text style={styles.legendText}>已穿</Text>
        <Text style={styles.totalText}>本期 {recentCount} 次</Text>
      </View>
    </View>
  );
}
