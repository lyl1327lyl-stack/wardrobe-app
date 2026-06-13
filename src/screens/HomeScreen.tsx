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
import { PreferenceSurveySheet } from '../components/PreferenceSurveySheet';
import { AttributeTipIcon } from '../components/AttributeTipBanner';
import { generateRecommendations } from '../services/outfitRecommender';
import { analyzeAttributeGaps, AttributeTip } from '../services/attributeTips';
import { getWeather } from '../services/weatherService';
import { getWearRecordsByDate, getWearRecordsByDateRange } from '../db/wearRecords';
import { ClothingItem, OutfitRecommendation, Weather, WearRecord } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_H_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_H_PADDING * 2;

// ── Warm MUJI-style palette ──
const PALETTE = {
  bg:          '#FAF7F2',
  card:        '#FFFFFF',
  text:        '#3D3226',
  textSecondary: '#9B8E82',
  textTertiary:  '#C4B8AB',
  primary:     '#B8956A',
  primaryLight:'#E8D5C0',
  border:      '#E8DED2',
  wardrobeBg:  '#F5EDE3',
  shadow:      'rgba(139,115,85,0.10)',
  white:       '#FFFFFF',
  accentGreen: '#8BA888',
  accentRose:  '#D4A99A',
  accentBlue:  '#A0B4C8',
  accentTaupe: '#C4B098',
};

const PARENT_ICONS: Record<string, string> = {
  '上装': 'shirt-outline',
  '下装': 'layers-outline',
  '外套': 'jacket-outline',
  '连衣裙': 'woman-outline',
  '鞋': 'footsteps-outline',
  '配饰': 'glasses-outline',
  '包包': 'bag-outline',
};

const CATEGORY_COLORS = [PALETTE.primary, PALETTE.accentRose, PALETTE.accentBlue, PALETTE.accentTaupe];

/** 温度区间 → 宜穿提示文字（固定映射） */
function getTempHint(temp: number): string {
  if (temp < 5) return '宜厚款';
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



// Illustration aspect ratio: 1536 / 1024 = 1.5
const ILLUSTRATION_ASPECT = 1536 / 1024;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.bg,
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
    backgroundColor: PALETTE.bg,
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
    color: PALETTE.text,
    letterSpacing: -0.3,
  },
  headerWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerWeatherText: {
    fontSize: 12,
    color: PALETTE.textSecondary,
    fontWeight: '500',
  },

  // ── Wardrobe illustration card ──
  illustrationCard: {
    marginHorizontal: CARD_H_PADDING,
    backgroundColor: PALETTE.wardrobeBg,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  illustration: {
    width: CARD_WIDTH,
    height: CARD_WIDTH / ILLUSTRATION_ASPECT,
    resizeMode: 'cover',
  },
  illustrationOverlay: {
    display: 'none' as 'none',
  },

  // ── Category stats ──
  statsCard: {
    marginHorizontal: CARD_H_PADDING,
    marginTop: 16,
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 18,
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryItem: {
    alignItems: 'center',
    flex: 1,
  },
  categoryIconWrap: {
    display: 'none' as 'none',
  },
  categoryCount: {
    fontSize: 22,
    fontWeight: '700',
    color: PALETTE.text,
  },
  categoryName: {
    fontSize: 11,
    color: PALETTE.textSecondary,
    marginTop: 2,
  },
  statsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PALETTE.border,
    marginVertical: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  totalLabel: {
    fontSize: 13,
    color: PALETTE.textSecondary,
  },
  totalCount: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.primary,
  },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: CARD_H_PADDING,
    paddingTop: 28,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: PALETTE.text,
    letterSpacing: -0.2,
  },
  sectionLink: {
    fontSize: 13,
    color: PALETTE.primary,
    fontWeight: '500',
  },

  // ── Recommendation ──
  recLoading: {
    marginHorizontal: CARD_H_PADDING,
    marginTop: 16,
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 10,
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  recEmpty: {
    marginHorizontal: CARD_H_PADDING,
    marginTop: 16,
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    gap: 8,
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },

  // ── Recent additions ──
  recentStrip: {
    paddingHorizontal: CARD_H_PADDING,
    gap: 10,
  },
  recentItem: {
    width: 80,
    alignItems: 'center',
    gap: 6,
  },
  recentImageWrap: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: PALETTE.wardrobeBg,
    overflow: 'hidden',
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  recentImage: {
    width: 76,
    height: 76,
    borderRadius: 14,
  },
  recentPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PALETTE.wardrobeBg,
  },
  recentLabel: {
    fontSize: 11,
    color: PALETTE.textSecondary,
    textAlign: 'center',
  },

  // ── Empty state ──
  emptyState: {
    marginHorizontal: CARD_H_PADDING,
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    gap: 8,
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyText: {
    fontSize: 13,
    color: PALETTE.textTertiary,
  },
});

