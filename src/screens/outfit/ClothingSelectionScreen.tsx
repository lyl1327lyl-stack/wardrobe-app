import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../../hooks/useTheme';
import { ClothingItem, ClothingType } from '../../types';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { useOutfitStore } from '../../store/outfitStore';

type RootStackParamList = {
  ClothingSelection: undefined;
  OutfitEditor: { selectedIds?: number[] };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 8;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

const CLOTHING_TABS: { label: string; value: ClothingType | '全部' }[] = [
  { label: '全部', value: '全部' },
  { label: '上装', value: '上装' },
  { label: '下装', value: '下装' },
  { label: '外套', value: '外套' },
  { label: '鞋', value: '鞋' },
  { label: '配饰', value: '配饰' },
];

export function ClothingSelectionScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const clothing = useWardrobeStore(state => state.clothing);
  const existingCanvasItems = useOutfitStore(state => state.canvasItems);

  // 已在画板上的衣物ID
  const existingIds = existingCanvasItems.map(item => item.clothingId);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<ClothingType | '全部'>('全部');

  const addCanvasItem = useOutfitStore(state => state.addCanvasItem);

  const filteredClothing = useMemo(() => {
    if (activeTab === '全部') return clothing;
    return clothing.filter(item => item.type === activeTab);
  }, [clothing, activeTab]);

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 20) return prev;
      return [...prev, id];
    });
  }, []);

  const handleNext = useCallback(() => {
    // 只添加新选中的衣物（不在画板上的）
    const newItems = clothing.filter(c =>
      selectedIds.includes(c.id) && !existingIds.includes(c.id)
    );

    // 添加到画板
    newItems.forEach(item => addCanvasItem(item));

    // 返回编辑器
    navigation.goBack();
  }, [selectedIds, clothing, existingIds, navigation, addCanvasItem]);

  // Reset outfitStore when entering to clear any previous state
  React.useEffect(() => {
    // 空的effect
  }, []);

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  const renderItem = ({ item }: { item: ClothingItem }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        onPress={() => toggleSelection(item.id)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.itemImage} />
        {isSelected && (
          <View style={styles.checkMark}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>创建搭配</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* 分类Tab - 使用 View + flexDirection row，与 WardrobeScreen 一致 */}
      <View style={styles.tabContainer}>
        <View style={styles.tabContent}>
          {CLOTHING_TABS.map(tab => (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tab, activeTab === tab.value && styles.tabActive]}
              onPress={() => setActiveTab(tab.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.value && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 衣物网格 */}
      <FlatList
        data={filteredClothing}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shirt-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>暂无衣物</Text>
          </View>
        }
      />

      {/* 底部渐变 + 按钮 */}
      <View style={styles.footer}>
        <View style={styles.footerGradient} pointerEvents="none" />
        <TouchableOpacity
          style={[styles.nextButton, selectedIds.length === 0 && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={selectedIds.length === 0}
        >
          <Text style={styles.nextButtonText}>
            下一步 ({selectedIds.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: any, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: insets.top + 8,
      paddingBottom: 12,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    tabContainer: {
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tabContent: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: '#fff',
      fontWeight: '500',
    },
    gridContent: {
      padding: GRID_PADDING,
    },
    gridRow: {
      gap: GRID_GAP,
      marginBottom: GRID_GAP,
    },
    item: {
      width: ITEM_SIZE,
      height: ITEM_SIZE,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 3,
      borderColor: 'transparent',
    },
    itemSelected: {
      borderColor: theme.colors.primary,
    },
    itemImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    checkMark: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
    },
    emptyText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.colors.textTertiary,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingBottom: 20,
    },
    footerGradient: {
      position: 'absolute',
      top: -60,
      left: 0,
      right: 0,
      height: 80,
      backgroundColor: theme.colors.background,
      opacity: 0.9,
    },
    nextButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 24,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    nextButtonDisabled: {
      backgroundColor: theme.colors.textTertiary,
      shadowOpacity: 0,
      elevation: 0,
    },
    nextButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
  });