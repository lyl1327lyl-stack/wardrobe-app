import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import { useWardrobeStore } from '../store/wardrobeStore';
import { Outfit, STYLES } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / NUM_COLUMNS;

type RootStackParamList = {
  ClothingSelection: undefined;
  OutfitEditor: { selectedIds?: number[]; outfitId?: number };
};

export function OutfitsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const outfits = useWardrobeStore(state => state.outfits);
  const clothing = useWardrobeStore(state => state.clothing);
  const deleteOutfits = useWardrobeStore(state => state.deleteOutfits);

  const [selectedFilter, setSelectedFilter] = useState<string>('全部');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const filteredOutfits = useMemo(() => {
    if (selectedFilter === '全部') return outfits;
    return outfits.filter(o => (o as any).style === selectedFilter);
  }, [outfits, selectedFilter]);

  const handleCreateOutfit = useCallback(() => {
    navigation.navigate('ClothingSelection');
  }, [navigation]);

  const handleEditOutfit = useCallback((outfitId: number) => {
    if (isSelectMode) {
      toggleSelect(outfitId);
    } else {
      navigation.navigate('OutfitEditor', {
        outfitId,
        mode: 'edit',
        exitTo: { screen: 'Main', tab: '搭配' },
      });
    }
  }, [isSelectMode, navigation, toggleSelect]);

  const toggleSelect = useCallback((outfitId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(outfitId)) {
        next.delete(outfitId);
      } else {
        next.add(outfitId);
      }
      return next;
    });
  }, []);

  const handleLongPress = useCallback((outfitId: number) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedIds(new Set([outfitId]));
    }
  }, [isSelectMode]);

  const handleCancelSelect = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBatchDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    await deleteOutfits(ids);
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, [selectedIds, deleteOutfits]);

  const getItemCount = (outfit: Outfit) => {
    return outfit.itemIds?.length || 0;
  };

  const renderOutfitCard = ({ item }: { item: Outfit }) => {
    const style = (item as any).style || '休闲';
    const thumbUri = item.thumbnailUri;
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        key={`outfit-card-${item.id}-${isSelected}`}
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => handleEditOutfit(item.id)}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.8}
      >
        {isSelectMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}
        <View style={styles.cardThumb}>
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              style={styles.cardImage}
            />
          ) : (
            <View style={styles.cardPlaceholder}>
              <Ionicons name="grid-outline" size={32} color={theme.colors.textTertiary} />
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardStyle}>{style}</Text>
          <Text style={styles.cardCount}>{getItemCount(item)}件</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  return (
    <View style={styles.container}>
      {/* 顶栏 */}
      <View style={styles.header}>
        {isSelectMode ? (
          <>
            <TouchableOpacity onPress={handleCancelSelect} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>已选{selectedIds.size}项</Text>
            <TouchableOpacity
              onPress={handleBatchDelete}
              style={styles.headerBtn}
              disabled={selectedIds.size === 0}
            >
              <Text style={[styles.headerBtnText, styles.deleteBtnText]}>
                删除({selectedIds.size})
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.headerTitle}>我的搭配</Text>
        )}
      </View>

      {/* 风格筛选 - 使用 View + flexDirection row，与 WardrobeScreen 一致 */}
      <View style={styles.filterSection}>
        {STYLES.map(filter => {
          const isSelected = selectedFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, isSelected && styles.filterPillActive]}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 搭配网格 */}
      {filteredOutfits.length > 0 ? (
        <FlatList
          data={filteredOutfits}
          renderItem={renderOutfitCard}
          keyExtractor={item => item.id.toString()}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          extraData={{ isSelectMode, selectedCount: selectedIds.size, isFocused }}
        />
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="grid-outline" size={36} color={theme.colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>暂无搭配</Text>
          <Text style={styles.emptySubtext}>点击右下角「+」开始创建搭配</Text>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateOutfit} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
      paddingHorizontal: 16,
      paddingTop: insets.top + 16,
      paddingBottom: 12,
      backgroundColor: theme.colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    headerBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    headerBtnText: {
      fontSize: 16,
      color: theme.colors.primary,
    },
    deleteBtnText: {
      color: theme.colors.danger,
    },
    filterSection: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    filterTextActive: {
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
    card: {
      width: CARD_WIDTH,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    cardSelected: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    cardThumb: {
      aspectRatio: 1,
      backgroundColor: theme.colors.borderLight,
    },
    cardImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    cardPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    checkbox: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: 'rgba(255,255,255,0.8)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    checkboxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    cardStyle: {
      fontSize: 13,
      color: theme.colors.text,
    },
    cardCount: {
      fontSize: 11,
      color: theme.colors.textTertiary,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
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
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
  });