import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { documentDirectory, copyAsync, writeAsStringAsync, deleteAsync } from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { captureRef } from 'react-native-view-shot';
import { ensureImageDir } from '../utils/imageUtils';
import { removeBackground, getRemoveBgCredits } from '../utils/backgroundRemoval';
import { isBackgroundRemovalConfigured } from '../utils/backgroundRemoval';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { RotationSlider } from '../components/RotationSlider';
import { setCropResult, type CropState } from '../utils/cropNavigation';
import {
  getDisplaySize,
  getInitialOffset,
  clampOffset,
  clampOffsetAABB,
  screenCropToPixelCrop,
} from '../utils/cropMath';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CROP_SIZE = SCREEN_WIDTH;

type CropRouteParams = {
  ImageCrop: { imageUri: string; isBgRemoved?: boolean; cropState?: CropState };
};

type ToolMode = 'rotate' | 'removebg' | null;

const BG_DARK = '#1a1a1a';
const TOOLBAR_BG = 'rgba(0,0,0,0.88)';

const makeStyles = (theme: Theme, topInset: number, bottomInset: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: BG_DARK,
    },

    // ── Top bar (overlay) ──
    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: topInset + 6,
      paddingBottom: 10,
      zIndex: 10,
    },
    topBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      height: 36,
      paddingHorizontal: 16,
      borderRadius: 18,
      backgroundColor: theme.colors.primary,
    },
    saveBtnDisabled: {
      opacity: 0.4,
    },
    saveBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },

    // ── Body (editing area) ──
    body: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: BG_DARK,
    },
    loadingCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── Crop frame ──
    cropBorder: {
      position: 'absolute',
      width: CROP_SIZE,
      height: CROP_SIZE,
      left: 0,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.6)',
    },
    gridLine: {
      position: 'absolute',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    corner: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderColor: 'rgba(255,255,255,0.8)',
    },
    cornerTL: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3 },
    cornerTR: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3 },
    cornerBL: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3 },
    cornerBR: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3 },

    // ── Bottom panel area ──
    bottomPanel: {
      backgroundColor: TOOLBAR_BG,
      paddingBottom: bottomInset + 8,
    },
    subPanel: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    toolBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      minWidth: 60,
    },
    toolBtnActive: {
      // active state handled via icon/text color
    },
    toolIcon: {
      width: 44,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toolLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.7)',
      marginTop: 2,
    },
    toolLabelActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    toolLabelDone: {
      color: theme.colors.accent,
    },
  });

