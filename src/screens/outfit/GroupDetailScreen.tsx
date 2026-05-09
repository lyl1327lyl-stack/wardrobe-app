import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
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
    exitTo?: { screen: string; tab?: string; groupId?: number; groupName?: string; outfitId?: number };
  };
  OutfitDetail: { outfitId: number; groupId?: number; groupName?: string };
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
  const clothing = useWardrobeStore(state => state.clothing);
  const deleteOutfits = useWardrobeStore(state => state.deleteOutfits);
  const deleteGroupWithAction = useWardrobeStore(state => state.deleteGroupWithAction);
  const moveGroupOutfits = useWardrobeStore(state => state.moveGroupOutfits);
  const moveOutfits = useWardrobeStore(state => state.moveOutfits);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: number; name: string; description: string } | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

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
      navigation.navigate('OutfitDetail', {
        outfitId,
        groupId,
        groupName: group?.name || groupName,
      });
    }
  }, [isSelectMode, navigation, groupId, group?.name, groupName]);

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

  const handleSelectAll = useCallback(() => {
    const allIds = groupOutfits.map(o => o.id);
    setSelectedIds(new Set(allIds));
  }, [groupOutfits]);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    Alert.alert(
      '删除搭配',
      `确定要删除 ${count} 套搭配吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            const ids = Array.from(selectedIds);
            await deleteOutfits(ids);
            setIsSelectMode(false);
            setSelectedIds(new Set());
          },
        },
      ],
    );
  }, [selectedIds, deleteOutfits]);

  const handleMenuAction = useCallback(() => {
    setShowMenuDropdown(prev => !prev);
  }, []);

  const handleMenuEdit = useCallback(() => {
    setShowMenuDropdown(false);
    if (group) {
      setEditingGroup({ id: group.id, name: group.name, description: group.description });
      setShowFormModal(true);
    }
  }, [group]);

  const handleMenuDelete = useCallback(() => {
    setShowMenuDropdown(false);
    const displayName = group?.name || groupName;
    const hasOutfits = groupOutfits.length > 0;

    if (hasOutfits) {
      Alert.alert(
        '删除分组',
        `确定要删除「${displayName}」吗？`,
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
    } else {
      Alert.alert(
        '删除分组',
        `确定要删除「${displayName}」吗？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: () => {
              deleteGroupWithAction(groupId, 'delete_outfits');
              navigation.goBack();
            },
          },
        ],
      );
    }
  }, [group?.name, groupName, groupId, groupOutfits.length, deleteGroupWithAction, navigation]);

  const handleMoveToGroup = useCallback((toGroupId: number) => {
    const targetName = groups.find(g => g.id === toGroupId)?.name || '';
    if (isSelectMode) {
      if (selectedIds.size > 0) {
        const count = selectedIds.size;
        Alert.alert(
          '移动搭配',
          `确定将 ${count} 套搭配移动到「${targetName}」吗？`,
          [
            { text: '取消', style: 'cancel' },
            {
              text: '移动',
              onPress: async () => {
                await moveOutfits(Array.from(selectedIds), toGroupId);
                setIsSelectMode(false);
                setSelectedIds(new Set());
              },
            },
          ],
        );
      }
    } else {
      Alert.alert(
        '移动搭配',
        `确定将所有搭配移动到「${targetName}」吗？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '移动',
            onPress: async () => {
              await moveGroupOutfits(groupId, toGroupId);
            },
          },
        ],
      );
    }
    setShowMoveModal(false);
  }, [groupId, isSelectMode, selectedIds, groups, moveGroupOutfits, moveOutfits]);

  const renderOutfitCard = ({ item }: { item: Outfit }) => {
    const thumbUri = item.thumbnailUri;
    const isSelected = selectedIds.has(item.id);
    const count = item.itemIds?.length || 0;
    const bg = (item as any).canvasBackground;
    const frameColor = bg?.type === 'color' ? bg.value : theme.colors.card;
    const canvasData = (item as any).canvasData;
    const totalPrice = canvasData
      ? canvasData.reduce((sum: number, ci: any) => {
          const c = clothing.find(cl => cl.id === ci.clothingId);
          return sum + (c?.price || 0);
        }, 0)
      : 0;

    return (
      <TouchableOpacity
        style={[styles.card, { borderWidth: 2.5, borderColor: isSelected ? theme.colors.primary : 'transparent' }]}
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
              {totalPrice > 0 && (
                <View style={styles.cardPriceBadge}>
                  <Text style={styles.cardPriceText}>¥{totalPrice.toLocaleString()}</Text>
                </View>
              )}
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
              <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>已选 {selectedIds.size} 项</Text>
              </View>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={handleSelectAll}>
                <Text style={[styles.actionText, { color: theme.colors.primary }]}>全选</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancelSelect} style={{ marginLeft: 14 }}>
                <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>取消</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.headerInfo}>
                <View style={styles.headerTitleRow}>
                  <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{group?.name || groupName}</Text>
                  <Text style={[styles.headerCount, { color: theme.colors.textTertiary }]}>{groupOutfits.length}套</Text>
                </View>
                {group?.description ? (
                  <Text style={[styles.headerDesc, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                    {group.description}
                  </Text>
                ) : null}
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
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: isSelectMode ? insets.bottom + 96 : 36 }]}
          onPress={handleCreateOutfit}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Select Mode Bottom Bar */}
      {isSelectMode && (
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => setShowMoveModal(true)}
            activeOpacity={0.7}
            disabled={selectedIds.size === 0}
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={18}
              color={selectedIds.size === 0 ? theme.colors.textTertiary : theme.colors.textSecondary}
            />
            <Text style={[styles.bottomBtnText, { color: selectedIds.size === 0 ? theme.colors.textTertiary : theme.colors.textSecondary }]}>
              移动到
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={handleBatchDelete}
            activeOpacity={0.7}
            disabled={selectedIds.size === 0}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={selectedIds.size === 0 ? theme.colors.textTertiary : theme.colors.danger}
            />
            <Text style={[styles.bottomBtnText, { color: selectedIds.size === 0 ? theme.colors.textTertiary : theme.colors.danger }]}>
              删除
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Move Group Modal */}
      <Modal visible={showMoveModal} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMoveModal(false)}>
          <View style={[styles.moveSheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.moveHandle} />
            <Text style={[styles.moveTitle, { color: theme.colors.text }]}>移动到其他分组</Text>
            <Text style={[styles.moveSubtext, { color: theme.colors.textTertiary }]}>
              {isSelectMode && selectedIds.size > 0
                ? `将 ${selectedIds.size} 套选中搭配移入`
                : `将 ${groupOutfits.length} 套搭配移入`}
            </Text>
            <FlatList
              data={groups.filter(g => g.id !== groupId)}
              keyExtractor={item => item.id.toString()}
              style={styles.moveList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.moveItem, { backgroundColor: theme.colors.background }]}
                  onPress={() => handleMoveToGroup(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.moveItemText, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.moveItemCount, { color: theme.colors.textTertiary }]}>
                    {outfits.filter(o => o.groupId === item.id).length}套
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Group Edit Modal */}
      <GroupFormModal
        visible={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingGroup(null);
        }}
        editGroup={editingGroup}
      />

      {/* Dropdown Menu */}
      {showMenuDropdown && (
        <>
          <TouchableOpacity
            style={[styles.dropdownOverlay, { top: insets.top + 56 }]}
            activeOpacity={1}
            onPress={() => setShowMenuDropdown(false)}
          />
          <View style={[styles.dropdownMenu, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, top: insets.top + 52 }]}>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleMenuEdit} activeOpacity={0.6}>
              <Ionicons name="create-outline" size={16} color={theme.colors.text} />
              <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>编辑分组</Text>
            </TouchableOpacity>
            <View style={[styles.dropdownDivider, { backgroundColor: theme.colors.border }]} />
            <TouchableOpacity style={styles.dropdownItem} onPress={handleMenuDelete} activeOpacity={0.6}>
              <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
              <Text style={[styles.dropdownItemText, { color: theme.colors.danger }]}>删除分组</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
    headerTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    headerCount: { fontSize: 13 },
    headerDesc: { fontSize: 12, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    actionText: { fontSize: 15, fontWeight: '500' },
    menuBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    dropdownOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99,
    },
    dropdownMenu: {
      position: 'absolute', top: 52, right: 12,
      borderRadius: 14, borderWidth: 1,
      paddingVertical: 6, minWidth: 160,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 10,
      zIndex: 100,
    },
    dropdownItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12, gap: 10,
    },
    dropdownItemText: { fontSize: 15 },
    dropdownDivider: { height: 1, marginVertical: 4, marginHorizontal: 12 },
    bottomBar: {
      flexDirection: 'row', alignItems: 'center',
      borderTopWidth: 1,
      paddingTop: 10, paddingHorizontal: 16,
    },
    bottomBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 10, borderRadius: 10, gap: 6,
    },
    bottomBtnText: { fontSize: 13, fontWeight: '500' },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
    },
    moveSheet: {
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 20, maxHeight: '50%',
    },
    moveHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: '#ddd', alignSelf: 'center',
      marginTop: 12, marginBottom: 16,
    },
    moveTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    moveSubtext: { fontSize: 13, marginBottom: 16 },
    moveList: { marginBottom: 8 },
    moveItem: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 8,
    },
    moveItemText: { fontSize: 15, fontWeight: '500' },
    moveItemCount: { fontSize: 13 },
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
    cardPriceBadge: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    },
    cardPriceText: { color: '#fff', fontSize: 11, fontWeight: '600' },
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
