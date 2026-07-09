// src/components/CalendarInsights.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { Insight } from '../utils/calendarStats';

interface Props {
  insights: Insight[];
}

export function CalendarInsights({ insights }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  if (insights.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {insights.map((ins, idx) => (
        <View key={idx} style={styles.row}>
          <Text style={styles.emoji}>{ins.emoji}</Text>
          <Text style={styles.text} numberOfLines={2}>{ins.text}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { marginHorizontal: 16, marginTop: 10, gap: 8 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 9,
      backgroundColor: theme.colors.card, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12,
      ...theme.shadows.sm,
    },
    emoji: { fontSize: 15 },
    text: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  });
