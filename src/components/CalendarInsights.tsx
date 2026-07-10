// src/components/CalendarInsights.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
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
        // 闲置提醒：多件缩略图卡片
        if (ins.items && ins.items.length > 0) {
          return (
            <View key={idx} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.emoji}>{ins.emoji}</Text>
                <Text style={styles.itemTitle}>{ins.text}</Text>
              </View>
              <View style={styles.itemThumbs}>
                {ins.items.map(it => (
                  <TouchableOpacity
                    key={it.itemId}
                    style={styles.itemCol}
                    onPress={() => onPressItem?.(it.itemId)}
                    activeOpacity={0.7}
                    disabled={!onPressItem}
                  >
                    <Image source={{ uri: it.thumb }} style={styles.itemThumb} resizeMode="cover" />
                    <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                    <Text style={styles.itemDays}>{it.days}天未穿</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        }
        // 普通文本洞察
        return (
          <View key={idx} style={styles.row}>
            <Text style={styles.emoji}>{ins.emoji}</Text>
            <Text style={styles.text} numberOfLines={2}>{ins.text}</Text>
          </View>
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
    text: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
    // 闲置多件卡片
    itemCard: {
      backgroundColor: theme.colors.card, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12,
      ...theme.shadows.sm,
    },
    itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
    itemTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
    itemThumbs: { flexDirection: 'row', gap: 10 },
    itemCol: { flex: 1, alignItems: 'center' },
    itemThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: theme.colors.borderLight, marginBottom: 5 },
    itemName: { fontSize: 11, fontWeight: '600', color: theme.colors.text, textAlign: 'center' },
    itemDays: { fontSize: 10, color: theme.colors.warning || theme.colors.textTertiary, marginTop: 1 },
  });
