import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ClothingItem, CLOTHING_TYPES, Season } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { getCustomSeasons } from '../utils/customOptions';

const SEASON_OPTIONS: ('全部' | Season)[] = ['全部', '春', '夏', '秋', '冬'];

const SEASON_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  '全部': { name: 'grid', color: '#6B7FD7' },
  '春': { name: 'flower', color: '#F06292' },
  '夏': { name: 'sunny', color: '#FFB74D' },
  '秋': { name: 'leaf', color: '#8D6E63' },
  '冬': { name: 'snow', color: '#4FC3F7' },
};

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  '上衣': { icon: 'shirt', label: '上衣' },
  '裤子': { icon: 'man', label: '裤子' },
  '裙子': { icon: 'ribbon', label: '裙子' },
  '鞋子': { icon: 'footsteps', label: '鞋子' },
  '配饰': { icon: 'glasses', label: '配饰' },
  '外套': { icon: 'cloudy', label: '外套' },
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
  });

export function WardrobeScreen() {
  const navigation = useNavigation<any>();
  const { clothing, trashClothing, soldClothing, loadData } = useWardrobeStore();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [selectedSeason, setSelectedSeason] = useState<'全部' | Season>('全部');
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [customSeasons, setCustomSeasons] = useState<Season[]>(['春', '夏', '秋', '冬']);

  useEffect(() => {
    loadData();
    getCustomSeasons().then(setCustomSeasons);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handlePress = (item: ClothingItem) => {
    navigation.navigate('ClothingDetail', { id: item.id });
  };

  const handleViewAll = (type: string) => {
    navigation.navigate('CategoryDetail', { type, season: selectedSeason });
  };

  const getFilteredClothing = () => {
    if (selectedSeason === '全部') return clothing;
    return clothing.filter(item => item.seasons.includes(selectedSeason as Season));
  };

  const getClothingByType = (type: string) => {
    return getFilteredClothing().filter(item => item.type === type);
  };

  const getTitle = () => {
    if (selectedSeason === '全部') return '我的衣橱';
    return `${selectedSeason}季衣橱`;
  };

  const filteredClothing = getFilteredClothing();
  const availableTypes = CLOTHING_TYPES.filter(type => getClothingByType(type).length > 0);
  const isEmpty = filteredClothing.length === 0;
  const seasonOptions: ('全部' | Season)[] = ['全部', ...customSeasons];

  return (
    <View style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
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
          {availableTypes.map(type => {
            const items = getClothingByType(type);
            if (items.length === 0) return null;

            return (
              <View key={type} style={styles.categoryCard}>
                {/* 类别标题栏 */}
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryTitleRow}>
                    <Ionicons
                      name={TYPE_CONFIG[type]?.icon || 'shirt'}
                      size={18}
                      color={theme.colors.accent}
                    />
                    <Text style={styles.categoryTitle}>{TYPE_CONFIG[type]?.label || type}</Text>
                    <Text style={styles.categoryCount}>{items.length}件</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewAllBtn}
                    onPress={() => handleViewAll(type)}
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
                    const costPerWear = item.price > 0 && item.wearCount > 0
                      ? Math.round(item.price / item.wearCount)
                      : null;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.itemCard}
                        onPress={() => handlePress(item)}
                        activeOpacity={0.85}
                      >
                        <Image
                          source={{ uri: item.thumbnailUri || item.imageUri }}
                          style={styles.itemImage}
                        />
                        {costPerWear !== null && (
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
    </View>
  );
}
