// src/components/TodayOutfitHero.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ClothingItem } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  /** 今日穿着的衣物（已记录则有，未记录为空数组） */
  items: ClothingItem[];
  /** 今日日期串 YYYY-MM-DD */
  today: string;
  /** 点击整卡（已记录态） */
  onPress: () => void;
  /** 未记录态点 CTA */
  onRecord: () => void;
}

export function TodayOutfitHero({ items, today, onPress, onRecord }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const recorded = items.length > 0;

  const label = (() => {
    const d = new Date(today);
    const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return `今日 · ${d.getMonth() + 1}月${d.getDate()}日 ${wd}`;
  })();

  return (
    <TouchableOpacity
      activeOpacity={recorded ? 0.85 : 0.9}
      onPress={recorded ? onPress : onRecord}
      disabled={false}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.left}>
          <Text style={styles.dateLabel}>{label}</Text>
          <Text style={styles.title}>{recorded ? '今日穿搭' : '今天还没记录穿搭'}</Text>
        </View>
        {recorded ? (
          <View style={styles.thumbRow}>
            {items.slice(0, 3).map((it, idx) => {
              const extra = idx === 2 && items.length > 3 ? items.length - 3 : 0;
              return (
                <View key={it.id} style={styles.thumbWrap}>
                  {(it.thumbnailUri || it.imageUri) ? (
                    <Image source={{ uri: it.thumbnailUri || it.imageUri }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="shirt-outline" size={14} color="#fff" />
                    </View>
                  )}
                  {extra > 0 && (
                    <View style={styles.moreBadge}>
                      <Text style={styles.moreText}>+{extra}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.cta}>
            <Ionicons name="add-outline" size={15} color={theme.colors.primary} />
            <Text style={[styles.ctaText, { color: theme.colors.primary }]}>记录今日穿搭</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 76,
    },
    left: { flex: 1, marginRight: 10 },
    dateLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
    title: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 3 },
    thumbRow: { flexDirection: 'row' },
    thumbWrap: { width: 40, height: 40, marginRight: 6, borderRadius: 10, overflow: 'hidden' },
    thumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)' },
    thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    moreBadge: {
      position: 'absolute', right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8,
      paddingHorizontal: 4, minWidth: 16, alignItems: 'center',
    },
    moreText: { fontSize: 9, color: '#fff', fontWeight: '700' },
    cta: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: '#fff', borderRadius: 16,
      paddingHorizontal: 12, paddingVertical: 8,
    },
    ctaText: { fontSize: 12, fontWeight: '700' },
  });
