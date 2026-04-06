import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { documentDirectory, copyAsync } from 'expo-file-system/legacy';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_PADDING = 20;
const IMAGE_AREA_SIZE = SCREEN_WIDTH - IMAGE_PADDING * 2;

type CropRouteParams = {
  ImageCrop: { imageUri: string };
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.94)',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 50,
      paddingBottom: 12,
    },
    headerBtn: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.white,
    },
    hint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 12,
    },
    hintText: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.5)',
    },
    imageWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: IMAGE_PADDING,
    },
    imageFrame: {
      position: 'relative',
      backgroundColor: '#111',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    cropOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    maskTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    maskBottom: {
      position: 'absolute',
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    maskLeft: {
      position: 'absolute',
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    maskRight: {
      position: 'absolute',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    cropBorder: {
      position: 'absolute',
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    handle: {
      position: 'absolute',
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      borderRadius: HANDLE_SIZE / 2,
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.white,
    },
    handleTL: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
    handleTR: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
    handleBL: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
    handleBR: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
    gridLine: {
      position: 'absolute',
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    gridLineH: {
      height: 1,
      width: '100%',
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    footerText: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.4)',
      textAlign: 'center',
      marginBottom: 14,
    },
    footerButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    skipBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
    },
    skipBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.7)',
    },
    confirmCropBtn: {
      flex: 1.6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
    },
    confirmCropBtnDisabled: {
      opacity: 0.5,
    },
    confirmCropBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.white,
    },
  });

const HANDLE_SIZE = 22;

