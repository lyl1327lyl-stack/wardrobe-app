import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { generateOutfitThumbnail } from '../../utils/generateOutfitThumbnail';

import { useTheme } from '../../hooks/useTheme';
import { useOutfitStore, CanvasItem, CanvasBackground } from '../../store/outfitStore';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { CanvasToolsBar } from '../../components/outfit/CanvasToolsBar';
import { OutfitAttributesSheet, OutfitAttributes } from '../../components/OutfitAttributesSheet';
import { useCustomOptionsStore } from '../../store/customOptionsStore';
import { ClothingItem } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_PADDING = 10;
const CANVAS_WIDTH = SCREEN_WIDTH - CANVAS_PADDING * 2;
const BASE_IMAGE_SIZE = 70;

type RootStackParamList = {
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

interface Props {
  onSave?: (canvasData: CanvasItem[], style: string) => void;
}

interface DraggableItemProps {
  item: CanvasItem;
  canvasWidth: number;
  canvasHeight: number;
  onUpdate: (clothingId: number, updates: Partial<CanvasItem>) => void;
  onDelete: (clothingId: number) => void;
  isSelected: boolean;
  onSelect: () => void;
  isDeleted?: boolean;
  styles: any;
  theme: any;
}

function DraggableItem({
  item,
  canvasWidth,
  canvasHeight,
  onUpdate,
  onDelete,
  isSelected,
  onSelect,
  isDeleted,
  styles,
  theme,
}: DraggableItemProps) {
  const [position, setPosition] = useState({ x: item.x, y: item.y });
  const [scale, setScale] = useState(item.scale);
  const [rotation, setRotation] = useState(item.rotation);

  const panRef = useRef<any>(null);
  const pinchRef = useRef<any>(null);
  const rotationRef = useRef<any>(null);

  const startPosition = useRef({ x: 0, y: 0 });
  const startScale = useRef(1);
  const startRotation = useRef(0);

  useEffect(() => {
    setPosition({ x: item.x, y: item.y });
  }, [item.x, item.y]);

  useEffect(() => {
    setScale(item.scale);
  }, [item.scale]);

  useEffect(() => {
    setRotation(item.rotation);
  }, [item.rotation]);

  const onPanGestureEvent = useCallback((event: any) => {
    const maxSize = BASE_IMAGE_SIZE * scale;
    const newX = Math.max(0, Math.min(canvasWidth - maxSize, startPosition.current.x + event.nativeEvent.translationX));
    const newY = Math.max(0, Math.min(canvasHeight - maxSize, startPosition.current.y + event.nativeEvent.translationY));
    setPosition({ x: newX, y: newY });
  }, [canvasWidth, canvasHeight, scale]);

  const onPanHandlerStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      onSelect();
      startPosition.current = { x: position.x, y: position.y };
    } else if (event.nativeEvent.state === State.END) {
      onUpdate(item.clothingId, { x: position.x, y: position.y });
    }
  }, [item.clothingId, position.x, position.y, onSelect, onUpdate]);

  const onPinchGestureEvent = useCallback((event: any) => {
    const newScale = Math.max(0.5, Math.min(3, startScale.current * event.nativeEvent.scale));
    setScale(newScale);
  }, []);

  const onPinchHandlerStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      startScale.current = scale;
    } else if (event.nativeEvent.state === State.END) {
      onUpdate(item.clothingId, { scale });
    }
  }, [item.clothingId, scale, onUpdate]);

  const onRotationGestureEvent = useCallback((event: any) => {
    const deg = startRotation.current + (event.nativeEvent.rotation * 180 / Math.PI);
    setRotation(((deg % 360) + 360) % 360);
  }, []);

  const onRotationHandlerStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      startRotation.current = rotation;
    } else if (event.nativeEvent.state === State.END) {
      onUpdate(item.clothingId, { rotation: ((rotation % 360) + 360) % 360 });
    }
  }, [item.clothingId, rotation, onUpdate]);

  // Rotate handle — drag from bottom-right corner to rotate
  const handlePanRef = useRef<any>(null);
  const handleStartRotation = useRef(0);

  const onHandlePanEvent = useCallback((event: any) => {
    const half = (BASE_IMAGE_SIZE * scale) / 2;
    const tx = half + event.nativeEvent.translationX;
    const ty = half + event.nativeEvent.translationY;
    const angle = Math.atan2(ty, tx) * 180 / Math.PI;
    const deg = handleStartRotation.current + (angle - 45);
    setRotation(((deg % 360) + 360) % 360);
  }, [scale]);

  const onHandlePanStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      onSelect();
      handleStartRotation.current = rotation;
    } else if (event.nativeEvent.state === State.END) {
      onUpdate(item.clothingId, { rotation: ((rotation % 360) + 360) % 360 });
    }
  }, [item.clothingId, rotation, onSelect, onUpdate]);

  const imageSize = BASE_IMAGE_SIZE * scale;

  return (
    <RotationGestureHandler
      ref={rotationRef}
      simultaneousHandlers={[panRef, pinchRef]}
      onGestureEvent={onRotationGestureEvent}
      onHandlerStateChange={onRotationHandlerStateChange}
    >
      <PinchGestureHandler
        ref={pinchRef}
        simultaneousHandlers={[panRef, rotationRef]}
        onGestureEvent={onPinchGestureEvent}
        onHandlerStateChange={onPinchHandlerStateChange}
      >
        <PanGestureHandler
          ref={panRef}
          simultaneousHandlers={[pinchRef, rotationRef]}
          onGestureEvent={onPanGestureEvent}
          onHandlerStateChange={onPanHandlerStateChange}
          minPointers={1}
          avgTouches
        >
          <View
            style={[
              styles.canvasItem,
              {
                left: position.x,
                top: position.y,
                zIndex: item.zIndex,
                width: imageSize,
                height: imageSize,
                transform: [{ rotate: `${rotation}deg` }],
                borderColor: isSelected ? theme.colors.primary : (isDeleted ? theme.colors.warning : 'transparent'),
                borderWidth: isSelected ? 2 : (isDeleted ? 1.5 : 0),
                borderStyle: (isSelected ? 'dashed' : 'solid') as any,
                opacity: isDeleted ? 0.75 : 1,
              },
            ]}
          >
            {isDeleted && (
              <View style={styles.deletedBadge}>
                <Ionicons name="warning" size={10} color="#fff" />
              </View>
            )}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onSelect()}
              style={{ flex: 1 }}
            >
              <Image
                source={{ uri: item.imageUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            {isSelected && (
              <>
                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: theme.colors.danger }]}
                  onPress={() => onDelete(item.clothingId)}
                >
                  <Text style={styles.deleteBtnText}>×</Text>
                </TouchableOpacity>
                <PanGestureHandler
                  ref={handlePanRef}
                  onGestureEvent={onHandlePanEvent}
                  onHandlerStateChange={onHandlePanStateChange}
                  minPointers={1}
                  avgTouches
                >
                  <View style={[styles.rotateHandle, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.rotateHandleText}>↻</Text>
                  </View>
                </PanGestureHandler>
              </>
            )}
          </View>
        </PanGestureHandler>
      </PinchGestureHandler>
    </RotationGestureHandler>
  );
}

