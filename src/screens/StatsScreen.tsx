import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { CLOTHING_TYPES, STYLES } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

const SEASON_CONFIG = [
  { season: '春', icon: 'flower' as const, color: '#A8E6CF', iconColor: '#52B788', bg: '#A8E6CF20' },
  { season: '夏', icon: 'sunny' as const, color: '#FFD3A5', iconColor: '#F9A825', bg: '#FFD3A520' },
  { season: '秋', icon: 'leaf' as const, color: '#FFAAA5', iconColor: '#D32F2F', bg: '#FFAAA520' },
  { season: '冬', icon: 'snow' as const, color: '#D5AAFF', iconColor: '#7B1FA2', bg: '#D5AAFF20' },
];

const TYPE_COLORS = ['#6B7FD7', '#E8B4A0', '#00B894', '#FDCB6E', '#A29BFE', '#74B9FF'];

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      marginTop: 4,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 16,
      gap: 12,
    },
    statCard: {
      width: '47%',
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      alignItems: 'center',
    },
    statIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    section: {
      backgroundColor: theme.colors.card,
      marginTop: 12,
      padding: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
      letterSpacing: -0.3,
    },
    barGroup: {
      gap: 14,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    barLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      width: 44,
    },
    barContainer: {
      flex: 1,
      height: 10,
      backgroundColor: theme.colors.borderLight,
      borderRadius: 5,
      overflow: 'hidden',
    },
    bar: {
      height: '100%',
      borderRadius: 5,
    },
    barValue: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      width: 24,
      textAlign: 'right',
      fontWeight: '500',
    },
    seasonGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    seasonCard: {
      flex: 1,
      alignItems: 'center',
      padding: 14,
      borderRadius: theme.borderRadius.lg,
    },
    seasonIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    seasonCount: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 2,
    },
    seasonLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    highlightCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
    },
    highlightLeft: {},
    highlightType: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    highlightColor: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginTop: 4,
    },
    highlightRight: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    highlightCount: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    highlightUnit: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginLeft: 2,
    },
    bottom: {
      height: 40,
    },
  });

