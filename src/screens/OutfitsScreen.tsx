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
import { useOutfitStore } from '../store/outfitStore';
import { Outfit, STYLES } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / NUM_COLUMNS;

type RootStackParamList = {
  ClothingSelection: { source?: 'Outfits' | 'Editor' } | undefined;
  OutfitEditor: { selectedIds?: number[]; outfitId?: number; mode?: 'create' | 'edit'; exitTo?: { screen: string; tab: string } };
};

const FILTER_OPTIONS = ['全部', ...STYLES];

export function OutfitsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const outfits = useWardrobeStore(state => state.outfits);
  const deleteOutfits = useWardrobeStore(state => state.deleteOutfits);
  const outfitFilter = useOutfitStore(state => state.outfitFilter);
  const setOutfitFilter = useOutfitStore(state => state.setOutfitFilter);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const filteredOutfits = useMemo(() => {
    if (outfitFilter === '全部') return outfits;
    return outfits.filter(o => (o as any).style === outfitFilter);
  }, [outfits, outfitFilter]);

  const handleCreateOutfit = useCallback(() => {
    navigation.navigate('ClothingSelection', { source: 'Outfits' });
  }, [navigation]);

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
    const count = getItemCount(item);

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => handleEditOutfit(item.id)}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.85}
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
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardPlaceholder}>
              <Ionicons name="shirt-outline" size={32} color={theme.colors.textTertiary} />
            </View>
          )}
          {/* 底部渐变 + 数量标签 */}
          <View style={styles.cardGradient} pointerEvents="none">
            <View style={styles.cardCountBadge}>
              <Text style={styles.cardCountText}>{count}件</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardStyleRow}>
            <View style={styles.styleDot} />
            <Text style={styles.cardStyle}>{style}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
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
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleCancelSelect} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>已选 {selectedIds.size} 项</Text>
            <TouchableOpacity
              onPress={handleBatchDelete}
              style={styles.headerBtn}
              disabled={selectedIds.size === 0}
            >
              <Text style={[styles.headerBtnText, styles.deleteBtnText, selectedIds.size === 0 && styles.btnDisabled]}>
                删除 ({selectedIds.size})
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>我的搭配</Text>
              <Text style={styles.headerSubtitle}>共 {outfits.length} 套</Text>
            </View>
            <TouchableOpacity style={styles.headerAddBtn} onPress={handleCreateOutfit} activeOpacity={0.7}>
              <Ionicons name="add" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 风格筛选 */}
      <View style={styles.filterWrapper}>
        <FlatList
          horizontal
          data={FILTER_OPTIONS}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => {
            const isSelected = outfitFilter === item;
            return (
              <TouchableOpacity
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setOutfitFilter(item)}
                activeOpacity={0.7}
              >
                {item === '全部' && (
                  <Ionicons
                    name={isSelected ? 'grid' : 'grid-outline'}
                    size={14}
                    color={isSelected ? '#fff' : theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
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
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>
              {outfitFilter === '全部' ? '全部搭配' : `${outfitFilter}`} · {filteredOutfits.length} 套
            </Text>
          }
        />
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="shirt-outline" size={40} color={theme.colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>
            {outfitFilter === '全部' ? '还没有搭配' : `暂无「${outfitFilter}」风格搭配`}
          </Text>
          <Text style={styles.emptySubtext}>点击下方按钮，开始创建你的第一套搭配</Text>
          <TouchableOpacity style={styles.emptyCreateBtn} onPress={handleCreateOutfit} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyCreateBtnText}>创建搭配</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB - 仅在非空或全部筛选时显示 */}
      {outfits.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateOutfit} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (theme: any, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    // 顶栏
    header: {
      paddingHorizontal: 16,
      paddingTop: insets.top + 12,
      paddingBottom: 14,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'column',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: 0.3,
    },
    headerSubtitle: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    headerAddBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBtn: {
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    headerBtnText: {
      fontSize: 16,
      color: theme.colors.primary,
    },
    deleteBtnText: {
      color: theme.colors.danger,
    },
    btnDisabled: {
      opacity: 0.4,
    },
    // 筛选
    filterWrapper: {
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    filterContent: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
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
      fontWeight: '600',
    },
    // 网格
    sectionLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.textTertiary,
      marginBottom: 12,
      letterSpacing: 0.5,
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
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    cardSelected: {
      borderWidth: 2.5,
      borderColor: theme.colors.primary,
    },
    cardThumb: {
      aspectRatio: 1,
      backgroundColor: theme.colors.borderLight,
      position: 'relative',
    },
    cardImage: {
      width: '100%',
      height: '100%',
    },
    cardPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.borderLight,
    },
    cardGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 48,
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    cardCountBadge: {
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    cardCountText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
    },
    cardInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    cardStyleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    styleDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
      marginRight: 6,
    },
    cardStyle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    checkbox: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: 'rgba(255,255,255,0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    checkboxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    // 空状态
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyIconWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
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
      lineHeight: 22,
      marginBottom: 24,
    },
    emptyCreateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    emptyCreateBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
    // FAB
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 36,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
  });
