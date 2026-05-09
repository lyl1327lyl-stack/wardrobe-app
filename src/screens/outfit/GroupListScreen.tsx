import React, { useMemo, useCallback, useState } from 'react';
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

import { useTheme } from '../../hooks/useTheme';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { OutfitGroup } from '../../types';
import { GroupFormModal } from './GroupFormModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / NUM_COLUMNS;

type RootStackParamList = {
  GroupDetail: { groupId: number; groupName: string };
  WearCalendar: undefined;
  ClothingSelection: { source?: 'Outfits' | 'Editor'; groupId?: number } | undefined;
};

export function GroupListScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const groups = useWardrobeStore(state => state.groups);
  const outfits = useWardrobeStore(state => state.outfits);

  const [showFormModal, setShowFormModal] = useState(false);

  const groupOutfitCount = useCallback((groupId: number) => {
    return outfits.filter(o => o.groupId === groupId).length;
  }, [outfits]);

  const groupPreviews = useCallback((groupId: number) => {
    return outfits
      .filter(o => o.groupId === groupId)
      .slice(0, 3)
      .map(o => o.thumbnailUri)
      .filter(Boolean) as string[];
  }, [outfits]);

  const navigateToGroup = useCallback((groupId: number, groupName: string) => {
    navigation.navigate('GroupDetail', { groupId, groupName });
  }, [navigation]);

  const renderGroupCard = ({ item }: { item: OutfitGroup }) => {
    const count = groupOutfitCount(item.id);
    const previews = groupPreviews(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => navigateToGroup(item.id, item.name)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '18' }]}>
            <Text style={[styles.countText, { color: theme.colors.primary }]}>{count}套</Text>
          </View>
        </View>
        {previews.length === 0 ? (
          <View style={styles.previewEmptyRow}>
            <Ionicons name="shirt-outline" size={16} color={theme.colors.textTertiary} />
            <Text style={[styles.previewEmptyText, { color: theme.colors.textTertiary }]}>暂无搭配</Text>
          </View>
        ) : (
          <View style={styles.previewRow}>
            {[0, 1, 2].map(idx => {
              const uri = previews[idx];
              if (uri) {
                return (
                  <View key={idx} style={[styles.previewImageWrap, { borderColor: theme.colors.border }]}>
                    <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
                  </View>
                );
              }
              return (
                <View key={idx} style={[styles.previewPlaceholder, { backgroundColor: theme.colors.card }]} />
              );
            })}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  const data = useMemo(() => {
    // 过滤"未分组"：只有存在未分组搭配时才显示
    const ungrouped = groups.find(g => g.name === '未分组');
    const hasUngroupedOutfits = ungrouped && outfits.some(o => o.groupId === ungrouped.id);

    let visibleGroups = groups.filter(g => {
      if (g.name === '未分组') return !!hasUngroupedOutfits;
      return true;
    });

    // "未分组"始终排在最后
    visibleGroups = [...visibleGroups].sort((a, b) => {
      if (a.name === '未分组') return 1;
      if (b.name === '未分组') return -1;
      return a.sortOrder - b.sortOrder;
    });

    return [...visibleGroups, { id: -2, name: '', description: '', sortOrder: 999, createdAt: '' } as OutfitGroup];
  }, [groups, outfits]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>我的搭配</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textTertiary, marginLeft: 6 }]}>
                 · 共 {groups.length} 个分组
              </Text>
            </View>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('WearCalendar')}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={data}
        renderItem={({ item }) => {
          if (item.id === -2) {
            return (
              <TouchableOpacity
                style={[styles.card, styles.addCard]}
                onPress={() => setShowFormModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="folder-outline" size={28} color={theme.colors.textTertiary} />
                <Text style={[styles.addCardText, { color: theme.colors.textTertiary }]}>新建分组</Text>
              </TouchableOpacity>
            );
          }
          return renderGroupCard({ item });
        }}
        keyExtractor={item => item.id.toString()}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        extraData={isFocused}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.borderLight }]}>
              <Ionicons name="folder-open-outline" size={40} color={theme.colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>还没有分组</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
              创建分组来管理你的搭配
            </Text>
            <TouchableOpacity
              style={[styles.emptyCreateBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowFormModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCreateBtnText}>创建分组</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB — 新建搭配 */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 24 }]}
        onPress={() => navigation.navigate('ClothingSelection', { source: 'Outfits' })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <GroupFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
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
    headerInner: {
      height: 36,
      justifyContent: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    headerSubtitle: { fontSize: 13, marginTop: 2 },
    headerIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    gridContent: { padding: GRID_PADDING },
    gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
    card: {
      width: CARD_WIDTH,
      borderRadius: 16,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardName: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
    countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    countText: { fontSize: 11, fontWeight: '600' },
    previewRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
    previewImageWrap: {
      width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
      borderWidth: 1.5,
    },
    previewImage: { width: '100%', height: '100%' },
    previewEmptyRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      height: 48, marginBottom: 8,
    },
    previewEmptyText: { fontSize: 12 },
    previewPlaceholder: {
      width: 48, height: 48, borderRadius: 8,
    },
    cardDesc: { fontSize: 11, lineHeight: 16 },
    addCard: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
      shadowOpacity: 0,
      elevation: 0,
    },
    addCardText: { fontSize: 13, marginTop: 6 },
    empty: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 40, paddingTop: 80,
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
      position: 'absolute',
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
  });
