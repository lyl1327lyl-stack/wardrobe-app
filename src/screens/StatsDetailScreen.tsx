import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { Season } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

const TYPE_COLORS = ['#6B7FD7', '#E8B4A0', '#00B894', '#FDCB6E', '#A29BFE', '#74B9FF'];
const RANK_BG_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

type StatsDetailTab = 'efficiency' | 'frequency' | 'warn' | 'companion';

type RouteParams = {
  StatsDetail: {
    tab: StatsDetailTab;
    filterSeason?: Season | null;
    filterType?: string | null;
  };
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
      backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.background,
      justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, flex: 1 },
    headerCount: { fontSize: 13, color: theme.colors.textTertiary, marginLeft: 8 },
    content: { flex: 1, padding: 16 },
    tabRow: {
      flexDirection: 'row', backgroundColor: theme.colors.card,
      borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border,
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
    tabActive: { backgroundColor: theme.colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textTertiary },
    tabTextActive: { color: '#fff' },
    rankList: { gap: 8 },
    rankItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 10, paddingHorizontal: 14, backgroundColor: theme.colors.card,
      borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border,
    },
    rankBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    rankBadgeText: { fontSize: 11, fontWeight: '700', color: '#333' },
    rankThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: theme.colors.borderLight },
    rankInfo: { flex: 1 },
    rankName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    rankDetail: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
    rankValue: { alignItems: 'flex-end' },
    rankValueMain: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
    rankValueSub: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
    warnCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 10, paddingHorizontal: 14, backgroundColor: theme.colors.card,
      borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8,
    },
    warnThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: theme.colors.borderLight },
    warnInfo: { flex: 1 },
    warnName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    warnReason: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
    warnDays: { fontSize: 18, fontWeight: '800', color: theme.colors.warning },
    warnDaysLabel: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2, textAlign: 'right' },
    emptyIcon: { alignItems: 'center', marginBottom: 8, paddingTop: 40 },
    emptyText: { fontSize: 13, color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: 20 },
    warnThresholdRow: {
      flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8,
    },
    warnThresholdLabel: { fontSize: 13, color: theme.colors.textSecondary },
    bottom: { height: 40 },
  });

