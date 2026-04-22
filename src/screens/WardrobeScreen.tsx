import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { DEFAULT_OPTIONS, getAllChildren } from '../utils/customOptions';
import { ClothingItem, Season } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { SellItemSheet } from '../components/SellItemSheet';
import { BatchDiscardReasonSheet } from '../components/BatchDiscardReasonSheet';
import MoveToWardrobeSheet from '../components/MoveToWardrobeSheet';
import * as wearRecordsDb from '../db/wearRecords';

const SEASON_OPTIONS: ('全部' | Season)[] = ['全部', '春', '夏', '秋', '冬'];

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
      paddingTop: 56,
      paddingBottom: 12,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
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
      paddingVertical: 8,
      gap: 8,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    categoryCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      ...theme.shadows.sm,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
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
      gap: 10,
    },
    itemCard: {
      width: 100,
      height: 100,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderLight,
      position: 'relative',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    itemCardSelected: {
      borderWidth: 3,
      borderColor: theme.colors.primary,
    },
    // 透明图片背景 - 无边框，融入页面背景
    itemCardTransparent: {
      width: 100,
      height: 100,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: theme.colors.background,
      position: 'relative',
    },
    itemImage: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.borderLight,
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
    // 网格视图样式 - 简洁版
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 10,
    },
    gridItemWrap: {
      width: '31%',
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: 'transparent',
      ...theme.shadows.sm,
    },
    gridItemSelected: {
      borderWidth: 3,
      borderColor: theme.colors.primary,
    },
    // 透明图片背景 - 使用与 gridItemWrap 一致的背景色
    gridItemTransparentWrap: {
      width: '31%',
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderLight,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    gridItemImage: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.borderLight,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    // 网格视图价格标签 - 只在右下角显示价格
    gridPriceBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
    },
    gridPriceText: {
      fontSize: 10,
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
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      gap: 6,
    },
    seasonPillActive: {
      backgroundColor: theme.colors.primary,
    },
    seasonPillText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    seasonPillTextActive: {
      color: theme.colors.white,
    },
    batchActionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
      alignItems: 'center',
      ...theme.shadows.lg,
    },
    batchCountWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 28,
      minWidth: 120,
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
    sellMultipleClothing,
    moveMultipleClothingToWardrobe,
    addWearRecords,
    wardrobes,
    currentWardrobeId,
    loadWardrobes,
    setCurrentWardrobe,
    getCurrentWardrobe,
  } = useWardrobeStore();
  const { theme } = useTheme();
  const categories = useCustomOptionsStore(state => state.categories);
  const isLoading = useCustomOptionsStore(state => state.isLoading);
  const seasons = useCustomOptionsStore(state => state.seasons);
  const load = useCustomOptionsStore(state => state.load);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [selectedSeasons, setSelectedSeasons] = useState<('全部' | Season)[]>(['全部']);
  const [showWardrobePicker, setShowWardrobePicker] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // 批量选择状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showSellSheet, setShowSellSheet] = useState(false);
  const [showBatchDiscardSheet, setShowBatchDiscardSheet] = useState(false);
  const [showMoveSheet, setShowMoveSheet] = useState(false);
  // 用于刷新图片，解决选择模式导致的图片空白问题
  const [imageRefreshKey, setImageRefreshKey] = useState(0);

  useEffect(() => {
    loadData();
    load();
    loadWardrobes();
    loadDrafts();
  }, []);

  // 当前选中的衣橱
  const currentWardrobe = getCurrentWardrobe();

  // 调试日志
  console.log('[WardrobeScreen] RENDER - imageRefreshKey:', imageRefreshKey, 'isSelecting:', isSelecting, 'selectedIds:', selectedIds, 'clothingCount:', clothing.length);

  const handlePress = (item: ClothingItem) => {
    navigation.navigate('ClothingDetail', { id: item.id });
  };

  const handleViewAll = (parent: string) => {
    const season = selectedSeasons.includes('全部') ? '全部' : selectedSeasons[0];
    navigation.navigate('CategoryDetail', { type: parent, season });
  };

  const getItemId = (item: ClothingItem) => Number(item.id);

  const getTitle = () => {
    if (selectedSeasons.includes('全部') || selectedSeasons.length === 0) return '我的衣橱';
    if (selectedSeasons.length === 1) return `${selectedSeasons[0]}季衣橱`;
    return `${selectedSeasons.length}个季节`;
  };

  // 使用 useMemo 确保稳定的数组引用
  const filteredClothing = useMemo(() => {
    // 先按衣橱筛选
    let result = clothing.filter(item => item.wardrobeId === currentWardrobeId);
    // 再按季节筛选
    if (!selectedSeasons.includes('全部') && selectedSeasons.length > 0) {
      result = result.filter(item =>
        item.seasons.some(season => selectedSeasons.includes(season))
      );
    }
    return result;
  }, [selectedSeasons, clothing, currentWardrobeId]);

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
  const getClothingByParent = useMemo(() => {
    return (parent: string) => {
      return filteredClothing.filter(item => {
        // 直接匹配 parentType
        if (item.parentType === parent) return true;
        // parentType 为空时，如果 type 正好是这个父分类名称（直接选了一级分类的情况）
        if (!item.parentType && item.type === parent) return true;
        return false;
      });
    };
  }, [filteredClothing]);

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
    console.log('[cancelSelection] will update imageRefreshKey from', imageRefreshKey, 'to', imageRefreshKey + 1);
    setImageRefreshKey(imageRefreshKey + 1);
    console.log('[cancelSelection] END');
  }, [imageRefreshKey]);

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

  const handleBatchSell = () => {
    if (selectedIds.length === 0) return;
    setShowSellSheet(true);
  };

  const handleSellConfirm = async (price: number, platform: string) => {
    await sellMultipleClothing(selectedIds.map(id => Number(id)), price, platform);
    setShowSellSheet(false);
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
    Alert.alert(
      '记录穿着',
      `确定要记录这 ${selectedIds.length} 件衣物的穿着吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: async () => {
            try {
              const now = new Date();
              const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              await addWearRecords(selectedIds.map(id => Number(id)), dateStr);
              Alert.alert('已记录穿着');
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
      <View style={styles.header}>
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
            {/* 右侧：视图切换 + 草稿箱 */}
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

      {/* 季节筛选按钮 */}
      <View style={styles.filterSection}>
        {SEASON_OPTIONS.map((season) => {
          const isSelected = selectedSeasons.includes(season);
          const iconConfig = SEASON_ICONS[season];
          const handlePress = () => {
            if (season === '全部') {
              setSelectedSeasons(['全部']);
            } else {
              const newSeasons = selectedSeasons.filter(s => s !== '全部');
              if (isSelected) {
                const filtered = newSeasons.filter(s => s !== season);
                setSelectedSeasons(filtered.length === 0 ? ['全部'] : filtered);
              } else {
                setSelectedSeasons([...newSeasons, season]);
              }
            }
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

      {/* 内容区域 */}
      {isEmpty ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="shirt-outline" size={56} color={theme.colors.border} />
          </View>
          <Text style={styles.emptyTitle}>
            {selectedSeasons.includes('全部') || selectedSeasons.length === 0 ? '还没有添加衣服' : `暂无${selectedSeasons[0]}季衣物`}
          </Text>
          <Text style={styles.emptySubtext}>
            {selectedSeasons.includes('全部') || selectedSeasons.length === 0 ? '点击下方按钮添加第一件衣服' : '试试切换其他季节'}
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
              console.log('[GridItem] render:', itemId, '| isSelecting:', isSelecting, '| imageRefreshKey:', imageRefreshKey, '| imageUri:', imageUri);
              return (
                <TouchableOpacity
                  key={`grid-${itemId}`}
                  style={[
                    styles.gridItemTransparentWrap,
                    isSelecting && isSelected && styles.gridItemSelected
                  ]}
                  onPress={() => isSelecting ? toggleSelect(itemId) : handlePress(item)}
                  onLongPress={() => handleLongPress(itemId)}
                  activeOpacity={0.85}
                >
                  <Image
                    key={`img-${itemId}-${imageRefreshKey}`}
                    source={{ uri: imageUri }}
                    style={styles.gridItemImage}
                    resizeMode="cover"
                    onLoadStart={() => console.log('[Image] loadStart:', itemId, imageUri, '| isSelecting:', isSelecting)}
                    onLoad={() => console.log('[Image] loaded:', itemId, imageUri)}
                    onLoadEnd={() => console.log('[Image] loadEnd:', itemId, imageUri)}
                    onError={(e) => console.log('[Image] error:', itemId, imageUri, e.nativeEvent.error)}
                  />
                  {isSelecting && isSelected && (
                    <View style={styles.gridSelectBadge}>
                      <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                    </View>
                  )}
                  {!isSelecting && item.price > 0 && (
                    <View style={styles.gridPriceBadge}>
                      <Text style={styles.gridPriceText}>{item.price}元</Text>
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
                    const costPerWear = item.price > 0 && item.wearCount > 0
                      ? Math.round(item.price / item.wearCount)
                      : null;
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
                          style={[styles.itemImage, isTransparent && { resizeMode: 'contain', backgroundColor: 'transparent' }]}
                          resizeMode={isTransparent ? 'contain' : 'cover'}
                        />
                        {isSelecting && isSelected && (
                          <View style={styles.selectBadge}>
                            <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                          </View>
                        )}
                        {costPerWear !== null && !isSelecting && (
                          <View style={styles.costBadge}>
                            <Text style={styles.costText}>{costPerWear}元/次</Text>
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
                  const costPerWear = item.price > 0 && item.wearCount > 0
                    ? Math.round(item.price / item.wearCount)
                    : null;
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
                      {costPerWear !== null && !isSelecting && (
                        <View style={styles.costBadge}>
                          <Text style={styles.costText}>{costPerWear}元/次</Text>
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
            <TouchableOpacity
              style={[styles.batchBtn, styles.batchBtnSecondary]}
              onPress={handleBatchWear}
              activeOpacity={0.8}
            >
              <View style={[styles.batchBtnIconWrap, styles.batchBtnSecondaryIcon]}>
                <Ionicons name="checkmark-done-outline" size={18} color={theme.colors.primary} />
              </View>
              <Text style={[styles.batchBtnText, styles.batchBtnSecondaryText]}>穿着</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchBtn, styles.batchBtnSuccess]}
              onPress={handleBatchSell}
              activeOpacity={0.8}
            >
              <View style={styles.batchBtnIconWrap}>
                <Ionicons name="cash-outline" size={18} color={theme.colors.white} />
              </View>
              <Text style={[styles.batchBtnText, styles.batchBtnWhiteText]}>卖出</Text>
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

      {/* 卖出表单 */}
      <SellItemSheet
        visible={showSellSheet}
        onClose={() => setShowSellSheet(false)}
        onSell={handleSellConfirm}
        title="批量卖出"
      />

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
