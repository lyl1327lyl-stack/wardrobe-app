import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Alert,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { generateOutfitThumbnail } from '../../utils/generateOutfitThumbnail';

import { useTheme } from '../../hooks/useTheme';
import { useOutfitStore, CanvasItem } from '../../store/outfitStore';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { CanvasToolsBar } from '../../components/outfit/CanvasToolsBar';
import { StyleSelector } from '../../components/outfit/StyleSelector';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_PADDING = 16;
const CANVAS_SIZE = SCREEN_WIDTH - CANVAS_PADDING * 2;

type RootStackParamList = {
  ClothingSelection: undefined;
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
  canvasSize: number;
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
  canvasSize,
  onUpdate,
  onDelete,
  onRotate,
  isSelected,
  onSelect,
  styles,
  theme,
}: DraggableItemProps) {
  const [position, setPosition] = useState({ x: item.x, y: item.y });
  const [itemScale, setItemScale] = useState(item.scale);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          onSelect();
        },
        onPanResponderMove: (_, gestureState) => {
          const newX = Math.max(0, Math.min(canvasSize - 80, position.x + gestureState.dx));
          const newY = Math.max(0, Math.min(canvasSize - 80, position.y + gestureState.dy));
          setPosition({ x: newX, y: newY });
        },
        onPanResponderRelease: () => {
          onUpdate(item.clothingId, { x: position.x, y: position.y });
        },
      }),
    [position, canvasSize, item.clothingId, onSelect, onUpdate]
  );

  const handlePinch = useCallback(
    (scale: number) => {
      const newScale = Math.max(0.5, Math.min(3, itemScale * scale));
      setItemScale(newScale);
      onUpdate(item.clothingId, { scale: newScale });
    },
    [itemScale, item.clothingId, onUpdate]
  );

  const imageSize = 70 * itemScale;

  return (
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
      {...panResponder.panHandlers}
    >
      {/* Pinchable area using TouchableOpacity with onPressIn for pinch start */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={() => {
          // Store initial scale on pinch start
        }}
        onPress={() => onSelect()}
        onLongPress={() => {
          // Show scale controls on long press
          Alert.alert(
            '调整大小',
            '使用双指捏合可以放大或缩小',
            [{ text: '知道了' }]
          );
        }}
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
            style={[styles.rotateButton, { top: -10, right: -10 }]}
            onPress={() => onRotate(item.clothingId)}
          >
            <Text style={styles.rotateButtonText}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteButton, { top: -10, left: -10 }]}
            onPress={() => onDelete(item.clothingId)}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
          {/* Scale buttons */}
          <View style={[styles.scaleControls, { bottom: -10, left: 0, right: 0 }]}>
            <TouchableOpacity
              style={styles.scaleButton}
              onPress={() => {
                const newScale = Math.max(0.5, itemScale - 0.1);
                setItemScale(newScale);
                onUpdate(item.clothingId, { scale: newScale });
              }}
            >
              <Text style={styles.scaleButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.scaleText}>{Math.round(itemScale * 100)}%</Text>
            <TouchableOpacity
              style={styles.scaleButton}
              onPress={() => {
                const newScale = Math.min(3, itemScale + 0.1);
                setItemScale(newScale);
                onUpdate(item.clothingId, { scale: newScale });
              }}
            >
              <Text style={styles.scaleButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
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
            name: exitTo.screen,
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
      thumbnailUri = await generateOutfitThumbnail(canvasItems);
      console.log('[handleSave] Thumbnail generated:', thumbnailUri);
    } catch (e: any) {
      console.warn('[handleSave] Thumbnail generation failed:', e?.message || e);
      thumbnailUri = canvasItems[0].imageUri;
    }

    console.log('[handleSave] Final thumbnailUri:', thumbnailUri);

    const outfitData = {
      name: `${selectedStyle}搭配`,
      itemIds: canvasItems.map(i => i.clothingId),
      itemPositions: {} as Record<string, any>,
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
            style={[styles.canvas, showGrid && styles.canvasGrid]}
            activeOpacity={1}
            onPress={handleBackgroundPress}
          >
            {canvasItems.map(item => (
              <DraggableItem
                key={item.clothingId}
                item={item}
                canvasSize={CANVAS_SIZE}
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

        {/* 层级控制 */}
        <View style={styles.layerControls}>
          <TouchableOpacity
            style={[styles.layerButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('ClothingSelection')}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.layerDivider} />
          <TouchableOpacity
            style={styles.layerButton}
            onPress={() => selectedItemId && bringForward(selectedItemId)}
          >
            <Ionicons name="arrow-up" size={16} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.layerButton}
            onPress={() => selectedItemId && sendBackward(selectedItemId)}
          >
            <Ionicons name="arrow-down" size={16} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.layerButton}
            onPress={() => selectedItemId && bringToFront(selectedItemId)}
          >
            <Ionicons name="arrow-up-circle" size={16} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.layerButton}
            onPress={() => selectedItemId && sendToBack(selectedItemId)}
          >
            <Ionicons name="arrow-down-circle" size={16} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* 操作提示 */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.legendText}>拖动调整位置</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
            <Text style={styles.legendText}>点击删除</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.legendText}>↻ 旋转</Text>
          </View>
        </View>
      </ScrollView>

      {/* 风格选择 */}
      <StyleSelector selectedStyle={selectedStyle} onStyleChange={setSelectedStyle} />

      {/* 底部工具栏 */}
      <CanvasToolsBar
        onUndo={undo}
        onRedo={redo}
        onToggleGrid={toggleGrid}
        onClear={clearCanvas}
        onChangeBackground={() => {}}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        showGrid={showGrid}
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
    },
    canvas: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
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
    scaleControls: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    scaleButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scaleButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    scaleText: {
      fontSize: 12,
      color: theme.colors.text,
      minWidth: 40,
      textAlign: 'center',
    },
    layerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 18,
      alignSelf: 'center',
      gap: 8,
    },
    layerButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    layerDivider: {
      width: 1,
      height: 20,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
      marginTop: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 3,
    },
    legendText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
  });