import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { Season, WearRecord } from '../types';
import { getWearRecordsByDateRange } from '../db/wearRecords';
import { useTheme } from '../hooks/useTheme';
import { useHeadingFont } from '../hooks/useHeadingFont';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../utils/theme';

const SEASON_CONFIG = [
  { season: '春', icon: 'flower' as const, color: '#A8E6CF', iconColor: '#52B788' },
  { season: '夏', icon: 'sunny' as const, color: '#FFD3A5', iconColor: '#F9A825' },
  { season: '秋', icon: 'leaf' as const, color: '#FFAAA5', iconColor: '#D32F2F' },
  { season: '冬', icon: 'snow' as const, color: '#D5AAFF', iconColor: '#7B1FA2' },
];

const TYPE_COLORS = ['#6B7FD7', '#E8B4A0', '#00B894', '#FDCB6E', '#A29BFE', '#74B9FF'];
const RANK_BG_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      paddingHorizontal: 16, paddingBottom: 12,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      height: 40,
    },
    headerIconBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.background,
      justifyContent: 'center', alignItems: 'center',
    },
    headerTitleWrap: {
      position: 'absolute', left: 60, right: 60, alignItems: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
    wardrobePicker: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, height: 34, borderRadius: 17,
      backgroundColor: theme.colors.primary + '14', borderWidth: 1, borderColor: theme.colors.primary + '30',
      maxWidth: 140,
    },
    wardrobePickerText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary, flexShrink: 1 },
    // 衣橱下拉菜单
    dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
    dropdownMenu: {
      position: 'absolute', right: 12,
      backgroundColor: theme.colors.card, borderRadius: 14, paddingVertical: 6,
      minWidth: 160, ...theme.shadows.md, borderWidth: 1, borderColor: theme.colors.border,
    },
    dropdownItem: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 11, paddingHorizontal: 14,
    },
    dropdownItemText: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.text },
    dropdownItemActive: { color: theme.colors.primary, fontWeight: '700' },
    subtitle: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 6 },
    // 模块1: 筛选器+顶部4卡片 (合并为一个模块)
    filterStatsModule: {
      marginHorizontal: 16, marginTop: 12, marginBottom: 12,
      backgroundColor: theme.colors.card, borderRadius: 16, overflow: 'hidden',
      borderWidth: 1, borderColor: theme.colors.border,
    },
    // 汇总条（始终显示）
    summaryBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 14, paddingVertical: 10,
    },
    summaryLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 },
    summaryBadge: {
      minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
      backgroundColor: theme.colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    summaryBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    summaryText: { fontSize: 13, fontWeight: '600', color: theme.colors.text, flexShrink: 1 },
    summaryRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    summaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 6 },
    summaryBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
    summaryBtnClear: { fontSize: 13, fontWeight: '600', color: theme.colors.textTertiary },
    // 展开后的三维度筛选
    filterExpanded: { paddingHorizontal: 14, paddingBottom: 12, gap: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 },
    dimensionChips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
    dimChip: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
      backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border,
    },
    dimChipActiveAll: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    dimChipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
    dimChipTextActive: { color: '#fff', fontWeight: '600' },
    dimChipTextActiveAll: { color: '#fff', fontWeight: '600' },
    // 顶部4卡片
    statsRow: { flexDirection: 'row', gap: 8, marginVertical: 4 },
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
    // 衣橱分析 section
    analysisSection: {
      backgroundColor: theme.colors.card, marginHorizontal: 16, marginTop: 12, borderRadius: 16,
      padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border,
    },
    analysisCard: {
      backgroundColor: theme.colors.background, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12,
    },
    analysisCardNoBorder: { marginBottom: 0 },
    analysisCardTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 16 },
    analysisCardSubtitle: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
    // 闲置率
    idleTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
    idleBig: { fontSize: 34, fontWeight: '800', color: theme.colors.warning },
    idleBigLabel: { fontSize: 12, color: theme.colors.textTertiary },
    idleProgress: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: theme.colors.borderLight },
    idleLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
    idleLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    idleLegendDot: { width: 9, height: 9, borderRadius: 3 },
    idleLegendText: { fontSize: 11, color: theme.colors.textSecondary },
    // 分布列表（颜色/品牌）
    distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
    distDot: { width: 12, height: 12, borderRadius: 6 },
    distRank: { width: 16, fontSize: 12, fontWeight: '700', color: theme.colors.textTertiary, textAlign: 'center' },
    distName: { fontSize: 13, color: theme.colors.text, width: 56 },
    distBarBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.colors.borderLight, overflow: 'hidden' },
    distBarFill: { height: 8, borderRadius: 4 },
    distCount: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, width: 40, textAlign: 'right' },
    // 穿着活跃度趋势
    trendHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
    trendTotal: { fontSize: 22, fontWeight: '800', color: theme.colors.primary },
    trendTotalLabel: { fontSize: 11, color: theme.colors.textTertiary },
    trendBarRow: { flexDirection: 'row', alignItems: 'flex-end', height: 112, gap: 8 },
    trendBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    trendBar: { width: '70%', borderRadius: 4, minHeight: 3 },
    trendBarVal: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 3 },
    trendBarLabel: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 4 },
    // 价格区间小柱状
    priceBarRow: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8 },
    priceBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    priceBar: { width: '70%', borderRadius: 4, minHeight: 3 },
    priceBarVal: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 3 },
    priceBarLabel: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 4 },
    // 搭配概览 tiles
    outfitTiles: { flexDirection: 'row' },
    outfitTile: { flex: 1, alignItems: 'center' },
    outfitTileVal: { fontSize: 20, fontWeight: '800', color: theme.colors.primary },
    outfitTileLabel: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 3 },
    outfitTileDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 2 },
    bottom: { height: 40 },
  });

