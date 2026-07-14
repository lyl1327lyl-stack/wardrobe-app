import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWardrobeStore } from '../store/wardrobeStore';
import { Wardrobe } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import WardrobeEditSheet from '../components/WardrobeEditSheet';
import DeleteWardrobeSheet from '../components/DeleteWardrobeSheet';

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // ── Header ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 56,
      paddingBottom: 14,
      paddingHorizontal: 20,
      backgroundColor: theme.colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.2,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 16,
      overflow: 'hidden',
    },
    addBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },

    // ── List ──
    list: {
      padding: 16,
      paddingBottom: 40,
    },

    // ── Card ──
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      ...theme.shadows.sm,
    },
    cardIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    cardInfo: {
      flex: 1,
    },
    cardNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    defaultBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      overflow: 'hidden',
    },
    defaultBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
    },
    cardCount: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 4,
    },
    cardActions: {
      flexDirection: 'row',
      gap: 6,
    },
    actionBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── Empty ──
    empty: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.primary + '12',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    emptySub: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginBottom: 20,
    },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 13,
      paddingHorizontal: 24,
      borderRadius: 16,
      overflow: 'hidden',
    },
    emptyBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
  });

export function WardrobeManagementScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const {
    wardrobes,
    clothing,
    loadWardrobes,
    loadData,
    addWardrobe,
    updateWardrobe,
    deleteWardrobe,
    isWardrobeLoading,
  } = useWardrobeStore();

  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [selectedWardrobe, setSelectedWardrobe] = useState<Wardrobe | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 每个衣橱的单品数量
  const wardrobeCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of clothing) {
      if (c.wardrobeId != null) {
        map.set(c.wardrobeId, (map.get(c.wardrobeId) || 0) + 1);
      }
    }
    return map;
  }, [clothing]);

  useFocusEffect(
    useCallback(() => {
      loadWardrobes();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAdd = () => {
    setSelectedWardrobe(null);
    setEditSheetVisible(true);
  };

  const handleEdit = (wardrobe: Wardrobe) => {
    setSelectedWardrobe(wardrobe);
    setEditSheetVisible(true);
  };

  const handleDelete = (wardrobe: Wardrobe) => {
    const count = wardrobeCounts.get(wardrobe.id) || 0;
    if (count === 0) {
      // 空衣橱：简单二次确认即可
      Alert.alert('删除衣橱', `确定要删除「${wardrobe.name}」吗？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWardrobe(wardrobe.id, 'delete');
            } catch (error) {
              Alert.alert('删除失败', '请重试');
            }
          },
        },
      ]);
      return;
    }
    setSelectedWardrobe(wardrobe);
    setDeleteSheetVisible(true);
  };

  const handleSave = async (name: string) => {
    try {
      if (selectedWardrobe) {
        await updateWardrobe(selectedWardrobe.id, name);
      } else {
        await addWardrobe(name);
      }
    } catch (error) {
      Alert.alert('保存失败', '请重试');
    }
  };

  const handleDeleteConfirm = async (action: 'move' | 'trash' | 'delete') => {
    if (!selectedWardrobe) return;
    try {
      await deleteWardrobe(selectedWardrobe.id, action);
      setDeleteSheetVisible(false);
    } catch (error) {
      Alert.alert('删除失败', '请重试');
    }
  };

  const renderItem = ({ item, index }: { item: Wardrobe; index: number }) => {
    const count = wardrobeCounts.get(item.id) || 0;
    const palette = [
      ['#6B7FD7', '#8B9FE8'], // 紫蓝
      ['#E8B4A0', '#F0C8B4'], // 暖橘
      ['#00B894', '#34D399'], // 翠绿
      ['#FDCB6E', '#FEDC8C'], // 金黄
      ['#A29BFE', '#C4BFFF'], // 紫
      ['#74B9FF', '#A0D2FF'], // 天蓝
    ];
    const [c1, c2] = palette[index % palette.length];

    return (
      <View style={styles.card}>
        {/* 左侧图标 */}
        <LinearGradient
          colors={[c1, c2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardIconWrap}
        >
          <Ionicons name="file-tray-full-outline" size={20} color="#fff" />
        </LinearGradient>

        {/* 中间信息 */}
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            {item.isDefault && (
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.defaultBadge}
              >
                <Text style={styles.defaultBadgeText}>默认</Text>
              </LinearGradient>
            )}
          </View>
          <Text style={styles.cardCount}>{count} 件单品</Text>
        </View>

        {/* 右侧操作 */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.background }]}
            onPress={() => handleEdit(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {!item.isDefault && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.danger + '12' }]}
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── 顶栏 ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>管理衣橱</Text>
        <TouchableOpacity onPress={handleAdd} activeOpacity={0.85}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>添加</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={wardrobes}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="file-tray-outline" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>暂无衣橱</Text>
            <Text style={styles.emptySub}>创建衣橱来分类管理你的单品</Text>
            <TouchableOpacity onPress={handleAdd} activeOpacity={0.85}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyBtn}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>创建衣橱</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      <WardrobeEditSheet
        visible={editSheetVisible}
        wardrobe={selectedWardrobe}
        onClose={() => setEditSheetVisible(false)}
        onSave={handleSave}
      />

      {selectedWardrobe && (
        <DeleteWardrobeSheet
          visible={deleteSheetVisible}
          wardrobe={selectedWardrobe}
          onClose={() => setDeleteSheetVisible(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </View>
  );
}
