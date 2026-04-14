import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ClothingItem } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { deleteImage } from '../utils/imageUtils';

const { width } = Dimensions.get('window');
const COLUMN = 2;
const ITEM_WIDTH = (width - 32 - 12) / COLUMN;

function formatTrashDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '今天删除';
  if (days === 1) return '昨天删除';
  if (days < 7) return `${days}天前删除`;
  return `${Math.floor(days / 7)}周前删除`;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 12,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    navBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    navBtnDisabled: {
      opacity: 0.5,
    },
    navTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    listContent: {
      padding: 16,
    },
    row: {
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    itemCard: {
      width: ITEM_WIDTH,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.card,
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
      height: ITEM_WIDTH,
      backgroundColor: theme.colors.borderLight,
    },
    itemOverlay: {
      position: 'absolute',
      top: 8,
      left: 8,
      right: 8,
    },
    itemType: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.white,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    itemDeletedDate: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    actionButtons: {
      flexDirection: 'row',
      padding: 8,
      gap: 8,
    },
    restoreBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: theme.colors.primary,
      paddingVertical: 8,
      borderRadius: 8,
    },
    restoreBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.white,
    },
    deleteBtn: {
      width: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.warning,
      paddingVertical: 8,
      borderRadius: 8,
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
    selectBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
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
    batchBtnPrimary: {
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
  });

export function TrashScreen() {
  const navigation = useNavigation<any>();
  const { trashClothing, restoreFromTrash, permanentDelete, emptyTrash, restoreMultipleFromTrash, permanentDeleteMultiple } = useWardrobeStore();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 批量选择状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 批量选择相关函数
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === trashClothing.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(trashClothing.map(item => Number(item.id)));
    }
  };

  const cancelSelection = () => {
    setIsSelecting(false);
    setSelectedIds([]);
  };

  const handleLongPress = (id: number) => {
    if (!isSelecting) {
      setIsSelecting(true);
      setSelectedIds([Number(id)]);
    }
  };

  const handleBatchRestore = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      '恢复衣服',
      `确定要恢复 ${selectedIds.length} 件衣服吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            await restoreMultipleFromTrash(selectedIds.map(id => Number(id)));
            cancelSelection();
          },
        },
      ]
    );
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      '永久删除',
      `确定要永久删除 ${selectedIds.length} 件衣服吗？此操作不可恢复！`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const item of trashClothing.filter(c => selectedIds.includes(Number(c.id)))) {
                await deleteImage(item.imageUri, item.thumbnailUri);
              }
              await permanentDeleteMultiple(selectedIds.map(id => Number(id)));
              cancelSelection();
            } catch (e) {
              console.error('批量删除失败:', e);
              Alert.alert('删除失败，请重试');
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      setRefreshKey(k => k + 1);
    }, [])
  );

  const handleRestore = (item: ClothingItem) => {
    Alert.alert(
      '恢复衣服',
      '确定要恢复这件衣服吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '恢复',
          onPress: () => restoreFromTrash(item.id),
        },
      ]
    );
  };

  const handlePermanentDelete = (item: ClothingItem) => {
    Alert.alert(
      '永久删除',
      '确定要永久删除这件衣服吗？此操作不可恢复！',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            deleteImage(item.imageUri, item.thumbnailUri)
              .then(() => permanentDelete(item.id))
              .catch(e => {
                console.error('永久删除失败:', e);
                Alert.alert('删除失败，请重试');
              });
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (trashClothing.length === 0) return;
    Alert.alert(
      '清空废衣篓',
      `确定要永久删除 ${trashClothing.length} 件衣服吗？此操作不可恢复！`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const item of trashClothing) {
                await deleteImage(item.imageUri, item.thumbnailUri);
              }
              await emptyTrash();
            } catch (e) {
              console.error('清空废衣篓失败:', e);
              Alert.alert('清空失败，请重试');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ClothingItem }) => {
    const itemId = Number(item.id);
    const isSelected = selectedIds.includes(itemId);
    const isTransparent = !!(item.thumbnailUri && item.thumbnailUri.endsWith('.png'));
    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          isSelecting && isSelected && styles.itemCardSelected,
          isTransparent && { backgroundColor: theme.colors.background }
        ]}
        onPress={() => isSelecting ? toggleSelect(itemId) : navigation.navigate('ClothingDetail', { id: item.id, source: 'trash' })}
        onLongPress={() => handleLongPress(itemId)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: item.thumbnailUri || item.imageUri }}
          style={[styles.itemImage, isTransparent && { resizeMode: 'contain' }]}
        />
        {isSelecting && isSelected && (
          <View style={styles.selectBadge}>
            <Ionicons name="checkmark" size={14} color={theme.colors.white} />
          </View>
        )}
        {!isSelecting && (
          <>
            <View style={styles.itemOverlay}>
              <Text style={styles.itemType}>{item.type}</Text>
              <Text style={styles.itemDeletedDate}>{formatTrashDate(item.deletedAt)}</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.restoreBtn}
                onPress={() => handleRestore(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-undo" size={16} color={theme.colors.white} />
                <Text style={styles.restoreBtnText}>恢复</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handlePermanentDelete(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="trash" size={16} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.navBar}>
        {isSelecting ? (
          <>
            <TouchableOpacity style={styles.navBtn} onPress={cancelSelection}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>选择 {selectedIds.length} 项</Text>
            <TouchableOpacity style={styles.navBtn} onPress={selectAll}>
              <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '600' }}>
                {selectedIds.length === trashClothing.length ? '取消全选' : '全选'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>废衣篓</Text>
            <TouchableOpacity
              style={[styles.navBtn, trashClothing.length === 0 && styles.navBtnDisabled]}
              onPress={handleEmptyTrash}
              disabled={trashClothing.length === 0}
            >
              <Ionicons
                name="trash-outline"
                size={22}
                color={trashClothing.length === 0 ? theme.colors.border : theme.colors.warning}
              />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 内容 */}
      {trashClothing.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="trash-outline" size={56} color={theme.colors.border} />
          </View>
          <Text style={styles.emptyTitle}>废衣篓是空的</Text>
          <Text style={styles.emptySubtext}>删除的衣服会显示在这里</Text>
        </View>
      ) : (
        <FlatList
          data={trashClothing}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          numColumns={COLUMN}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          extraData={selectedIds}
        />
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
              {selectedIds.length === trashClothing.length ? '· 全部衣物' : ''}
            </Text>
          </View>
          <View style={styles.batchButtonsRow}>
            <TouchableOpacity
              style={[styles.batchBtn, styles.batchBtnPrimary]}
              onPress={handleBatchRestore}
              activeOpacity={0.8}
            >
              <View style={styles.batchBtnIconWrap}>
                <Ionicons name="arrow-undo" size={18} color={theme.colors.white} />
              </View>
              <Text style={[styles.batchBtnText, styles.batchBtnWhiteText]}>恢复</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchBtn, styles.batchBtnDanger]}
              onPress={handleBatchDelete}
              activeOpacity={0.8}
            >
              <View style={styles.batchBtnIconWrap}>
                <Ionicons name="trash" size={18} color={theme.colors.white} />
              </View>
              <Text style={[styles.batchBtnText, styles.batchBtnWhiteText]}>永久删除</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
