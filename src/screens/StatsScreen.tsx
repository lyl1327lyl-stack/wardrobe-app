import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { STYLES, Season } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

const SEASON_CONFIG = [
  { season: '春', icon: 'flower' as const, color: '#A8E6CF', iconColor: '#52B788' },
  { season: '夏', icon: 'sunny' as const, color: '#FFD3A5', iconColor: '#F9A825' },
  { season: '秋', icon: 'leaf' as const, color: '#FFAAA5', iconColor: '#D32F2F' },
  { season: '冬', icon: 'snow' as const, color: '#D5AAFF', iconColor: '#7B1FA2' },
];

const TYPE_COLORS = ['#6B7FD7', '#E8B4A0', '#00B894', '#FDCB6E', '#A29BFE', '#74B9FF'];
const RANK_BG_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

type FilterScope = 'all' | 'season' | 'type';

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerAccent: { width: 4, height: 24, borderRadius: 2, backgroundColor: theme.colors.primary, marginRight: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    headerIcon: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.background,
      justifyContent: 'center', alignItems: 'center',
    },
    subtitle: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 6 },
    // 模块1: 筛选器+顶部4卡片 (合并为一个模块)
    filterStatsModule: {
      marginHorizontal: 16, marginTop: 12, marginBottom: 12,
      backgroundColor: theme.colors.card, borderRadius: 16, overflow: 'hidden',
      borderWidth: 1, borderColor: theme.colors.border,
    },
    filterSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 8 },
    filterRow: { flexDirection: 'row', gap: 8 },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, backgroundColor: theme.colors.card,
      borderWidth: 1, borderColor: theme.colors.border,
    },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterChipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
    filterChipTextActive: { color: '#fff' },
    filterSeasonRow: { flexDirection: 'row', gap: 8 },
    seasonChip: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 8, borderRadius: 12, backgroundColor: theme.colors.card,
      borderWidth: 1, borderColor: theme.colors.border, gap: 4,
    },
    seasonChipActive: { borderColor: 'transparent' },
    seasonChipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
    seasonChipTextActive: { color: '#fff' },
    filterTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeChip: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
      backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border,
    },
    typeChipActive: { borderColor: 'transparent' },
    typeChipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
    typeChipTextActive: { color: '#fff' },
    // 顶部4卡片
    statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    statCard: {
      flex: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6,
      alignItems: 'center', backgroundColor: theme.colors.background,
      borderWidth: 1, borderColor: theme.colors.border,
    },
    statIconWrap: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
    statLabel: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '500' },
    // 柱状图卡片
    chartSection: {
      marginHorizontal: 16, marginBottom: 12,
      backgroundColor: theme.colors.card, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: theme.colors.border,
    },
    chartTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    chartTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chartIcon: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    chartTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    chartControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    valueToggle: { flexDirection: 'row', backgroundColor: theme.colors.background, borderRadius: 8, padding: 2 },
    valueToggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    valueToggleBtnActive: { backgroundColor: theme.colors.primary },
    valueToggleText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
    valueToggleTextActive: { color: '#fff' },
    timeToggle: { flexDirection: 'row', backgroundColor: theme.colors.background, borderRadius: 8, padding: 2 },
    timeToggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    timeToggleBtnActive: { backgroundColor: theme.colors.primary },
    timeToggleText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
    timeToggleTextActive: { color: '#fff' },
    yearToggle: { flexDirection: 'row', gap: 4 },
    yearBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.colors.background },
    yearBtnActive: { backgroundColor: theme.colors.primary },
    yearBtnText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
    yearBtnTextActive: { color: '#fff' },
    barChartWrap: { marginTop: 10 },
    barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, gap: 4 },
    barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    bar: { width: '80%', borderRadius: 3, minHeight: 3 },
    barInsideLabel: { fontSize: 8, fontWeight: '600', color: '#fff', textAlign: 'center' },
    barTopLabel: { fontSize: 9, color: theme.colors.textSecondary, marginBottom: 3, textAlign: 'center' },
    barBottomLabel: { fontSize: 9, color: theme.colors.textTertiary, marginTop: 4, textAlign: 'center' },
    barValueBadge: { fontSize: 8, color: theme.colors.textTertiary, marginTop: 2 },
    chartEmpty: { height: 80, justifyContent: 'center', alignItems: 'center' },
    // ROI卡片
    roiSection: {
      marginHorizontal: 16, marginBottom: 12,
      backgroundColor: theme.colors.card, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: theme.colors.border,
    },
    roiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    roiRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 12 },
    roiItem: { alignItems: 'center', flex: 1 },
    roiValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    roiLabel: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 3, fontWeight: '500' },
    roiDivider: { width: 1, height: 28, backgroundColor: theme.colors.border },
    roiResult: {
      alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border,
    },
    roiResultValue: { fontSize: 22, fontWeight: '800' },
    roiResultLabel: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 3 },
    roiEmpty: { height: 80, justifyContent: 'center', alignItems: 'center' },
    // 详细统计
    detailSection: {
      backgroundColor: theme.colors.card, marginHorizontal: 16, borderRadius: 16,
      padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    sectionIcon: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1 },
    viewMoreInline: {
      flexDirection: 'row', alignItems: 'center', gap: 2,
      paddingHorizontal: 10, paddingVertical: 5,
    },
    viewMoreInlineText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
    tabRow: {
      flexDirection: 'row', backgroundColor: theme.colors.background,
      borderRadius: 10, padding: 3, marginBottom: 12,
    },
    tab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: theme.colors.card },
    tabText: { fontSize: 11, fontWeight: '600', color: theme.colors.textTertiary },
    tabTextActive: { color: theme.colors.primary },
    // 排行列表
    rankList: { gap: 6 },
    rankItem: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 8, paddingHorizontal: 10, backgroundColor: theme.colors.background, borderRadius: 10,
    },
    rankBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    rankBadgeText: { fontSize: 10, fontWeight: '700', color: '#333' },
    rankThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: theme.colors.borderLight },
    rankInfo: { flex: 1 },
    rankName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
    rankDetail: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 },
    rankValue: { alignItems: 'flex-end' },
    rankValueMain: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
    rankValueSub: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 1 },
    // 未穿提醒
    warnCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: theme.colors.background, borderRadius: 10, padding: 10, marginBottom: 6,
    },
    warnThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: theme.colors.borderLight },
    warnInfo: { flex: 1 },
    warnName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
    warnReason: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 },
    warnDays: { fontSize: 14, fontWeight: '800', color: theme.colors.warning },
    // 空状态
    emptyText: { fontSize: 12, color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: 20 },
    emptyIcon: { alignItems: 'center', marginBottom: 8 },
    // 详细统计-展开列表
    detailListContainer: { maxHeight: 520, minHeight: 200, overflow: 'hidden' },
    detailListExpanded: { maxHeight: undefined },
    detailFadeOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 50,
      backgroundColor: theme.colors.card, opacity: 0.85,
    },
    bottom: { height: 40 },
  });

