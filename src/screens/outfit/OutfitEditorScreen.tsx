import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
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
import { BackgroundPicker } from '../../components/outfit/BackgroundPicker';

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
                borderColor: isSelected ? theme.colors.primary : 'transparent',
                borderWidth: isSelected ? 2 : 0,
                borderStyle: (isSelected ? 'dashed' : 'solid') as any,
              },
            ]}
          >
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
    setCanvasBackground,
    historyIndex,
    history,
    saveToHistory,
    loadFromOutfit,
    editingOutfitId,
    reset,
  } = useOutfitStore();

  const { addOutfit, updateOutfit, outfits, groups } = useWardrobeStore();

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: CANVAS_WIDTH, height: CANVAS_WIDTH });
  const [showTooltip, setShowTooltip] = useState(true);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
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
            text: '保存',
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

  const handleSave = useCallback(async () => {
    console.log('[handleSave] START - canvasItems:', canvasItems.length);
    console.log('[handleSave] editingOutfitId:', editingOutfitId);

    if (canvasItems.length === 0) {
      Alert.alert('请添加衣物', '请至少添加一件衣物到画板');
      return;
    }

    // Generate thumbnail from hidden clean canvas (no shadow, no border, no selection)
    const fallbackUri = canvasItems.length > 0 ? canvasItems[0].imageUri : '';
    let thumbnailUri = fallbackUri;
    try {
      console.log('[handleSave] Capturing thumbnail from clean canvas...');
      thumbnailUri = await generateOutfitThumbnail(captureTargetRef, fallbackUri);
      console.log('[handleSave] Thumbnail generated:', thumbnailUri);
    } catch (e: any) {
      console.warn('[handleSave] Thumbnail generation failed:', e?.message || e);
      thumbnailUri = fallbackUri;
    }

    console.log('[handleSave] Final thumbnailUri:', thumbnailUri);

    // 获取 groupId 的优先级：
    // 1. 编辑已有搭配时，保留原 groupId
    // 2. 从 route params 获取（从 GroupDetailScreen 新建时传入）
    // 3. "未分组" 默认分组
    const getDefaultGroupId = () => {
      const defaultGroup = groups.find(g => g.name === '未分组');
      return defaultGroup?.id || groups[0]?.id || 0;
    };

    let groupId: number;
    if (editingOutfitId) {
      const existingOutfit = outfits.find(o => o.id === editingOutfitId);
      groupId = existingOutfit?.groupId || groupIdFromRoute || getDefaultGroupId();
    } else {
      groupId = groupIdFromRoute || getDefaultGroupId();
    }

    const outfitData = {
      name: `${groups.find(g => g.id === groupId)?.name || '未分组'}搭配`,
      itemIds: canvasItems.map(i => i.clothingId),
      canvasData: canvasItems,
      canvasBackground,
      groupId,
      thumbnailUri,
      createdAt: new Date().toISOString(),
    };

    console.log('[handleSave] Calling database - editingOutfitId:', editingOutfitId);

    try {
      console.log('[handleSave] outfitData:', JSON.stringify(outfitData, null, 2));
      if (editingOutfitId) {
        // Update existing outfit
        const updatedOutfit = { ...outfitData, id: editingOutfitId };
        await updateOutfit(updatedOutfit as any);
        console.log('[handleSave] Updated outfit:', editingOutfitId);
      } else {
        // Add new outfit
        const newId = await addOutfit(outfitData as any);
        console.log('[handleSave] Added new outfit with id:', newId);

        // Reset outfit store
        reset();

        // 标记为保存退出，跳过 beforeRemove 拦截
        isSaving.current = true;

        // 新建搭配 → 询问用户是否编辑其他属性
        const gName = groups.find(g => g.id === groupId)?.name || '';
        Alert.alert(
          '搭配已创建',
          '是否需要编辑搭配的季节、风格、备注等属性？',
          [
            {
              text: '返回分组',
              style: 'cancel',
              onPress: () => {
                navigation.reset({
                  index: 1,
                  routes: [
                    { name: 'Main' as any, params: { screen: '搭配' } },
                    { name: 'GroupDetail' as any, params: { groupId, groupName: gName } },
                  ],
                });
              },
            },
            {
              text: '编辑属性',
              onPress: () => {
                navigation.reset({
                  index: 2,
                  routes: [
                    { name: 'Main' as any, params: { screen: '搭配' } },
                    { name: 'GroupDetail' as any, params: { groupId, groupName: gName } },
                    { name: 'OutfitDetail' as any, params: { outfitId: newId, groupId, groupName: gName } },
                  ],
                });
              },
            },
          ],
        );
        return;
      }

      console.log('[handleSave] Success, about to reset and navigate');

      // Reset outfit store
      reset();

      // 标记为保存退出，跳过 beforeRemove 拦截
      isSaving.current = true;

      // 统一出口：回到 exitTo 指定的目标 Tab
      exitEditor();
    } catch (error: any) {
      console.error('[handleSave] Error saving outfit:', error?.message || error);
      Alert.alert('保存失败', error?.message || '请重试');
    }
  }, [canvasItems, editingOutfitId, canvasBackground, navigation, addOutfit, updateOutfit, reset, exitEditor, groupIdFromRoute, groups, outfits]);
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

      <View style={styles.content}>
        <View style={styles.canvasWrapper}>
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
        </View>

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

      {/* 底部工具栏 */}
      <CanvasToolsBar
        onAdd={() => navigation.navigate('ClothingSelection', { source: 'Editor' })}
        onMoveUp={() => selectedItemId && bringForward(selectedItemId)}
        onMoveDown={() => selectedItemId && sendBackward(selectedItemId)}
        onBackground={() => setShowBackgroundPicker(true)}
        hasSelection={!!selectedItemId}
      />

      {/* 背景选择器 */}
      <BackgroundPicker
        visible={showBackgroundPicker}
        onClose={() => setShowBackgroundPicker(false)}
        currentBackground={canvasBackground}
        onSelectBackground={setCanvasBackground}
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
    content: {
      flex: 1,
      backgroundColor: theme.colors.borderLight,
    },
    canvasWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: CANVAS_PADDING,
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
  });