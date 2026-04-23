import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ClothingItem, ClothingType } from '../../types';
import { useWardrobeStore } from '../../store/wardrobeStore';

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

interface Props {
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  maxItems?: number;
}

export function ClothingSelector({ selectedIds, onSelectionChange, maxItems = 20 }: Props) {
  const { theme } = useTheme();
  const clothing = useWardrobeStore(state => state.clothing);
  const [activeTab, setActiveTab] = useState<ClothingType | '全部'>('全部');

  const filteredClothing = useMemo(() => {
    if (activeTab === '全部') return clothing;
    return clothing.filter(item => item.type === activeTab);
  }, [clothing, activeTab]);

  const toggleSelection = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      if (selectedIds.length >= maxItems) return;
      onSelectionChange([...selectedIds, id]);
    }
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

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
      {/* 分类Tab */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
        contentContainerStyle={styles.tabContent}
      >
        {CLOTHING_TABS.map(tab => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tab, activeTab === tab.value && styles.tabActive]}
            onPress={() => setActiveTab(tab.value)}
          >
            <Text style={[styles.tabText, activeTab === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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

      {/* 底部下一步按钮 */}
      <View style={styles.footer}>
        <View style={styles.footerGradient} pointerEvents="none" />
        <View style={styles.footerContent}>
          <Text style={styles.selectedCount}>
            已选择 {selectedIds.length}/{maxItems} 件
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabContainer: {
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tabContent: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      flexDirection: 'row',
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
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
    },
    footerGradient: {
      height: 80,
      backgroundColor: theme.colors.background,
      opacity: 0.9,
    },
    footerContent: {
      position: 'absolute',
      bottom: 20,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    selectedCount: {
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
  });
