// src/components/StreakProgressCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  streakDays: number;
  recorded: number;
  total: number;
}

export function StreakProgressCard({ streakDays, recorded, total }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const pct = total > 0 ? Math.min(recorded / total, 1) : 0;

  return (
    <View style={styles.row}>
      <View style={[styles.card, { flex: 1 }]}>
        <Text style={styles.fire}>{streakDays > 0 ? '🔥' : '💧'}</Text>
        <View>
          <Text style={styles.streakNum}>
            {streakDays}
            <Text style={styles.streakUnit}> 天</Text>
          </Text>
          <Text style={styles.subLabel}>连续记录</Text>
        </View>
      </View>
      <View style={[styles.card, { flex: 1.4 }]}>
        <View style={styles.progressHead}>
          <Text style={styles.subLabel}>本月进度</Text>
          <Text style={styles.progressNum}>
            {recorded}<Text style={styles.progressTotal}>/{total}</Text>
          </Text>
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 10 },
    card: {
      backgroundColor: theme.colors.card, borderRadius: 14, padding: 12,
      flexDirection: 'row', alignItems: 'center', gap: 9,
      ...theme.shadows.sm,
    },
    fire: { fontSize: 18 },
    streakNum: { fontSize: 16, fontWeight: '800', color: theme.colors.primary, lineHeight: 18 },
    streakUnit: { fontSize: 10, color: theme.colors.textTertiary, fontWeight: '500' },
    subLabel: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 2 },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' },
    progressNum: { fontSize: 14, fontWeight: '800', color: theme.colors.primary },
    progressTotal: { fontSize: 10, color: theme.colors.textTertiary, fontWeight: '500' },
    barBg: { height: 6, backgroundColor: theme.colors.borderLight, borderRadius: 3, marginTop: 8 },
    barFill: { height: 6, borderRadius: 3, backgroundColor: theme.colors.primary },
  });