export function ImageCropScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<CropRouteParams, 'ImageCrop'>>();
  const { imageUri, isBgRemoved: initialBgRemoved, cropState: initialCropState } = route.params;
  const restoreStateRef = useRef(initialCropState);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets.top, insets.bottom), [theme, insets.top, insets.bottom]);

  // ── State ──
  const [imageReady, setImageReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [currentImageUri, setCurrentImageUri] = useState(imageUri);
  const [displaySize, setDisplaySize] = useState({ width: CROP_SIZE, height: CROP_SIZE });

  // Background removal
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(initialBgRemoved || false);
  const [creditsInfo, setCreditsInfo] = useState<{ remaining: number } | null>(null);
  const [bgRemovalConfigured, setBgRemovalConfigured] = useState(false);

  // Tool panel
  const [activeTool, setActiveTool] = useState<ToolMode>(null);

  // Refs
  const originalSizeRef = useRef({ width: 1, height: 1 });
  const displaySizeRef = useRef({ width: CROP_SIZE, height: CROP_SIZE });
  const offsetRef = useRef({ x: 0, y: 0 });
  const offsetAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scaleRef = useRef(1);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const startScaleRef = useRef(1);
  const startOffsetRef = useRef({ x: 0, y: 0 });

  // Rotation
  const [rotationAngle, setRotationAngle] = useState(0);
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const rotationRef = useRef(0);

  // Capture ref for bg-removed composite
  const captureViewRef = useRef<View>(null);
  const bounceAnimRef = useRef<any>(null);

  const cropTop = bodyHeight > 0 ? (bodyHeight - CROP_SIZE) / 2 : 0;
  const maskHeight = Math.max(0, (bodyHeight - CROP_SIZE) / 2);
  const isPng = currentImageUri.toLowerCase().endsWith('.png') || currentImageUri.startsWith('data:image/png');
  const canShrink = bgRemoved || isPng;

  // ── Load image dimensions ──
  useEffect(() => {
    if (!currentImageUri) return;
    Image.getSize(
      currentImageUri,
      (width, height) => {
        originalSizeRef.current = { width, height };
        const ds = getDisplaySize(width, height, CROP_SIZE);
        displaySizeRef.current = ds;
        setDisplaySize(ds);

        const saved = restoreStateRef.current;
        restoreStateRef.current = undefined;
        if (saved &&
            Math.abs(saved.displayWidth - ds.width) < 1 &&
            Math.abs(saved.displayHeight - ds.height) < 1) {
          offsetRef.current = saved.offset;
          offsetAnim.setValue(saved.offset);
          scaleRef.current = saved.scale;
          scaleAnim.setValue(saved.scale);
          rotationRef.current = saved.rotation;
          rotationAnim.setValue(saved.rotation);
          setRotationAngle(saved.rotation);
        } else {
          const init = getInitialOffset(ds.width, ds.height, CROP_SIZE);
          offsetRef.current = init;
          offsetAnim.setValue(init);
          scaleRef.current = 1;
          scaleAnim.setValue(1);
        }

        setImageReady(true);
      },
      (error) => {
        console.error('[ImageCrop] Image.getSize failed:', error);
      },
    );
  }, [currentImageUri]);

  // ── Fetch credits ──
  useEffect(() => {
    isBackgroundRemovalConfigured().then((configured) => {
      setBgRemovalConfigured(configured);
      if (configured) {
        getRemoveBgCredits().then(setCreditsInfo).catch(() => setCreditsInfo(null));
      }
    });
  }, []);

  // ── Gestures ──
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScaleRef.current = scaleRef.current;
    })
    .onUpdate((e) => {
      let minScale: number;
      if (canShrink) {
        minScale = 0.5;
      } else {
        const radians = Math.abs(rotationRef.current) * Math.PI / 180;
        minScale = (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians))) * 1.03;
      }
      const newScale = Math.max(minScale, Math.min(4, startScaleRef.current * e.scale));
      scaleRef.current = newScale;
      scaleAnim.setValue(newScale);
    })
    .onEnd(() => {
      if (canShrink) return;
      const s = scaleRef.current;
      const radians = Math.abs(rotationRef.current) * Math.PI / 180;
      const minScale = (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians))) * 1.03;
      if (s <= minScale + 0.05) {
        scaleRef.current = minScale;
        scaleAnim.setValue(minScale);
        if (rotationRef.current === 0) {
          const init = getInitialOffset(displaySizeRef.current.width, displaySizeRef.current.height, CROP_SIZE);
          offsetRef.current = init;
          offsetAnim.setValue(init);
          return;
        }
      }
      const clamped = clampOffset(offsetRef.current, displaySizeRef.current, scaleRef.current, CROP_SIZE, rotationRef.current);
      offsetRef.current = clamped;
      offsetAnim.setValue(clamped);
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      if (bounceAnimRef.current) {
        bounceAnimRef.current.stop();
        bounceAnimRef.current = null;
      }
      startOffsetRef.current = { ...offsetRef.current };
    })
    .onChange((e) => {
      const newX = startOffsetRef.current.x + e.translationX;
      const newY = startOffsetRef.current.y + e.translationY;
      if (canShrink) {
        offsetRef.current = { x: newX, y: newY };
        offsetAnim.setValue({ x: newX, y: newY });
      } else {
        const clamped = clampOffsetAABB(
          { x: newX, y: newY },
          displaySizeRef.current,
          scaleRef.current,
          CROP_SIZE,
          rotationRef.current,
        );
        offsetRef.current = clamped;
        offsetAnim.setValue(clamped);
      }
    })
    .onEnd(() => {
      if (canShrink) return;
      const target = clampOffset(
        offsetRef.current,
        displaySizeRef.current,
        scaleRef.current,
        CROP_SIZE,
        rotationRef.current,
      );
      const dx = target.x - offsetRef.current.x;
      const dy = target.y - offsetRef.current.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        offsetRef.current = target;
        bounceAnimRef.current = Animated.spring(offsetAnim, {
          toValue: { x: target.x, y: target.y },
          useNativeDriver: false,
          overshootClamping: true,
          stiffness: 400,
          damping: 30,
        });
        bounceAnimRef.current.start(() => { bounceAnimRef.current = null; });
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // ── Confirm ──
  const handleConfirm = useCallback(async () => {
    if (!imageReady || isProcessing) return;
    setIsProcessing(true);
    let tempInputPath: string | null = null;
    try {
      const curW = originalSizeRef.current.width;
      const curH = originalSizeRef.current.height;
      const offset = offsetRef.current;
      const s = scaleRef.current;
      const ds = displaySizeRef.current;

      const isPng = currentImageUri.toLowerCase().endsWith('.png')
        || currentImageUri.startsWith('data:image/png');
      const savedExt = (bgRemoved || isPng) ? 'png' : 'jpg';
      const savedPath = `${documentDirectory}images/crop_${Date.now()}_${Math.floor(Math.random() * 999999)}.${savedExt}`;

      const MAX_DIM = 1500;

      await ensureImageDir();

      let cropSourceUri = currentImageUri;
      if (currentImageUri.startsWith('data:image/png;base64,')) {
        const tempPath = `${documentDirectory}images/temp_input_${Date.now()}.png`;
        tempInputPath = tempPath;
        const base64 = currentImageUri.split(',')[1];
        await writeAsStringAsync(tempPath, base64, { encoding: 'base64' });
        cropSourceUri = tempPath;
        const sizeResult = await new Promise<{ width: number; height: number }>((resolve) => {
          Image.getSize(cropSourceUri, (w, h) => resolve({ width: w, height: h }), () => resolve({ width: curW, height: curH }));
        });
        originalSizeRef.current = sizeResult;
      }

      let bgRemovedOriginalUri: string | undefined;
      let bgSavePromise: Promise<void> | null = null;
      if (bgRemoved && currentImageUri !== imageUri) {
        const fullOriginalPath = `${documentDirectory}images/bg_full_${Date.now()}.png`;
        bgRemovedOriginalUri = fullOriginalPath;
        bgSavePromise = copyAsync({ from: cropSourceUri, to: fullOriginalPath });
        bgSavePromise = bgSavePromise.catch((e) => {
          console.error('[ImageCrop] Failed to save bg-removed original:', e);
        });
      }

      let cropPromise: Promise<void>;
      const captureView = captureViewRef.current;
      if (captureView) {
        cropPromise = (async () => {
          const capturedUri = await captureRef(captureView, {
            format: (bgRemoved || isPng) ? 'png' : 'jpg',
            quality: 1,
          });
          await copyAsync({ from: capturedUri, to: savedPath });
        })();
      } else {
        const pixelCrop = screenCropToPixelCrop(offset, s, ds, { width: curW, height: curH }, CROP_SIZE);
        const ox = Math.max(0, Math.min(Math.round(pixelCrop.originX), curW - 1));
        const oy = Math.max(0, Math.min(Math.round(pixelCrop.originY), curH - 1));
        const maxW = curW - ox;
        const maxH = curH - oy;
        const cw = Math.round(pixelCrop.width);
        const ch = Math.round(pixelCrop.height);
        const cropRect = {
          originX: ox,
          originY: oy,
          width: Math.max(1, Math.min(cw, maxW)),
          height: Math.max(1, Math.min(ch, maxH)),
        };

        cropPromise = (async () => {
          const actions: any[] = [{ crop: cropRect }];
          if (cropRect.width > MAX_DIM || cropRect.height > MAX_DIM) {
            actions.push(cropRect.width > cropRect.height
              ? { resize: { width: MAX_DIM } }
              : { resize: { height: MAX_DIM } });
          }
          const result = await manipulateAsync(
            cropSourceUri,
            actions,
            isPng ? { format: SaveFormat.PNG } : { format: SaveFormat.JPEG, compress: 0.92 },
          );
          await copyAsync({ from: result.uri, to: savedPath });
        })();
      }

      if (bgSavePromise) {
        await Promise.all([cropPromise, bgSavePromise]);
      } else {
        await cropPromise;
      }

      setCropResult({
        uri: savedPath,
        removeBg: bgRemoved,
        bgRemovedOriginalUri,
        cropState: {
          offset: { ...offsetRef.current },
          scale: scaleRef.current,
          rotation: rotationRef.current,
          displayWidth: displaySizeRef.current.width,
          displayHeight: displaySizeRef.current.height,
        },
      });
      navigation.goBack();
    } catch (error) {
      console.error('[ImageCrop] Crop failed:', error);
      setCropResult({ uri: imageUri, removeBg: bgRemoved });
      navigation.goBack();
    } finally {
      setIsProcessing(false);
      if (tempInputPath) {
        deleteAsync(tempInputPath, { idempotent: true }).catch(() => {});
      }
    }
  }, [imageReady, currentImageUri, bgRemoved, imageUri, navigation, isProcessing]);

  const handleCancel = useCallback(() => {
    // Don't set crop result — user cancelled
    navigation.goBack();
  }, [navigation]);

  // ── Background removal ──
  const handleRemoveBg = useCallback(async () => {
    if (isRemovingBg || bgRemoved) return;
    setIsRemovingBg(true);
    try {
      const result = await removeBackground(currentImageUri);
      if (result) {
        setCurrentImageUri(result);
        setBgRemoved(true);
        getRemoveBgCredits().then(setCreditsInfo).catch(() => {});
      }
    } catch (e) {
      console.error('[ImageCrop] Remove bg failed:', e);
    } finally {
      setIsRemovingBg(false);
    }
  }, [currentImageUri, isRemovingBg, bgRemoved]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setCurrentImageUri(imageUri);
    setBgRemoved(initialBgRemoved || false);
    const ds = displaySizeRef.current;
    const init = getInitialOffset(ds.width, ds.height, CROP_SIZE);
    offsetRef.current = init;
    offsetAnim.setValue(init);
    scaleRef.current = 1;
    scaleAnim.setValue(1);
    rotationRef.current = 0;
    rotationAnim.setValue(0);
    setRotationAngle(0);
    setActiveTool(null);
  }, [imageUri, initialBgRemoved]);

  // ── Tool toggle ──
  const toggleTool = useCallback((tool: ToolMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTool((prev) => prev === tool ? null : tool);
  }, []);

  const showContent = imageReady && bodyHeight > 0;

  // Transform string for rotate
  const rotateTransform = rotationAnim.interpolate({
    inputRange: [-180, 180],
    outputRange: ['-180deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      {/* ── Top bar overlay ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleCancel} style={styles.topBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={28} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, (isProcessing || !imageReady || isRemovingBg) && styles.saveBtnDisabled]}
          onPress={handleConfirm}
          disabled={isProcessing || !imageReady || isRemovingBg}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark" size={20} color="#fff" />
          )}
          <Text style={styles.saveBtnText}>
            {isProcessing ? '处理中' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Body (editing area) ── */}
      <View
        style={styles.body}
        onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}
      >
        {/* Hidden capture view */}
        <View
          ref={captureViewRef}
          style={{
            position: 'absolute',
            top: cropTop,
            left: 0,
            width: CROP_SIZE,
            height: CROP_SIZE,
            backgroundColor: canShrink ? 'transparent' : '#ffffff',
            overflow: 'hidden',
          }}
          collapsable={false}
        >
          {showContent && (
            <Animated.Image
              source={{ uri: currentImageUri }}
              style={{
                position: 'absolute',
                width: displaySize.width,
                height: displaySize.height,
                transform: [
                  { translateX: offsetAnim.x },
                  { translateY: offsetAnim.y },
                  { scale: scaleAnim },
                  { rotate: rotateTransform },
                ],
              }}
              resizeMode="cover"
            />
          )}
        </View>

        <GestureDetector gesture={composedGesture}>
          <View style={StyleSheet.absoluteFill}>
            <Animated.Image
              source={{ uri: currentImageUri }}
              style={{
                position: 'absolute',
                width: displaySize.width,
                height: displaySize.height,
                left: 0,
                top: cropTop,
                transform: [
                  { translateX: offsetAnim.x },
                  { translateY: offsetAnim.y },
                  { scale: scaleAnim },
                  { rotate: rotateTransform },
                ],
                opacity: showContent ? 1 : 0,
              }}
              resizeMode="cover"
            />
          </View>
        </GestureDetector>

        {/* Loading */}
        {!showContent && (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ marginTop: 10, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              加载图片中...
            </Text>
          </View>
        )}

        {/* Masks + crop frame */}
        {showContent && (
          <>
            {maskHeight > 0 && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: maskHeight, backgroundColor: 'rgba(0,0,0,0.55)' }} pointerEvents="none" />
            )}
            {maskHeight > 0 && (
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: maskHeight, backgroundColor: 'rgba(0,0,0,0.55)' }} pointerEvents="none" />
            )}

            <View style={[styles.cropBorder, { top: cropTop }]} pointerEvents="none">
              <View style={[styles.gridLine, { width: '100%', height: 1, top: CROP_SIZE / 3 }]} />
              <View style={[styles.gridLine, { width: '100%', height: 1, top: (CROP_SIZE * 2) / 3 }]} />
              <View style={[styles.gridLine, { height: '100%', width: 1, left: CROP_SIZE / 3 }]} />
              <View style={[styles.gridLine, { height: '100%', width: 1, left: (CROP_SIZE * 2) / 3 }]} />
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </>
        )}
      </View>

      {/* ── Bottom panel ── */}
      <View style={styles.bottomPanel}>
        {/* Expandable sub-panel */}
        {activeTool === 'rotate' && showContent && (
          <View style={styles.subPanel}>
            <RotationSlider
              value={rotationAngle}
              onValueChange={(angle) => {
                rotationRef.current = angle;
                setRotationAngle(angle);
                rotationAnim.setValue(angle);
                if (!canShrink) {
                  const radians = Math.abs(angle) * Math.PI / 180;
                  const minScale = (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians))) * 1.03;
                  if (scaleRef.current < minScale) {
                    scaleRef.current = minScale;
                    scaleAnim.setValue(minScale);
                  }
                  const clamped = clampOffset(offsetRef.current, displaySizeRef.current, scaleRef.current, CROP_SIZE, angle);
                  offsetRef.current = clamped;
                  offsetAnim.setValue(clamped);
                }
              }}
              disabled={isProcessing || isRemovingBg}
              darkMode
            />
          </View>
        )}

        {/* Credits info for bg removal */}
        {activeTool === 'removebg' && bgRemovalConfigured && !bgRemoved && (
          <View style={styles.subPanel}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.5)" />
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {creditsInfo !== null ? `免费抠图剩余 ${creditsInfo.remaining} 次` : '加载中...'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 4, lineHeight: 16 }}>
              主体清晰、纯色背景效果最佳
            </Text>
          </View>
        )}

        {/* Toolbar */}
        <View style={styles.toolbar}>
          {/* Rotate */}
          <TouchableOpacity
            style={styles.toolBtn}
            activeOpacity={0.7}
            onPress={() => toggleTool('rotate')}
          >
            <View style={styles.toolIcon}>
              <Ionicons name="sync" size={22} color={activeTool === 'rotate' ? theme.colors.primary : 'rgba(255,255,255,0.9)'} />
            </View>
            <Text style={[styles.toolLabel, activeTool === 'rotate' && styles.toolLabelActive]}>旋转</Text>
          </TouchableOpacity>

          {/* AI Background Removal */}
          <TouchableOpacity
            style={styles.toolBtn}
            activeOpacity={0.7}
            onPress={bgRemoved ? undefined : handleRemoveBg}
            disabled={isRemovingBg || isProcessing || !bgRemovalConfigured}
          >
            <View style={styles.toolIcon}>
              {isRemovingBg ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons
                  name={bgRemoved ? 'checkmark-circle' : 'sparkles'}
                  size={22}
                  color={bgRemoved ? theme.colors.accent : (activeTool === 'removebg' ? theme.colors.primary : 'rgba(255,255,255,0.9)')}
                />
              )}
            </View>
            <Text style={[
              styles.toolLabel,
              bgRemoved && styles.toolLabelDone,
              !bgRemoved && activeTool === 'removebg' && styles.toolLabelActive,
            ]}>
              {isRemovingBg ? '抠图中' : bgRemoved ? '已抠图' : 'AI抠图'}
            </Text>
          </TouchableOpacity>

          {/* Reset */}
          <TouchableOpacity
            style={styles.toolBtn}
            activeOpacity={0.7}
            onPress={handleReset}
            disabled={isProcessing || isRemovingBg}
          >
            <View style={styles.toolIcon}>
              <Ionicons name="refresh" size={22} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.toolLabel}>重置</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
