import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../hooks/useTheme';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { GroupFormModal } from './GroupFormModal';
import { Outfit } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / NUM_COLUMNS;

type RootStackParamList = {
  GroupDetail: { groupId: number; groupName: string };
  ClothingSelection: { source?: 'Outfits' | 'Editor'; groupId?: number } | undefined;
  OutfitEditor: {
    selectedIds?: number[];
    outfitId?: number;
    mode?: 'create' | 'edit';
    groupId?: number;
    exitTo?: { screen: string; tab: string };
  };
};

export function GroupDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GroupDetail'>>();
  const { groupId, groupName } = route.params;

  const outfits = useWardrobeStore(state => state.outfits);
  const groups = useWardrobeStore(state => state.groups);
  const deleteOutfits = useWardrobeStore(state => state.deleteOutfits);
  const deleteGroupWithAction = useWardrobeStore(state => state.deleteGroupWithAction);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: number; name: string; description: string } | null>(null);

  const group = groups.find(g => g.id === groupId);
  const groupOutfits = useMemo(() => {
    return outfits.filter(o => o.groupId === groupId);
  }, [outfits, groupId]);

  const handleCreateOutfit = useCallback(() => {
    navigation.navigate('ClothingSelection', { source: 'Outfits', groupId });
  }, [navigation, groupId]);

  const handleEditOutfit = useCallback((outfitId: number) => {
    if (isSelectMode) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(outfitId) ? next.delete(outfitId) : next.add(outfitId);
        return next;
      });
    } else {
      navigation.navigate('OutfitEditor', {
        outfitId,
        mode: 'edit',
        groupId,
        exitTo: { screen: 'Main', tab: '搭配' },
      });
    }
  }, [isSelectMode, navigation, groupId]);

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

  const handleMenuAction = useCallback(() => {
    Alert.alert(
      groupName,
      '管理分组',
      [
        {
          text: '编辑分组',
          onPress: () => {
            if (group) {
              setEditingGroup({ id: group.id, name: group.name, description: group.description });
              setShowFormModal(true);
            }
          },
        },
        {
          text: '删除分组',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '删除分组',
              `确定要删除「${groupName}」吗？`,
              [
                { text: '取消', style: 'cancel' },
                {
                  text: '移入未分组',
                  onPress: () => deleteGroupWithAction(groupId, 'move'),
                },
                {
                  text: '同时删除搭配',
                  style: 'destructive',
                  onPress: () => {
                    deleteGroupWithAction(groupId, 'delete_outfits');
                    navigation.goBack();
                  },
                },
              ],
            );
          },
        },
        { text: '取消', style: 'cancel' },
      ],
    );
  }, [groupName, group, groupId, deleteGroupWithAction, navigation]);

  const renderOutfitCard = ({ item }: { item: Outfit }) => {
    const thumbUri = item.thumbnailUri;
    const isSelected = selectedIds.has(item.id);
    const count = item.itemIds?.length || 0;
    const bg = (item as any).canvasBackground;
    const frameColor = bg?.type === 'color' ? bg.value : theme.colors.card;

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && { borderWidth: 2.5, borderColor: theme.colors.primary }]}
        onPress={() => handleEditOutfit(item.id)}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.85}
      >
        {isSelectMode && (
          <View style={[styles.checkbox, isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}
        <View style={[styles.cardThumb, { backgroundColor: frameColor }]}>
          <View style={styles.cardInnerFrame}>
            {thumbUri ? (
              <Image source={{ uri: thumbUri }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={[styles.cardPlaceholder, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="shirt-outline" size={28} color={theme.colors.textTertiary} />
              </View>
            )}
            <View style={styles.cardGradient} pointerEvents="none">
              <View style={styles.cardCountBadge}>
                <Text style={styles.cardCountText}>{count}件</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          {isSelectMode ? (
            <>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>已选 {selectedIds.size} 项</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleCancelSelect}>
                  <Text style={[styles.actionText, { color: theme.colors.primary }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleBatchDelete} disabled={selectedIds.size === 0} style={{ marginLeft: 16 }}>
                  <Text style={[styles.actionText, { color: theme.colors.danger, opacity: selectedIds.size === 0 ? 0.4 : 1 }]}>
                    删除
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.headerInfo}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{groupName}</Text>
                {group?.description ? (
                  <Text style={[styles.headerDesc, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                    {group.description} · {groupOutfits.length}套
                  </Text>
                ) : (
                  <Text style={[styles.headerDesc, { color: theme.colors.textTertiary }]}>
                    {groupOutfits.length}套
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.menuBtn} onPress={handleMenuAction}>
                <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Grid */}
      {groupOutfits.length > 0 ? (
        <FlatList
          data={groupOutfits}
          renderItem={renderOutfitCard}
          keyExtractor={item => item.id.toString()}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          extraData={{ isSelectMode, selectedCount: selectedIds.size, isFocused }}
        />
      ) : (
        <View style={styles.empty}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.borderLight }]}>
            <Ionicons name="shirt-outline" size={40} color={theme.colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>暂未搭配</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
            点击下方按钮创建第一套搭配
          </Text>
          <TouchableOpacity
            style={[styles.emptyCreateBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleCreateOutfit}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyCreateBtnText}>创建搭配</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      {groupOutfits.length > 0 && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={handleCreateOutfit} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Group Edit Modal */}
      <GroupFormModal
        visible={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingGroup(null);
        }}
        editGroup={editingGroup}
      />
    </View>
  );
}

const createStyles = (theme: any, insets: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: theme.colors.background,
      alignItems: 'center', justifyContent: 'center',
    },
    headerInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    headerDesc: { fontSize: 12, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    actionText: { fontSize: 15, fontWeight: '500' },
    menuBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    gridContent: { padding: GRID_PADDING },
    gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
    card: {
      width: CARD_WIDTH,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
      backgroundColor: theme.colors.card,
    },
    cardThumb: { aspectRatio: 1, padding: 10 },
    cardInnerFrame: { flex: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' },
    cardImage: { width: '100%', height: '100%' },
    cardPlaceholder: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
    },
    cardGradient: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
      paddingHorizontal: 8, paddingBottom: 8,
    },
    cardCountBadge: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    },
    cardCountText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    checkbox: {
      position: 'absolute', top: 8, right: 8, zIndex: 10,
      width: 24, height: 24, borderRadius: 12,
      borderWidth: 2, borderColor: theme.colors.border,
      backgroundColor: 'rgba(255,255,255,0.9)',
      alignItems: 'center', justifyContent: 'center',
    },
    empty: {
      flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
    },
    emptyIconWrap: {
      width: 88, height: 88, borderRadius: 44,
      justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    emptyCreateBtn: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
    },
    emptyCreateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    fab: {
      position: 'absolute', right: 20, bottom: 36,
      width: 58, height: 58, borderRadius: 29,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
  });
