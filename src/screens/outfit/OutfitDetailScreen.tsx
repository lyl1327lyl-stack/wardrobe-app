import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../hooks/useTheme';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { Outfit, ClothingItem } from '../../types';
import { Theme } from '../../utils/theme';

type RootStackParamList = {
  OutfitDetail: { outfitId: number; groupId?: number; groupName?: string };
  OutfitEditor: {
    outfitId?: number;
    mode?: 'create' | 'edit';
    groupId?: number;
    openAttrs?: boolean;
    exitTo?: { screen: string; outfitId?: number; groupId?: number; groupName?: string };
  };
  ClothingDetail: { id: number; source?: string };
};

export function OutfitDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OutfitDetail'>>();
  const { outfitId, groupId, groupName } = route.params;

  const outfits = useWardrobeStore(s => s.outfits);
  const groups = useWardrobeStore(s => s.groups);
  const clothing = useWardrobeStore(s => s.clothing);
  const deleteOutfit = useWardrobeStore(s => s.deleteOutfit);
  const addWearRecords = useWardrobeStore(s => s.addWearRecords);

  const outfit = useMemo(() => outfits.find(o => o.id === outfitId), [outfits, outfitId]);
  const currentGroup = groups.find(g => g.id === (outfit?.groupId || groupId));

  // If outfit deleted while viewing, go back
  useEffect(() => {
    if (isFocused && !outfit) {
      navigation.goBack();
    }
  }, [isFocused, outfit, navigation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      '删除搭配',
      '确定要删除这套搭配吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteOutfit(outfitId);
          },
        },
      ],
    );
  }, [outfitId, deleteOutfit]);

  const handleRecordWear = useCallback(async () => {
    if (!outfit?.itemIds || outfit.itemIds.length === 0) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const count = await addWearRecords([...outfit.itemIds], dateStr);
    if (count > 0) {
      Alert.alert('已记录', `已为 ${count} 件衣物记录今天的穿着`);
    } else {
      Alert.alert('提示', '搭配中的所有衣物今天都已记录过穿着');
    }
  }, [outfit?.itemIds, addWearRecords]);

  // 从 canvasData 中获取已删除单品的缓存图片 URI
  const deletedImageUriMap = useMemo(() => {
    const map: Record<number, string> = {};
    const canvasData = (outfit as any)?.canvasData;
    if (canvasData && Array.isArray(canvasData)) {
      canvasData.forEach((ci: any) => {
        if (ci.clothingId && ci.imageUri) {
          map[ci.clothingId] = ci.imageUri;
        }
      });
    }
    return map;
  }, [outfit]);

  const outfitItems = useMemo(() => {
    if (!outfit?.itemIds) return [];
    return outfit.itemIds.map(id => {
      const found = clothing.find(c => c.id === id);
      if (found) return found;
      const cachedUri = deletedImageUriMap[id];
      return { id, deleted: true, thumbnailUri: cachedUri || null } as unknown as ClothingItem;
    });
  }, [outfit?.itemIds, clothing, deletedImageUriMap]);

  const outfitClothing = useMemo(() => {
    return outfitItems.filter(item => !(item as any).deleted) as ClothingItem[];
  }, [outfitItems]);

  const deletedCount = outfitItems.length - outfitClothing.length;

  const totalPrice = useMemo(() => {
    return outfitClothing.reduce((sum, c) => sum + (c.price || 0), 0);
  }, [outfitClothing]);

  const bg = (outfit as any)?.canvasBackground;
  const frameColor = bg?.type === 'color' ? bg.value : theme.colors.card;

  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);

  if (!outfit) {
    return (
      <View style={[styles_empty.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles_empty.text, { color: theme.colors.textTertiary }]}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>搭配详情</Text>
        <TouchableOpacity
          style={[styles.headerEditBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            navigation.navigate('OutfitEditor', {
              outfitId,
              mode: 'edit',
              groupId: outfit.groupId,
              openAttrs: true,
              exitTo: { screen: 'OutfitDetail', outfitId, groupId: outfit.groupId, groupName: currentGroup?.name || groupName },
            });
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Canvas Card */}
        <View style={styles.canvasCard}>
          <View style={styles.canvasLabel}>
            <View style={styles.canvasLabelDot} />
            <Text style={[styles.canvasLabelText, { color: theme.colors.textTertiary }]}>画板</Text>
          </View>
          <View style={[styles.canvasFrame, { backgroundColor: frameColor }]}>
            {outfit.thumbnailUri ? (
              <Image source={{ uri: outfit.thumbnailUri }} style={styles.canvasImage} resizeMode="cover" />
            ) : (
              <View style={[styles.canvasPlaceholder, { backgroundColor: frameColor }]}>
                <Ionicons name="shirt-outline" size={48} color={theme.colors.textTertiary} />
                <Text style={[styles.canvasPlaceholderText, { color: theme.colors.textTertiary }]}>
                  暂无画板预览
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 标签行：季节 + 标签（仿衣服详情 tagsRow） */}
        {((outfit.seasons || []).length > 0 || (outfit.tags || []).length > 0) && (
          <View style={styles.infoSection}>
            <View style={styles.tagsRow}>
              {(outfit.seasons || []).map((s, i) => (
                <View key={`season-${s}`} style={[styles.tag, i === 0 && styles.tagSeason, i === 0 && { backgroundColor: theme.colors.accent }]}>
                  <Text style={[styles.tagText, i === 0 && styles.tagTextSeason, i === 0 && { color: theme.colors.white }]}>{s}</Text>
                </View>
              ))}
              {(outfit.tags || []).map(t => (
                <View key={`tag-${t}`} style={[styles.tag, { backgroundColor: theme.colors.borderLight }]}>
                  <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 统计卡片：件数 / 总价 / 分组 */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{outfitClothing.length}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>件数</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>¥{totalPrice.toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>总价</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]} numberOfLines={1}>{currentGroup?.name || '未分组'}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>分组</Text>
            </View>
          </View>
        </View>

        {/* 备注卡片 */}
        <View style={[styles.remarksCard, { backgroundColor: theme.colors.card, borderLeftColor: theme.colors.accent }]}>
          <View style={styles.remarksHeader}>
            <View style={[styles.remarksDot, { backgroundColor: theme.colors.accent }]} />
            <Text style={[styles.remarksTitle, { color: theme.colors.textTertiary }]}>备注</Text>
          </View>
          <Text style={[styles.remarksText, { color: outfit.notes ? theme.colors.text : theme.colors.textTertiary }]}>
            {outfit.notes || '暂无备注'}
          </Text>
        </View>

        {/* Clothing Items Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.clothingHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                搭配衣物
              </Text>
              <View style={[styles.countBadge, { backgroundColor: theme.colors.borderLight }]}>
                <Text style={[styles.countBadgeText, { color: theme.colors.textSecondary }]}>
                  {outfitClothing.length}件
                </Text>
              </View>
              {deletedCount > 0 && (
                <Text style={[styles.deletedHint, { color: theme.colors.warning }]}>
                  ({deletedCount}件已删除)
                </Text>
              )}
            </View>
            {totalPrice > 0 && (
              <Text style={[styles.clothingPrice, { color: theme.colors.primary }]}>¥{totalPrice.toLocaleString()}</Text>
            )}
          </View>
          {outfitItems.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.clothingScroll}
            >
              {outfitItems.map(item => {
                const isDeleted = (item as any).deleted;
                if (isDeleted) {
                  return (
                    <View
                      key={`deleted-${item.id}`}
                      style={[styles.clothingItem, styles.clothingItemDeleted, { backgroundColor: theme.colors.borderLight, borderColor: theme.colors.border }]}
                    >
                      {item.thumbnailUri ? (
                        <Image source={{ uri: item.thumbnailUri }} style={[styles.clothingImage, { opacity: 0.45 }]} />
                      ) : (
                        <Ionicons name="help-circle-outline" size={24} color={theme.colors.textTertiary} />
                      )}
                      <View style={styles.deletedOverlay}>
                        <Text style={styles.deletedOverlayText}>已删除</Text>
                      </View>
                    </View>
                  );
                }
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.clothingItem, { backgroundColor: theme.colors.background }]}
                    onPress={() => navigation.navigate('ClothingDetail', { id: item.id })}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.clothingImage} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={[styles.emptyHint, { color: theme.colors.textTertiary }]}>
              暂无衣物
            </Text>
          )}
        </View>
        {/* 操作按钮（随滚动，仿衣服详情底部管理按钮） */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleRecordWear}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={[styles.actionBtnPrimaryText, { color: theme.colors.white }]}>记录穿着</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.borderLight }]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            <Text style={[styles.actionBtnDangerText, { color: theme.colors.danger }]}>删除</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles_empty = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 14 },
});

const makeStyles = (theme: Theme, insets: any) =>
  StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: theme.colors.background,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: theme.colors.card,
      alignItems: 'center', justifyContent: 'center',
      ...theme.shadows.sm,
    },
    headerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
    headerSpacer: { width: 36, height: 36 },
    headerEditBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: { flex: 1 },

    // Canvas Card
    canvasCard: {
      marginHorizontal: 20,
      marginTop: 12,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 18,
      ...theme.shadows.md,
    },
    canvasLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    canvasLabelDot: {
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: theme.colors.primary,
    },
    canvasLabelText: {
      fontSize: 12, fontWeight: '600', letterSpacing: 1,
    },
    canvasFrame: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
    },
    canvasImage: {
      width: '100%', height: '100%',
    },
    canvasPlaceholder: {
      flex: 1,
      alignItems: 'center', justifyContent: 'center',
      gap: 8,
    },
    canvasPlaceholderText: {
      fontSize: 13, fontWeight: '500',
    },
    editCanvasBtn: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },

    // Group row (inside info card)
    groupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    groupRowText: {
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
    },

    // Divider
    canvasDivider: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 2,
    },
    canvasDividerLine: {
      height: 1,
    },

    // Card module
    card: {
      marginHorizontal: 20,
      marginTop: 16,
      borderRadius: theme.borderRadius.lg,
      padding: 18,
      ...theme.shadows.sm,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    cardDot: {
      width: 6, height: 6, borderRadius: 3,
    },
    cardTitle: {
      fontSize: 14, fontWeight: '600',
    },

    // Info blocks inside the unified card
    infoBlock: {},
    blockDivider: {
      height: 1,
      marginVertical: 16,
    },

    // Header apply button
    headerApplyBtn: {
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 16,
    },
    headerApplyText: {
      color: '#fff', fontSize: 13, fontWeight: '600',
    },

    // Chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1,
    },
    chipText: { fontSize: 13, fontWeight: '500' },

    // Empty hint
    emptyHint: {
      fontSize: 13,
    },

    // Notes
    notesInput: {
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      lineHeight: 22,
      borderWidth: 1,
      minHeight: 80,
    },
    notesReadonly: {
      fontSize: 14,
      lineHeight: 20,
      minHeight: 40,
    },

    // Clothing
    clothingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    countBadge: {
      paddingHorizontal: 8, paddingVertical: 2,
      borderRadius: 10,
    },
    countBadgeText: {
      fontSize: 12, fontWeight: '500',
    },
    clothingScroll: { paddingTop: 8, gap: 10 },
    clothingItem: {
      width: 80, height: 80, borderRadius: 12,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    clothingImage: { width: '100%', height: '100%', objectFit: 'cover' },
    clothingItemDeleted: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deletedOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.warning + 'CC',
      paddingVertical: 3,
      alignItems: 'center',
    },
    deletedOverlayText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#fff',
    },
    deletedHint: {
      fontSize: 11,
      fontWeight: '500',
      marginLeft: 4,
    },

    // Modal shared
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },

    // Move sheet
    moveSheet: {
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 20, maxHeight: '50%',
    },
    moveHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: '#ddd', alignSelf: 'center',
      marginTop: 12, marginBottom: 16,
    },
    moveTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    moveList: { marginBottom: 8 },
    moveItem: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 8,
    },
    moveItemText: { fontSize: 15, fontWeight: '500' },
    moveItemCount: { fontSize: 13 },

    // Bottom bar
    bottomBar: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingTop: 10, gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
    primaryAction: {
      flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 13, borderRadius: 14, gap: 8,
    },
    primaryActionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    dangerAction: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 13, borderRadius: 14, gap: 4,
    },
    dangerActionText: { fontSize: 13, fontWeight: '600', color: theme.colors.danger },
    clothingPrice: {
      fontSize: 15, fontWeight: '700',
    },

    // tagsRow（仿衣服详情）
    infoSection: {
      paddingHorizontal: 20,
      paddingTop: 18,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
    },
    tagSeason: {},
    tagText: {
      fontSize: 12,
      fontWeight: '500',
    },
    tagTextSeason: {},
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statDivider: {
      width: 1,
      height: 36,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    statLabel: {
      fontSize: 11,
      marginTop: 4,
    },
    remarksCard: {
      marginHorizontal: 20,
      marginTop: 16,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      borderLeftWidth: 3,
      ...theme.shadows.sm,
    },
    remarksHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    remarksDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 8,
    },
    remarksTitle: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1,
    },
    remarksText: {
      fontSize: 14,
      lineHeight: 22,
    },
    actionRow: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginTop: 20,
      gap: 12,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 14,
    },
    actionBtnPrimaryText: {
      fontSize: 14,
      fontWeight: '700',
    },
    actionBtnDangerText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
