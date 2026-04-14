import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { ClothingItem } from '../types';

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textTertiary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingTop: 100,
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
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
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
    gridItemImage: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.borderLight,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    gridItemOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    gridItemName: {
      fontSize: 11,
      color: theme.colors.white,
      fontWeight: '500',
    },
    gridItemMeta: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.8)',
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
      minWidth: 100,
    },
    batchBtnSecondary: {
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    batchBtnSuccess: {
      backgroundColor: theme.colors.primary,
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
    bottomPadding: {
      height: 100,
    },
  });

export function DraftsScreen() {
  const navigation = useNavigation<any>();
  const { draftClothing, loadDrafts, deleteDraft, deleteAllDrafts } = useWardrobeStore();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    loadDrafts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [])
  );

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === draftClothing.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(draftClothing.map(item => Number(item.id)));
    }
  }, [selectedIds.length, draftClothing]);

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

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      '确认删除',
      `确定要删除选中的 ${selectedIds.length} 个草稿吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedIds) {
              await deleteDraft(Number(id));
            }
            cancelSelection();
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      '确认清空',
      '确定要清空所有草稿吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: async () => {
            await deleteAllDrafts();
          },
        },
      ]
    );
  };

  const handlePress = (item: ClothingItem) => {
    if (isSelecting) {
      toggleSelect(item.id);
    } else {
      navigation.navigate('EditClothing', {
        id: item.id,
        isDraft: true,
        prefilledImageUri: item.thumbnailUri || item.imageUri,
      });
    }
  };

  const getItemId = (item: ClothingItem) => Number(item.id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={styles.headerTitle}>草稿箱</Text>
            <Text style={styles.headerSubtitle}>{draftClothing.length}个</Text>
          </View>
        </View>
        {draftClothing.length > 0 && !isSelecting && (
          <TouchableOpacity onPress={handleDeleteAll} style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="trash-outline" size={22} color={theme.colors.warning} />
          </TouchableOpacity>
        )}
      </View>

      {draftClothing.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="document-text-outline" size={56} color={theme.colors.border} />
          </View>
          <Text style={styles.emptyTitle}>草稿箱是空的</Text>
          <Text style={styles.emptySubtext}>添加衣服时点击"存草稿"可以将未完成的衣物保存到这里</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        >
          <View style={styles.gridContainer}>
            {draftClothing.map(item => {
              const itemId = getItemId(item);
              const isSelected = selectedIds.includes(itemId);
              const imageUri = item.thumbnailUri || item.imageUri;
              const isTransparent = !!(item.thumbnailUri && item.thumbnailUri.endsWith('.png'));
              return (
                <TouchableOpacity
                  key={`grid-${itemId}`}
                  style={[
                    styles.gridItemWrap,
                    isSelecting && isSelected && styles.gridItemSelected,
                    isTransparent && { backgroundColor: theme.colors.background }
                  ]}
                  onPress={() => handlePress(item)}
                  onLongPress={() => handleLongPress(itemId)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={[styles.gridItemImage, isTransparent && { resizeMode: 'contain' }]}
                    resizeMode={isTransparent ? 'contain' : 'cover'}
                  />
                  {isSelecting && isSelected && (
                    <View style={styles.gridSelectBadge}>
                      <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                    </View>
                  )}
                  <View style={styles.gridItemOverlay}>
                    <Text style={styles.gridItemName} numberOfLines={1}>{item.type || '未分类'}</Text>
                    <Text style={styles.gridItemMeta} numberOfLines={1}>{item.brand || item.color || ''}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* 批量操作栏 */}
      {isSelecting && (
        <View style={styles.batchActionBar}>
          <View style={styles.batchCountWrap}>
            <TouchableOpacity onPress={cancelSelection} style={{ marginRight: 12 }}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.batchCountDot} />
            <Text style={styles.batchCount}>
              已选择 {selectedIds.length} 个
            </Text>
          </View>
          <View style={styles.batchButtonsRow}>
            <TouchableOpacity
              style={[styles.batchBtn, styles.batchBtnSecondary]}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <View style={[styles.batchBtnIconWrap, styles.batchBtnSecondaryIcon]}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.warning} />
              </View>
              <Text style={[styles.batchBtnText, styles.batchBtnSecondaryText]}>删除</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 返回按钮已移至顶栏 */}
    </View>
  );
}
