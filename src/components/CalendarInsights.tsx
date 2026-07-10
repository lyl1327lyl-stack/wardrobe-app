// src/components/CalendarInsights.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { Insight } from '../utils/calendarStats';

interface Props {
  insights: Insight[];
  /** 点击关联衣物（闲置提醒）时回调，传入衣物 id */
  onPressItem?: (itemId: number) => void;
}

export function CalendarInsights({ insights, onPressItem }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  if (insights.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {insights.map((ins, idx) => {
        const tappable = ins.itemId != null && !!onPressItem;
        const leading = ins.thumb ? (
          <Image source={{ uri: ins.thumb }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{ins.emoji}</Text>
        );
        const content = (
          <>
            {leading}
            <Text style={styles.text} numberOfLines={2}>{ins.text}</Text>
            {tappable && (
              <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
            )}
          </>
        );
        return tappable ? (
          <TouchableOpacity
            key={idx}
            style={styles.row}
            onPress={() => onPressItem!(ins.itemId!)}
            activeOpacity={0.7}
          >
            {content}
          </TouchableOpacity>
        ) : (
          <View key={idx} style={styles.row}>{content}</View>
        );
      })}
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
    thumb: { width: 30, height: 30, borderRadius: 7, backgroundColor: theme.colors.borderLight },
    text: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  });