export function StatsScreen() {
  const navigation = useNavigation<any>();
  const { clothing, soldClothing, trashClothing } = useWardrobeStore();
  const categories = useCustomOptionsStore(state => state.categories);
  const getParentOfChild = useCustomOptionsStore(state => state.getParentOfChild);
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [statsTab, setStatsTab] = useState<'efficiency' | 'frequency' | 'warn' | 'companion'>('efficiency');
  const [warnDays, setWarnDays] = useState(30);
  const [filterScope, setFilterScope] = useState<FilterScope>('all');
  const [filterSeason, setFilterSeason] = useState<Season | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'month' | 'year'>('month');
  const [chartValueType, setChartValueType] = useState<'value' | 'count'>('value');
  const [timelineYear, setTimelineYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const currentSeason = useMemo((): Season => {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return '春';
    if (month >= 6 && month <= 8) return '夏';
    if (month >= 9 && month <= 11) return '秋';
    return '冬';
  }, []);

  const parentCategories = useMemo(() => Object.keys(categories), [categories]);

  // 根据筛选条件过滤衣物
  const filteredClothing = useMemo(() => {
    return clothing.filter(item => {
      if (filterScope === 'all') return true;
      if (filterScope === 'season') {
        if (!filterSeason) return true;
        return item.seasons.includes(filterSeason);
      }
      if (filterScope === 'type') {
        if (!filterType) return true;
        return item.type === filterType;
      }
      return true;
    });
  }, [clothing, filterScope, filterSeason, filterType]);

  // 统计计算 - 依赖 clothing 确保实时刷新
  const stats = useMemo(() => {
    const total = filteredClothing.length;
    const byParent: Record<string, number> = {};
    const bySeason: Record<string, number> = {};
    const byStyle: Record<string, number> = {};

    filteredClothing.forEach(item => {
      const parent = getParentOfChild(item.type);
      if (parent) byParent[parent] = (byParent[parent] || 0) + 1;
      item.seasons.forEach(s => { bySeason[s] = (bySeason[s] || 0) + 1; });
      if (item.styles) item.styles.forEach(s => { byStyle[s] = (byStyle[s] || 0) + 1; });
    });

    const totalValue = filteredClothing.reduce((sum, item) => sum + (item.price || 0), 0);
    const totalWear = filteredClothing.reduce((sum, item) => sum + item.wearCount, 0);

    // 性价比排行
    const efficiencyRank = [...filteredClothing]
      .filter(c => c.wearCount > 0 && c.price > 0)
      .map(c => ({ ...c, costPerWear: c.price / c.wearCount }))
      .sort((a, b) => a.costPerWear - b.costPerWear);

    // 穿着次数排行榜（全部）
    const recentWearRank = [...filteredClothing]
      .filter(c => c.wearCount > 0)
      .sort((a, b) => b.wearCount - a.wearCount);

    // 未穿提醒
    const now = new Date();
    const unwornWarning = [...filteredClothing]
      .filter(c => {
        if (c.wearCount === 0 || !c.lastWornAt) return false;
        const daysSinceWorn = Math.floor((now.getTime() - new Date(c.lastWornAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceWorn < warnDays) return false;
        return c.seasons.includes(currentSeason);
      })
      .sort((a, b) => {
        const aDays = Math.floor((now.getTime() - new Date(a.lastWornAt!).getTime()) / (1000 * 60 * 60 * 24));
        const bDays = Math.floor((now.getTime() - new Date(b.lastWornAt!).getTime()) / (1000 * 60 * 60 * 24));
        return bDays - aDays;
      })
      .slice(0, 5);

    // 陪伴年限
    const companionRank = [...filteredClothing]
      .filter(c => c.purchaseDate)
      .map(c => {
        const daysOwned = Math.floor((now.getTime() - new Date(c.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
        return { ...c, daysOwned };
      })
      .sort((a, b) => b.daysOwned - a.daysOwned)
      .slice(0, 10);

    // 全部购买时间按年（包含在库+废弃+卖出的衣物）
    const timelineByYear: Record<string, { count: number; value: number }> = {};
    const allItemsForTimeline = [...clothing, ...trashClothing, ...soldClothing];
    allItemsForTimeline.forEach(item => {
      if (item.purchaseDate) {
        const date = new Date(item.purchaseDate);
        const key = String(date.getFullYear());
        if (!timelineByYear[key]) timelineByYear[key] = { count: 0, value: 0 };
        timelineByYear[key].count++;
        timelineByYear[key].value += item.price || 0;
      }
    });

    // ROI（不跟随筛选，基于全部已卖出衣物）
    const soldTotalBuy = soldClothing.reduce((sum, item) => sum + (item.price || 0), 0);
    const soldTotalSell = soldClothing.reduce((sum, item) => sum + (item.soldPrice || 0), 0);
    const soldCount = soldClothing.length;
    const soldProfit = soldTotalSell - soldTotalBuy;
    const soldRate = soldTotalBuy > 0 ? ((soldTotalSell / soldTotalBuy - 1) * 100) : 0;

    return {
      total, totalValue, totalWear, byParent, bySeason, byStyle,
      efficiencyRank, recentWearRank, unwornWarning, companionRank,
      timelineByYear,
      soldTotalBuy, soldTotalSell, soldCount, soldProfit, soldRate
    };
  }, [clothing, filteredClothing, soldClothing, trashClothing, getParentOfChild, warnDays, currentSeason]);

  // 月度购买数据 - 根据选择的年份筛选（包含在库+废弃+卖出的衣物）
  const monthlyData = useMemo(() => {
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const result: { month: string; count: number; value: number; year: number }[] = [];
    const now = new Date();
    const isCurrentYear = timelineYear === now.getFullYear();
    const maxMonth = isCurrentYear ? now.getMonth() + 1 : 12;
    const allItems = [...clothing, ...trashClothing, ...soldClothing];

    for (let m = 1; m <= maxMonth; m++) {
      const monthClothing = allItems.filter(item => {
        if (!item.purchaseDate) return false;
        const date = new Date(item.purchaseDate);
        return date.getFullYear() === timelineYear && date.getMonth() + 1 === m;
      });
      result.push({
        month: monthNames[m - 1],
        count: monthClothing.length,
        value: monthClothing.reduce((sum, item) => sum + (item.price || 0), 0),
        year: timelineYear,
      });
    }
    return result;
  }, [clothing, trashClothing, soldClothing, timelineYear]);

  // 年度购买数据
  const yearlyData = useMemo(() => {
    return Object.entries(stats.timelineByYear)
      .map(([year, data]) => ({
        year: parseInt(year),
        count: data.count,
        value: data.value,
      }))
      .sort((a, b) => a.year - b.year)
      .slice(0, 6);
  }, [stats.timelineByYear]);

  // 可选的年份列表（基于有购买记录的年份）
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const allItems = [...clothing, ...trashClothing, ...soldClothing];
    allItems.forEach(item => {
      if (item.purchaseDate) {
        years.add(new Date(item.purchaseDate).getFullYear());
      }
    });
    return [...years].sort((a, b) => b - a);
  }, [clothing, trashClothing, soldClothing]);

  const avgWear = stats.total > 0 ? (stats.totalWear / stats.total).toFixed(1) : '0';

  const formatCurrency = (value: number) => {
    if (value >= 10000) return `¥${(value / 10000).toFixed(1)}万`;
    return `¥${value.toLocaleString()}`;
  };

  const getDaysSinceWorn = (lastWornAt: string | null) => {
    if (!lastWornAt) return 0;
    return Math.floor((new Date().getTime() - new Date(lastWornAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getFilterLabel = () => {
    if (filterScope === 'all') return '全部衣物';
    if (filterScope === 'season' && filterSeason) return filterSeason + '季';
    if (filterScope === 'type' && filterType) return filterType;
    return '全部衣物';
  };

  const fmtK = (v: number) => {
    if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return `¥${v}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <View style={styles.headerAccent} />
            <Text style={styles.title}>衣橱统计</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="analytics-outline" size={20} color={theme.colors.primary} />
          </View>
        </View>
      </View>

      {/* 模块1: 筛选器 + 顶部4卡片 */}
      <View style={styles.filterStatsModule}>
        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, filterScope === 'all' && styles.filterChipActive]}
              onPress={() => { setFilterScope('all'); setFilterSeason(null); setFilterType(null); }}
            >
              <Text style={[styles.filterChipText, filterScope === 'all' && styles.filterChipTextActive]}>全部</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filterScope === 'season' && styles.filterChipActive]}
              onPress={() => { setFilterScope('season'); setFilterSeason(null); setFilterType(null); }}
            >
              <Ionicons name="leaf-outline" size={14} color={filterScope === 'season' ? '#fff' : theme.colors.textSecondary} />
              <Text style={[styles.filterChipText, filterScope === 'season' && styles.filterChipTextActive]}>季节</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filterScope === 'type' && styles.filterChipActive]}
              onPress={() => { setFilterScope('type'); setFilterSeason(null); setFilterType(null); }}
            >
              <Ionicons name="grid-outline" size={14} color={filterScope === 'type' ? '#fff' : theme.colors.textSecondary} />
              <Text style={[styles.filterChipText, filterScope === 'type' && styles.filterChipTextActive]}>类型</Text>
            </TouchableOpacity>
          </View>

          {filterScope === 'season' && (
            <View style={styles.filterSeasonRow}>
              {SEASON_CONFIG.map(({ season, icon, color }) => {
                const isActive = filterSeason === season;
                return (
                  <TouchableOpacity
                    key={season}
                    style={[
                      styles.seasonChip,
                      { backgroundColor: isActive ? color : theme.colors.background, borderColor: isActive ? 'transparent' : theme.colors.border }
                    ]}
                    onPress={() => setFilterSeason(isActive ? null : season)}
                  >
                    <Ionicons name={icon} size={14} color={isActive ? '#fff' : theme.colors.textSecondary} />
                    <Text style={[styles.seasonChipText, isActive && styles.seasonChipTextActive]}>{season}季</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {filterScope === 'type' && (
            <View style={styles.filterTypeRow}>
              {parentCategories.map((parent, idx) => {
                const isActive = filterType === parent;
                const color = TYPE_COLORS[idx % TYPE_COLORS.length];
                return (
                  <TouchableOpacity
                    key={parent}
                    style={[
                      styles.typeChip,
                      { backgroundColor: isActive ? color : theme.colors.background, borderColor: isActive ? 'transparent' : theme.colors.border }
                    ]}
                    onPress={() => setFilterType(isActive ? null : parent)}
                  >
                    <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>{parent}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 顶部4卡片 */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: TYPE_COLORS[0] + '20' }]}>
              <Ionicons name="shirt-outline" size={16} color={TYPE_COLORS[0]} />
            </View>
            <Text style={[styles.statValue, { color: TYPE_COLORS[0] }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>{getFilterLabel()}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: TYPE_COLORS[1] + '20' }]}>
              <Ionicons name="wallet-outline" size={16} color={TYPE_COLORS[1]} />
            </View>
            <Text style={[styles.statValue, { color: TYPE_COLORS[1] }]}>{formatCurrency(stats.totalValue)}</Text>
            <Text style={styles.statLabel}>总价值</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: TYPE_COLORS[2] + '20' }]}>
              <Ionicons name="checkmark-done-outline" size={16} color={TYPE_COLORS[2]} />
            </View>
            <Text style={[styles.statValue, { color: TYPE_COLORS[2] }]}>{stats.totalWear}</Text>
            <Text style={styles.statLabel}>穿着次数</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: TYPE_COLORS[3] + '20' }]}>
              <Ionicons name="bar-chart-outline" size={16} color={TYPE_COLORS[3]} />
            </View>
            <Text style={[styles.statValue, { color: TYPE_COLORS[3] }]}>{avgWear}</Text>
            <Text style={styles.statLabel}>平均穿着</Text>
          </View>
        </View>
      </View>

      {/* 购买趋势柱状图 */}
      <View style={styles.chartSection}>
        <View style={styles.chartTitleRow}>
          <View style={styles.chartTitleLeft}>
            <View style={[styles.chartIcon, { backgroundColor: TYPE_COLORS[2] + '15' }]}>
              <Ionicons name="cart-outline" size={14} color={TYPE_COLORS[2]} />
            </View>
            <Text style={styles.chartTitle}>购买趋势</Text>
          </View>
          <View style={styles.chartControls}>
            <View style={styles.valueToggle}>
              <TouchableOpacity
                style={[styles.valueToggleBtn, chartValueType === 'value' && styles.valueToggleBtnActive]}
                onPress={() => setChartValueType('value')}
              >
                <Text style={[styles.valueToggleText, chartValueType === 'value' && styles.valueToggleTextActive]}>金额</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.valueToggleBtn, chartValueType === 'count' && styles.valueToggleBtnActive]}
                onPress={() => setChartValueType('count')}
              >
                <Text style={[styles.valueToggleText, chartValueType === 'count' && styles.valueToggleTextActive]}>数量</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeToggle}>
              <TouchableOpacity
                style={[styles.timeToggleBtn, timeRange === 'month' && styles.timeToggleBtnActive]}
                onPress={() => setTimeRange('month')}
              >
                <Text style={[styles.timeToggleText, timeRange === 'month' && styles.timeToggleTextActive]}>月</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeToggleBtn, timeRange === 'year' && styles.timeToggleBtnActive]}
                onPress={() => setTimeRange('year')}
              >
                <Text style={[styles.timeToggleText, timeRange === 'year' && styles.timeToggleTextActive]}>年</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 月度视图 */}
        {timeRange === 'month' && (
          <>
            {/* 年份选择器 */}
            {availableYears.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>年份</Text>
                <View style={styles.yearToggle}>
                  {availableYears.slice(0, 4).map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.yearBtn, timelineYear === year && styles.yearBtnActive]}
                      onPress={() => setTimelineYear(year)}
                    >
                      <Text style={[styles.yearBtnText, timelineYear === year && styles.yearBtnTextActive]}>
                        {year === currentYear ? '今年' : year === currentYear - 1 ? '去年' : `${year}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.barChartWrap}>
              <View style={styles.barChart}>
                {monthlyData.map((item, idx) => {
                  const maxVal = chartValueType === 'value'
                    ? Math.max(...monthlyData.map(d => d.value))
                    : Math.max(...monthlyData.map(d => d.count));
                  const val = chartValueType === 'value' ? item.value : item.count;
                  const heightPct = maxVal > 0 ? (val / maxVal * 100) : 0;
                  const hasData = item.count > 0;
                  const showInsideLabel = hasData && heightPct > 30;
                  return (
                    <View key={item.month} style={styles.barColumn}>
                      {hasData && !showInsideLabel && (
                        <Text style={styles.barTopLabel}>
                          {chartValueType === 'value' ? fmtK(val) : `${val}件`}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.max(hasData ? heightPct : 0, hasData ? 3 : 0)}%`,
                            backgroundColor: hasData ? TYPE_COLORS[idx % TYPE_COLORS.length] : theme.colors.borderLight,
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingVertical: 2,
                          },
                        ]}
                      >
                        {showInsideLabel && (
                          <Text style={styles.barInsideLabel}>
                            {chartValueType === 'value' ? fmtK(val) : `${val}件`}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.barBottomLabel}>{item.month}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* 年度视图 */}
        {timeRange === 'year' && (
          <View style={styles.barChartWrap}>
            {yearlyData.length === 0 ? (
              <View style={styles.chartEmpty}>
                <Text style={styles.emptyText}>暂无购买记录</Text>
              </View>
            ) : (
              <View style={styles.barChart}>
                {yearlyData.map((item, idx) => {
                  const maxVal = chartValueType === 'value'
                    ? Math.max(...yearlyData.map(d => d.value))
                    : Math.max(...yearlyData.map(d => d.count));
                  const val = chartValueType === 'value' ? item.value : item.count;
                  const heightPct = maxVal > 0 ? (val / maxVal * 100) : 0;
                  const showInsideLabel = heightPct > 30;
                  return (
                    <View key={item.year} style={styles.barColumn}>
                      {showInsideLabel ? null : (
                        <Text style={styles.barTopLabel}>
                          {chartValueType === 'value' ? fmtK(val) : `${val}件`}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.max(heightPct, 3)}%`,
                            backgroundColor: TYPE_COLORS[idx % TYPE_COLORS.length],
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingVertical: 2,
                          },
                        ]}
                      >
                        {showInsideLabel && (
                          <Text style={styles.barInsideLabel}>
                            {chartValueType === 'value' ? fmtK(val) : `${val}件`}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.barBottomLabel}>{item.year}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      {/* 卖出ROI卡片 */}
      <View style={styles.roiSection}>
        <View style={styles.roiTitleRow}>
          <View style={[styles.chartIcon, { backgroundColor: TYPE_COLORS[4] + '15' }]}>
            <Ionicons name="trending-up-outline" size={14} color={TYPE_COLORS[4]} />
          </View>
          <Text style={styles.chartTitle}>卖出ROI</Text>
        </View>
        {stats.soldCount === 0 ? (
          <View style={styles.roiEmpty}>
            <Text style={styles.emptyText}>暂无卖出的衣服</Text>
          </View>
        ) : (
          <>
            <View style={styles.roiRow}>
              <View style={styles.roiItem}>
                <Text style={styles.roiValue}>¥{stats.soldTotalBuy.toLocaleString()}</Text>
                <Text style={styles.roiLabel}>总买入价</Text>
              </View>
              <View style={styles.roiDivider} />
              <View style={styles.roiItem}>
                <Text style={styles.roiValue}>¥{stats.soldTotalSell.toLocaleString()}</Text>
                <Text style={styles.roiLabel}>总卖出价</Text>
              </View>
              <View style={styles.roiDivider} />
              <View style={styles.roiItem}>
                <Text style={styles.roiValue}>{stats.soldCount}</Text>
                <Text style={styles.roiLabel}>卖出件数</Text>
              </View>
            </View>
            <View style={styles.roiResult}>
              <Text style={[styles.roiResultValue, { color: stats.soldProfit >= 0 ? '#4CAF50' : theme.colors.warning }]}>
                {stats.soldProfit >= 0 ? '+' : ''}¥{stats.soldProfit.toLocaleString()}
              </Text>
              <Text style={styles.roiResultLabel}>
                {stats.soldRate >= 0 ? '收益率' : '损耗率'} {Math.abs(stats.soldRate).toFixed(1)}%
              </Text>
            </View>
          </>
        )}
      </View>

      {/* 详细统计 */}
      <View style={styles.detailSection}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: theme.colors.primary + '15' }]}>
            <Ionicons name="analytics-outline" size={14} color={theme.colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>详细统计</Text>
          <TouchableOpacity
            style={styles.viewMoreInline}
            onPress={() => navigation.navigate('StatsDetail', { tab: statsTab, filterSeason, filterType })}
            activeOpacity={0.7}
          >
            <Text style={styles.viewMoreInlineText}>查看全部</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, statsTab === 'efficiency' && styles.tabActive]}
            onPress={() => setStatsTab('efficiency')}
          >
            <Text style={[styles.tabText, statsTab === 'efficiency' && styles.tabTextActive]}>性价比</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, statsTab === 'frequency' && styles.tabActive]}
            onPress={() => setStatsTab('frequency')}
          >
            <Text style={[styles.tabText, statsTab === 'frequency' && styles.tabTextActive]}>穿着榜</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, statsTab === 'warn' && styles.tabActive]}
            onPress={() => setStatsTab('warn')}
          >
            <Text style={[styles.tabText, statsTab === 'warn' && styles.tabTextActive]}>冷宫榜</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, statsTab === 'companion' && styles.tabActive]}
            onPress={() => setStatsTab('companion')}
          >
            <Text style={[styles.tabText, statsTab === 'companion' && styles.tabTextActive]}>在库时长</Text>
          </TouchableOpacity>
        </View>

        {statsTab === 'efficiency' && (
          <View style={styles.detailListContainer}>
            {stats.efficiencyRank.length === 0 ? (
              <>
                <View style={styles.emptyIcon}><Ionicons name="cash-outline" size={32} color={theme.colors.border} /></View>
                <Text style={styles.emptyText}>暂无穿着次数大于0的衣服</Text>
              </>
            ) : (
              stats.efficiencyRank.slice(0, 10).map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.rankItem}
                  onPress={() => navigation.navigate('ClothingDetail', { id: item.id })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? RANK_BG_COLORS[idx] : theme.colors.borderLight }]}>
                    <Text style={[styles.rankBadgeText, { color: idx < 3 ? '#333' : theme.colors.textTertiary }]}>{idx + 1}</Text>
                  </View>
                  <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.rankThumb} />
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankName}>{item.type}</Text>
                    <Text style={styles.rankDetail}>{item.color} · {item.brand || '未知品牌'}</Text>
                  </View>
                  <View style={styles.rankValue}>
                    <Text style={styles.rankValueMain}>¥{item.costPerWear.toFixed(0)}</Text>
                    <Text style={styles.rankValueSub}>元/次</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
            {stats.efficiencyRank.length > 10 && (
              <View style={styles.detailFadeOverlay} pointerEvents="none" />
            )}
          </View>
        )}

        {statsTab === 'frequency' && (
          <View style={styles.detailListContainer}>
            {stats.recentWearRank.length === 0 ? (
              <>
                <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={32} color={theme.colors.border} /></View>
                <Text style={styles.emptyText}>近30天暂无穿着记录</Text>
              </>
            ) : (
              stats.recentWearRank.slice(0, 10).map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.rankItem}
                  onPress={() => navigation.navigate('ClothingDetail', { id: item.id })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? RANK_BG_COLORS[idx] : theme.colors.borderLight }]}>
                    <Text style={[styles.rankBadgeText, { color: idx < 3 ? '#333' : theme.colors.textTertiary }]}>{idx + 1}</Text>
                  </View>
                  <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.rankThumb} />
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankName}>{item.type}</Text>
                    <Text style={styles.rankDetail}>共 {item.wearCount} 次穿着</Text>
                  </View>
                  <View style={styles.rankValue}>
                    <Text style={styles.rankValueMain}>{item.wearCount}</Text>
                    <Text style={styles.rankValueSub}>次</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
            {stats.recentWearRank.length > 10 && (
              <View style={styles.detailFadeOverlay} pointerEvents="none" />
            )}
          </View>
        )}

        {statsTab === 'warn' && (
          <View style={{ minHeight: 200 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>提醒阈值</Text>
              {[30, 60, 90].map(days => (
                <TouchableOpacity
                  key={days}
                  onPress={() => setWarnDays(days)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                    backgroundColor: warnDays === days ? theme.colors.primary : theme.colors.background,
                  }}
                >
                  <Text style={{ fontSize: 11, color: warnDays === days ? '#fff' : theme.colors.textSecondary, fontWeight: '600' }}>{days}天</Text>
                </TouchableOpacity>
              ))}
            </View>
            {stats.unwornWarning.length === 0 ? (
              <>
                <View style={styles.emptyIcon}><Ionicons name="checkmark-circle-outline" size={32} color={theme.colors.border} /></View>
                <Text style={styles.emptyText}>当前没有超过{warnDays}天未穿的衣服</Text>
              </>
            ) : (
              stats.unwornWarning.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.warnCard}
                  onPress={() => navigation.navigate('ClothingDetail', { id: item.id })}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.warnThumb} />
                  <View style={styles.warnInfo}>
                    <Text style={styles.warnName}>{item.type}</Text>
                    <Text style={styles.warnReason}>{item.color} · {getDaysSinceWorn(item.lastWornAt)}天未穿</Text>
                  </View>
                  <Text style={styles.warnDays}>{getDaysSinceWorn(item.lastWornAt)}天</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* 陪伴年限列表 */}
        {statsTab === 'companion' && (
          <View style={styles.detailListContainer}>
            {stats.companionRank.length === 0 ? (
              <>
                <View style={styles.emptyIcon}><Ionicons name="time-outline" size={32} color={theme.colors.border} /></View>
                <Text style={styles.emptyText}>暂无购买记录</Text>
              </>
            ) : (
              stats.companionRank.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.rankItem}
                  onPress={() => navigation.navigate('ClothingDetail', { id: item.id })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? RANK_BG_COLORS[idx] : theme.colors.borderLight }]}>
                    <Text style={[styles.rankBadgeText, { color: idx < 3 ? '#333' : theme.colors.textTertiary }]}>{idx + 1}</Text>
                  </View>
                  <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.rankThumb} />
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankName}>{item.type}</Text>
                    <Text style={styles.rankDetail}>{item.color} · {item.brand || '未知品牌'}</Text>
                  </View>
                  <View style={styles.rankValue}>
                    <Text style={styles.rankValueMain}>{item.daysOwned}</Text>
                    <Text style={styles.rankValueSub}>天</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      <View style={styles.bottom} />
    </ScrollView>
  );
}