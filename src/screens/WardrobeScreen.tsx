import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { DEFAULT_OPTIONS, getAllChildren } from '../utils/customOptions';
import { ClothingItem, Season } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../utils/theme';
import { BatchDiscardReasonSheet } from '../components/BatchDiscardReasonSheet';
import MoveToWardrobeSheet from '../components/MoveToWardrobeSheet';
import * as wearRecordsDb from '../db/wearRecords';

const SEASON_FILTER_KEY = 'wardrobe_season_filter';

const GRID_COLUMNS = 4;
const GRID_GAP = 8;
const GRID_PADDING = 16;

const SEASON_OPTIONS: ('全部' | Season)[] = ['全部', '春', '夏', '秋', '冬'];

const SORT_OPTIONS = [
  { key: 'createdAt' as const, label: '创建时间', icon: 'time-outline' as const },
  { key: 'price' as const, label: '价格', icon: 'cash-outline' as const },
  { key: 'color' as const, label: '颜色', icon: 'color-palette-outline' as const },
];

const SEASON_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  '全部': { name: 'grid', color: '#6B7FD7' },
  '春': { name: 'flower', color: '#F06292' },
  '夏': { name: 'sunny', color: '#FFB74D' },
  '秋': { name: 'leaf', color: '#8D6E63' },
  '冬': { name: 'snow', color: '#4FC3F7' },
};

// 父分类图标映射
const PARENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  '上装': 'shirt-outline',
  '下装': 'layers-outline',
  '外套': 'snow-outline',
  '鞋': 'footsteps-outline',
  '配饰': 'sparkles-outline',
  '包包': 'bag-outline',
};

// Create styles dynamically based on theme
const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    // 统一顶栏
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: theme.colors.card,
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
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    headerRightIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    headerIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    draftBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.warning,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    draftBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.white,
    },
    wardrobeSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    wardrobeCount: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    wardrobeCountLabel: {
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    // 季节筛选条
    filterSection: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 4,
      gap: 6,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    categoryCard: {
      backgroundColor: 'transparent',
      paddingVertical: 10,
      paddingHorizontal: 4,
      marginBottom: 6,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    categoryTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    categoryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    categoryCount: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginLeft: 4,
    },
    viewAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    viewAllText: {
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    categoryScroll: {
      gap: 8,
    },
    itemCard: {
      width: 88,
      height: 88,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: 'transparent',
      position: 'relative',
    },
    itemCardSelected: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderRadius: 8,
    },
    itemCardTransparent: {
      width: 88,
      height: 88,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: 'transparent',
      position: 'relative',
    },
    itemImage: {
      width: '100%',
      height: '100%',
      borderRadius: 8,
    },
    costBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
    },
    costText: {
      fontSize: 10,
      color: theme.colors.white,
      fontWeight: '600',
    },
    selectBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // 网格视图样式
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      rowGap: GRID_GAP,
      columnGap: GRID_GAP,
    },
    gridItemWrap: {
      width: 88,
      height: 88,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    gridItemSelected: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    gridItemTransparentWrap: {
      width: 88,
      height: 88,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    gridItemImage: {
      width: 88,
      height: 88,
      borderRadius: 8,
    },
    // 网格视图右下角单次穿着价格
    gridCostBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    gridCostText: {
      fontSize: 9,
      color: theme.colors.white,
      fontWeight: '600',
    },
    gridSelectBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bottomPadding: {
      height: 100,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyIconWrap: {
      width: 112,
      height: 112,
      borderRadius: 56,
      backgroundColor: theme.colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 10,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      lineHeight: 20,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 32,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.lg,
    },
    // Picker dropdown styles
    pickerContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
    },
    pickerBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    pickerDropdown: {
      position: 'absolute',
      top: 100,
      left: 20,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      paddingVertical: 8,
      paddingHorizontal: 12,
      minWidth: 180,
      ...theme.shadows.lg,
    },
    pickerDropdownArrow: {
      position: 'absolute',
      top: -8,
      alignSelf: 'center',
      width: 14,
      height: 14,
      backgroundColor: theme.colors.card,
      transform: [{ rotate: '45deg' }],
    },
    pickerDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginHorizontal: 8,
    },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 10,
      gap: 10,
    },
    pickerOptionActive: {
      backgroundColor: `${theme.colors.primary}10`,
    },
    pickerIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerOptionText: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text,
    },
    pickerOptionTextActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    pickerBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.warning,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    pickerBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.white,
    },
    // Season filter styles
    seasonPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      gap: 4,
    },
    seasonPillActive: {
      backgroundColor: theme.colors.primary,
    },
    seasonPillText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    seasonPillTextActive: {
      color: theme.colors.white,
    },
    // 排序选项条
    sortSection: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    sortContent: {
      gap: 6,
    },
    sortPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: theme.colors.card,
      gap: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sortPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    sortPillText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    sortPillTextActive: {
      color: theme.colors.white,
    },
    batchActionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 40,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      ...theme.shadows.lg,
    },
    batchCountWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      gap: 8,
    },
    batchCountDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
    },
    batchCount: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    batchCountSub: {
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    batchButtonsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    batchBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      maxWidth: 160,
    },
    batchBtnSecondary: {
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    batchBtnDanger: {
      backgroundColor: theme.colors.warning,
    },
    batchBtnSuccess: {
      backgroundColor: '#4CAF50',
    },
    batchBtnIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    batchBtnSecondaryIcon: {
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    batchBtnText: {
      fontSize: 15,
      fontWeight: '600',
    },
    batchBtnSecondaryText: {
      color: theme.colors.textSecondary,
    },
    batchBtnWhiteText: {
      color: theme.colors.white,
    },
  });