export function ImageCropScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<CropRouteParams, 'ImageCrop'>>();
  const { imageUri } = route.params;
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [cropRegion, setCropRegion] = useState({ x: 40, y: 40, width: 80, height: 80 });
  const [imageLayout, setImageLayout] = useState({ width: IMAGE_AREA_SIZE, height: IMAGE_AREA_SIZE });
  const [isProcessing, setIsProcessing] = useState(false);
  const cropRef = useRef<{ x: number; y: number; width: number; height: number }>({ x: 40, y: 40, width: 80, height: 80 });
  const activeHandleRef = useRef<string | null>(null);

  const handleImageLoad = (event: any) => {
    const { width, height } = event.nativeEvent.source;
    const aspectRatio = width / height;
    let imgW = IMAGE_AREA_SIZE;
    let imgH = IMAGE_AREA_SIZE;
    if (aspectRatio > 1) {
      imgH = IMAGE_AREA_SIZE / aspectRatio;
    } else {
      imgW = IMAGE_AREA_SIZE * aspectRatio;
    }
    setImageLayout({ width: imgW, height: imgH });

    const size = Math.min(imgW, imgH) * 0.7;
    const initial = {
      x: (imgW - size) / 2,
      y: (imgH - size) / 2,
      width: size,
      height: size,
    };
    setCropRegion(initial);
    cropRef.current = initial;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        activeHandleRef.current = detectHandle(locationX, locationY);
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        const handle = activeHandleRef.current;
        const { x: cx, y: cy, width: cw, height: ch } = cropRef.current;

        if (handle === 'move') {
          const newX = Math.max(0, Math.min(imageLayout.width - cw, cx + gestureState.dx));
          const newY = Math.max(0, Math.min(imageLayout.height - ch, cy + gestureState.dy));
          const next = { ...cropRef.current, x: newX, y: newY };
          cropRef.current = next;
          setCropRegion({ ...next });
          gestureState.dx = 0;
          gestureState.dy = 0;
        } else if (handle) {
          const next = updateByHandle(handle, locationX, locationY, cropRef.current);
          cropRef.current = next;
          setCropRegion({ ...next });
        }
      },
      onPanResponderRelease: () => {
        activeHandleRef.current = null;
      },
    })
  ).current;

  const detectHandle = (x: number, y: number): string | null => {
    const { x: cx, y: cy, width: cw, height: ch } = cropRef.current;
    const HANDLE_SIZE_LOCAL = 32;
    const handles = [
      { name: 'tl', x: cx, y: cy },
      { name: 'tr', x: cx + cw, y: cy },
      { name: 'bl', x: cx, y: cy + ch },
      { name: 'br', x: cx + cw, y: cy + ch },
      { name: 'move', x: cx + cw / 2, y: cy + ch / 2 },
    ];
    for (const h of handles) {
      if (Math.abs(x - h.x) < HANDLE_SIZE_LOCAL && Math.abs(y - h.y) < HANDLE_SIZE_LOCAL) {
        return h.name;
      }
    }
    // If tapped inside crop area (not on handle), treat as move
    if (x >= cx && x <= cx + cw && y >= cy && y <= cy + ch) {
      return 'move';
    }
    return null;
  };

  const updateByHandle = (
    handle: string,
    x: number,
    y: number,
    curr: { x: number; y: number; width: number; height: number }
  ) => {
    let { x: cx, y: cy, width: cw, height: ch } = curr;
    const H = 28;
    switch (handle) {
      case 'tl':
        cx = Math.max(0, x - H / 2);
        cy = Math.max(0, y - H / 2);
        cw = Math.max(60, cropRef.current.width + (cropRef.current.x - cx));
        ch = Math.max(60, cropRef.current.height + (cropRef.current.y - cy));
        break;
      case 'tr':
        cy = Math.max(0, y - H / 2);
        cw = Math.max(60, x + H / 2 - cx);
        ch = Math.max(60, cropRef.current.height + (cropRef.current.y - cy));
        break;
      case 'bl':
        cx = Math.max(0, x - H / 2);
        cw = Math.max(60, cropRef.current.width + (cropRef.current.x - cx));
        ch = Math.max(60, y + H / 2 - cy);
        break;
      case 'br':
        cw = Math.max(60, x + H / 2 - cx);
        ch = Math.max(60, y + H / 2 - cy);
        break;
    }
    cx = Math.min(cx, imageLayout.width - 60);
    cy = Math.min(cy, imageLayout.height - 60);
    cw = Math.min(cw, imageLayout.width - cx);
    ch = Math.min(ch, imageLayout.height - cy);
    return { x: cx, y: cy, width: cw, height: ch };
  };

  const applyCropResult = (resultUri: string) => {
    // Find AddClothing or EditClothing screen's params and update croppedUri
    const navState = navigation.getParent()?.getState();
    if (navState?.routes) {
      for (const r of navState.routes) {
        if (r.name === 'AddClothing' || r.name === 'EditClothing') {
          r.params = { ...r.params, croppedUri: resultUri };
          break;
        }
      }
    }
    navigation.goBack();
  };

  const handleCrop = async () => {
    setIsProcessing(true);
    try {
      const { x, y, width, height } = cropRef.current;
      const result = await manipulateAsync(
        imageUri,
        [{ crop: { originX: x, originY: y, width, height } }],
        { compress: 0.9, format: SaveFormat.PNG }
      );
      const timestamp = Date.now();
      const savedPath = `${documentDirectory}images/crop_${timestamp}.png`;
      await copyAsync({ from: result.uri, to: savedPath });
      applyCropResult(savedPath);
    } catch (error) {
      console.error('Crop failed:', error);
      applyCropResult(imageUri);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    // Skip cropping - use original image as-is, pass it back
    applyCropResult(imageUri);
  };

  const { x: cx, y: cy, width: cw, height: ch } = cropRegion;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
          <Ionicons name="close" size={26} color={theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>调整裁剪区域</Text>
        <TouchableOpacity onPress={handleCrop} style={styles.headerBtn} disabled={isProcessing}>
          <Ionicons
            name="checkmark"
            size={28}
            color={isProcessing ? 'rgba(255,255,255,0.3)' : theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.hint}>
        <Ionicons name="hand-left-outline" size={15} color="rgba(255,255,255,0.55)" />
        <Text style={styles.hintText}>拖动边框和四角，选中衣物区域以移除背景</Text>
      </View>

      <View style={styles.imageWrapper}>
        <View
          ref={(ref) => {
            if (ref) {
              (ref as any).measure = (callback: Function) => {
                callback(0, 0, imageLayout.width, imageLayout.height, 0, 0);
              };
            }
          }}
          style={[styles.imageFrame, { width: imageLayout.width, height: imageLayout.height }]}
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width: imageLayout.width, height: imageLayout.height }}
            resizeMode="contain"
            onLoad={handleImageLoad}
          />
          <View style={styles.cropOverlay} pointerEvents="box-none">
            {/* Dark masks */}
            <View style={[styles.maskTop, { width: imageLayout.width, height: cy }]} />
            <View style={[styles.maskBottom, { top: cy + ch, width: imageLayout.width, height: imageLayout.height - cy - ch }]} />
            <View style={[styles.maskLeft, { top: cy, width: cx, height: ch }]} />
            <View style={[styles.maskRight, { top: cy, left: cx + cw, width: imageLayout.width - cx - cw, height: ch }]} />

            {/* Crop border + handles */}
            <View
              style={[styles.cropBorder, { left: cx, top: cy, width: cw, height: ch }]}
              {...panResponder.panHandlers}
            >
              <View style={[styles.handle, styles.handleTL]} />
              <View style={[styles.handle, styles.handleTR]} />
              <View style={[styles.handle, styles.handleBL]} />
              <View style={[styles.handle, styles.handleBR]} />
              <View style={[styles.gridLine, { left: cw / 3, width: 1, height: ch }]} />
              <View style={[styles.gridLine, { left: (cw * 2) / 3, width: 1, height: ch }]} />
              <View style={[styles.gridLine, styles.gridLineH, { top: ch / 3, width: cw }]} />
              <View style={[styles.gridLine, styles.gridLineH, { top: (ch * 2) / 3, width: cw }]} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>拖动选框，仅保留衣物部分（可跳过）</Text>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleCancel}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>跳过裁剪</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmCropBtn, isProcessing && styles.confirmCropBtnDisabled]}
            onPress={handleCrop}
            disabled={isProcessing}
            activeOpacity={0.85}
          >
            <Ionicons name="crop" size={18} color={theme.colors.white} />
            <Text style={styles.confirmCropBtnText}>确认裁剪</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
