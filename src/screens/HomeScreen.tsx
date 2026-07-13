import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWardrobeStore } from '../store/wardrobeStore';
import { usePreferenceStore } from '../store/preferenceStore';
import { OutfitRecommendationCard } from '../components/OutfitRecommendationCard';
import { PreferenceSurveySheet } from '../components/PreferenceSurveySheet';
import { generateRecommendations } from '../services/outfitRecommender';
import { analyzeAttributeGaps, AttributeTip } from '../services/attributeTips';
import { getWeather } from '../services/weatherService';
import { getWearRecordsByDate, getWearRecordsByDateRange } from '../db/wearRecords';
import { ClothingItem, OutfitRecommendation, Weather, WearRecord } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { getIdleItems, getActiveSeasons, getSeasonTransition, computeStreak, formatDate } from '../utils/calendarStats';
import { CalendarInsights } from '../components/CalendarInsights';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_H_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_H_PADDING * 2;
const CAT_COLORS = ['#6B7FD7', '#E8B4A0', '#00B894', '#FDCB6E', '#A29BFE', '#74B9FF'];

/** 温度区间 → 宜穿提示文字（固定映射） */
function getTempHint(temp: number): string {
  if (temp < 10) return '宜厚款';
  if (temp < 15) return '适中外套';
  if (temp < 20) return '薄外套';
  if (temp < 25) return '宜薄款';
  if (temp < 30) return '清凉短袖';
  return '透气清凉';
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/** 查询最近 7 天穿着记录，返回 clothingId → 最近一次距今几天 */
async function buildRecentlyWornDays(): Promise<Map<number, number>> {
  const d = new Date();
  const endDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  d.setDate(d.getDate() - 7);
  const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const records = await getWearRecordsByDateRange(startDate, endDate);
  const map = new Map<number, number>();
  for (const r of records) {
    const ago = daysAgo(r.wornDate);
    const existing = map.get(r.clothingId);
    if (existing === undefined || ago < existing) {
      map.set(r.clothingId, ago);
    }
  }
  return map;
}



const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: CARD_H_PADDING,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: theme.colors.background,
    zIndex: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  headerWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerWeatherText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },

  // ── Category stats ──
  statsCard: {
    marginHorizontal: CARD_H_PADDING,
    marginTop: 16,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 18,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statsHeaderLink: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryItem: {
    alignItems: 'center',
    flex: 1,
  },
  categoryCount: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  categoryName: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: 14,
  },
  insightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  insightItem: {
    alignItems: 'center',
    flex: 1,
  },
  insightValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  insightLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // 类型占比迷你条
  catBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 14,
    backgroundColor: theme.colors.borderLight,
  },
  catSeg: {
    height: 8,
  },
  // 衣橱下拉
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  dropdownMenu: {
    position: 'absolute', left: 20, top: 92,
    backgroundColor: theme.colors.white, borderRadius: 14, paddingVertical: 6,
    minWidth: 180, borderWidth: 1, borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14 },
  dropdownItemText: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.text },
  dropdownItemActive: { color: theme.colors.primary, fontWeight: '700' },

  // ── Quick actions ──
  quickActions: {
    marginHorizontal: CARD_H_PADDING,
    marginTop: 12,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    flexDirection: 'row',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.text,
  },

  // ── 今日穿搭 Hero（天气+今日+推荐融合）──
  todayHero: {
    marginHorizontal: CARD_H_PADDING,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  todayHeroTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  todayHeroSub: { fontSize: 12, color: 'rgba(255,255,255,0.88)', marginTop: 3 },

  // ── Recommendation ──
  recLoading: {
    marginHorizontal: CARD_H_PADDING,
    marginTop: 16,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 10,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  recEmpty: {
    marginHorizontal: CARD_H_PADDING,
    marginTop: 16,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    gap: 8,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },

  // 本周概览
  weekCard: {
    marginHorizontal: CARD_H_PADDING, marginTop: 12,
    backgroundColor: theme.colors.white, borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  weekItem: { flex: 1, alignItems: 'center' },
  weekBig: { fontSize: 18 },
  weekNum: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  weekUnit: { fontSize: 11, color: theme.colors.textTertiary, fontWeight: '500' },
  weekLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  weekDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },

  // 换季提醒
  tipCard: {
    marginHorizontal: CARD_H_PADDING, marginTop: 12,
    backgroundColor: theme.colors.white, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  tipIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  tipTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  tipSub: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  tipBtn: { backgroundColor: theme.colors.primary + '15', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  tipBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },

  // 最近搭配速览
  recentOutfitsWrap: { marginTop: 16 },
  recentOutfitsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: CARD_H_PADDING, marginBottom: 10 },
  recentOutfitsTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  recentOutfitsMore: { fontSize: 12, color: theme.colors.primary, fontWeight: '500' },
  recentOutfitsRow: { paddingHorizontal: CARD_H_PADDING, gap: 10 },
  recentOutfitCard: { width: 96 },
  recentOutfitThumb: { width: 96, height: 120, borderRadius: 12, backgroundColor: theme.colors.borderLight, marginBottom: 6 },
  recentOutfitName: { fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center' },
});

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const clothing = useWardrobeStore(s => s.clothing);
  const outfits = useWardrobeStore(s => s.outfits);
  const wardrobes = useWardrobeStore(s => s.wardrobes);
  const addWearRecords = useWardrobeStore(s => s.addWearRecords);
  const deleteWearRecordsByDate = useWardrobeStore(s => s.deleteWearRecordsByDate);

  const [weather, setWeather] = useState<Weather | null>(null);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [recIndex, setRecIndex] = useState(0);
  const [recLoading, setRecLoading] = useState(true);
  const [todayRecords, setTodayRecords] = useState<WearRecord[]>([]);
  const [showSurveySheet, setShowSurveySheet] = useState(false);
  // 主页级衣橱范围（null = 全部衣橱；仅影响本页概况，不改动全局）
  const [scopeWardrobeId, setScopeWardrobeId] = useState<number | null>(null);
  const [showWardrobeDropdown, setShowWardrobeDropdown] = useState(false);
  const [weekStats, setWeekStats] = useState<{ streak: number; weekDays: number }>({ streak: 0, weekDays: 0 });

  const scopedClothing = useMemo(
    () => (scopeWardrobeId == null ? clothing : clothing.filter(c => c.wardrobeId === scopeWardrobeId)),
    [clothing, scopeWardrobeId]
  );
  const scopeWardrobeName = scopeWardrobeId == null
    ? '全部衣橱'
    : (wardrobes.find(w => w.id === scopeWardrobeId)?.name || '衣橱');

  // 最近推荐过的单品 ID（有上限滑动窗口，避免集合膨胀导致新鲜度失效）
  const recentRecommendedIdsRef = useRef<number[]>([]);
  const MAX_RECENT_IDS = 25;

  function addToRecentIds(ids: number[]) {
    const arr = recentRecommendedIdsRef.current;
    for (const id of ids) {
      const idx = arr.indexOf(id);
      if (idx !== -1) arr.splice(idx, 1); // 移到末尾（最新）
      arr.push(id);
    }
    // 保留最近 25 件，超出部分释放冷却
    while (arr.length > MAX_RECENT_IDS) arr.shift();
  }

  function getRecentIdsSet(): Set<number> {
    return new Set(recentRecommendedIdsRef.current);
  }

  const recommendation = recommendations[recIndex] || null;

  const todayLabel = useMemo(() => {
    const d = new Date();
    const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${wd}`;
  }, []);

  // Category stats — dynamic from (scoped) clothing data
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedClothing.forEach(c => {
      const cat = c.parentType || '其他';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [scopedClothing]);

  const totalCount = scopedClothing.length;

  const attributeTips = useMemo(() => analyzeAttributeGaps(scopedClothing), [scopedClothing]);

  // 统计扩展维度：总价、平均穿着、沉睡件数（沉睡口径与日历闲置一致：当季+在库+含从未穿）
  const wardrobeInsights = useMemo(() => {
    const active = scopedClothing.filter(c => !c.deletedAt);
    const totalPrice = active.reduce((sum, c) => sum + (c.price || 0), 0);
    const avgWearCount = active.length > 0
      ? active.reduce((sum, c) => sum + (c.wearCount || 0), 0) / active.length
      : 0;
    const sleepingCount = getIdleItems(active, getActiveSeasons()).length;
    return { totalPrice, avgWearCount, sleepingCount };
  }, [clothing]);

  // 本周穿搭概览：连续记录天数 + 本周已记录天数（异步加载近 40 天记录）
  const loadWeekStats = useCallback(async () => {
    try {
      const now = new Date();
      const start = new Date(now); start.setDate(start.getDate() - 39);
      const startStr = formatDate(start);
      const todayStr = formatDate(now);
      const recs = await getWearRecordsByDateRange(startStr, todayStr);
      const recordedDates = new Set<string>();
      recs.forEach(r => recordedDates.add(r.wornDate));
      const streak = computeStreak(recordedDates, todayStr);
      // 本周(周一~周日)已记录天数
      const dow = (now.getDay() + 6) % 7; // 0=周一
      const monday = new Date(now); monday.setDate(now.getDate() - dow);
      const weekStrs = new Set<string>();
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        weekStrs.add(formatDate(d));
      }
      const weekDays = [...recordedDates].filter(d => weekStrs.has(d)).length;
      setWeekStats({ streak, weekDays });
    } catch (e) {
      // 静默失败
    }
  }, []);

  // 换季提醒：若刚进入某季节(7天内)，提示整理该季节衣物
  const seasonTransition = useMemo(() => {
    const t = getSeasonTransition();
    if (!t) return null;
    const count = scopedClothing.filter(c => c.seasons && c.seasons.includes(t.season)).length;
    return { season: t.season, count };
  }, [scopedClothing]);

  // 当季闲置提醒 Top3（复用 getIdleItems）
  const idleInsight = useMemo(() => {
    const entries = getIdleItems(scopedClothing.filter(c => !c.deletedAt), getActiveSeasons()).slice(0, 3);
    if (entries.length === 0) return null;
    return {
      emoji: '💤',
      text: '当季闲置未穿',
      items: entries.map(({ item, days, neverWorn }) => ({
        itemId: item.id,
        thumb: item.thumbnailUri || item.imageUri,
        name: item.type || item.remarks || '该衣物',
        days,
        neverWorn,
      })),
    };
  }, [scopedClothing]);

  // 最近搭配（按创建时间倒序，最多 8 套）
  const recentOutfits = useMemo(
    () => [...outfits].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 8),
    [outfits]
  );

  const loadRecommendations = useCallback(async (wardrobeId: number | null) => {
    const w = await getWeather();
    setWeather(w);
    setRecLoading(true);
    const recentlyWornDays = await buildRecentlyWornDays();
    const s = useWardrobeStore.getState();
    const prefs = usePreferenceStore.getState();
    const allClothing = s.clothing;
    const sourceClothing = wardrobeId == null ? allClothing : allClothing.filter(c => c.wardrobeId === wardrobeId);
    const recs = generateRecommendations(sourceClothing, s.outfits, w, {
      recentRecommendedItemIds: getRecentIdsSet(),
      recentlyWornDays,
      blacklistPairs: prefs.blacklist,
      likedItemIds: prefs.likedItemIds,
      preferredStyles: prefs.preferredStyles,
      preferredColors: prefs.preferredColors,
      comfortVsAppearance: prefs.comfortVsAppearance,
      preferredScenes: prefs.preferredScenes,
    });
    const allIds: number[] = [];
    for (const rec of recs) {
      for (const item of rec.items) allIds.push(item.id);
    }
    addToRecentIds(allIds);
    setRecommendations(recs);
    setRecIndex(0);
    setRecLoading(false);
  }, []);

  const refreshTodayRecords = useCallback(async () => {
    const records = await getWearRecordsByDate(todayDateStr());
    setTodayRecords(records);
  }, []);

  /** 跳转搭配画板，将单品预置到画布上 */
  const handleSaveAsOutfit = useCallback((overrideItems?: ClothingItem[]) => {
    const saveItems = overrideItems || recommendation?.items;
    if (!saveItems || saveItems.length === 0) return;
    const ids = [...saveItems.map(i => i.id)].sort((a, b) => a - b);
    const exists = outfits.some(o => {
      const oIds = [...o.itemIds].sort((a, b) => a - b);
      return oIds.length === ids.length && oIds.every((v, i) => v === ids[i]);
    });

    if (exists) {
      Alert.alert('搭配已存在', '这套搭配已经在「我的搭配」中了，是否查看？', [
        { text: '不了', style: 'cancel' },
        { text: '查看', onPress: () => {
          const match = outfits.find(o => {
            const oIds = [...o.itemIds].sort((a, b) => a - b);
            return oIds.length === ids.length && oIds.every((v, i) => v === ids[i]);
          });
          if (match) {
            navigation.navigate('OutfitDetail', { outfitId: match.id });
          }
        }},
      ]);
      return;
    }

    Alert.alert('添加搭配', '将搭配单品添加到我的搭配？', [
      { text: '取消', style: 'cancel' },
      { text: '添加', onPress: () => {
        const outfitStore = require('../store/outfitStore').useOutfitStore.getState();
        outfitStore.reset();
        outfitStore.setSelectedClothings(saveItems);
        navigation.navigate('OutfitEditor', {
          selectedIds: ids,
          exitTo: { screen: 'Home' },
        });
      }},
    ]);
  }, [recommendation, navigation, outfits]);

  /** 替换推荐中的某件单品 */
  const handleReplaceItem = useCallback((index: number, newItem: ClothingItem) => {
    setRecommendations(prev => {
      const updated = prev.map(rec => {
        const newItems = [...rec.items];
        newItems[index] = newItem;
        return { ...rec, items: newItems };
      });
      return updated;
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      await usePreferenceStore.getState().load();
      const s = useWardrobeStore.getState();
      // 确保数据已加载（其他 tab 的 loadData 可能尚未执行）
      if (s.clothing.length === 0) {
        await s.loadData();
      }
      const s2 = useWardrobeStore.getState();
      lastSnapshotRef.current = { clothingCount: s2.clothing.length, outfitCount: s2.outfits.length };
      await refreshTodayRecords();
      await loadRecommendations(scopeWardrobeId);
      await loadWeekStats();
    };
    init();
  }, []);

  // 切换衣橱范围后重新生成推荐（跳过首次，由 init 处理）
  const scopeChangedRef = useRef(false);
  useEffect(() => {
    if (!scopeChangedRef.current) { scopeChangedRef.current = true; return; }
    loadRecommendations(scopeWardrobeId);
  }, [scopeWardrobeId]);

  // 记录上次推荐时的数据快照，用于检测变更
  const lastSnapshotRef = useRef({ clothingCount: 0, outfitCount: 0 });

  // 每次页面获得焦点时刷新今日记录，并在数据变更时自动刷新推荐
  useFocusEffect(
    useCallback(() => {
      refreshTodayRecords();
      loadWeekStats();
      const s = useWardrobeStore.getState();
      const prev = lastSnapshotRef.current;
      if (s.clothing.length !== prev.clothingCount || s.outfits.length !== prev.outfitCount) {
        if (prev.clothingCount > 0) {
          // 非首次加载，数据确实变了才刷新推荐
          loadRecommendations(scopeWardrobeId);
        }
        lastSnapshotRef.current = { clothingCount: s.clothing.length, outfitCount: s.outfits.length };
      }
    }, [refreshTodayRecords, loadRecommendations, scopeWardrobeId])
  );

  const handleRefresh = useCallback(async () => {
    if (recIndex < recommendations.length - 1) {
      setRecIndex(recIndex + 1);
    } else {
      const recentlyWornDays = await buildRecentlyWornDays();
      const s = useWardrobeStore.getState();
      const prefs = usePreferenceStore.getState();
      const sourceClothing = scopeWardrobeId == null ? s.clothing : s.clothing.filter(c => c.wardrobeId === scopeWardrobeId);
      const recs = generateRecommendations(sourceClothing, s.outfits, weather, {
        recentRecommendedItemIds: getRecentIdsSet(),
        recentlyWornDays,
        blacklistPairs: prefs.blacklist,
        likedItemIds: prefs.likedItemIds,
        preferredStyles: prefs.preferredStyles,
        preferredColors: prefs.preferredColors,
        comfortVsAppearance: prefs.comfortVsAppearance,
        preferredScenes: prefs.preferredScenes,
      });
      if (recs.length > 0) {
        const allIds: number[] = [];
        for (const rec of recs) {
          for (const item of rec.items) allIds.push(item.id);
        }
        addToRecentIds(allIds);
        setRecommendations(recs);
        setRecIndex(0);
      }
    }
  }, [recIndex, recommendations.length, weather, scopeWardrobeId]);

  const handleWearRecommendation = useCallback(async (mode: 'append' | 'replace', overrideItems?: ClothingItem[]) => {
    if (!recommendation) return;
    const wearItems = overrideItems || recommendation.items;
    const ids = wearItems.map(i => i.id);
    if (mode === 'replace') {
      await deleteWearRecordsByDate(todayDateStr());
    }
    await addWearRecords(ids, todayDateStr());
    const records = await getWearRecordsByDate(todayDateStr());
    setTodayRecords(records);
  }, [recommendation, addWearRecords, deleteWearRecordsByDate]);

  /** 新建搭配：重置搭配编辑器 store 后跳转 */
  const handleNewOutfit = useCallback(() => {
    const outfitStore = require('../store/outfitStore').useOutfitStore.getState();
    outfitStore.reset();
    navigation.navigate('OutfitEditor', { exitTo: { screen: 'Home' } });
  }, [navigation]);

  const surveyPrefs = useMemo(() => {
    const s = usePreferenceStore.getState();
    return {
      preferredStyles: s.preferredStyles,
      preferredColors: s.preferredColors,
      comfortVsAppearance: s.comfortVsAppearance,
      preferredScenes: s.preferredScenes,
    };
  }, [showSurveySheet]);

  const handleSaveSurvey = useCallback(async (prefs: typeof surveyPrefs) => {
    await usePreferenceStore.getState().setSurveyPreferences(prefs);
    loadRecommendations(scopeWardrobeId);
  }, [loadRecommendations, scopeWardrobeId]);

  return (
    <View style={styles.container}>
      {/* ── 顶部导航（固定）── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerTitleRow} activeOpacity={0.7} onPress={() => setShowWardrobeDropdown(true)}>
          <Text style={styles.headerTitle}>{scopeWardrobeName}</Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        {weather && (
          <View style={styles.headerWeather}>
            <Ionicons
              name={
                weather.condition === '晴' ? 'sunny' :
                weather.condition === '多云' ? 'partly-sunny' :
                weather.condition === '阴' ? 'cloudy' :
                weather.condition === '雨' ? 'rainy' :
                weather.condition === '雪' ? 'snow' :
                'cloudy'
              }
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.headerWeatherText}>{weather.temperature}°C · {getTempHint(weather.temperature)}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 数据统计卡（可点击跳转统计页）── */}
        <TouchableOpacity
          style={styles.statsCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Stats' as any)}
        >
          <View style={styles.statsHeader}>
            <View style={styles.statsHeaderLeft}>
              <View style={styles.statsHeaderIcon}>
                <Ionicons name="bar-chart-outline" size={14} color={theme.colors.primary} />
              </View>
              <Text style={styles.statsHeaderTitle}>衣橱概况</Text>
            </View>
            <Text style={styles.statsHeaderLink}>查看详情 ›</Text>
          </View>

          <View style={styles.categoryRow}>
            {categoryStats.slice(0, 4).map(([cat, count]) => (
              <View key={cat} style={styles.categoryItem}>
                <Text style={styles.categoryCount}>{count}</Text>
                <Text style={styles.categoryName}>{cat}</Text>
              </View>
            ))}
          </View>

          {/* 类型占比迷你条 */}
          {totalCount > 0 && (
            <View style={styles.catBar}>
              {categoryStats.slice(0, 6).map(([cat, count], idx) => (
                <View
                  key={cat}
                  style={[styles.catSeg, { flex: count, backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] }]}
                />
              ))}
            </View>
          )}

          <View style={styles.statsDivider} />

          <View style={styles.insightsRow}>
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>¥{wardrobeInsights.totalPrice.toLocaleString()}</Text>
              <Text style={styles.insightLabel}>总价</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>{wardrobeInsights.avgWearCount.toFixed(1)}</Text>
              <Text style={styles.insightLabel}>次/件</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={[styles.insightValue, { color: theme.colors.warning }]}>{wardrobeInsights.sleepingCount}</Text>
              <Text style={styles.insightLabel}>沉睡件</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>{totalCount}</Text>
              <Text style={styles.insightLabel}>总数</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── 快捷入口 ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('RecordWear')} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>记录穿搭</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('AddClothing')} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>添加单品</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={handleNewOutfit} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="grid-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>新建搭配</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('WearCalendar')} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>穿搭日历</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={() => setShowSurveySheet(true)} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="color-palette-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>个性化</Text>
          </TouchableOpacity>
        </View>

        {recLoading ? (
          <View style={styles.recLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={{ color: theme.colors.textTertiary, fontSize: 13 }}>正在生成推荐...</Text>
          </View>
        ) : recommendation ? (
          <>
            {/* 今日穿搭 Hero：天气 + 今日 + 推荐融合 */}
            <View style={styles.todayHero}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.todayHeroTitle}>今日穿搭</Text>
                <Text style={styles.todayHeroSub}>
                  {todayLabel}{weather ? ` · ${weather.temperature}° ${weather.condition}` : ''}
                </Text>
              </View>
              {weather && (
                <Ionicons
                  name={
                    weather.condition === '晴' ? 'sunny' :
                    weather.condition === '多云' ? 'partly-sunny' :
                    weather.condition === '阴' ? 'cloudy' :
                    weather.condition === '雨' ? 'rainy' :
                    weather.condition === '雪' ? 'snow' : 'cloudy'
                  }
                  size={26}
                  color="#fff"
                />
              )}
            </View>
            <OutfitRecommendationCard
            recommendation={recommendation}
            allClothing={scopedClothing}
            outfits={outfits}
            onRefresh={handleRefresh}
            onWear={handleWearRecommendation}
            onSaveAsOutfit={handleSaveAsOutfit}
            onReplaceItem={handleReplaceItem}
            todayWornIds={todayRecords.map(r => r.clothingId)}
            recTotal={recommendations.length}
            recIndex={recIndex}
            attributeTips={attributeTips}
          />
          </>
        ) : (
          <View style={styles.recEmpty}>
            <Ionicons name="shirt-outline" size={28} color={theme.colors.border} />
            <Text style={{ color: theme.colors.textTertiary, fontSize: 13 }}>
              {totalCount === 0
                ? '去添加你的第一件衣服吧'
                : '需要更多类型单品（如上装+下装）来生成搭配'}
            </Text>
          </View>
        )}

        {/* ── 本周穿搭概览 ── */}
        <View style={styles.weekCard}>
          <View style={styles.weekItem}>
            <Text style={styles.weekBig}>{weekStats.streak > 0 ? '🔥' : '💧'}</Text>
            <Text style={styles.weekNum}>{weekStats.streak}<Text style={styles.weekUnit}> 天</Text></Text>
            <Text style={styles.weekLabel}>连续记录</Text>
          </View>
          <View style={styles.weekDivider} />
          <View style={styles.weekItem}>
            <Text style={styles.weekBig}>📅</Text>
            <Text style={styles.weekNum}>{weekStats.weekDays}<Text style={styles.weekUnit}>/7</Text></Text>
            <Text style={styles.weekLabel}>本周已记录</Text>
          </View>
        </View>

        {/* ── 换季提醒 ── */}
        {seasonTransition && (
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Ionicons name="leaf-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>入{seasonTransition.season}了，整理一下{seasonTransition.season}季衣物？</Text>
              <Text style={styles.tipSub}>你的{seasonTransition.season}季衣物共 {seasonTransition.count} 件</Text>
            </View>
            <TouchableOpacity
              style={styles.tipBtn}
              onPress={() => navigation.navigate('衣橱')}
              activeOpacity={0.7}
            >
              <Text style={styles.tipBtnText}>去整理</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 当季闲置提醒（复用 CalendarInsights）── */}
        {idleInsight && (
          <CalendarInsights
            insights={[idleInsight]}
            onPressItem={(id) => navigation.navigate('ClothingDetail' as any, { id })}
          />
        )}

        {/* ── 最近搭配速览 ── */}
        {recentOutfits.length > 0 && (
          <View style={styles.recentOutfitsWrap}>
            <View style={styles.recentOutfitsHeader}>
              <Text style={styles.recentOutfitsTitle}>最近搭配</Text>
              <TouchableOpacity onPress={() => navigation.navigate('搭配')} activeOpacity={0.7}>
                <Text style={styles.recentOutfitsMore}>全部 ›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentOutfitsRow}>
              {recentOutfits.map(o => {
                const firstItem = clothing.find(c => c.id === o.itemIds[0]);
                const thumb = o.thumbnailUri || firstItem?.thumbnailUri || firstItem?.imageUri || '';
                return (
                  <TouchableOpacity
                    key={o.id}
                    style={styles.recentOutfitCard}
                    onPress={() => navigation.navigate('OutfitDetail', { outfitId: o.id })}
                    activeOpacity={0.7}
                  >
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.recentOutfitThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.recentOutfitThumb, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.borderLight }]}>
                        <Ionicons name="grid-outline" size={20} color={theme.colors.textTertiary} />
                      </View>
                    )}
                    <Text style={styles.recentOutfitName} numberOfLines={1}>{o.name || '未命名搭配'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <PreferenceSurveySheet
        visible={showSurveySheet}
        onClose={() => setShowSurveySheet(false)}
        onSave={handleSaveSurvey}
        initialPrefs={surveyPrefs}
      />

      {/* 衣橱范围切换下拉 */}
      <Modal visible={showWardrobeDropdown} transparent animationType="none" onRequestClose={() => setShowWardrobeDropdown(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowWardrobeDropdown(false)}>
          <View style={styles.dropdownMenu}>
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

    </View>
  );
}
