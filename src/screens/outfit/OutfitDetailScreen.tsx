import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../hooks/useTheme';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { useCustomOptionsStore } from '../../store/customOptionsStore';
import { Outfit, ClothingItem, SEASONS } from '../../types';
import { Theme } from '../../utils/theme';

type RootStackParamList = {
  OutfitDetail: { outfitId: number; groupId?: number; groupName?: string };
  OutfitEditor: {
    outfitId?: number;
    mode?: 'create' | 'edit';
    groupId?: number;
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
  const updateOutfit = useWardrobeStore(s => s.updateOutfit);
  const deleteOutfit = useWardrobeStore(s => s.deleteOutfit);
  const addWearRecords = useWardrobeStore(s => s.addWearRecords);
  const customSeasons = useCustomOptionsStore(s => s.seasons);
  const customTags = useCustomOptionsStore(s => s.tags);

  const outfit = useMemo(() => outfits.find(o => o.id === outfitId), [outfits, outfitId]);
  const currentGroup = groups.find(g => g.id === (outfit?.groupId || groupId));

  const [showMoveModal, setShowMoveModal] = useState(false);

  // Unified draft state — saved together with one Apply button
  const [draftGroupId, setDraftGroupId] = useState<number | null>(null);

  const draftGroup = useMemo(() => groups.find(g => g.id === draftGroupId), [groups, draftGroupId]);
  const [draftSeasons, setDraftSeasons] = useState<string[]>([]);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftNotes, setDraftNotes] = useState('');

  // Initialize draft state when outfit loads
  useEffect(() => {
    if (outfit) {
      setDraftGroupId(outfit.groupId ?? null);
      setDraftSeasons([...(outfit.seasons || [])]);
      setDraftTags([...(outfit.tags || [])]);
      setDraftNotes(outfit.notes || '');
    }
  }, [outfit?.id]);

  // If outfit deleted while viewing, go back
  useEffect(() => {
    if (isFocused && !outfit) {
      navigation.goBack();
    }
  }, [isFocused, outfit, navigation]);

  const savedSeasons: string[] = outfit?.seasons || [];
  const savedTags: string[] = outfit?.tags || [];
  const savedNotes: string = outfit?.notes || '';

  const hasChanges = useMemo(() => {
    const groupChanged = draftGroupId !== (outfit?.groupId ?? null);
    const seasonsChanged = [...draftSeasons].sort().join(',') !== [...savedSeasons].sort().join(',');
    const tagsChanged = [...draftTags].sort().join(',') !== [...savedTags].sort().join(',');
    const notesChanged = draftNotes !== savedNotes;
    return groupChanged || seasonsChanged || tagsChanged || notesChanged;
  }, [draftGroupId, outfit?.groupId, draftSeasons, draftTags, draftNotes, savedSeasons, savedTags, savedNotes]);

  const toggleSeason = useCallback((season: string) => {
    setDraftSeasons(prev =>
      prev.includes(season) ? prev.filter(s => s !== season) : [...prev, season]
    );
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setDraftTags(prev =>
      prev.includes(tag) ? prev.filter(s => s !== tag) : [...prev, tag]
    );
  }, []);

  const handleApply = useCallback(() => {
    if (!outfit) return;
    updateOutfit({
      ...outfit,
      groupId: draftGroupId ?? undefined,
      seasons: [...draftSeasons],
      tags: [...draftTags],
      notes: draftNotes,
    } as Outfit);
  }, [outfit, draftGroupId, draftSeasons, draftTags, draftNotes, updateOutfit]);

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

  const handleSelectDraftGroup = useCallback((toGroupId: number) => {
    setDraftGroupId(toGroupId);
    setShowMoveModal(false);
  }, []);

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

  const seasonOptions = customSeasons.length > 0 ? customSeasons : SEASONS;

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
        {hasChanges ? (
          <TouchableOpacity
            style={[styles.headerApplyBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleApply}
            activeOpacity={0.8}
          >
            <Text style={styles.headerApplyText}>应用</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
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
            <TouchableOpacity
              style={[styles.editCanvasBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                navigation.navigate('OutfitEditor', {
                  outfitId,
                  mode: 'edit',
                  groupId: outfit.groupId,
                  exitTo: { screen: 'OutfitDetail', outfitId, groupId: outfit.groupId, groupName: currentGroup?.name || groupName },
                });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.canvasDivider}>
          <View style={[styles.canvasDividerLine, { backgroundColor: theme.colors.border }]} />
        </View>

        {/* Info Card: group + season + style + notes */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          {/* Group */}
          <View style={styles.infoBlock}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardDot, { backgroundColor: theme.colors.accent }]} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>分组</Text>
            </View>
            <TouchableOpacity
              style={[styles.groupRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              onPress={() => setShowMoveModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="folder-outline"
                size={16}
                color={draftGroup ? theme.colors.primary : theme.colors.textTertiary}
              />
              <Text
                style={[styles.groupRowText, { color: draftGroup ? theme.colors.text : theme.colors.textTertiary }]}
                numberOfLines={1}
              >
                {draftGroup?.name || '未分组'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.blockDivider, { backgroundColor: theme.colors.border }]} />

          {/* Season */}
          <View style={styles.infoBlock}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>季节</Text>
            </View>
            <View style={styles.chipRow}>
              {seasonOptions.map(season => (
                <TouchableOpacity
                  key={season}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                    draftSeasons.includes(season) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => toggleSeason(season)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.chipText,
                    { color: theme.colors.textSecondary },
                    draftSeasons.includes(season) && { color: '#fff' },
                  ]}>
                    {season}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.blockDivider, { backgroundColor: theme.colors.border }]} />

          {/* Style */}
          <View style={styles.infoBlock}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardDot, { backgroundColor: theme.colors.accent }]} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>标签</Text>
            </View>
            {customTags.length > 0 ? (
              <View style={styles.chipRow}>
                {customTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                      draftTags.includes(tag) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                    ]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: theme.colors.textSecondary },
                      draftTags.includes(tag) && { color: '#fff' },
                    ]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyHint, { color: theme.colors.textTertiary }]}>
                暂无标签选项，可在个人中心添加
              </Text>
            )}
          </View>

          <View style={[styles.blockDivider, { backgroundColor: theme.colors.border }]} />

          {/* Notes */}
          <View style={styles.infoBlock}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardDot, { backgroundColor: theme.colors.textTertiary }]} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>备注</Text>
            </View>
            <TextInput
              style={[styles.notesInput, {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }]}
              placeholder="添加备注..."
              placeholderTextColor={theme.colors.textTertiary}
              value={draftNotes}
              onChangeText={setDraftNotes}
              maxLength={200}
              multiline
              textAlignVertical="top"
            />
          </View>

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
      </ScrollView>

      {/* Move Modal */}
      <Modal visible={showMoveModal} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMoveModal(false)}>
          <View style={[styles.moveSheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.moveHandle} />
            <Text style={[styles.moveTitle, { color: theme.colors.text }]}>选择分组</Text>
            <FlatList
              data={groups}
              keyExtractor={item => item.id.toString()}
              style={styles.moveList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.moveItem,
                    { backgroundColor: theme.colors.background },
                    draftGroupId === item.id && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => handleSelectDraftGroup(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.moveItemText, { color: theme.colors.text }]}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.moveItemCount, { color: theme.colors.textTertiary }]}>
                      {outfits.filter(o => o.groupId === item.id).length}套
                    </Text>
                    {draftGroupId === item.id && (
                      <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={[styles.primaryAction, { backgroundColor: theme.colors.primary }]} onPress={handleRecordWear} activeOpacity={0.8}>
          <Ionicons name="checkmark-done" size={20} color="#fff" />
          <Text style={styles.primaryActionText}>记录穿着</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.dangerAction, { backgroundColor: theme.colors.borderLight }]} onPress={handleDelete} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          <Text style={styles.dangerActionText}>删除</Text>
        </TouchableOpacity>
      </View>
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
  });
