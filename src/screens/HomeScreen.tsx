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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { usePreferenceStore } from '../store/preferenceStore';
import { OutfitRecommendationCard } from '../components/OutfitRecommendationCard';
import { RecentOutfitCard } from '../components/RecentOutfitCard';
import { PreferenceSurveySheet } from '../components/PreferenceSurveySheet';
import { generateRecommendations } from '../services/outfitRecommender';
import { analyzeAttributeGaps, AttributeTip } from '../services/attributeTips';
import { getWeather } from '../services/weatherService';
import { getWearRecordsByDate, getWearRecordsByDateRange } from '../db/wearRecords';
import { ClothingItem, OutfitRecommendation, Weather, WearRecord } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_H_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_H_PADDING * 2;

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
});

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const clothing = useWardrobeStore(s => s.clothing);
  const outfits = useWardrobeStore(s => s.outfits);
  const addWearRecords = useWardrobeStore(s => s.addWearRecords);
  const deleteWearRecordsByDate = useWardrobeStore(s => s.deleteWearRecordsByDate);

  const [weather, setWeather] = useState<Weather | null>(null);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [recIndex, setRecIndex] = useState(0);
  const [recLoading, setRecLoading] = useState(true);
  const [todayRecords, setTodayRecords] = useState<WearRecord[]>([]);
  const [showSurveySheet, setShowSurveySheet] = useState(false);

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

  // Category stats — dynamic from clothing data
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    clothing.forEach(c => {
      const cat = c.parentType || '其他';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [clothing]);

  const totalCount = clothing.length;

  const attributeTips = useMemo(() => analyzeAttributeGaps(clothing), [clothing]);

  // 统计扩展维度：总价、平均穿着、沉睡件数
  const wardrobeInsights = useMemo(() => {
    const active = clothing.filter(c => !c.deletedAt);
    const totalPrice = active.reduce((sum, c) => sum + (c.price || 0), 0);
    const avgWearCount = active.length > 0
      ? active.reduce((sum, c) => sum + (c.wearCount || 0), 0) / active.length
      : 0;
    const SLEEP_THRESHOLD_DAYS = 30;
    const now = Date.now();
    const sleepingCount = active.filter(c => {
      if (!c.lastWornAt) return true; // 从未穿过
      const days = Math.floor((now - new Date(c.lastWornAt).getTime()) / (1000 * 60 * 60 * 24));
      return days > SLEEP_THRESHOLD_DAYS;
    }).length;
    return { totalPrice, avgWearCount, sleepingCount };
  }, [clothing]);

  const loadRecommendations = useCallback(async () => {
    const w = await getWeather();
    setWeather(w);
    setRecLoading(true);
    const recentlyWornDays = await buildRecentlyWornDays();
    const s = useWardrobeStore.getState();
    const prefs = usePreferenceStore.getState();
    const recs = generateRecommendations(s.clothing, s.outfits, w, {
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
      await loadRecommendations();
    };
    init();
  }, []);

  // 记录上次推荐时的数据快照，用于检测变更
  const lastSnapshotRef = useRef({ clothingCount: 0, outfitCount: 0 });

  // 每次页面获得焦点时刷新今日记录，并在数据变更时自动刷新推荐
  useFocusEffect(
    useCallback(() => {
      refreshTodayRecords();
      const s = useWardrobeStore.getState();
      const prev = lastSnapshotRef.current;
      if (s.clothing.length !== prev.clothingCount || s.outfits.length !== prev.outfitCount) {
        if (prev.clothingCount > 0) {
          // 非首次加载，数据确实变了才刷新推荐
          loadRecommendations();
        }
        lastSnapshotRef.current = { clothingCount: s.clothing.length, outfitCount: s.outfits.length };
      }
    }, [refreshTodayRecords, loadRecommendations])
  );

  const handleRefresh = useCallback(async () => {
    if (recIndex < recommendations.length - 1) {
      setRecIndex(recIndex + 1);
    } else {
      const recentlyWornDays = await buildRecentlyWornDays();
      const s = useWardrobeStore.getState();
      const prefs = usePreferenceStore.getState();
      const recs = generateRecommendations(s.clothing, s.outfits, weather, {
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
  }, [recIndex, recommendations.length, weather]);

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

  const goToCalendar = () => navigation.navigate('WearCalendar');

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
    loadRecommendations();
  }, [loadRecommendations]);

  return (
    <View style={styles.container}>
      {/* ── 顶部导航（固定）── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerTitleRow} activeOpacity={0.7}>
          <Text style={styles.headerTitle}>我的衣橱</Text>
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
        </View>

        {recLoading ? (
          <View style={styles.recLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={{ color: theme.colors.textTertiary, fontSize: 13 }}>正在生成推荐...</Text>
          </View>
        ) : recommendation ? (
          <OutfitRecommendationCard
            recommendation={recommendation}
            allClothing={clothing}
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

        {/* ── 近期穿搭 ── */}
        <RecentOutfitCard
          todayRecords={todayRecords}
          onViewCalendar={goToCalendar}
        />
      </ScrollView>

      <PreferenceSurveySheet
        visible={showSurveySheet}
        onClose={() => setShowSurveySheet(false)}
        onSave={handleSaveSurvey}
        initialPrefs={surveyPrefs}
      />

    </View>
  );
}