export function HomeScreen() {
  const navigation = useNavigation<any>();

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

  // Recently added (newest 8)
  const recentAdditions = useMemo(
    () =>
      [...clothing]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [clothing],
  );

  const attributeTips = useMemo(() => analyzeAttributeGaps(clothing), [clothing]);

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
    setTimeout(() => {
      const sortedIds = [...wearItems.map(i => i.id)].sort((a, b) => a - b);
      const outfitExists = useWardrobeStore.getState().outfits.some(o => {
        const oIds = [...o.itemIds].sort((a, b) => a - b);
        return oIds.length === sortedIds.length && oIds.every((v, i) => v === sortedIds[i]);
      });
      if (outfitExists) {
        Alert.alert('记录成功', '今日穿搭已记录');
      } else {
        Alert.alert('记录成功', '是否将这套搭配添加到「我的搭配」？', [
          { text: '以后再说', style: 'cancel' },
          { text: '添加', onPress: () => handleSaveAsOutfit(wearItems) },
        ]);
      }
    }, 400);
  }, [recommendation, addWearRecords, deleteWearRecordsByDate, weather, handleSaveAsOutfit]);

  const goToWardrobe = () => navigation.navigate('衣橱');
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
          <Ionicons name="chevron-down" size={16} color={PALETTE.textSecondary} />
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
              color={PALETTE.textSecondary}
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
        {/* ── 核心视觉卡片：衣橱插画 ── */}
        <View style={styles.illustrationCard}>
          <Image
            source={require('../../assets/wardrobe-illustration-handdrawn.png')}
            style={styles.illustration}
          />
        </View>

        {/* ── 数据统计条 ── */}
        <View style={styles.statsCard}>
          <View style={styles.categoryRow}>
            {categoryStats.slice(0, 4).map(([cat, count], i) => (
              <View key={cat} style={styles.categoryItem}>
                <View style={[styles.categoryIconWrap, { backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] + '20' }]}>
                  <Ionicons
                    name={(PARENT_ICONS[cat] || 'grid-outline') as any}
                    size={18}
                    color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  />
                </View>
                <Text style={styles.categoryCount}>{count}</Text>
                <Text style={styles.categoryName}>{cat}</Text>
              </View>
            ))}
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.totalRow}>
            <Ionicons name="shirt-outline" size={14} color={PALETTE.primary} />
            <Text style={styles.totalLabel}>衣橱总数</Text>
            <Text style={styles.totalCount}>{totalCount} 件</Text>
          </View>
        </View>

        {/* ── 今日穿搭推荐 ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>今日穿搭推荐</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AttributeTipIcon tips={attributeTips} />
            <TouchableOpacity onPress={() => setShowSurveySheet(true)} activeOpacity={0.7}>
              <Text style={styles.sectionLink}>偏好设置</Text>
            </TouchableOpacity>
          </View>
        </View>

        {recLoading ? (
          <View style={styles.recLoading}>
            <ActivityIndicator size="small" color={PALETTE.primary} />
            <Text style={{ color: PALETTE.textTertiary, fontSize: 13 }}>正在生成推荐...</Text>
          </View>
        ) : recommendation ? (
          <OutfitRecommendationCard
            recommendation={recommendation}
            allClothing={clothing}
            onRefresh={handleRefresh}
            onWear={handleWearRecommendation}
            onCalendar={goToCalendar}
            onSaveAsOutfit={handleSaveAsOutfit}
            onReplaceItem={handleReplaceItem}
            todayThumbnails={todayRecords.map(r => ({ uri: r.clothingThumbnailUri, type: r.clothingType, id: r.clothingId }))}
            recTotal={recommendations.length}
            recIndex={recIndex}
            onSwitchToRecommend={() => {}}
          />
        ) : (
          <View style={styles.recEmpty}>
            <Ionicons name="shirt-outline" size={28} color={PALETTE.border} />
            <Text style={{ color: PALETTE.textTertiary, fontSize: 13 }}>
              {totalCount === 0
                ? '去添加你的第一件衣服吧'
                : '需要更多类型单品（如上装+下装）来生成搭配'}
            </Text>
          </View>
        )}

        {/* ── 最近添加 ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>最近添加</Text>
          <TouchableOpacity onPress={goToWardrobe} activeOpacity={0.7}>
            <Text style={styles.sectionLink}>更多 &gt;</Text>
          </TouchableOpacity>
        </View>
        {recentAdditions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentStrip}
          >
            {recentAdditions.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.recentItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ClothingDetail', { id: item.id })}
              >
                <View style={styles.recentImageWrap}>
                  {item.thumbnailUri ? (
                    <Image source={{ uri: item.thumbnailUri }} style={styles.recentImage} />
                  ) : (
                    <View style={styles.recentPlaceholder}>
                      <Ionicons
                        name={(PARENT_ICONS[item.parentType] || 'shirt-outline') as any}
                        size={26}
                        color={PALETTE.primaryLight}
                      />
                    </View>
                  )}
                </View>
                <Text style={styles.recentLabel} numberOfLines={1}>
                  {item.parentType || item.type || '单品'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="add-circle-outline" size={28} color={PALETTE.border} />
            <Text style={styles.emptyText}>去添加你的第一件衣服吧</Text>
          </View>
        )}
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