export function StatsScreen() {
  const { clothing } = useWardrobeStore();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const stats = useMemo(() => {
    const total = clothing.length;
    const byType: Record<string, number> = {};
    const bySeason: Record<string, number> = {};
    const byStyle: Record<string, number> = {};

    clothing.forEach(item => {
      byType[item.type] = (byType[item.type] || 0) + 1;
      item.seasons.forEach(s => {
        bySeason[s] = (bySeason[s] || 0) + 1;
      });
      if (item.styles) {
        item.styles.forEach(s => {
          byStyle[s] = (byStyle[s] || 0) + 1;
        });
      }
    });

    const totalValue = clothing.reduce((sum, item) => sum + (item.price || 0), 0);
    const totalWear = clothing.reduce((sum, item) => sum + item.wearCount, 0);
    const sortedByWear = [...clothing].sort((a, b) => b.wearCount - a.wearCount);
    const mostWorn = sortedByWear.find(c => c.wearCount > 0);

    return { total, byType, bySeason, byStyle, totalValue, totalWear, mostWorn, sortedByWear };
  }, [clothing]);

  const avgWear = stats.total > 0 ? (stats.totalWear / stats.total).toFixed(1) : '0';
  const costPerWear = stats.totalWear > 0 ? (stats.totalValue / stats.totalWear).toFixed(1) : '0';

  const formatCurrency = (value: number) => {
    if (value >= 10000) {
      return `¥${(value / 10000).toFixed(1)}万`;
    }
    return `¥${value.toLocaleString()}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>穿衣统计</Text>
        <Text style={styles.subtitle}>共 {stats.total} 件衣服</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: `${TYPE_COLORS[0]}15` }]}>
          <View style={[styles.statIconWrap, { backgroundColor: `${TYPE_COLORS[0]}25` }]}>
            <Ionicons name="shirt-outline" size={22} color={TYPE_COLORS[0]} />
          </View>
          <Text style={[styles.statValue, { color: TYPE_COLORS[0] }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>衣服总数</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: `${TYPE_COLORS[1]}15` }]}>
          <View style={[styles.statIconWrap, { backgroundColor: `${TYPE_COLORS[1]}25` }]}>
            <Ionicons name="wallet-outline" size={22} color={TYPE_COLORS[1]} />
          </View>
          <Text style={[styles.statValue, { color: TYPE_COLORS[1] }]}>{formatCurrency(stats.totalValue)}</Text>
          <Text style={styles.statLabel}>总价值</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: `${TYPE_COLORS[2]}15` }]}>
          <View style={[styles.statIconWrap, { backgroundColor: `${TYPE_COLORS[2]}25` }]}>
            <Ionicons name="checkmark-done-outline" size={22} color={TYPE_COLORS[2]} />
          </View>
          <Text style={[styles.statValue, { color: TYPE_COLORS[2] }]}>{stats.totalWear}</Text>
          <Text style={styles.statLabel}>穿着次数</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: `${TYPE_COLORS[3]}15` }]}>
          <View style={[styles.statIconWrap, { backgroundColor: `${TYPE_COLORS[3]}25` }]}>
            <Ionicons name="bar-chart-outline" size={22} color={TYPE_COLORS[3]} />
          </View>
          <Text style={[styles.statValue, { color: TYPE_COLORS[3] }]}>{avgWear}</Text>
          <Text style={styles.statLabel}>平均穿着</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>类型分布</Text>
        <View style={styles.barGroup}>
          {CLOTHING_TYPES.map((type, idx) => {
            const count = stats.byType[type] || 0;
            const percent = stats.total > 0 ? (count / stats.total * 100) : 0;
            return (
              <View key={type} style={styles.barRow}>
                <Text style={styles.barLabel}>{type}</Text>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${percent}%`,
                        backgroundColor: TYPE_COLORS[idx % TYPE_COLORS.length],
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>季节分布</Text>
        <View style={styles.seasonGrid}>
          {SEASON_CONFIG.map(({ season, icon, color, iconColor, bg }) => {
            const count = stats.bySeason[season] || 0;
            return (
              <View key={season} style={[styles.seasonCard, { backgroundColor: bg }]}>
                <View style={[styles.seasonIconWrap, { backgroundColor: color + '30' }]}>
                  <Ionicons name={icon} size={20} color={iconColor} />
                </View>
                <Text style={styles.seasonCount}>{count}</Text>
                <Text style={styles.seasonLabel}>{season}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>风格分布</Text>
        <View style={styles.barGroup}>
          {STYLES.map((style, idx) => {
            const count = stats.byStyle[style] || 0;
            const percent = stats.total > 0 ? (count / stats.total * 100) : 0;
            return (
              <View key={style} style={styles.barRow}>
                <Text style={styles.barLabel}>{style}</Text>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${percent}%`,
                        backgroundColor: TYPE_COLORS[idx % TYPE_COLORS.length],
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {stats.mostWorn && stats.mostWorn.wearCount > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最常穿着</Text>
          <View style={styles.highlightCard}>
            <View style={styles.highlightLeft}>
              <Text style={styles.highlightType}>{stats.mostWorn.type}</Text>
              <Text style={styles.highlightColor}>
                {stats.mostWorn.color} · {stats.mostWorn.brand || '未知品牌'}
              </Text>
            </View>
            <View style={styles.highlightRight}>
              <Text style={styles.highlightCount}>{stats.mostWorn.wearCount}</Text>
              <Text style={styles.highlightUnit}>次</Text>
            </View>
          </View>
        </View>
      )}

      {stats.totalWear > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>性价比分析</Text>
          <View style={styles.highlightCard}>
            <View style={styles.highlightLeft}>
              <Text style={styles.highlightType}>每件衣服平均花费</Text>
              <Text style={styles.highlightColor}>总价值 ÷ 穿着次数</Text>
            </View>
            <View style={styles.highlightRight}>
              <Text style={styles.highlightCount}>¥{costPerWear}</Text>
              <Text style={styles.highlightUnit}>元/次</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.bottom} />
    </ScrollView>
  );
}