export function StatsScreen() {
  const navigation = useNavigation<any>();
  const { clothing, soldClothing, trashClothing, wardrobes, outfits, groups } = useWardrobeStore();
  const categories = useCustomOptionsStore(state => state.categories);
  const getParentOfChild = useCustomOptionsStore(state => state.getParentOfChild);
  const { theme } = useTheme();
  const headingFont = useHeadingFont();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [statsTab, setStatsTab] = useState<'efficiency' | 'frequency' | 'warn' | 'companion'>('efficiency');
  const [warnDays, setWarnDays] = useState(30);
  // 页面级衣橱范围（null = 全部衣橱；默认选中默认衣橱）
  const [scopeWardrobeId, setScopeWardrobeId] = useState<number | null>(null);
  const [showWardrobeDropdown, setShowWardrobeDropdown] = useState(false);
  const [timeRange, setTimeRange] = useState<'month' | 'year'>('month');
  const [chartValueType, setChartValueType] = useState<'value' | 'count'>('value');
  const currentYear = new Date().getFullYear();

  // 衣橱加载后默认选中默认衣橱（"我的衣橱"）
  useEffect(() => {
    if (scopeWardrobeId != null) return;
    const def = wardrobes.find(w => w.isDefault) || wardrobes[0];
    if (def) setScopeWardrobeId(def.id);
  }, [wardrobes, scopeWardrobeId]);

  // 页面级衣橱范围过滤（应用到所有卡片）
  const scopedClothing = useMemo(
    () => (scopeWardrobeId == null ? clothing : clothing.filter(c => c.wardrobeId === scopeWardrobeId)),
    [clothing, scopeWardrobeId]
  );
  const scopedTrash = useMemo(
    () => (scopeWardrobeId == null ? trashClothing : trashClothing.filter(c => c.wardrobeId === scopeWardrobeId)),
    [trashClothing, scopeWardrobeId]
  );
  const scopedSold = useMemo(
    () => (scopeWardrobeId == null ? soldClothing : soldClothing.filter(c => c.wardrobeId === scopeWardrobeId)),
    [soldClothing, scopeWardrobeId]
  );

  // 年份列表（基于购买记录，受衣橱范围约束）
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const allItems = [...scopedClothing, ...scopedTrash, ...scopedSold];
    allItems.forEach(item => {
      if (item.purchaseDate) {
        years.add(new Date(item.purchaseDate).getFullYear());
      }
    });
    return [...years].sort((a, b) => b - a);
  }, [scopedClothing, scopedTrash, scopedSold]);

  const [timelineYear, setTimelineYear] = useState(
    availableYears.length > 0 ? availableYears[0] : currentYear
  );
  const currentSeason = useMemo((): Season => {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return '春';
    if (month >= 6 && month <= 8) return '夏';
    if (month >= 9 && month <= 11) return '秋';
    return '冬';
  }, []);

  const parentCategories = useMemo(() => Object.keys(categories), [categories]);

  // 统计基于衣橱范围（已移除季节/类型细分筛选）
  const filteredClothing = scopedClothing;

  // 统计计算
  const stats = useMemo(() => {
    const total = filteredClothing.length;
    const byParent: Record<string, number> = {};
    const bySeason: Record<string, number> = {};
    const byStyle: Record<string, number> = {};

    filteredClothing.forEach(item => {
      const parent = getParentOfChild(item.type);
      if (parent) byParent[parent] = (byParent[parent] || 0) + 1;
      item.seasons.forEach(s => { bySeason[s] = (bySeason[s] || 0) + 1; });
      if (item.tags) item.tags.forEach(s => { byStyle[s] = (byStyle[s] || 0) + 1; });
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

    // 全部购买时间按年（在库+废弃+卖出，受衣橱范围约束）
    const timelineByYear: Record<string, { count: number; value: number }> = {};
    const allItemsForTimeline = [...scopedClothing, ...scopedTrash, ...scopedSold];
    allItemsForTimeline.forEach(item => {
      if (item.purchaseDate) {
        const date = new Date(item.purchaseDate);
        const key = String(date.getFullYear());
        if (!timelineByYear[key]) timelineByYear[key] = { count: 0, value: 0 };
        timelineByYear[key].count++;
        timelineByYear[key].value += item.price || 0;
      }
    });

    // ROI（受衣橱范围约束）
    const soldTotalBuy = scopedSold.reduce((sum, item) => sum + (item.price || 0), 0);
    const soldTotalSell = scopedSold.reduce((sum, item) => sum + (item.soldPrice || 0), 0);
    const soldCount = scopedSold.length;
    const soldProfit = soldTotalSell - soldTotalBuy;
    const soldRate = soldTotalBuy > 0 ? ((soldTotalSell / soldTotalBuy - 1) * 100) : 0;

    return {
      total, totalValue, totalWear, byParent, bySeason, byStyle,
      efficiencyRank, recentWearRank, unwornWarning, companionRank,
      timelineByYear,
      soldTotalBuy, soldTotalSell, soldCount, soldProfit, soldRate
    };
  }, [scopedClothing, scopedTrash, scopedSold, filteredClothing, getParentOfChild, warnDays, currentSeason]);

  // 月度购买数据 - 根据选择的年份筛选（包含在库+废弃+卖出的衣物）
  const monthlyData = useMemo(() => {
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const result: { month: string; count: number; value: number; year: number }[] = [];
    const now = new Date();
    const isCurrentYear = timelineYear === now.getFullYear();
    const maxMonth = isCurrentYear ? now.getMonth() + 1 : 12;
    const allItems = [...scopedClothing, ...scopedTrash, ...scopedSold];

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
  }, [scopedClothing, scopedTrash, scopedSold, timelineYear]);

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

  // 可选年份已在顶部定义

  const avgWear = stats.total > 0 ? (stats.totalWear / stats.total).toFixed(1) : '0';

  // 统一格式化金额
  const fmtCurrency = (value: number) => {
    if (value >= 10000) return `¥${(value / 10000).toFixed(1)}万`;
    if (value >= 1000) return `¥${(value / 1000).toFixed(0)}k`;
    return `¥${value}`;
  };

  // ============ 衣橱分析 ============
  // 颜色名 -> 色值（用于颜色分布展示）
  const colorHexOf = (name: string): string => {
    const map: Record<string, string> = {
      '黑': '#2B2B2B', '黑色': '#2B2B2B',
      '白': '#EDEDED', '白色': '#EDEDED', '米白': '#F2EDE4',
      '灰': '#9AA0A6', '灰色': '#9AA0A6', '浅灰': '#C9CDD2', '深灰': '#5F6368',
      '红': '#E53935', '红色': '#E53935', '酒红': '#7B1E22',
      '橙': '#FB8C00', '橙色': '#FB8C00', '橘': '#FB8C00', '橘色': '#FB8C00',
      '黄': '#FDD835', '黄色': '#FDD835', '姜黄': '#D49B3C',
      '绿': '#43A047', '绿色': '#43A047', '墨绿': '#1E5631', '军绿': '#5B6E3C', '薄荷绿': '#9FD8C6',
      '蓝': '#1E88E5', '蓝色': '#1E88E5', '藏蓝': '#1A2A4F', '牛仔蓝': '#5A7DA0', '天蓝': '#7EC4E3',
      '紫': '#8E24AA', '紫色': '#8E24AA',
      '粉': '#EC8FBF', '粉色': '#EC8FBF', '裸粉': '#E6B8B0',
      '棕': '#6D4C2E', '棕色': '#6D4C2E', '咖': '#6F4E37', '咖啡': '#6F4E37',
      '卡其': '#BDBA8E', '驼': '#C19A6B', '驼色': '#C19A6B', '杏': '#D8B98A', '杏色': '#D8B98A',
      '银': '#C0C4CC', '银色': '#C0C4CC',
      '金': '#D4AF37', '金色': '#D4AF37',
    };
    if (map[name]) return map[name];
    for (const key of Object.keys(map)) { if (name.includes(key)) return map[key]; }
    return TYPE_COLORS[Math.abs(hashCode(name)) % TYPE_COLORS.length];
  };
  const hashCode = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; };

  // 闲置率（基于衣橱范围，不受季节/类型细分影响）
  const idle = useMemo(() => {
    const total = scopedClothing.length;
    const never = scopedClothing.filter(c => c.wearCount === 0).length;
    const low = scopedClothing.filter(c => c.wearCount > 0 && c.wearCount < 3).length;
    const active = scopedClothing.filter(c => c.wearCount >= 3).length;
    return { total, never, low, active, rate: total > 0 ? Math.round((never / total) * 100) : 0 };
  }, [scopedClothing]);

  // 颜色分布（受季节/类型细分影响）
  const colorDist = useMemo(() => {
    const m: Record<string, number> = {};
    filteredClothing.forEach(c => { const k = (c.color || '').trim() || '未知'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([name, count]) => ({ name, count, hex: name === '未知' ? theme.colors.border : colorHexOf(name) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredClothing, theme]);

  // 价格区间分布
  const priceBuckets = useMemo(() => {
    const buckets = [
      { label: '<100', min: 0, max: 100, count: 0 },
      { label: '100-300', min: 100, max: 300, count: 0 },
      { label: '300-1k', min: 300, max: 1000, count: 0 },
      { label: '1k-3k', min: 1000, max: 3000, count: 0 },
      { label: '3k+', min: 3000, max: Infinity, count: 0 },
    ];
    filteredClothing.forEach(c => {
      const p = c.price || 0;
      const b = buckets.find(bk => p >= bk.min && p < bk.max);
      if (b) b.count++;
    });
    return buckets;
  }, [filteredClothing]);

  // 品牌分布 Top 5
  const brandDist = useMemo(() => {
    const m: Record<string, number> = {};
    filteredClothing.forEach(c => { const k = (c.brand || '').trim(); if (k) m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [filteredClothing]);

  // 季节分布（一件衣服属多季会在多季都计入；占比 = 该季件数 / 总衣物数）
  const seasonDist = useMemo(() => {
    return SEASON_CONFIG.map(s => ({
      name: s.season,
      count: filteredClothing.filter(c => Array.isArray(c.seasons) && c.seasons.includes(s.season)).length,
      color: s.color,
    }));
  }, [filteredClothing]);

  // 大类型（parentType）分布
  const parentTypeDist = useMemo(() => {
    const m: Record<string, number> = {};
    filteredClothing.forEach(c => { const k = (c.parentType || '').trim() || '未分类'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [filteredClothing]);

  // 搭配概览
  const outfitOverview = useMemo(() => {
    const total = outfits.length;
    const totalItems = outfits.reduce((s, o) => s + (o.itemIds?.length || 0), 0);
    const avg = total > 0 ? (totalItems / total).toFixed(1) : '0';
    return { total, avg, groupCount: groups.length };
  }, [outfits, groups]);

  // 穿着活跃度趋势（最近6个月）—— 异步加载穿着记录
  const [wearRecords, setWearRecords] = useState<WearRecord[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
        const endStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const records = await getWearRecordsByDateRange(startStr, endStr);
        if (!cancelled) setWearRecords(records);
      } catch (e) {
        // 静默失败，趋势卡显示空
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const scopedClothingIds = useMemo(() => new Set(scopedClothing.map(c => c.id)), [scopedClothing]);
  const wearTrend = useMemo(() => {
    const now = new Date();
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const result: { month: string; count: number; isCurrent: boolean }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const prefix = `${y}-${String(m).padStart(2, '0')}`;
      const count = wearRecords.filter(r => r.wornDate.startsWith(prefix) && scopedClothingIds.has(r.clothingId)).length;
      result.push({ month: monthNames[m - 1], count, isCurrent: i === 0 });
    }
    return result;
  }, [wearRecords, scopedClothingIds]);
  const wearTrendTotal = wearTrend.reduce((s, m) => s + m.count, 0);



  const getDaysSinceWorn = (lastWornAt: string | null) => {
    if (!lastWornAt) return 0;
    return Math.floor((new Date().getTime() - new Date(lastWornAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  // 当前衣橱范围名称
  const scopeName = scopeWardrobeId == null
    ? '全部衣橱'
    : (wardrobes.find(w => w.id === scopeWardrobeId)?.name || '衣橱');

  return (
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 10 }]}>
        <View style={styles.headerRow}>
          {/* 返回 */}
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          {/* 衣橱筛选下拉 */}
          <TouchableOpacity
            style={styles.wardrobePicker}
            onPress={() => setShowWardrobeDropdown(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="file-tray-full-outline" size={15} color={theme.colors.primary} />
            <Text style={[styles.wardrobePickerText, headingFont]} numberOfLines={1}>{scopeName}</Text>
            <Ionicons name="chevron-down" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 顶部4卡片已并入下方「衣橱分析」模块 */}

      {/* 衣橱分析（整体置顶） */}
      <View style={styles.analysisSection}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: theme.colors.primary + '15' }]}>
            <Ionicons name="pie-chart-outline" size={14} color={theme.colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>衣橱分析</Text>
        </View>

        {/* 概览 4 指标 */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: TYPE_COLORS[0] + '20' }]}>
              <Ionicons name="shirt-outline" size={16} color={TYPE_COLORS[0]} />
            </View>
            <Text style={[styles.statValue, { color: TYPE_COLORS[0] }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>总件数</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: TYPE_COLORS[1] + '20' }]}>
              <Ionicons name="wallet-outline" size={16} color={TYPE_COLORS[1]} />
            </View>
            <Text style={[styles.statValue, { color: TYPE_COLORS[1] }]}>{fmtCurrency(stats.totalValue)}</Text>
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

        {/* 穿着活跃度趋势（最近6个月） */}
        <View style={styles.analysisCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendTotal}>{wearTrendTotal}</Text>
            <Text style={styles.trendTotalLabel}>近6个月穿着次数</Text>
          </View>
          {wearTrendTotal === 0 ? (
            <Text style={styles.emptyText}>近6个月暂无穿着记录</Text>
          ) : (
            <View style={styles.trendBarRow}>
              {wearTrend.map((m) => {
                const max = Math.max(...wearTrend.map(x => x.count));
                const pct = max > 0 ? (m.count / max) * 100 : 0;
                return (
                  <View key={m.month + m.count} style={styles.trendBarCol}>
                    <Text style={styles.trendBarVal}>{m.count}</Text>
                    <View style={[styles.trendBar, { height: `${Math.max(pct * 0.7, m.count > 0 ? 6 : 0)}%`, backgroundColor: m.count > 0 ? (m.isCurrent ? theme.colors.primary : theme.colors.accent) : theme.colors.borderLight }]} />
                    <Text style={[styles.trendBarLabel, m.isCurrent && { color: theme.colors.primary, fontWeight: '600' }]}>{m.month}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 闲置率 */}
        <View style={styles.analysisCard}>
          <Text style={styles.analysisCardTitle}>闲置率</Text>
          {idle.total === 0 ? (
            <Text style={styles.emptyText}>暂无衣物</Text>
          ) : (
            <View style={styles.idleTop}>
              <View>
                <Text style={styles.idleBig}>{idle.rate}%</Text>
                <Text style={styles.idleBigLabel}>从未穿过</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.idleProgress}>
                  <View style={{ flex: idle.never, backgroundColor: theme.colors.warning }} />
                  <View style={{ flex: idle.low, backgroundColor: '#F2C94C' }} />
                  <View style={{ flex: idle.active, backgroundColor: '#4CAF50' }} />
                </View>
                <View style={styles.idleLegend}>
                  <View style={styles.idleLegendItem}><View style={[styles.idleLegendDot, { backgroundColor: theme.colors.warning }]} /><Text style={styles.idleLegendText}>从未穿 {idle.never}</Text></View>
                  <View style={styles.idleLegendItem}><View style={[styles.idleLegendDot, { backgroundColor: '#F2C94C' }]} /><Text style={styles.idleLegendText}>&lt;3次 {idle.low}</Text></View>
                  <View style={styles.idleLegendItem}><View style={[styles.idleLegendDot, { backgroundColor: '#4CAF50' }]} /><Text style={styles.idleLegendText}>活跃 {idle.active}</Text></View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* 颜色分布 */}
        <View style={styles.analysisCard}>
          <Text style={styles.analysisCardTitle}>颜色分布</Text>
          {colorDist.length === 0 ? (
            <Text style={styles.emptyText}>暂无衣物</Text>
          ) : (
            colorDist.slice(0, 6).map((c, idx) => {
              const max = colorDist[0].count;
              return (
                <View key={c.name} style={styles.distRow}>
                  <Text style={styles.distRank}>{idx + 1}</Text>
                  <View style={[styles.distDot, { backgroundColor: c.hex }]} />
                  <Text style={styles.distName} numberOfLines={1}>{c.name}</Text>
                  <View style={styles.distBarBg}>
                    <View style={[styles.distBarFill, { width: `${Math.max((c.count / max) * 100, 8)}%`, backgroundColor: c.hex }]} />
                  </View>
                  <Text style={styles.distCount}>{c.count}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* 季节分布 */}
        <View style={styles.analysisCard}>
          <Text style={styles.analysisCardTitle}>季节分布</Text>
          {filteredClothing.length === 0 ? (
            <Text style={styles.emptyText}>暂无衣物</Text>
          ) : (
            seasonDist.map((s, idx) => {
              const max = Math.max(...seasonDist.map(x => x.count), 1);
              const total = filteredClothing.length;
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              return (
                <View key={s.name} style={styles.distRow}>
                  <Text style={styles.distRank}>{idx + 1}</Text>
                  <View style={[styles.distDot, { backgroundColor: s.color }]} />
                  <Text style={styles.distName} numberOfLines={1}>{s.name}</Text>
                  <View style={styles.distBarBg}>
                    <View style={[styles.distBarFill, { width: `${Math.max((s.count / max) * 100, s.count > 0 ? 8 : 0)}%`, backgroundColor: s.color }]} />
                  </View>
                  <Text style={styles.distCount}>{s.count} · {pct}%</Text>
                </View>
              );
            })
          )}
        </View>

        {/* 大类型分布 */}
        <View style={styles.analysisCard}>
          <Text style={styles.analysisCardTitle}>类型分布（大类型）</Text>
          {parentTypeDist.length === 0 ? (
            <Text style={styles.emptyText}>暂无衣物</Text>
          ) : (
            parentTypeDist.map((p, idx) => {
              const max = parentTypeDist[0].count;
              const total = filteredClothing.length;
              const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
              return (
                <View key={p.name} style={styles.distRow}>
                  <Text style={styles.distRank}>{idx + 1}</Text>
                  <Text style={[styles.distName, { flex: 1, fontWeight: '500' }]} numberOfLines={1}>{p.name}</Text>
                  <View style={styles.distBarBg}>
                    <View style={[styles.distBarFill, { width: `${Math.max((p.count / max) * 100, 8)}%`, backgroundColor: TYPE_COLORS[idx % TYPE_COLORS.length] }]} />
                  </View>
                  <Text style={styles.distCount}>{p.count} · {pct}%</Text>
                </View>
              );
            })
          )}
        </View>

        {/* 价格区间分布 */}
        <View style={styles.analysisCard}>
          <Text style={styles.analysisCardTitle}>价格区间分布</Text>
          {filteredClothing.length === 0 ? (
            <Text style={styles.emptyText}>暂无衣物</Text>
          ) : (
            <View style={styles.priceBarRow}>
              {priceBuckets.map((b, idx) => {
                const max = Math.max(...priceBuckets.map(x => x.count));
                const pct = max > 0 ? (b.count / max) * 100 : 0;
                return (
                  <View key={b.label} style={styles.priceBarCol}>
                    <Text style={styles.priceBarVal}>{b.count}</Text>
                    <View style={[styles.priceBar, { height: `${Math.max(pct * 0.7, b.count > 0 ? 6 : 0)}%`, backgroundColor: b.count > 0 ? TYPE_COLORS[idx % TYPE_COLORS.length] : theme.colors.borderLight }]} />
                    <Text style={styles.priceBarLabel}>{b.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 品牌分布 Top 5 */}
        <View style={styles.analysisCard}>
          <Text style={styles.analysisCardTitle}>品牌分布 Top 5</Text>
          {brandDist.length === 0 ? (
            <Text style={styles.emptyText}>暂无品牌信息</Text>
          ) : (
            brandDist.map((b, idx) => {
              const max = brandDist[0].count;
              return (
                <View key={b.name} style={styles.distRow}>
                  <Text style={styles.distRank}>{idx + 1}</Text>
                  <Text style={[styles.distName, { flex: 1, fontWeight: '500' }]} numberOfLines={1}>{b.name}</Text>
                  <View style={styles.distBarBg}>
                    <View style={[styles.distBarFill, { width: `${Math.max((b.count / max) * 100, 8)}%`, backgroundColor: TYPE_COLORS[idx % TYPE_COLORS.length] }]} />
                  </View>
                  <Text style={styles.distCount}>{b.count}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* 搭配概览 */}
        <View style={[styles.analysisCard, styles.analysisCardNoBorder]}>
          <Text style={styles.analysisCardTitle}>搭配概览</Text>
          <View style={styles.outfitTiles}>
            <View style={styles.outfitTile}>
              <Text style={styles.outfitTileVal}>{outfitOverview.total}</Text>
              <Text style={styles.outfitTileLabel}>已创建搭配</Text>
            </View>
            <View style={styles.outfitTileDivider} />
            <View style={styles.outfitTile}>
              <Text style={styles.outfitTileVal}>{outfitOverview.avg}</Text>
              <Text style={styles.outfitTileLabel}>平均件数/套</Text>
            </View>
            <View style={styles.outfitTileDivider} />
            <View style={styles.outfitTile}>
              <Text style={styles.outfitTileVal}>{outfitOverview.groupCount}</Text>
              <Text style={styles.outfitTileLabel}>分组数</Text>
            </View>
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
                          {chartValueType === 'value' ? fmtCurrency(val) : `${val}件`}
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
                            {chartValueType === 'value' ? fmtCurrency(val) : `${val}件`}
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
                          {chartValueType === 'value' ? fmtCurrency(val) : `${val}件`}
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
                            {chartValueType === 'value' ? fmtCurrency(val) : `${val}件`}
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
            onPress={() => navigation.navigate('StatsDetail', { tab: statsTab })}
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

    {/* 衣橱筛选下拉菜单 */}
    <Modal visible={showWardrobeDropdown} transparent animationType="none" onRequestClose={() => setShowWardrobeDropdown(false)}>
      <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowWardrobeDropdown(false)}>
        <View style={[styles.dropdownMenu, { top: insets.top + 52 }]}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => { setScopeWardrobeId(null); setShowWardrobeDropdown(false); }}
          >
            <Ionicons name="layers-outline" size={16} color={scopeWardrobeId == null ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[styles.dropdownItemText, scopeWardrobeId == null && styles.dropdownItemActive]}>全部衣橱</Text>
            {scopeWardrobeId == null && <Ionicons name="checkmark" size={16} color={theme.colors.primary} />}
          </TouchableOpacity>
          {wardrobes.map(w => {
            const isActive = scopeWardrobeId === w.id;
            return (
              <TouchableOpacity
                key={w.id}
                style={styles.dropdownItem}
                onPress={() => { setScopeWardrobeId(w.id); setShowWardrobeDropdown(false); }}
              >
                <Ionicons name="file-tray-full-outline" size={16} color={isActive ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemActive]} numberOfLines={1}>{w.name}</Text>
                {isActive && <Ionicons name="checkmark" size={16} color={theme.colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
    </>
  );
}