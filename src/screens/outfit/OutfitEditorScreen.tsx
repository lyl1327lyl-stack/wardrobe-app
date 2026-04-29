import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { generateOutfitThumbnail } from '../../utils/generateOutfitThumbnail';

import { useTheme } from '../../hooks/useTheme';
import { useOutfitStore, CanvasItem, CanvasBackground } from '../../store/outfitStore';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { CanvasToolsBar } from '../../components/outfit/CanvasToolsBar';
import { StyleSelector } from '../../components/outfit/StyleSelector';
import { BackgroundPicker } from '../../components/outfit/BackgroundPicker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_PADDING = 16;
const CANVAS_WIDTH = SCREEN_WIDTH - CANVAS_PADDING * 2;
// 画板高度：屏幕高度 - 顶部导航(约100) - 风格选择(约60) - 底栏(约80) - 内容padding(32) - 额外边距(40)
const CANVAS_HEIGHT = SCREEN_HEIGHT - 100 - 60 - 80 - 32 - 40;
const BASE_IMAGE_SIZE = 70;

type RootStackParamList = {
  ClothingSelection: { source?: 'Outfits' | 'Editor' } | undefined;
  OutfitEditor: {
    selectedIds?: number[];
    outfitId?: number;
    mode?: 'create' | 'edit';
    exitTo?: { screen: string; tab: string };
  };
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
  onRotate: (clothingId: number) => void;
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
  onRotate,
  isSelected,
  onSelect,
  styles,
  theme,
}: DraggableItemProps) {
  // 使用普通 state 管理位置和缩放
  const [position, setPosition] = useState({ x: item.x, y: item.y });
  const [scale, setScale] = useState(item.scale);

  // 手势起始位置
  const panRef = useRef<any>(null);
  const pinchRef = useRef<any>(null);

  // 记录手势开始时的状态
  const startPosition = useRef({ x: 0, y: 0 });
  const startScale = useRef(1);

  // 当 item 的位置从外部更新时，同步到 state
  useEffect(() => {
    setPosition({ x: item.x, y: item.y });
  }, [item.x, item.y]);

  useEffect(() => {
    setScale(item.scale);
  }, [item.scale]);

  // 拖拽手势处理
  const onPanGestureEvent = useCallback((event: any) => {
    // 持续更新位置
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

  // 双指缩放手势处理
  const onPinchGestureEvent = useCallback((event: any) => {
    // 持续更新缩放
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

  const imageSize = BASE_IMAGE_SIZE * scale;

  return (
    <PinchGestureHandler
      ref={pinchRef}
      simultaneousHandlers={panRef}
      onGestureEvent={onPinchGestureEvent}
      onHandlerStateChange={onPinchHandlerStateChange}
    >
      <PanGestureHandler
        ref={panRef}
        simultaneousHandlers={pinchRef}
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
              borderColor: isSelected ? theme.colors.primary : 'transparent',
              borderWidth: isSelected ? 2 : 0,
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
                style={[styles.deleteButton, { top: -10, left: -10 }]}
                onPress={() => onDelete(item.clothingId)}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rotateButton, { bottom: -10, right: -10 }]}
                onPress={() => onRotate(item.clothingId)}
              >
                <Text style={styles.rotateButtonText}>↻</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </PanGestureHandler>
    </PinchGestureHandler>
  );
}

export function OutfitEditorScreen({ onSave }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OutfitEditor'>>();

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
    selectedStyle,
    setSelectedStyle,
    historyIndex,
    history,
    saveToHistory,
    loadFromOutfit,
    editingOutfitId,
    reset,
  } = useOutfitStore();

  const { addOutfit, updateOutfit, outfits } = useWardrobeStore();

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);

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
        const style = (outfit as any).style || '休闲';
        if (canvasData && canvasData.length > 0) {
          loadFromOutfit(canvasData, style, outfitId);
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

  const handleRotate = useCallback(
    (clothingId: number) => {
      saveToHistory();
      const item = canvasItems.find(i => i.clothingId === clothingId);
      if (item) {
        updateCanvasItem(clothingId, { rotation: (item.rotation + 15) % 360 });
      }
    },
    [canvasItems, updateCanvasItem, saveToHistory]
  );

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

  // 统一退出函数：不管从哪个入口进入，都回到目标 Tab
  const exitEditor = useCallback(() => {
    const exitTo = route.params?.exitTo;
    if (exitTo) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: exitTo.screen as any,
            params: {
              screen: exitTo.tab,
            },
          },
        ],
      });
    } else {
      navigation.goBack();
    }
  }, [navigation, route.params?.exitTo]);

  const handleSave = useCallback(async () => {
    console.log('[handleSave] START - selectedStyle:', selectedStyle, 'canvasItems:', canvasItems.length);
    console.log('[handleSave] editingOutfitId:', editingOutfitId);

    if (!selectedStyle) {
      Alert.alert('请选择风格', '请为搭配选择一个风格标签');
      return;
    }
    if (canvasItems.length === 0) {
      Alert.alert('请添加衣物', '请至少添加一件衣物到画板');
      return;
    }

    // Generate thumbnail using Skia
    let thumbnailUri = canvasItems.length > 0 ? canvasItems[0].imageUri : '';
    try {
      console.log('[handleSave] Generating thumbnail with Skia...');
      thumbnailUri = await generateOutfitThumbnail(canvasItems, CANVAS_WIDTH, CANVAS_HEIGHT, BASE_IMAGE_SIZE);
      console.log('[handleSave] Thumbnail generated:', thumbnailUri);
    } catch (e: any) {
      console.warn('[handleSave] Thumbnail generation failed:', e?.message || e);
      thumbnailUri = canvasItems[0].imageUri;
    }

    console.log('[handleSave] Final thumbnailUri:', thumbnailUri);

    const outfitData = {
      name: `${selectedStyle}搭配`,
      itemIds: canvasItems.map(i => i.clothingId),
      canvasData: canvasItems,
      style: selectedStyle,
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
      }

      console.log('[handleSave] Success, about to reset and navigate');

      // Reset outfit store
      reset();

      // 统一出口：回到 exitTo 指定的目标 Tab
      exitEditor();
    } catch (error: any) {
      console.error('[handleSave] Error saving outfit:', error?.message || error);
      Alert.alert('保存失败', error?.message || '请重试');
    }
  }, [canvasItems, selectedStyle, editingOutfitId, navigation, addOutfit, updateOutfit, reset, exitEditor]);

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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 1:1 画布区域 */}
        <View style={styles.canvasWrapper}>
          <TouchableOpacity
            style={[
              styles.canvas,
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
                canvasWidth={CANVAS_WIDTH}
                canvasHeight={CANVAS_HEIGHT}
                onUpdate={updateCanvasItem}
                onDelete={handleDelete}
                onRotate={handleRotate}
                isSelected={selectedItemId === item.clothingId}
                onSelect={() => handleSelect(item.clothingId)}
                styles={styles}
                theme={theme}
              />
            ))}
            {canvasItems.length === 0 && (
              <View style={styles.canvasEmpty}>
                <Ionicons name="image-outline" size={48} color={theme.colors.textTertiary} />
                <Text style={styles.canvasEmptyText}>点击"+"添加衣物</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 风格选择 */}
      <StyleSelector selectedStyle={selectedStyle} onStyleChange={setSelectedStyle} />

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
    },
    contentContainer: {
      paddingVertical: 16,
    },
    canvasWrapper: {
      paddingHorizontal: CANVAS_PADDING,
      flex: 1,
    },
    canvas: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
    },
    canvasGrid: {
      backgroundColor: '#fafafa',
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
    canvasItem: {
      position: 'absolute',
    },
    rotateButton: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rotateButtonText: {
      color: '#fff',
      fontSize: 12,
    },
    deleteButton: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
    },
  });