export function StatsDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'StatsDetail'>>();
  const { tab: initialTab, filterSeason, filterType } = route.params;

  const { clothing, soldClothing } = useWardrobeStore();
  const getParentOfChild = useCustomOptionsStore(state => state.getParentOfChild);
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [statsTab, setStatsTab] = useState<StatsDetailTab>(initialTab);
  const [warnDays, setWarnDays] = useState(30);

  const currentSeason = useMemo((): Season => {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return '春';
    if (month >= 6 && month <= 8) return '夏';
    if (month >= 9 && month <= 11) return '秋';
    return '冬';
  }, []);

  // 过滤后的衣物
  const filteredClothing = useMemo(() => {
    return clothing.filter(item => {
      if (filterSeason) return item.seasons.includes(filterSeason);
      if (filterType) return item.type === filterType;
      return true;
    });
  }, [clothing, filterSeason, filterType]);

  // 统计数据
  const stats = useMemo(() => {
    const efficiencyRank = [...filteredClothing]
      .filter(c => c.wearCount > 0 && c.price > 0)
      .map(c => ({ ...c, costPerWear: c.price / c.wearCount }))
      .sort((a, b) => a.costPerWear - b.costPerWear);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentWearRank = [...filteredClothing]
      .filter(c => c.wearCount > 0)
      .sort((a, b) => b.wearCount - a.wearCount);

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
      });

    // 陪伴年限
    const companionRank = [...filteredClothing]
      .filter(c => c.purchaseDate)
      .map(c => {
        const daysOwned = Math.floor((now.getTime() - new Date(c.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
        return { ...c, daysOwned };
      })
      .sort((a, b) => b.daysOwned - a.daysOwned);

    return { efficiencyRank, recentWearRank, unwornWarning, companionRank };
  }, [filteredClothing, warnDays, currentSeason]);

  const getDaysSinceWorn = (lastWornAt: string | null) => {
    if (!lastWornAt) return 0;
    return Math.floor((new Date().getTime() - new Date(lastWornAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getTabTitle = () => {
    if (statsTab === 'efficiency') return '性价比排行';
    if (statsTab === 'frequency') return '穿着排行榜';
    if (statsTab === 'companion') return '陪伴年限';
    return '冷宫榜';
  };

  const getTotalCount = () => {
    if (statsTab === 'efficiency') return stats.efficiencyRank.length;
    if (statsTab === 'frequency') return stats.recentWearRank.length;
    if (statsTab === 'companion') return stats.companionRank.length;
    return stats.unwornWarning.length;
  };

  const tabTitleMap: Record<StatsDetailTab, string> = {
    efficiency: '性价比',
    frequency: '穿着榜',
    warn: '冷宫榜',
    companion: '在库时长',
  };

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTabTitle()}</Text>
        <Text style={styles.headerCount}>共 {getTotalCount()} 件</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tab 切换 */}
        <View style={styles.tabRow}>
          {(['efficiency', 'frequency', 'warn', 'companion'] as StatsDetailTab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, statsTab === t && styles.tabActive]}
              onPress={() => setStatsTab(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, statsTab === t && styles.tabTextActive]}>{tabTitleMap[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 性价比列表 */}
        {statsTab === 'efficiency' && (
          <View style={[styles.rankList, { minHeight: 200 }]}>
            {stats.efficiencyRank.length === 0 ? (
              <>
                <View style={styles.emptyIcon}><Ionicons name="cash-outline" size={40} color={theme.colors.border} /></View>
                <Text style={styles.emptyText}>暂无穿着次数大于0的衣服</Text>
              </>
            ) : (
              stats.efficiencyRank.map((item, idx) => (
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
          </View>
        )}

        {/* 穿着榜列表 */}
        {statsTab === 'frequency' && (
          <View style={[styles.rankList, { minHeight: 200 }]}>
            {stats.recentWearRank.length === 0 ? (
              <>
                <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={40} color={theme.colors.border} /></View>
                <Text style={styles.emptyText}>暂无穿着记录</Text>
              </>
            ) : (
              stats.recentWearRank.map((item, idx) => (
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
          </View>
        )}

        {/* 冷宫榜列表 */}
        {statsTab === 'warn' && (
          <View style={{ minHeight: 200 }}>
            <View style={styles.warnThresholdRow}>
              <Text style={styles.warnThresholdLabel}>提醒阈值</Text>
              {[30, 60, 90].map(days => (
                <TouchableOpacity
                  key={days}
                  onPress={() => setWarnDays(days)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10,
                    backgroundColor: warnDays === days ? theme.colors.primary : theme.colors.background,
                    borderWidth: 1, borderColor: warnDays === days ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, color: warnDays === days ? '#fff' : theme.colors.textSecondary, fontWeight: '600' }}>{days}天</Text>
                </TouchableOpacity>
              ))}
            </View>
            {stats.unwornWarning.length === 0 ? (
              <>
                <View style={styles.emptyIcon}><Ionicons name="checkmark-circle-outline" size={40} color={theme.colors.border} /></View>
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
                    <Text style={styles.warnReason}>{item.color} · {item.brand || '未知品牌'}</Text>
                  </View>
                  <View>
                    <Text style={styles.warnDays}>{getDaysSinceWorn(item.lastWornAt)}天</Text>
                    <Text style={styles.warnDaysLabel}>未穿</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* 陪伴年限列表 */}
        {statsTab === 'companion' && (
          <View style={[styles.rankList, { minHeight: 200 }]}>
            {stats.companionRank.length === 0 ? (
              <>
                <View style={styles.emptyIcon}><Ionicons name="time-outline" size={40} color={theme.colors.border} /></View>
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

        <View style={styles.bottom} />
      </ScrollView>
    </View>
  );
}