export function WardrobeScreen() {
  const navigation = useNavigation<any>();
  const {
    clothing,
    trashClothing,
    soldClothing,
    draftClothing,
    loadData,
    loadDrafts,
    moveMultipleToTrash,
    moveMultipleClothingToWardrobe,
    addWearRecords,
    wardrobes,
    currentWardrobeId,
    loadWardrobes,
    setCurrentWardrobe,
    getCurrentWardrobe,
  } = useWardrobeStore();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const categories = useCustomOptionsStore(state => state.categories);
  const isLoading = useCustomOptionsStore(state => state.isLoading);
  const seasons = useCustomOptionsStore(state => state.seasons);
  const customTags = useCustomOptionsStore(state => state.tags);
  const load = useCustomOptionsStore(state => state.load);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const gridItemSize = useMemo(() => {
    const { width: screenWidth } = Dimensions.get('window');
    return (screenWidth - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  }, []);

  const tagOptions = useMemo(() => {
    return customTags && customTags.length > 0 ? customTags : DEFAULT_OPTIONS.tags;
  }, [customTags]);

  const [selectedSeason, setSelectedSeason] = useState<('全部' | Season)>('全部');
  const [seasonLoaded, setSeasonLoaded] = useState(false);

  // 从 AsyncStorage 恢复季节筛选
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SEASON_FILTER_KEY);
        if (saved && SEASON_OPTIONS.includes(saved as any)) {
          setSelectedSeason(saved as ('全部' | Season));
        }
      } catch {}
      setSeasonLoaded(true);
    })();
  }, []);

  // 季节变更时持久化
  const handleSeasonChange = useCallback((season: '全部' | Season) => {
    setSelectedSeason(season);
    AsyncStorage.setItem(SEASON_FILTER_KEY, season).catch(() => {});
  }, []);

  const [selectedTag, setSelectedTag] = useState<string>('全部');
  const [selectedType, setSelectedType] = useState<string>('全部');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [showWardrobePicker, setShowWardrobePicker] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // 批量选择状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBatchDiscardSheet, setShowBatchDiscardSheet] = useState(false);
  const [showMoveSheet, setShowMoveSheet] = useState(false);

  useEffect(() => {
    loadData();
    load();
    loadWardrobes();
    loadDrafts();
  }, []);

  // 当前选中的衣橱
  const currentWardrobe = getCurrentWardrobe();

  // 调试日志
  console.log('[WardrobeScreen] RENDER - isSelecting:', isSelecting, 'selectedIds:', selectedIds, 'clothingCount:', clothing.length);

  const handlePress = (item: ClothingItem) => {
    navigation.navigate('ClothingDetail', { id: item.id });
  };

  const handleViewAll = (parent: string) => {
    const season = selectedSeason;
    navigation.navigate('CategoryDetail', { type: parent, season });
  };

  const getItemId = (item: ClothingItem) => Number(item.id);

  const getTitle = () => {
    if (selectedSeason === '全部') return '我的衣橱';
    return `${selectedSeason}季衣橱`;
  };

  // 不含种类筛选的列表，用于计算 availableParents（避免种类筛选后其他选项消失）
  const clothingForTypeFilter = useMemo(() => {
    let result = clothing.filter(item => item.wardrobeId === currentWardrobeId);
    if (selectedSeason !== '全部') {
      result = result.filter(item => item.seasons.includes(selectedSeason));
    }
    if (selectedTag !== '全部') {
      result = result.filter(item => item.tags.includes(selectedTag));
    }
    return result;
  }, [selectedSeason, selectedTag, clothing, currentWardrobeId]);

  // 使用 useMemo 确保稳定的数组引用
  const filteredClothing = useMemo(() => {
    let result = clothingForTypeFilter;
    // 按衣服种类筛选（仅网格模式生效）
    if (viewMode === 'grid' && selectedType !== '全部') {
      result = result.filter(item => item.parentType === selectedType);
    }
    // 排序：网格视图使用选择的排序方式，列表视图默认按创建时间
    const sortKey = viewMode === 'grid' ? sortBy : 'createdAt';
    const ascending = viewMode === 'grid' ? sortAsc : false;
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'createdAt':
          cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        case 'price':
          cmp = (a.price || 0) - (b.price || 0);
          break;
        case 'type':
          cmp = (a.parentType || a.type || '').localeCompare(b.parentType || b.type || '')
            || (a.type || '').localeCompare(b.type || '');
          break;
        case 'color':
          cmp = (a.color || '').localeCompare(b.color || '');
          break;
      }
      return ascending ? cmp : -cmp;
    });
    return result;
  }, [clothingForTypeFilter, selectedType, sortBy, sortAsc, viewMode]);

  const effectiveCategories = categories && Object.keys(categories).length > 0 ? categories : DEFAULT_OPTIONS.categories;
  const parentCategories = Object.keys(effectiveCategories);

  // 获取所有已知的子分类
  const allKnownChildren = useMemo(() => getAllChildren(effectiveCategories), [effectiveCategories]);

  // 获取未分类的衣服（parentType 为空且 type 也不是任何已知父分类）
  const uncategorizedItems = useMemo(() => {
    return filteredClothing.filter(item => {
      // 有 parentType 的都已被 getClothingByParent 处理，不属于未分类
      if (item.parentType) return false;
      // parentType 为空时：如果 type 正好是某个父分类名称，可归属到该父分类（不算未分类）
      if (parentCategories.includes(item.type)) return false;
      // 其他情况视为未分类
      return true;
    });
  }, [filteredClothing, parentCategories]);

  // 根据父分类获取衣服（直接用 parentType 字段匹配，消除歧义）
  // 使用 clothingForTypeFilter 确保种类筛选芯片不会因选中某项而消失
  const getClothingByParent = useMemo(() => {
    return (parent: string) => {
      return clothingForTypeFilter.filter(item => {
        // 直接匹配 parentType
        if (item.parentType === parent) return true;
        // parentType 为空时，如果 type 正好是这个父分类名称（直接选了一级分类的情况）
        if (!item.parentType && item.type === parent) return true;
        return false;
      });
    };
  }, [clothingForTypeFilter]);

  // Find parents that have clothes with matching types
  const parentsWithClothing = useMemo(() => {
    return parentCategories.filter(parent => getClothingByParent(parent).length > 0);
  }, [parentCategories, getClothingByParent]);

  // If some parents have clothes, show only those. Otherwise show all (to ensure something displays)
  const availableParents = useMemo(() => {
    return parentsWithClothing.length > 0 ? [...new Set(parentsWithClothing)] : [...new Set(parentCategories)];
  }, [parentsWithClothing, parentCategories]);

  const hasUncategorized = uncategorizedItems.length > 0;
  const isEmpty = filteredClothing.length === 0;
  const seasonOptions: ('全部' | Season)[] = ['全部', ...(seasons || [])];

  // 批量选择相关函数
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === filteredClothing.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClothing.map(item => Number(item.id)));
    }
  }, [selectedIds.length, filteredClothing]);

  const cancelSelection = useCallback(() => {
    console.log('[cancelSelection] START - isSelecting:', true, '-> will set to false');
    setIsSelecting(false);
    setSelectedIds([]);
    console.log('[cancelSelection] END');
  }, []);

  const handleLongPress = useCallback((id: number) => {
    if (!isSelecting) {
      setIsSelecting(true);
      setSelectedIds([Number(id)]);
    }
  }, [isSelecting]);

  const handleBatchTrash = () => {
    if (selectedIds.length === 0) return;
    setShowBatchDiscardSheet(true);
  };

  const handleBatchDiscardConfirm = async (reason: string) => {
    await moveMultipleToTrash(selectedIds.map(id => Number(id)), reason);
    cancelSelection();
  };

  const handleMoveToWardrobe = async (targetWardrobeId: number) => {
    await moveMultipleClothingToWardrobe(selectedIds.map(id => Number(id)), targetWardrobeId);
    // 刷新数据
    await loadData();
    cancelSelection();
  };

  const handleBatchWear = () => {
    if (selectedIds.length === 0) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const selectedCount = selectedIds.length;

    Alert.alert(
      '记录穿着',
      `确定要记录这 ${selectedCount} 件衣物的穿着吗？\n\n今日已记录的衣服将自动跳过。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: async () => {
            try {
              const recordedCount = await addWearRecords(selectedIds.map(id => Number(id)), dateStr);
              if (recordedCount === 0) {
                Alert.alert('今日已记录', '所选衣物今天都已记录过穿着，无需重复记录。');
              } else {
                Alert.alert('已记录穿着', `成功记录 ${recordedCount} 件衣物的穿着。`);
              }
              cancelSelection();
              await loadData();
            } catch (e) {
              console.error('记录穿着失败:', e);
              Alert.alert('记录穿着失败');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* 统一顶栏 */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
        {isSelecting ? (
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.wardrobeSelector} onPress={cancelSelection} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
              <Text style={[styles.headerTitle, { fontSize: 17 }]}>取消选择</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={selectAll} activeOpacity={0.7}>
              <Text style={[styles.wardrobeCount, { fontSize: 15, color: theme.colors.primary }]}>
                {selectedIds.length === filteredClothing.length ? '取消全选' : '全选'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            {/* 左侧：衣橱选择器 */}
            <TouchableOpacity
              style={styles.wardrobeSelector}
              onPress={() => setShowWardrobePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.headerTitle}>{currentWardrobe?.name || '我的衣橱'}</Text>
              <Ionicons name="chevron-down" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            {/* 右侧：视图切换 + 日历 + 草稿箱 */}
            <View style={styles.headerRightIcons}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
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
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => navigation.navigate('Drafts')}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text-outline" size={22} color={theme.colors.warning} />
                {draftClothing.length > 0 && (
                  <View style={styles.draftBadge}>
                    <Text style={styles.draftBadgeText}>{draftClothing.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        </View>
      </View>

      {/* 季节筛选按钮 */}
      <View style={styles.filterSection}>
        {SEASON_OPTIONS.map((season) => {
          const isSelected = selectedSeason === season;
          const iconConfig = SEASON_ICONS[season];
          const handlePress = () => {
            handleSeasonChange(season);
          };
          return (
            <TouchableOpacity
              key={season}
              style={[styles.seasonPill, isSelected && styles.seasonPillActive]}
              onPress={handlePress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconConfig.name}
                size={14}
                color={isSelected ? theme.colors.white : theme.colors.textTertiary}
              />
              <Text style={[styles.seasonPillText, isSelected && styles.seasonPillTextActive]}>
                {season === '全部' ? '全部' : season}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 衣服种类筛选 - 仅网格视图 */}
      {viewMode === 'grid' && (
        <View style={styles.filterSection}>
          {['全部', ...availableParents].map((type) => {
            const isSelected = selectedType === type;
            const handlePress = () => setSelectedType(type);
            return (
              <TouchableOpacity
                key={type}
                style={[styles.seasonPill, isSelected && styles.seasonPillActive]}
                onPress={handlePress}
                activeOpacity={0.7}
              >
                <Text style={[styles.seasonPillText, isSelected && styles.seasonPillTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 标签筛选按钮 - 单选 */}
      <View style={styles.filterSection}>
        {['全部', ...tagOptions].map((tag) => {
          const isSelected = selectedTag === tag;
          const handlePress = () => {
            setSelectedTag(tag);
          };
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.seasonPill, isSelected && styles.seasonPillActive]}
              onPress={handlePress}
              activeOpacity={0.7}
            >
              <Text style={[styles.seasonPillText, isSelected && styles.seasonPillTextActive]}>
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 排序 - 仅网格视图 */}
      {viewMode === 'grid' && (
        <View style={styles.sortSection}>
          <Ionicons name="swap-vertical-outline" size={14} color={theme.colors.textTertiary} style={{ marginRight: 6 }} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortContent}
          >
          {SORT_OPTIONS.map((opt) => {
            const isActive = sortBy === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortPill, isActive && styles.sortPillActive]}
                onPress={() => {
                  if (sortBy === opt.key) {
                    setSortAsc(!sortAsc);
                  } else {
                    setSortBy(opt.key);
                    setSortAsc(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.icon}
                  size={13}
                  color={isActive ? theme.colors.white : theme.colors.textTertiary}
                />
                <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>
                  {opt.label}
                </Text>
                {isActive && (
                  <Ionicons
                    name={sortAsc ? 'arrow-up' : 'arrow-down'}
                    size={11}
                    color={theme.colors.white}
                  />
                )}
              </TouchableOpacity>
            );
          })}
          </ScrollView>
        </View>
      )}

      {/* 内容区域 */}
      {isEmpty ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="shirt-outline" size={56} color={theme.colors.border} />
          </View>
          <Text style={styles.emptyTitle}>
            {selectedSeason === '全部' ? '还没有添加衣服' : `暂无${selectedSeason}季衣物`}
          </Text>
          <Text style={styles.emptySubtext}>
            {selectedSeason === '全部' ? '点击下方按钮添加第一件衣服' : '试试切换其他季节'}
          </Text>
        </View>
      ) : viewMode === 'grid' ? (
        /* 网格视图 */
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        >
          <View style={styles.gridContainer}>
            {filteredClothing.map(item => {
              const itemId = getItemId(item);
              const isSelected = selectedIds.includes(itemId);
              const imageUri = item.thumbnailUri || item.imageUri;
              const isTransparent = !!(item.thumbnailUri && item.thumbnailUri.endsWith('.png'));
              console.log('[GridItem] render:', itemId, '| isSelecting:', isSelecting, '| imageUri:', imageUri);
              return (
                <TouchableOpacity
                  key={`grid-${itemId}-${isSelected}`}
                  style={[
                    styles.gridItemTransparentWrap,
                    { width: gridItemSize, height: gridItemSize },
                    isSelecting && isSelected && styles.gridItemSelected
                  ]}
                  onPress={() => isSelecting ? toggleSelect(itemId) : handlePress(item)}
                  onLongPress={() => handleLongPress(itemId)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={[styles.gridItemImage, { width: gridItemSize, height: gridItemSize }]}
                    resizeMode="cover"
                  />
                  {isSelecting && isSelected && (
                    <View style={styles.gridSelectBadge}>
                      <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        /* 列表视图 */
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 分类横向卡片 */}
          {availableParents.map(parent => {
            const items = getClothingByParent(parent);
            if (items.length === 0) return null;

            return (
              <View key={parent} style={styles.categoryCard}>
                {/* 类别标题栏 */}
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryTitleRow}>
                    <Ionicons
                      name={PARENT_ICONS[parent] || 'shirt-outline'}
                      size={18}
                      color={theme.colors.accent}
                    />
                    <Text style={styles.categoryTitle}>{parent}</Text>
                    <Text style={styles.categoryCount}>{items.length}件</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewAllBtn}
                    onPress={() => handleViewAll(parent)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllText}>查看更多</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                {/* 横向图片列表 - 显示所有衣服，最新在前 */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {[...items].sort((a, b) => Number(b.createdAt?.replace(/-/g, '')) - Number(a.createdAt?.replace(/-/g, ''))).map(item => {
                    const itemId = getItemId(item);
                    const isSelected = selectedIds.includes(itemId);
                    const imageUri = item.thumbnailUri || item.imageUri;
                    const isTransparent = !!(item.thumbnailUri && item.thumbnailUri.endsWith('.png'));
                    return (
                      <TouchableOpacity
                        key={`card-${itemId}-${isSelected}`}
                        style={[
                          isTransparent ? styles.itemCardTransparent : styles.itemCard,
                          isSelecting && isSelected && styles.itemCardSelected
                        ]}
                        onPress={() => isSelecting ? toggleSelect(itemId) : handlePress(item)}
                        onLongPress={() => handleLongPress(itemId)}
                        activeOpacity={0.85}
                      >
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                        {isSelecting && isSelected && (
                          <View style={styles.selectBadge}>
                            <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })}
          {/* 未分类卡片 */}
          {hasUncategorized && (
            <View style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleRow}>
                  <Ionicons
                    name="help-circle-outline"
                    size={18}
                    color={theme.colors.accent}
                  />
                  <Text style={styles.categoryTitle}>未分类</Text>
                  <Text style={styles.categoryCount}>{uncategorizedItems.length}件</Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {[...uncategorizedItems].sort((a, b) => Number(b.createdAt?.replace(/-/g, '')) - Number(a.createdAt?.replace(/-/g, ''))).map(item => {
                  const itemId = getItemId(item);
                  const isSelected = selectedIds.includes(itemId);
                  const imageUri = item.thumbnailUri || item.imageUri;
                  const isTransparent = !!(item.thumbnailUri && item.thumbnailUri.endsWith('.png'));
                  return (
                    <TouchableOpacity
                      key={`card-${itemId}`}
                      style={[
                        isTransparent ? styles.itemCardTransparent : styles.itemCard,
                        isSelecting && isSelected && styles.itemCardSelected
                      ]}
                      onPress={() => isSelecting ? toggleSelect(itemId) : handlePress(item)}
                      onLongPress={() => handleLongPress(itemId)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                      {isSelecting && isSelected && (
                        <View style={styles.selectBadge}>
                          <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* 添加按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddClothing')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={theme.colors.white} />
      </TouchableOpacity>

      {/* 衣橱下拉 */}
      {showWardrobePicker && (
        <View style={styles.pickerContainer}>
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowWardrobePicker(false)}
          />
          <View style={styles.pickerDropdown}>
            <View style={styles.pickerDropdownArrow} />
            {/* 衣橱选项 */}
            {wardrobes.map((wardrobe) => {
              const isActive = wardrobe.id === currentWardrobeId;
              return (
                <TouchableOpacity
                  key={wardrobe.id}
                  style={[styles.pickerOption, isActive && styles.pickerOptionActive]}
                  onPress={() => {
                    setCurrentWardrobe(wardrobe.id);
                    setShowWardrobePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, isActive && styles.pickerOptionTextActive]}>
                    {wardrobe.name}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <View style={styles.pickerDivider} />
            {/* 废衣篓 */}
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => {
                setShowWardrobePicker(false);
                navigation.navigate('Trash');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.textTertiary} />
              <Text style={styles.pickerOptionText}>废衣篓</Text>
              {trashClothing.length > 0 && (
                <View style={styles.pickerBadge}>
                  <Text style={styles.pickerBadgeText}>{trashClothing.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            {/* 已卖出 */}
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => {
                setShowWardrobePicker(false);
                navigation.navigate('SoldItems');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="cash-outline" size={18} color={theme.colors.textTertiary} />
              <Text style={styles.pickerOptionText}>已卖出</Text>
              {soldClothing.length > 0 && (
                <View style={[styles.pickerBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.pickerBadgeText}>{soldClothing.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.pickerDivider} />
            {/* 管理衣橱 */}
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => {
                setShowWardrobePicker(false);
                navigation.navigate('WardrobeManagement');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.pickerOptionText}>管理衣橱</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 批量操作栏 */}
      {isSelecting && (
        <View style={styles.batchActionBar}>
          <View style={styles.batchCountWrap}>
            <View style={styles.batchCountDot} />
            <Text style={styles.batchCount}>
              已选择 {selectedIds.length} 件
            </Text>
            <Text style={styles.batchCountSub}>
              {selectedIds.length === filteredClothing.length ? '· 全部衣物' : ''}
            </Text>
          </View>
          <View style={styles.batchButtonsRow}>
            <TouchableOpacity
              style={[styles.batchBtn, styles.batchBtnSecondary]}
              onPress={() => setShowMoveSheet(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.batchBtnIconWrap, styles.batchBtnSecondaryIcon]}>
                <Ionicons name="swap-horizontal-outline" size={18} color={theme.colors.primary} />
              </View>
              <Text style={[styles.batchBtnText, styles.batchBtnSecondaryText]}>移动</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchBtn, styles.batchBtnSecondary]}
              onPress={handleBatchTrash}
              activeOpacity={0.8}
            >
              <View style={[styles.batchBtnIconWrap, styles.batchBtnSecondaryIcon]}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.warning} />
              </View>
              <Text style={[styles.batchBtnText, styles.batchBtnSecondaryText]}>废衣篓</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 添加按钮 - 非选择模式显示 */}
      {!isSelecting && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddClothing')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={theme.colors.white} />
        </TouchableOpacity>
      )}

      {/* 批量丢弃原因选择 */}
      <BatchDiscardReasonSheet
        visible={showBatchDiscardSheet}
        onClose={() => setShowBatchDiscardSheet(false)}
        itemCount={selectedIds.length}
        onConfirm={handleBatchDiscardConfirm}
      />

      {/* 移动到衣橱 */}
      <MoveToWardrobeSheet
        visible={showMoveSheet}
        currentWardrobeId={currentWardrobeId}
        onClose={() => setShowMoveSheet(false)}
        onSelect={handleMoveToWardrobe}
      />
    </View>
  );
}