export function OutfitEditorScreen({ onSave }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OutfitEditor'>>();

  const groupIdFromRoute = route.params?.groupId;
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(groupIdFromRoute ?? null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const {
    canvasItems,
    updateCanvasItem,
    removeCanvasItem,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    undo,
    redo,
    clearCanvas,
    toggleGrid,
    showGrid,
    canvasBackground,
    historyIndex,
    history,
    saveToHistory,
    loadFromOutfit,
    editingOutfitId,
    reset,
  } = useOutfitStore();

  const { addOutfit, updateOutfit, outfits, groups, clothing } = useWardrobeStore();

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: CANVAS_WIDTH, height: CANVAS_WIDTH });
  const [showTooltip, setShowTooltip] = useState(true);
  const [showAttrSheet, setShowAttrSheet] = useState(false);
  const customSeasons = useCustomOptionsStore(s => s.seasons);

  // 检测画板中已删除的单品
  const deletedClothingIds = useMemo(() => {
    return canvasItems
      .filter(ci => !clothing.some(c => c.id === ci.clothingId))
      .map(ci => ci.clothingId);
  }, [canvasItems, clothing]);

  const handleClearDeleted = useCallback(() => {
    deletedClothingIds.forEach(id => removeCanvasItem(id));
  }, [deletedClothingIds, removeCanvasItem]);

  // 保存前预填属性：编辑模式读 outfit 现值；新建模式推断（季节交集、标签并集）
  const prefillAttributes = useMemo<OutfitAttributes>(() => {
    const getDefaultGroupId = () =>
      groups.find(g => g.name === '未分组')?.id || groups[0]?.id || 0;
    if (editingOutfitId) {
      const existing = outfits.find(o => o.id === editingOutfitId);
      return {
        name: existing?.name || '',
        groupId: selectedGroupId ?? existing?.groupId ?? getDefaultGroupId(),
        seasons: existing?.seasons || [],
        tags: existing?.tags || [],
        notes: existing?.notes || '',
      };
    }
    // 新建：推断
    const clothings = canvasItems
      .map(ci => clothing.find(c => c.id === ci.clothingId))
      .filter((c): c is ClothingItem => !!c);
    // 季节交集：所有单品都含的季
    const seasonSets = clothings.map(c => new Set(c.seasons));
    const intersected = customSeasons.filter(s =>
      seasonSets.length > 0 && seasonSets.every(set => set.has(s)),
    );
    // 标签并集：去重合并
    const tagUnion = Array.from(new Set(clothings.flatMap(c => c.tags)));
    const gid = selectedGroupId ?? getDefaultGroupId();
    const mainType =
      clothings[0]?.parentType ||
      clothings[0]?.type ||
      groups.find(g => g.id === gid)?.name ||
      '搭配';
    return {
      name: `${mainType}搭配`,
      groupId: gid,
      seasons: intersected,
      tags: tagUnion,
      notes: '',
    };
  }, [editingOutfitId, outfits, canvasItems, clothing, selectedGroupId, groups, customSeasons]);
  const canvasRef = useRef<View>(null);
  const captureTargetRef = useRef<View>(null);

  // Auto-dismiss tooltip when items are added or after 4 seconds
  useEffect(() => {
    if (canvasItems.length > 0) {
      setShowTooltip(false);
      return;
    }
    if (!showTooltip) return;
    const timer = setTimeout(() => setShowTooltip(false), 4000);
    return () => clearTimeout(timer);
  }, [canvasItems.length, showTooltip]);

  // Track unsaved changes — use refs to avoid stale closure issues
  const initialSnapshot = useRef<string | null>(null);
  const isSaving = useRef(false);
  const itemsRef = useRef(canvasItems);
  itemsRef.current = canvasItems;
  const bgRef = useRef(canvasBackground);
  bgRef.current = canvasBackground;
  const handleSaveRef = useRef<() => void>(() => {});

  // Capture baseline snapshot after initial data loads
  useEffect(() => {
    const timer = setTimeout(() => {
      if (initialSnapshot.current === null) {
        initialSnapshot.current = JSON.stringify({
          items: itemsRef.current,
          bg: bgRef.current,
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [route.params]);

  // Intercept back navigation when there are unsaved changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (isSaving.current) {
        isSaving.current = false;
        return; // Allow navigation after save
      }

      const current = JSON.stringify({
        items: itemsRef.current,
        bg: bgRef.current,
      });

      if (initialSnapshot.current === null || current === initialSnapshot.current) {
        return; // No changes or no snapshot yet
      }

      e.preventDefault();
      Alert.alert(
        '未保存的修改',
        '画板有未保存的修改，请选择：',
        [
          {
            text: '放弃更改',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
          {
            text: '填写并保存',
            onPress: () => handleSaveRef.current(),
          },
        ],
      );
    });

    return unsubscribe;
  }, [navigation]);

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  // Load existing outfit data when editing
  React.useEffect(() => {
    const { outfitId, selectedIds } = route.params || {};
    console.log('[OutfitEditorScreen] useEffect - outfitId:', outfitId, 'selectedIds:', selectedIds);

    if (outfitId) {
      // Editing existing outfit
      const outfit = outfits.find(o => o.id === outfitId);
      if (outfit) {
        setSelectedGroupId(outfit.groupId ?? null);
        const canvasData = (outfit as any).canvasData;
        const background = (outfit as any).canvasBackground;
        if (canvasData && canvasData.length > 0) {
          loadFromOutfit(canvasData, outfitId, background);
          console.log('[OutfitEditorScreen] Loaded existing outfit:', outfitId);
        }
      }
    } else if (selectedIds && selectedIds.length > 0) {
      // New outfit with preselected clothing - do NOT reset, store already has selectedClothings from ClothingSelectionScreen
    } else {
      // No params - user opened editor directly, reset the store
      reset();
    }
  }, [route.params]);

  const handleDelete = useCallback(
    (clothingId: number) => {
      removeCanvasItem(clothingId);
      setSelectedItemId(null);
    },
    [removeCanvasItem]
  );

  const handleSelect = useCallback((id: number) => {
    setSelectedItemId(id);
  }, []);

  // 统一退出函数：不管从哪个入口进入，都回到目标页面
  const exitEditor = useCallback(() => {
    const exitTo = route.params?.exitTo;
    if (exitTo) {
      if (exitTo.screen === 'OutfitDetail') {
        navigation.goBack();
      } else if (exitTo.screen === 'GroupDetail' && exitTo.groupId) {
        // 从 GroupDetail 进入：返回 GroupDetail 页面
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Main' as any, params: { screen: '搭配' } },
            { name: 'GroupDetail' as any, params: { groupId: exitTo.groupId, groupName: exitTo.groupName || '' } },
          ],
        });
      } else if (exitTo.tab) {
        // Tab 页面
        navigation.reset({
          index: 0,
          routes: [{ name: exitTo.screen as any, params: { screen: exitTo.tab } }],
        });
      } else {
        navigation.goBack();
      }
    } else {
      navigation.goBack();
    }
  }, [navigation, route.params?.exitTo]);

  // 保存按钮：校验画板非空后打开属性 Sheet
  const handleSave = useCallback(() => {
    if (canvasItems.length === 0) {
      Alert.alert('请添加衣物', '请至少添加一件衣物到画板');
      return;
    }
    setShowAttrSheet(true);
  }, [canvasItems.length]);

  // Sheet 确认后：生成缩略图 + 写库（含完整属性）+ 退出
  const handleConfirmAttributes = useCallback(async (attrs: OutfitAttributes) => {
    // 生成缩略图（隐藏画布，去除选中态）
    const fallbackUri = canvasItems.length > 0 ? canvasItems[0].imageUri : '';
    let thumbnailUri = fallbackUri;
    try {
      thumbnailUri = await generateOutfitThumbnail(captureTargetRef, fallbackUri);
    } catch (e: any) {
      thumbnailUri = fallbackUri;
    }

    const outfitData = {
      name: attrs.name,
      itemIds: canvasItems.map(i => i.clothingId),
      canvasData: canvasItems,
      canvasBackground,
      groupId: attrs.groupId,
      seasons: attrs.seasons,
      tags: attrs.tags,
      notes: attrs.notes,
      thumbnailUri,
      createdAt: new Date().toISOString(),
    };

    try {
      if (editingOutfitId) {
        // 编辑：更新后回详情页
        const updatedOutfit = { ...outfitData, id: editingOutfitId };
        await updateOutfit(updatedOutfit as any);
        reset();
        isSaving.current = true;
        exitEditor();
      } else {
        // 新建：写入后 reset 到该搭配所在分组
        await addOutfit(outfitData as any);
        reset();
        isSaving.current = true;
        const gName = groups.find(g => g.id === attrs.groupId)?.name || '';
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Main' as any, params: { screen: '搭配' } },
            { name: 'GroupDetail' as any, params: { groupId: attrs.groupId, groupName: gName } },
          ],
        });
      }
      setShowAttrSheet(false);
    } catch (error: any) {
      Alert.alert('保存失败', error?.message || '请重试');
    }
  }, [canvasItems, canvasBackground, editingOutfitId, addOutfit, updateOutfit, reset, exitEditor, groups, navigation]);
  handleSaveRef.current = handleSave;

  const handleBackgroundPress = useCallback(() => {
    setSelectedItemId(null);
  }, []);

  return (
    <View style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>搭配画板</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </View>

      {/* 已删除单品清除横幅 */}
      {deletedClothingIds.length > 0 && (
        <View style={styles.deletedBanner}>
          <View style={styles.deletedBannerLeft}>
            <Ionicons name="warning-outline" size={16} color={theme.colors.warning} />
            <Text style={styles.deletedBannerText}>
              检测到 {deletedClothingIds.length} 个已删除的单品
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.deletedBannerBtn, { backgroundColor: theme.colors.warning }]}
            onPress={handleClearDeleted}
            activeOpacity={0.7}
          >
            <Text style={styles.deletedBannerBtnText}>一键清除</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.canvasCentered}>
          <TouchableOpacity
            ref={canvasRef}
            style={[
              styles.canvas,
              { width: CANVAS_WIDTH, height: CANVAS_WIDTH },
              showGrid && styles.canvasGrid,
              canvasBackground.type === 'color' && { backgroundColor: canvasBackground.value },
            ]}
            activeOpacity={1}
            onPress={handleBackgroundPress}
          >
            {canvasItems.map(item => (
              <DraggableItem
                key={item.clothingId}
                item={item}
                canvasWidth={canvasDims.width}
                canvasHeight={canvasDims.height}
                onUpdate={updateCanvasItem}
                onDelete={handleDelete}
                isSelected={selectedItemId === item.clothingId}
                onSelect={() => handleSelect(item.clothingId)}
                isDeleted={deletedClothingIds.includes(item.clothingId)}
                styles={styles}
                theme={theme}
              />
            ))}
            {showTooltip && canvasItems.length === 0 && (
              <View style={styles.tooltipBubble} pointerEvents="none">
                <Ionicons name="hand-left-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.tooltipText}>拖拽移动 · 双指缩放 · 双指旋转</Text>
              </View>
            )}
            {canvasItems.length === 0 && (
              <View style={styles.canvasEmpty}>
                <Ionicons name="image-outline" size={48} color={theme.colors.textTertiary} />
                <Text style={styles.canvasEmptyText}>点击"+"添加衣物</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendIcon, { backgroundColor: theme.colors.danger }]}>
                <Text style={styles.legendIconText}>×</Text>
              </View>
              <Text style={[styles.legendText, { color: theme.colors.textTertiary }]}>删除</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIcon, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.legendIconText}>↻</Text>
              </View>
              <Text style={[styles.legendText, { color: theme.colors.textTertiary }]}>旋转</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIcon, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}>
                <Ionicons name="chevron-up" size={12} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.legendText, { color: theme.colors.textTertiary }]}>上一层</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIcon, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}>
                <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.legendText, { color: theme.colors.textTertiary }]}>下一层</Text>
            </View>
          </View>
        </View>

        {/* Floating layer controls — visible when an item is selected */}
        {selectedItemId && (
          <View style={styles.layerControls}>
            <TouchableOpacity
              style={[styles.layerBtn, { backgroundColor: theme.colors.card }]}
              onPress={() => bringForward(selectedItemId)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-up" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={[styles.layerDivider, { backgroundColor: theme.colors.border }]} />
            <TouchableOpacity
              style={[styles.layerBtn, { backgroundColor: theme.colors.card }]}
              onPress={() => sendBackward(selectedItemId)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-down" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* Hidden canvas for clean thumbnail capture — no shadow, no border, no selection */}
        <View style={styles.captureContainer} pointerEvents="none">
          <View
            ref={captureTargetRef}
            style={[
              styles.captureCanvas,
              { width: canvasDims.width, height: canvasDims.height, backgroundColor: 'transparent' },
            ]}
          >
            {canvasItems.map(item => (
              <Image
                key={item.clothingId}
                source={{ uri: item.imageUri }}
                style={{
                  position: 'absolute',
                  left: item.x,
                  top: item.y,
                  width: BASE_IMAGE_SIZE * item.scale,
                  height: BASE_IMAGE_SIZE * item.scale,
                  transform: [{ rotate: `${item.rotation}deg` }],
                }}
                resizeMode="contain"
              />
            ))}
          </View>
        </View>
      </View>

      {/* 分组选择 Modal */}
      <Modal visible={showGroupModal} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowGroupModal(false)}>
          <View style={[styles.groupSheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.groupSheetHandle} />
            <Text style={[styles.groupSheetTitle, { color: theme.colors.text }]}>选择分组</Text>
            <FlatList
              data={groups}
              keyExtractor={item => item.id.toString()}
              style={styles.groupList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.groupItem,
                    { backgroundColor: theme.colors.background },
                    selectedGroupId === item.id && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary },
                  ]}
                  onPress={() => {
                    setSelectedGroupId(item.id);
                    setShowGroupModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.groupItemText, { color: theme.colors.text }]}>{item.name}</Text>
                  {selectedGroupId === item.id && (
                    <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <OutfitAttributesSheet
        visible={showAttrSheet}
        initial={prefillAttributes}
        groups={groups}
        onClose={() => setShowAttrSheet(false)}
        onConfirm={handleConfirmAttributes}
      />

      {/* 底部工具栏 */}
      <CanvasToolsBar
        onAdd={() => navigation.navigate('ClothingSelection', { source: 'Editor' })}
        selectedGroupName={groups.find(g => g.id === selectedGroupId)?.name}
        onSelectGroup={() => setShowGroupModal(true)}
      />
    </View>
  );
}

const createStyles = (theme: any, insets: any) =>
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
      paddingTop: insets.top + 8,
      paddingBottom: 12,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
    },
    deletedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.warning + '12',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.warning + '30',
    },
    deletedBannerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    deletedBannerText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.warning,
    },
    deletedBannerBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
    },
    deletedBannerBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    deletedBadge: {
      position: 'absolute',
      top: -4,
      left: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.warning,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
    },
    content: {
      flex: 1,
      backgroundColor: theme.colors.borderLight,
    },
    canvasCentered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: CANVAS_PADDING,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
      gap: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    legendIconText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    legendText: {
      fontSize: 11,
      fontWeight: '500',
    },
    canvas: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      position: 'relative',
      ...theme.shadows.md,
    },
    canvasGrid: {
      backgroundColor: '#fafafa',
    },
    captureContainer: {
      position: 'absolute',
      left: -9999,
      top: 0,
    },
    captureCanvas: {
      overflow: 'hidden',
    },
    canvasEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    canvasEmptyText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.colors.textTertiary,
    },
    tooltipBubble: {
      position: 'absolute',
      top: 12,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary + '15',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      zIndex: 10,
    },
    tooltipText: {
      fontSize: 12,
      color: theme.colors.primary,
      marginLeft: 6,
      fontWeight: '500',
    },
    canvasItem: {
      position: 'absolute',
    },
    deleteBtn: {
      position: 'absolute',
      top: -10,
      left: -10,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
    },
    deleteBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    rotateHandle: {
      position: 'absolute',
      bottom: -12,
      right: -12,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
    },
    rotateHandleText: {
      color: '#fff',
      fontSize: 15,
    },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
    },
    groupSheet: {
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 20, maxHeight: '50%',
    },
    groupSheetHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: '#ddd', alignSelf: 'center',
      marginTop: 12, marginBottom: 16,
    },
    groupSheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    groupList: { marginBottom: 8 },
    groupItem: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 8,
      borderWidth: 2, borderColor: 'transparent',
    },
    groupItemText: { fontSize: 15, fontWeight: '500' },
    layerControls: {
      position: 'absolute',
      right: CANVAS_PADDING + 8,
      top: '50%',
      transform: [{ translateY: -44 }],
      borderRadius: 12,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    layerBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    layerDivider: {
      height: 1,
      marginHorizontal: 8,
    },
  });