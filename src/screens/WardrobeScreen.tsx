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
    header: {
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    titleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.5,
    },
    headerCount: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      fontWeight: '500',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      gap: 4,
      position: 'relative',
    },
    headerActionText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    headerBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.warning,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    headerBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.white,
    },
    settingsBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
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
    batchActionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: 20,
      paddingTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    batchCount: {
      fontSize: 14,
      fontWeight: '500',
    },
    batchButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    batchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
    },
    batchBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.white,
    },
  });

export function WardrobeScreen() {
  const navigation = useNavigation<any>();
  const { clothing, trashClothing, soldClothing, loadData, moveMultipleToTrash, sellMultipleClothing } = useWardrobeStore();
  const { theme } = useTheme();
  const categories = useCustomOptionsStore(state => state.categories);
  const isLoading = useCustomOptionsStore(state => state.isLoading);
  const seasons = useCustomOptionsStore(state => state.seasons);
  const load = useCustomOptionsStore(state => state.load);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [selectedSeason, setSelectedSeason] = useState<'全部' | Season>('全部');
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);

  // 批量选择状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showSellSheet, setShowSellSheet] = useState(false);

  useEffect(() => {
    loadData();
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handlePress = (item: ClothingItem) => {
    navigation.navigate('ClothingDetail', { id: item.id });
  };

  const handleViewAll = (parent: string) => {
    navigation.navigate('CategoryDetail', { type: parent, season: selectedSeason });
  };

  const getItemId = (item: ClothingItem) => Number(item.id);

  const getTitle = () => {
    if (selectedSeason === '全部') return '我的衣橱';
    return `${selectedSeason}季衣橱`;
  };

  // 使用 useMemo 确保稳定的数组引用
  const filteredClothing = useMemo(() => {
    if (selectedSeason === '全部') return clothing;
    return clothing.filter(item => item.seasons.includes(selectedSeason as Season));
  }, [selectedSeason, clothing]);

  const effectiveCategories = categories && Object.keys(categories).length > 0 ? categories : DEFAULT_OPTIONS.categories;
  const parentCategories = Object.keys(effectiveCategories);

  // 获取所有已知的子分类
  const allKnownChildren = useMemo(() => getAllChildren(effectiveCategories), [effectiveCategories]);

  // 获取未分类的衣服（类型不在任何已知子分类中）
  const uncategorizedItems = useMemo(() => {
    return filteredClothing.filter(item => !allKnownChildren.includes(item.type));
  }, [filteredClothing, allKnownChildren]);

  // 根据父分类获取衣服
  const getClothingByParent = useMemo(() => {
    return (parent: string) => {
      const children = effectiveCategories[parent] || [];
      return filteredClothing.filter(item => children.includes(item.type));
    };
  }, [filteredClothing, effectiveCategories]);

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
    setIsSelecting(false);
    setSelectedIds([]);
  }, []);

  const handleLongPress = useCallback((id: number) => {
    if (!isSelecting) {
      setIsSelecting(true);
      setSelectedIds([Number(id)]);
    }
  }, [isSelecting]);

  const handleBatchTrash = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      '移至废衣篓',
      `确定要将 ${selectedIds.length} 件衣服移至废衣篓吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            await moveMultipleToTrash(selectedIds.map(id => Number(id)));
            cancelSelection();
          },
        },
      ]
    );
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

  return (
    <View style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        {isSelecting ? (
          <>
            <TouchableOpacity style={styles.titleButton} onPress={cancelSelection} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
              <Text style={styles.headerTitle}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={selectAll} activeOpacity={0.7}>
              <Text style={[styles.headerCount, { color: theme.colors.primary }]}>
                {selectedIds.length === filteredClothing.length ? '取消全选' : '全选'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.titleButton}
              onPress={() => setShowSeasonPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.headerTitle}>{getTitle()}</Text>
              <Text style={styles.headerCount}>{filteredClothing.length} 件</Text>
              <Ionicons name="chevron-down" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => navigation.navigate('Trash')}
                activeOpacity={0.7}
              >
                <Text style={styles.headerActionText}>废衣篓</Text>
                {trashClothing.length > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>{trashClothing.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => navigation.navigate('SoldItems')}
                activeOpacity={0.7}
              >
                <Text style={styles.headerActionText}>已卖出</Text>
                {soldClothing.length > 0 && (
                  <View style={[styles.headerBadge, { backgroundColor: '#4CAF50' }]}>
                    <Text style={styles.headerBadgeText}>{soldClothing.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

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
      ) : (
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
                {/* 横向图片列表 */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {items.slice(0, 4).map(item => {
                    const itemId = getItemId(item);
                    const costPerWear = item.price > 0 && item.wearCount > 0
                      ? Math.round(item.price / item.wearCount)
                      : null;
                    const isSelected = selectedIds.includes(itemId);
                    const imageUri = item.thumbnailUri || item.imageUri;
                    return (
                      <TouchableOpacity
                        key={`card-${itemId}`}
                        style={[styles.itemCard, isSelecting && isSelected && styles.itemCardSelected]}
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
                {uncategorizedItems.slice(0, 4).map(item => {
                  const itemId = getItemId(item);
                  const costPerWear = item.price > 0 && item.wearCount > 0
                    ? Math.round(item.price / item.wearCount)
                    : null;
                  const isSelected = selectedIds.includes(itemId);
                  const imageUri = item.thumbnailUri || item.imageUri;
                  return (
                    <TouchableOpacity
                      key={`card-${itemId}`}
                      style={[styles.itemCard, isSelecting && isSelected && styles.itemCardSelected]}
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

      {/* 季节选择 */}
      {showSeasonPicker && (
        <View style={styles.pickerContainer}>
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowSeasonPicker(false)}
          />
          <View style={styles.pickerDropdown}>
            <View style={styles.pickerDropdownArrow} />
            {seasonOptions.map((season, index) => {
              const isSelected = selectedSeason === season;
              const iconConfig = SEASON_ICONS[season];
              return (
                <View key={season}>
                  {index > 0 && <View style={styles.pickerDivider} />}
                  <TouchableOpacity
                    style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                    onPress={() => {
                      setSelectedSeason(season);
                      setShowSeasonPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.pickerIconWrap, isSelected && { backgroundColor: `${iconConfig.color}20` }]}>
                      <Ionicons
                        name={iconConfig.name}
                        size={18}
                        color={isSelected ? iconConfig.color : theme.colors.textTertiary}
                      />
                    </View>
                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextActive]}>
                      {season === '全部' ? '全部季节' : `${season}季`}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 批量操作栏 */}
      {isSelecting && (
        <View style={[styles.batchActionBar, { paddingBottom: 20 }]}>
          <Text style={[styles.batchCount, { color: theme.colors.textSecondary }]}>
            已选择 {selectedIds.length} 件
          </Text>
          <View style={styles.batchButtons}>
            <TouchableOpacity
              style={[styles.batchBtn, { backgroundColor: theme.colors.warning }]}
              onPress={handleBatchTrash}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.white} />
              <Text style={styles.batchBtnText}>废衣篓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchBtn, { backgroundColor: '#4CAF50' }]}
              onPress={handleBatchSell}
              activeOpacity={0.8}
            >
              <Ionicons name="cash-outline" size={20} color={theme.colors.white} />
              <Text style={styles.batchBtnText}>卖出</Text>
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
    </View>
  );
}
