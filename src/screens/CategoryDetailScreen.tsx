import React, { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { ClothingItem, Season } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const CARD_GAP = 10;
const CARD_WIDTH = (width - 32 - CARD_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;
const CARD_SIZE = CARD_WIDTH;

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  '上衣': { icon: 'shirt', label: '上衣' },
  '裤子': { icon: 'man', label: '裤子' },
  '裙子': { icon: 'ribbon', label: '裙子' },
  '鞋子': { icon: 'footsteps', label: '鞋子' },
  '配饰': { icon: 'glasses', label: '配饰' },
  '外套': { icon: 'cloudy', label: '外套' },
};

type RouteParams = { CategoryDetail: { type: string; season: '全部' | Season } };

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 16,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginLeft: 12,
    },
    headerCount: {
      fontSize: 14,
      color: theme.colors.textTertiary,
    },
    gridContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    card: {
      width: CARD_SIZE,
      height: CARD_SIZE,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderLight,
      marginBottom: CARD_GAP,
    },
    cardMargin: {
      marginLeft: CARD_GAP,
    },
    cardImage: {
      width: '100%',
      height: '100%',
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
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textTertiary,
    },
  });

export function CategoryDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'CategoryDetail'>>();
  const { clothing, loadData } = useWardrobeStore();
  const getChildrenOf = useCustomOptionsStore(state => state.getChildrenOf);
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { type, season } = route.params;

  useEffect(() => {
    loadData();
  }, []);

  const getFilteredClothing = () => {
    // type 是父分类名称，直接用 parentType 匹配（兼容 parentType 为空的旧数据）
    let items = clothing.filter(item => {
      if (item.parentType === type) return true;
      if (!item.parentType && item.type === type) return true;
      return false;
    });
    if (season !== '全部') {
      items = items.filter(item => item.seasons.includes(season as Season));
    }
    return items;
  };

  const items = getFilteredClothing();

  const handlePress = (item: ClothingItem) => {
    navigation.navigate('ClothingDetail', { id: item.id });
  };

  const renderItem = ({ item, index }: { item: ClothingItem; index: number }) => {
    const costPerWear = item.price > 0 && item.wearCount > 0
      ? Math.round(item.price / item.wearCount)
      : null;
    const isTransparent = !!(item.thumbnailUri && item.thumbnailUri.endsWith('.png'));
    return (
      <TouchableOpacity
        style={[
          styles.card,
          index % COLUMN_COUNT !== 0 && styles.cardMargin,
          isTransparent && { backgroundColor: theme.colors.background }
        ]}
        onPress={() => handlePress(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.thumbnailUri || item.imageUri }}
          style={[styles.cardImage, isTransparent && { resizeMode: 'contain' }]}
        />
        {costPerWear !== null && (
          <View style={styles.costBadge}>
            <Text style={styles.costText}>{costPerWear}元/次</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getTitle = () => {
    const typeLabel = TYPE_CONFIG[type]?.label || type;
    if (season === '全部') return typeLabel;
    return `${season}季${typeLabel}`;
  };

  return (
    <View style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <Text style={styles.headerCount}>{items.length}件</Text>
      </View>

      {/* 网格内容 */}
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={48} color={theme.colors.border} />
          <Text style={styles.emptyText}>暂无衣物</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          numColumns={COLUMN_COUNT}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
        />
      )}
    </View>
  );
}
