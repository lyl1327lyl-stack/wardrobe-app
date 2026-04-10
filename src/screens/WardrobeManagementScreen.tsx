import React, { useState, useEffect, useCallback } from 'react';
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
import { useWardrobeStore } from '../store/wardrobeStore';
import { Wardrobe } from '../types';
import { useTheme } from '../hooks/useTheme';
import WardrobeEditSheet from '../components/WardrobeEditSheet';
import DeleteWardrobeSheet from '../components/DeleteWardrobeSheet';

export function WardrobeManagementScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemoStyles(theme);

  const {
    wardrobes,
    loadWardrobes,
    addWardrobe,
    updateWardrobe,
    deleteWardrobe,
    isWardrobeLoading,
  } = useWardrobeStore();

  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [selectedWardrobe, setSelectedWardrobe] = useState<Wardrobe | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadWardrobes();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWardrobes();
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

  const renderItem = ({ item }: { item: Wardrobe }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <View style={styles.itemText}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.isDefault && (
            <Text style={styles.defaultBadge}>默认</Text>
          )}
        </View>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.actionText}>编辑</Text>
        </TouchableOpacity>
        {!item.isDefault && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Text style={[styles.actionText, styles.deleteText]}>删除</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>管理衣橱</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addText}>+ 添加</Text>
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
            <Text style={styles.emptyText}>暂无衣橱</Text>
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

const useMemoStyles = (theme: any) => {
  return React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 56,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        backButton: {
          padding: 4,
        },
        backText: {
          fontSize: 16,
          color: theme.colors.primary,
        },
        title: {
          fontSize: 17,
          fontWeight: '600',
          color: theme.colors.text,
        },
        addButton: {
          padding: 4,
        },
        addText: {
          fontSize: 16,
          color: theme.colors.primary,
          fontWeight: '500',
        },
        list: {
          padding: 16,
        },
        itemCard: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
        },
        itemInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        itemText: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        itemName: {
          fontSize: 16,
          fontWeight: '500',
          color: theme.colors.text,
        },
        defaultBadge: {
          fontSize: 12,
          color: theme.colors.primary,
          marginLeft: 8,
          backgroundColor: theme.colors.primaryLight || '#e8f4ff',
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 4,
        },
        itemActions: {
          flexDirection: 'row',
          gap: 8,
        },
        actionButton: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 6,
          backgroundColor: theme.colors.background,
        },
        actionText: {
          fontSize: 14,
          color: theme.colors.primary,
        },
        deleteButton: {
          backgroundColor: '#fff0f0',
        },
        deleteText: {
          color: '#ff3b30',
        },
        empty: {
          alignItems: 'center',
          paddingVertical: 40,
        },
        emptyText: {
          fontSize: 15,
          color: theme.colors.textTertiary,
        },
      }),
    [theme]
  );
};
