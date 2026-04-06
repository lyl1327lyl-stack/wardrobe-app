import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  BackHandler,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ClothingItem, OutfitItemPosition } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { ClothingPickerModal } from '../components/ClothingPickerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH - 32;
const CANVAS_ITEM_SIZE = 100;

type RouteParams = {
  OutfitDetail: { outfitId: number };
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
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
    canvas: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: theme.colors.borderLight,
      position: 'relative',
    },
    canvasWrapper: {
      flex: 1,
    },
    topSpacer: {
      flex: 1,
    },
    bottomSpacer: {
      flex: 1,
      minHeight: 60,
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
      width: CANVAS_ITEM_SIZE,
      height: CANVAS_ITEM_SIZE,
    },
    canvasImage: {
      width: CANVAS_ITEM_SIZE,
      height: CANVAS_ITEM_SIZE,
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
    },
    removeBtnInner: {
      width: 24,
      height: 24,
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

// 可拖动画板衣物
interface CanvasItemProps {
  clothing: ClothingItem;
  position: OutfitItemPosition;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (x: number, y: number, scale: number) => void;
  onRemove: () => void;
  styles: ReturnType<typeof makeStyles>;
}

function CanvasItem({ clothing, position, isSelected, onSelect, onPositionChange, onRemove, styles }: CanvasItemProps) {
  const pan = useRef(new Animated.ValueXY({ x: position.x, y: position.y })).current;
  const absPos = useRef({ x: position.x, y: position.y });

  useEffect(() => {
    absPos.current = { x: position.x, y: position.y };
    pan.setValue({ x: position.x, y: position.y });
    pan.flattenOffset();
  }, [position.x, position.y]);

  const panResponder = useRef(
    require('react-native').PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect();
        pan.setOffset(absPos.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const rawX = (pan.x as any)._value;
        const rawY = (pan.y as any)._value;
        const newX = Math.max(0, Math.min(rawX, SCREEN_WIDTH - CANVAS_ITEM_SIZE));
        const newY = Math.max(0, Math.min(rawY, CANVAS_SIZE - CANVAS_ITEM_SIZE));
        absPos.current = { x: newX, y: newY };
        pan.setValue({ x: newX, y: newY });
        onPositionChange(newX, newY, 1);
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.canvasItem,
        { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
      ]}
      {...panResponder.panHandlers}
    >
      <Image source={{ uri: clothing.thumbnailUri }} style={styles.canvasImage} />
      {isSelected && (
        <View style={styles.removeBtn}>
          <TouchableOpacity style={styles.removeBtnInner} onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

export function OutfitDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'OutfitDetail'>>();
  const { outfitId } = route.params;
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { outfits, clothing, updateOutfit, deleteOutfit } = useWardrobeStore();

  const outfit = outfits.find(o => o.id === outfitId);

  const [localItemIds, setLocalItemIds] = useState<number[]>([]);
  const [localPositions, setLocalPositions] = useState<Record<number, OutfitItemPosition>>({});
  const [canvasItemIds, setCanvasItemIds] = useState<number[]>([]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const canvasRef = useRef<View>(null);

  useEffect(() => {
    if (outfit) {
      const itemIds = outfit.itemIds || [];
      const positions = outfit.itemPositions || {};
      setLocalItemIds(itemIds);
      setLocalPositions(positions);
      const onCanvas = itemIds.filter(id => positions[id]);
      setCanvasItemIds(onCanvas);
      setEditedName(outfit.name);
    }
  }, [outfit?.id]);

  const hasUnsavedChanges = outfit && (
    JSON.stringify(localItemIds) !== JSON.stringify(outfit.itemIds) ||
    JSON.stringify(localPositions) !== JSON.stringify(outfit.itemPositions)
  );

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => backHandler.remove();
  }, [hasUnsavedChanges]);

  const canvasItems: ClothingItem[] = canvasItemIds
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
      if (canvasRef.current && canvasItems.length > 0) {
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

  const addClothingToOutfitById = (id: number) => {
    if (localItemIds.includes(id)) return;
    const padding = 20;
    const available = CANVAS_SIZE - CANVAS_ITEM_SIZE - padding * 2;
    const x = padding + Math.random() * available;
    const y = padding + Math.random() * available;
    setLocalItemIds(prev => [...prev, id]);
    setCanvasItemIds(prev => [...prev, id]);
    setLocalPositions(prev => ({
      ...prev,
      [id]: { x, y, scale: 1 },
    }));
  };

  const removeFromCanvas = (id: number) => {
    setSelectedItemId(null);
    setCanvasItemIds(prev => prev.filter(itemId => itemId !== id));
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
      <View style={styles.canvasWrapper}>
        <View style={styles.topSpacer} />
        <View style={styles.canvas} ref={canvasRef}>
          {canvasItems.length === 0 ? (
            <View style={styles.canvasEmpty}>
              <Ionicons name="images-outline" size={48} color={theme.colors.border} />
              <Text style={styles.canvasEmptyText}>点击下方按钮添加衣服</Text>
            </View>
          ) : (
            canvasItems.map(c => (
              <CanvasItem
                key={c.id}
                clothing={c}
                position={localPositions[c.id] || { x: 0, y: 0, scale: 1 }}
                isSelected={selectedItemId === c.id}
                onSelect={() => setSelectedItemId(c.id)}
                onPositionChange={(x, y, scale) => {
                  setLocalPositions(prev => ({
                    ...prev,
                    [c.id]: { x, y, scale },
                  }));
                }}
                onRemove={() => removeFromCanvas(c.id)}
                styles={styles}
              />
            ))
          )}
        </View>
        <View style={styles.bottomSpacer} />
      </View>

      <ClothingPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        alreadyAddedIds={localItemIds}
        onConfirm={(ids) => {
          ids.forEach(id => addClothingToOutfitById(id));
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

        <TouchableOpacity style={styles.actionBtn} onPress={handleSave} activeOpacity={0.7}>
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

        <TouchableOpacity style={styles.actionBtn} onPress={handleDelete} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
          <Text style={[styles.actionLabel, { color: theme.colors.danger }]}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
