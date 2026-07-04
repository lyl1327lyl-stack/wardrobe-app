import React, { useMemo, useRef, useState, useEffect } from 'react';
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
const MONTH_GAP = 10; // 月份之间的额外间隔

interface Cell {
  key: string;
  worn: boolean;
  isToday: boolean;
  isPadding: boolean; // 月份首列上方 / 末列下方的占位（不属于该月任何一天）
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
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
    timeline: {
      flexDirection: 'row',
    },
    monthGroup: {
      marginRight: MONTH_GAP,
    },
    monthLabel: {
      fontSize: 10,
      color: theme.colors.textTertiary,
      marginBottom: 4,
      height: 14,
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
    cellPad: {
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
  const scrollRef = useRef<ScrollView>(null);
  const [didScroll, setDidScroll] = useState(false);

  const { monthsData, recentCount } = useMemo(() => {
    const todayD = parseDate(today);
    const groups: { label: string; columns: Cell[][]; dayCount: number }[] = [];
    let count = 0;

    for (let i = months - 1; i >= 0; i--) {
      const firstOfMonth = new Date(todayD.getFullYear(), todayD.getMonth() - i, 1);
      const y = firstOfMonth.getFullYear();
      const m = firstOfMonth.getMonth(); // 0-based
      const isCurrent = i === 0;
      const totalDays = isCurrent
        ? todayD.getDate()
        : new Date(y, m + 1, 0).getDate();
      // 1 号固定放第一行第一列，按列顺序填，末列不满则置空
      const colCount = Math.ceil(totalDays / ROWS);

      const columns: Cell[][] = [];
      for (let c = 0; c < colCount; c++) {
        const col: Cell[] = [];
        for (let r = 0; r < ROWS; r++) {
          const day = c * ROWS + r + 1;
          if (day > totalDays) {
            // 末列最后一天下方的占位
            col.push({ key: `${y}-${m}-pad-${c}-${r}`, worn: false, isToday: false, isPadding: true });
          } else {
            const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const worn = wornDates.has(key);
            if (worn) count++;
            col.push({ key, worn, isToday: isCurrent && day === todayD.getDate(), isPadding: false });
          }
        }
        columns.push(col);
      }
      groups.push({ label: `${m + 1}月`, columns, dayCount: totalDays });
    }
    return { monthsData: groups, recentCount: count };
  }, [wornDates, months, today]);

  // 默认滚动到最右（当前月）
  useEffect(() => {
    if (!didScroll && monthsData.length > 0) {
      const t = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
        setDidScroll(true);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [didScroll, monthsData.length]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.title}>穿着频次</Text>
        <Text style={styles.subtitle}>近 {months} 个月</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.timeline}>
          {monthsData.map((md, mi) => (
            <View key={mi} style={styles.monthGroup}>
              <Text style={styles.monthLabel}>{md.label}</Text>
              <View style={styles.grid}>
                {md.columns.map((col, ci) => (
                  <View key={ci} style={styles.col}>
                    {col.map((cell) => (
                      <View
                        key={cell.key}
                        style={[
                          styles.cell,
                          cell.isPadding
                            ? styles.cellPad
                            : cell.worn
                              ? [styles.cellWorn, cell.isToday && styles.cellToday]
                              : cell.isToday && styles.cellToday,
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          ))}
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
