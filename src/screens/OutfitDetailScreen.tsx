import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  BackHandler,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ClothingItem, OutfitItemPosition } from '../types';
import { theme } from '../utils/theme';
import { ClothingPickerModal } from '../components/ClothingPickerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_ITEM_SIZE = 90;

type RouteParams = {
  OutfitDetail: { outfitId: number };
};

export function OutfitDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'OutfitDetail'>>();
  const { outfitId } = route.params;

  const { outfits, clothing, updateOutfit, deleteOutfit } = useWardrobeStore();

  const outfit = outfits.find(o => o.id === outfitId);

  // 本地状态
  const [localItemIds, setLocalItemIds] = useState<number[]>([]);
  const [localPositions, setLocalPositions] = useState<Record<number, OutfitItemPosition>>({});

  // UI状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const canvasRef = useRef<View>(null);

  // 初始化数据
  useEffect(() => {
    if (outfit) {
      setLocalItemIds(outfit.itemIds || []);
      setLocalPositions(outfit.itemPositions || {});
      setEditedName(outfit.name);
    }
  }, [outfit?.id]);

  // 计算是否有未保存的修改
  const hasUnsavedChanges = outfit && (
    JSON.stringify(localItemIds) !== JSON.stringify(outfit.itemIds) ||
    JSON.stringify(localPositions) !== JSON.stringify(outfit.itemPositions) ||
    editedName !== outfit.name
  );

  // 硬件返回键监听
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => backHandler.remove();
  }, [hasUnsavedChanges]);

  // 画板上的衣物
  const canvasItems: ClothingItem[] = localItemIds
    .map(id => clothing.find(cl => cl.id === id))
    .filter(Boolean) as ClothingItem[];

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        '有未保存的修改',
        '确定要放弃修改并退出吗？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确定',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [hasUnsavedChanges, navigation]);

  const handleSave = async () => {
    if (!outfit) return;
    try {
      let thumbnailUri: string | undefined;
      if (canvasRef.current) {
        try {
          thumbnailUri = await captureRef(canvasRef, { format: 'png', quality: 0.8 });
        } catch {
          // 截图失败不影响保存
        }
      }
      await updateOutfit({
        ...outfit,
        name: editedName.trim() || outfit.name,
        itemIds: localItemIds,
        itemPositions: localPositions,
        thumbnailUri,
      });
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch {
      Alert.alert('保存失败，请重试');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '确认删除',
      `确定要删除搭配「${outfit?.name}」吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteOutfit(outfitId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const confirmNameEdit = () => {
    setIsEditingName(false);
  };

  const addClothingToCanvasById = (id: number) => {
    if (localItemIds.includes(id)) return;
    const centerX = (SCREEN_WIDTH - CANVAS_ITEM_SIZE) / 2;
    const centerY = 100 + Math.random() * 100;
    setLocalItemIds(prev => [...prev, id]);
    setLocalPositions(prev => ({
      ...prev,
      [id]: { x: centerX, y: centerY, scale: 1 },
    }));
  };

  const removeItemFromCanvas = (id: number) => {
    setSelectedItemId(null);
    setLocalItemIds(prev => prev.filter(itemId => itemId !== id));
    setLocalPositions(prev => {
      const newPositions = { ...prev };
      delete newPositions[id];
      return newPositions;
    });
  };

  if (!outfit) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>搭配不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        {isEditingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={styles.nameInput}
              value={editedName}
              onChangeText={setEditedName}
              autoFocus
            />
            <TouchableOpacity onPress={confirmNameEdit} style={styles.nameConfirmBtn}>
              <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setIsEditingName(true)}>
            <Text style={styles.headerTitle}>{editedName}</Text>
            <Text style={styles.headerSubtitle}>点击改名</Text>
          </TouchableOpacity>
        )}

        <View style={styles.headerRight}>
          {showSaved ? (
            <View style={styles.savedIndicator}>
              <Ionicons name="checkmark" size={16} color={theme.colors.success} />
              <Text style={styles.savedText}>已保存</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 画板区域 */}
      <ScrollView style={styles.canvasScroll} contentContainerStyle={styles.canvasContent}>
        <View style={styles.canvas} ref={canvasRef}>
          {canvasItems.length === 0 ? (
            <View style={styles.canvasEmpty}>
              <Ionicons name="images-outline" size={48} color={theme.colors.border} />
              <Text style={styles.canvasEmptyText}>点击下方「添加衣服」添加衣物</Text>
            </View>
          ) : (
            <View style={styles.canvasGrid}>
              {canvasItems.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.canvasItem,
                    selectedItemId === c.id && styles.canvasItemSelected,
                  ]}
                  onPress={() => {
                    if (selectedItemId === c.id) {
                      removeItemFromCanvas(c.id);
                    } else {
                      setSelectedItemId(c.id);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: c.thumbnailUri }} style={styles.canvasImage} />
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>已选</Text>
                  </View>
                  {selectedItemId === c.id && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeItemFromCanvas(c.id)}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ClothingPickerModal */}
      <ClothingPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        alreadyAddedIds={localItemIds}
        onConfirm={(ids) => {
          ids.forEach(id => addClothingToCanvasById(id));
          setShowPicker(false);
        }}
      />

      {/* 底部操作栏 */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={22} color={theme.colors.primary} />
          <Text style={[styles.actionLabel, { color: theme.colors.primary }]}>添加衣服</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color={hasUnsavedChanges ? theme.colors.primary : theme.colors.textTertiary}
          />
          <Text
            style={[
              styles.actionLabel,
              { color: hasUnsavedChanges ? theme.colors.primary : theme.colors.textTertiary },
            ]}
          >
            保存
          </Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
          <Text style={[styles.actionLabel, { color: theme.colors.danger }]}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerBtn: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
    justifyContent: 'flex-end',
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: {
    fontSize: 13,
    color: theme.colors.success,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    minWidth: 120,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  nameConfirmBtn: {
    padding: 4,
  },
  canvasScroll: {
    flex: 1,
  },
  canvasContent: {
    flexGrow: 1,
  },
  canvas: {
    flex: 1,
    minHeight: SCREEN_WIDTH * 1.2,
    backgroundColor: theme.colors.borderLight,
    padding: 8,
  },
  canvasEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    minHeight: SCREEN_WIDTH * 1.0,
  },
  canvasEmptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  canvasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 4,
  },
  canvasItem: {
    width: CANVAS_ITEM_SIZE,
    height: CANVAS_ITEM_SIZE,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  canvasItemSelected: {
    borderColor: theme.colors.danger,
  },
  canvasImage: {
    width: CANVAS_ITEM_SIZE,
    height: CANVAS_ITEM_SIZE,
  },
  selectedBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  selectedBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    paddingVertical: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 100,
  },
});
