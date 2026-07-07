import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../hooks/useTheme';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { useCustomOptionsStore } from '../../store/customOptionsStore';
import { OutfitGroup } from '../../types';
import { GroupFormModal } from './GroupFormModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / NUM_COLUMNS;
const OUTFIT_COLS = 3;
const OUTFIT_CARD_W = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (OUTFIT_COLS - 1)) / OUTFIT_COLS;

type RootStackParamList = {
  GroupDetail: { groupId: number; groupName: string };
  OutfitDetail: { outfitId: number };
  WearCalendar: undefined;
  ClothingSelection: { source?: 'Outfits' | 'Editor'; groupId?: number } | undefined;
};

export function GroupListScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const groups = useWardrobeStore(state => state.groups);
  const outfits = useWardrobeStore(state => state.outfits);

  const [showFormModal, setShowFormModal] = useState(false);
  const [viewMode, setViewMode] = useState<'groups' | 'grid'>('grid');
  const [showSearch, setShowSearch] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | 'all'>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('全部');
  const [selectedTag, setSelectedTag] = useState<string>('全部');
  const [searchKeyword, setSearchKeyword] = useState('');

  const customSeasons = useCustomOptionsStore(s => s.seasons);

  // 网格视图：含搭配的分组（用于筛选 chip）
  const groupChips = useMemo(() => {
    return groups.filter(g => outfits.some(o => o.groupId === g.id));
  }, [groups, outfits]);

  // 季节选项（固定 春夏秋冬 + 全部）
  const seasonOptions = useMemo(() => {
    const base = customSeasons && customSeasons.length > 0 ? customSeasons : ['春', '夏', '秋', '冬'];
    return ['全部', ...base];
  }, [customSeasons]);

  // 标签选项：从现有搭配中聚合
  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    outfits.forEach(o => (o.tags || []).forEach(t => set.add(t)));
    return ['全部', ...[...set].sort()];
  }, [outfits]);

  const groupNameOf = useCallback((groupId: number) => {
    return groups.find(g => g.id === groupId)?.name || '未分组';
  }, [groups]);

  // 网格视图：综合筛选后的搭配
  const filteredOutfits = useMemo(() => {
    let list = outfits;
    if (selectedGroupId !== 'all') list = list.filter(o => o.groupId === selectedGroupId);
    if (selectedSeason !== '全部') list = list.filter(o => (o.seasons || []).includes(selectedSeason));
    if (selectedTag !== '全部') list = list.filter(o => (o.tags || []).includes(selectedTag));
    const kw = searchKeyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(o =>
        (o.name || '').toLowerCase().includes(kw) ||
        (o.notes || '').toLowerCase().includes(kw) ||
        groupNameOf(o.groupId).toLowerCase().includes(kw) ||
        (o.tags || []).some(t => t.toLowerCase().includes(kw))
      );
    }
    return list;
  }, [outfits, selectedGroupId, selectedSeason, selectedTag, searchKeyword, groupNameOf]);

  // 汇总条：当前生效的筛选
  const activeOutfitFilters = useMemo(() => {
    const labels: string[] = [];
    if (searchKeyword.trim()) labels.push(`“${searchKeyword.trim()}”`);
    if (selectedGroupId !== 'all') labels.push(groupNameOf(selectedGroupId));
    if (selectedSeason !== '全部') labels.push(selectedSeason);
    if (selectedTag !== '全部') labels.push(`#${selectedTag}`);
    return labels;
  }, [searchKeyword, selectedGroupId, selectedSeason, selectedTag, groupNameOf]);

  const clearOutfitFilters = useCallback(() => {
    setSelectedGroupId('all');
    setSelectedSeason('全部');
    setSelectedTag('全部');
    setSearchKeyword('');
  }, []);

  const groupOutfitCount = useCallback((groupId: number) => {
    return outfits.filter(o => o.groupId === groupId).length;
  }, [outfits]);

  const groupPreviews = useCallback((groupId: number) => {
    return outfits
      .filter(o => o.groupId === groupId)
      .slice(0, 3)
      .map(o => o.thumbnailUri)
      .filter(Boolean) as string[];
  }, [outfits]);

  const navigateToGroup = useCallback((groupId: number, groupName: string) => {
    navigation.navigate('GroupDetail', { groupId, groupName });
  }, [navigation]);

  const renderGroupCard = ({ item }: { item: OutfitGroup }) => {
    const count = groupOutfitCount(item.id);
    const previews = groupPreviews(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => navigateToGroup(item.id, item.name)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '18' }]}>
            <Text style={[styles.countText, { color: theme.colors.primary }]}>{count}套</Text>
          </View>
        </View>
        {previews.length === 0 ? (
          <View style={styles.previewEmptyRow}>
            <Ionicons name="shirt-outline" size={16} color={theme.colors.textTertiary} />
            <Text style={[styles.previewEmptyText, { color: theme.colors.textTertiary }]}>暂无搭配</Text>
          </View>
        ) : (
          <View style={styles.previewRow}>
            {[0, 1, 2].map(idx => {
              const uri = previews[idx];
              if (uri) {
                return (
                  <View key={idx} style={[styles.previewImageWrap, { borderColor: theme.colors.border }]}>
                    <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
                  </View>
                );
              }
              return (
                <View key={idx} style={[styles.previewPlaceholder, { backgroundColor: theme.colors.card }]} />
              );
            })}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  const data = useMemo(() => {
    // 过滤"未分组"：只有存在未分组搭配时才显示
    const ungrouped = groups.find(g => g.name === '未分组');
    const hasUngroupedOutfits = ungrouped && outfits.some(o => o.groupId === ungrouped.id);

    let visibleGroups = groups.filter(g => {
      if (g.name === '未分组') return !!hasUngroupedOutfits;
      return true;
    });

    // "未分组"始终排在最后
    visibleGroups = [...visibleGroups].sort((a, b) => {
      if (a.name === '未分组') return 1;
      if (b.name === '未分组') return -1;
      return a.sortOrder - b.sortOrder;
    });

    // 搜索分组名
    const kw = searchKeyword.trim().toLowerCase();
    if (kw) {
      visibleGroups = visibleGroups.filter(g => (g.name || '').toLowerCase().includes(kw));
    }

    // 搜索时隐藏「新建分组」卡片
    return kw
      ? visibleGroups
      : [...visibleGroups, { id: -2, name: '', description: '', sortOrder: 999, createdAt: '' } as OutfitGroup];
  }, [groups, outfits, searchKeyword]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>我的搭配</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textTertiary, marginLeft: 6 }]}>
                 · 共 {groups.length} 个分组
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setShowSearch(v => !v)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showSearch ? 'search' : 'search-outline'}
                  size={22}
                  color={showSearch ? theme.colors.primary : theme.colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setViewMode(m => m === 'groups' ? 'grid' : 'groups')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={viewMode === 'groups' ? 'apps-outline' : 'folder-open-outline'}
                  size={22}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => navigation.navigate('WearCalendar')}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {viewMode === 'groups' ? (
      <View style={{ flex: 1 }}>
      {showSearch && (
        <View style={[styles.outfitSearchRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={16} color={theme.colors.textTertiary} />
          <TextInput
            style={[styles.outfitSearchInput, { color: theme.colors.text }]}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            placeholder="搜索分组名..."
            placeholderTextColor={theme.colors.textTertiary}
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity onPress={() => setSearchKeyword('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}
      <FlatList
        data={data}
        renderItem={({ item }) => {
          if (item.id === -2) {
            return (
              <TouchableOpacity
                style={[styles.card, styles.addCard]}
                onPress={() => setShowFormModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="folder-outline" size={28} color={theme.colors.textTertiary} />
                <Text style={[styles.addCardText, { color: theme.colors.textTertiary }]}>新建分组</Text>
              </TouchableOpacity>
            );
          }
          return renderGroupCard({ item });
        }}
        keyExtractor={item => item.id.toString()}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        extraData={isFocused}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.borderLight }]}>
              <Ionicons name="folder-open-outline" size={40} color={theme.colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>还没有分组</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
              创建分组来管理你的搭配
            </Text>
            <TouchableOpacity
              style={[styles.emptyCreateBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowFormModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCreateBtnText}>创建分组</Text>
            </TouchableOpacity>
          </View>
        }
      />
      </View>
      ) : (
        /* 网格视图：所有搭配 + 分组筛选 */
        <View style={{ flex: 1 }}>
          {/* 搜索 */}
          {showSearch && (
          <View style={[styles.outfitSearchRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="search" size={16} color={theme.colors.textTertiary} />
            <TextInput
              style={[styles.outfitSearchInput, { color: theme.colors.text }]}
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              placeholder="搜索搭配名/分组/标签/备注..."
              placeholderTextColor={theme.colors.textTertiary}
            />
            {searchKeyword.length > 0 && (
              <TouchableOpacity onPress={() => setSearchKeyword('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          )}

          {filtersExpanded && (<>
          {/* 季节筛选 */}
          <View style={[styles.outfitFilterBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {seasonOptions.map(s => {
                const active = selectedSeason === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.outfitChip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }, active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                    onPress={() => setSelectedSeason(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.outfitChipText, { color: theme.colors.textSecondary }, active && { color: theme.colors.white }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 分组筛选 */}
          <View style={[styles.outfitFilterBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              <TouchableOpacity
                style={[styles.outfitChip, { backgroundColor: selectedGroupId === 'all' ? theme.colors.primary : theme.colors.background, borderColor: selectedGroupId === 'all' ? theme.colors.primary : theme.colors.border }]}
                onPress={() => setSelectedGroupId('all')}
                activeOpacity={0.7}
              >
                <Text style={[styles.outfitChipText, { color: selectedGroupId === 'all' ? theme.colors.white : theme.colors.textSecondary }]}>全部分组</Text>
              </TouchableOpacity>
              {groupChips.map(g => {
                const active = selectedGroupId === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.outfitChip, { backgroundColor: active ? theme.colors.primary : theme.colors.background, borderColor: active ? theme.colors.primary : theme.colors.border }]}
                    onPress={() => setSelectedGroupId(g.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.outfitChipText, { color: active ? theme.colors.white : theme.colors.textSecondary }]}>{g.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 标签筛选 */}
          {tagOptions.length > 1 && (
            <View style={[styles.outfitFilterBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {tagOptions.map(t => {
                  const active = selectedTag === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.outfitChip, { backgroundColor: active ? theme.colors.primary : theme.colors.background, borderColor: active ? theme.colors.primary : theme.colors.border }]}
                      onPress={() => setSelectedTag(t)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.outfitChipText, { color: active ? theme.colors.white : theme.colors.textSecondary }]}>{t === '全部' ? '全部标签' : `#${t}`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
          </>)}

          {/* 汇总条 */}
          <View style={[styles.outfitSummary, { backgroundColor: theme.colors.primary + '0A', borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.outfitSummaryText, { color: theme.colors.text }]} numberOfLines={1}>
              {activeOutfitFilters.length > 0 ? activeOutfitFilters.join(' · ') : '全部搭配'}
              <Text style={{ color: theme.colors.textTertiary, fontWeight: '400' }}> · 共 {filteredOutfits.length} 套</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={[styles.outfitSummaryClear, { backgroundColor: theme.colors.card }]}
                onPress={() => setFiltersExpanded(v => !v)}
                activeOpacity={0.7}
              >
                <Ionicons name={filtersExpanded ? 'chevron-up' : 'filter-outline'} size={14} color={theme.colors.primary} />
                <Text style={[styles.outfitSummaryClearText, { color: theme.colors.primary }]}>{filtersExpanded ? '收起' : '筛选'}</Text>
              </TouchableOpacity>
              {activeOutfitFilters.length > 0 && (
                <TouchableOpacity style={[styles.outfitSummaryClear, { backgroundColor: theme.colors.card }]} onPress={clearOutfitFilters} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={14} color={theme.colors.primary} />
                  <Text style={[styles.outfitSummaryClearText, { color: theme.colors.primary }]}>清除</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={filteredOutfits}
            renderItem={({ item }) => {
              return (
                <TouchableOpacity
                  style={[styles.outfitCard, { width: OUTFIT_CARD_W, height: OUTFIT_CARD_W, backgroundColor: theme.colors.borderLight }]}
                  onPress={() => navigation.navigate('OutfitDetail', { outfitId: item.id })}
                  activeOpacity={0.85}
                >
                  {item.thumbnailUri ? (
                    <Image source={{ uri: item.thumbnailUri }} style={styles.outfitThumbFill} resizeMode="cover" />
                  ) : (
                    <View style={[styles.outfitThumbFill, { justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="shirt-outline" size={28} color={theme.colors.textTertiary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            keyExtractor={item => item.id.toString()}
            numColumns={OUTFIT_COLS}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.borderLight }]}>
                  <Ionicons name="grid-outline" size={40} color={theme.colors.textTertiary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>暂无搭配</Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
                  {selectedGroupId !== 'all' ? '该分组下还没有搭配' : '去创建你的第一套搭配吧'}
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* FAB — 新建搭配 */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 24 }]}
        onPress={() => navigation.navigate('ClothingSelection', { source: 'Outfits' })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <GroupFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
      />
    </View>
  );
}

const createStyles = (theme: any, insets: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerInner: {
      height: 36,
      justifyContent: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    headerSubtitle: { fontSize: 13, marginTop: 2 },
    headerIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    gridContent: { padding: GRID_PADDING },
    gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
    // 网格视图：筛选 + 汇总 + 搭配卡
    outfitSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    outfitSearchInput: {
      flex: 1,
      fontSize: 14,
      padding: 0,
    },
    outfitFilterBar: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    outfitChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
    },
    outfitChipActive: {},
    outfitChipText: {
      fontSize: 13,
      fontWeight: '600',
    },
    outfitSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    outfitSummaryText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },
    outfitSummaryClear: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      marginLeft: 10,
    },
    outfitSummaryClearText: {
      fontSize: 12,
      fontWeight: '600',
    },
    outfitCard: {
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    outfitThumbFill: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      width: CARD_WIDTH,
      borderRadius: 16,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardName: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
    countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    countText: { fontSize: 11, fontWeight: '600' },
    previewRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
    previewImageWrap: {
      width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
      borderWidth: 1.5,
    },
    previewImage: { width: '100%', height: '100%' },
    previewEmptyRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      height: 48, marginBottom: 8,
    },
    previewEmptyText: { fontSize: 12 },
    previewPlaceholder: {
      width: 48, height: 48, borderRadius: 8,
    },
    cardDesc: { fontSize: 11, lineHeight: 16 },
    addCard: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
      shadowOpacity: 0,
      elevation: 0,
    },
    addCardText: { fontSize: 13, marginTop: 6 },
    empty: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 40, paddingTop: 80,
    },
    emptyIconWrap: {
      width: 88, height: 88, borderRadius: 44,
      justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    emptyCreateBtn: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
    },
    emptyCreateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    fab: {
      position: 'absolute',
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
  });
