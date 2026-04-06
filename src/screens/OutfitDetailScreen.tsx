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
  Animated,
  PanResponder,
  TextInput,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { Outfit, ClothingItem, OutfitItemPosition } from '../types';
import { theme } from '../utils/theme';
import { ClothingPickerModal } from '../components/ClothingPickerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_HEIGHT = SCREEN_WIDTH * 1.2;
const ITEM_SIZE = 120;

type RouteParams = {
  OutfitDetail: { outfitId: number };
};

interface CanvasItemData {
  clothing: ClothingItem;
  position: OutfitItemPosition;
}

export function OutfitDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'OutfitDetail'>>();
  const { outfitId } = route.params;

  const { outfits, clothing, updateOutfit, deleteOutfit } = useWardrobeStore();

  const outfit = outfits.find(o => o.id === outfitId);

  // 本地状态：待保存的衣物列表和位置
  const [localItemIds, setLocalItemIds] = useState<number[]>([]);
  const [localPositions, setLocalPositions] = useState<Record<number, OutfitItemPosition>>({});

  // UI状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);

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

  // 未加入搭配的衣物
  const availableClothing = clothing.filter(c => !localItemIds.includes(c.id));

  // 画板上的衣物
  const canvasItems: CanvasItemData[] = localItemIds
    .map(id => {
      const c = clothing.find(cl => cl.id === id);
      if (!c) return null;
      return {
        clothing: c,
        position: localPositions[id] || { x: 0, y: 0, scale: 1 },
      };
    })
    .filter(Boolean) as CanvasItemData[];

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
      await updateOutfit({
        ...outfit,
        name: editedName.trim() || outfit.name,
        itemIds: localItemIds,
        itemPositions: localPositions,
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

  const addClothingToCanvasById = (id: number) => {
    if (localItemIds.includes(id)) return;
    const randomX = (Math.random() - 0.5) * 60;
    const randomY = (Math.random() - 0.5) * 60;
    const centerX = (SCREEN_WIDTH - ITEM_SIZE) / 2 + randomX;
    const centerY = (CANVAS_HEIGHT - ITEM_SIZE) / 2 + randomY;
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
          <TextInput
            style={styles.nameInput}
            value={editedName}
            onChangeText={setEditedName}
            onBlur={() => setIsEditingName(false)}
            onSubmitEditing={() => setIsEditingName(false)}
            autoFocus
          />
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
      <View style={styles.canvas} onTouchStart={() => setSelectedItemId(null)}>
        {canvasItems.length === 0 ? (
          <View style={styles.canvasEmpty}>
            <Ionicons name="images-outline" size={48} color={theme.colors.border} />
            <Text style={styles.canvasEmptyText}>从下方添加衣服到画板</Text>
          </View>
        ) : (
          canvasItems.map(({ clothing: c, position }) => (
            <DraggableItem
              key={c.id}
              clothing={c}
              position={position}
              isSelected={selectedItemId === c.id}
              onSelect={() => setSelectedItemId(c.id)}
              onDeselect={() => setSelectedItemId(null)}
              onPositionChange={(x, y, scale) => {
                setLocalPositions(prev => ({
                  ...prev,
                  [c.id]: { x, y, scale },
                }));
              }}
              onRemove={() => removeItemFromCanvas(c.id)}
            />
          ))
        )}
      </View>

      {/* 底部Strip */}
      <View style={styles.bottomStrip}>
        <Text style={styles.stripTitle}>添加到搭配</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}
        >
          {availableClothing.length === 0 ? (
            <Text style={styles.stripEmpty}>所有衣服都已添加</Text>
          ) : (
            availableClothing.map(item => (
              <DraggableStripItem
                key={item.id}
                item={item}
                onAddToCanvas={addClothingToCanvasById}
              />
            ))
          )}
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="add" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 底部操作栏 */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle-outline" size={20} color={hasUnsavedChanges ? theme.colors.primary : theme.colors.textTertiary} />
          <Text style={[styles.actionBtnText, { color: hasUnsavedChanges ? theme.colors.primary : theme.colors.textTertiary }]}>保存</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditingName(true)}>
          <Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.actionBtnText}>改名</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
          <Text style={[styles.actionBtnText, { color: theme.colors.danger }]}>删除</Text>
        </TouchableOpacity>
      </View>

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
    </View>
  );
}

// 可拖动 Strip 衣物组件（拖出 Strip 区域添加到画板）
interface DraggableStripItemProps {
  item: ClothingItem;
  onAddToCanvas: (id: number) => void;
}

function DraggableStripItem({ item, onAddToCanvas }: DraggableStripItemProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const stripTopY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 15;
      },
      onPanResponderGrant: () => {
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        // 如果向上拖动超过 strip 区域，添加到画板
        if (gestureState.moveY < stripTopY.current - 20) {
          onAddToCanvas(item.id);
        }
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.stripItem, { transform: [{ translateY: pan.y }] }]}
      onLayout={(e) => { stripTopY.current = e.nativeEvent.layout.y; }}
      {...panResponder.panHandlers}
    >
      <Image source={{ uri: item.thumbnailUri }} style={styles.stripImage} />
    </Animated.View>
  );
}

// 可拖动衣物组件
interface DraggableItemProps {
  clothing: ClothingItem;
  position: OutfitItemPosition;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onPositionChange: (x: number, y: number, scale: number) => void;
  onRemove: () => void;
}

function DraggableItem({
  clothing,
  position,
  isSelected,
  onSelect,
  onPositionChange,
  onRemove,
}: DraggableItemProps) {
  const pan = useRef(new Animated.ValueXY({ x: position.x, y: position.y })).current;
  const currentPosition = useRef({ x: position.x, y: position.y });
  const scale = useRef(new Animated.Value(position.scale)).current;
  const currentScale = useRef(position.scale);

  useEffect(() => {
    pan.setValue({ x: position.x, y: position.y });
    currentPosition.current = { x: position.x, y: position.y };
  }, [position.x, position.y]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect();
        pan.setOffset({
          x: currentPosition.current.x,
          y: currentPosition.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        currentPosition.current.x += gestureState.dx;
        currentPosition.current.y += gestureState.dy;
        onPositionChange(
          currentPosition.current.x,
          currentPosition.current.y,
          currentScale.current
        );
      },
    })
  ).current;

  const panStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { scale: scale },
    ],
  };

  return (
    <Animated.View
      style={[styles.canvasItem, panStyle]}
      {...panResponder.panHandlers}
    >
      <Image source={{ uri: clothing.thumbnailUri }} style={styles.canvasImage} />
      {isSelected && (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Ionicons name="close" size={16} color={theme.colors.white} />
        </TouchableOpacity>
      )}
    </Animated.View>
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
    gap: 8,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
  },
  saveBtnText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
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
  menuBtn: {
    padding: 4,
  },
  nameInput: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    minWidth: 120,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
    paddingVertical: 2,
  },
  canvas: {
    width: SCREEN_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: theme.colors.borderLight,
    position: 'relative',
  },
  canvasEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  canvasEmptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  canvasItem: {
    position: 'absolute',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  canvasImage: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.card,
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  bottomStrip: {
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  stripTitle: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  stripContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
    flexDirection: 'row',
  },
  stripItem: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.borderLight,
  },
  stripImage: {
    width: 64,
    height: 64,
  },
  stripEmpty: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    paddingVertical: 16,
  },
  addBtn: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.borderLight,
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.border,
  },
  menuPanel: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    padding: 8,
    minWidth: 180,
    ...theme.shadows.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
  },
  menuItemText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 100,
  },
});
