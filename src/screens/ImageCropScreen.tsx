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
import { ImageRequirements } from '../components/ImageRequirements';
import { setCropResult } from '../utils/cropNavigation';
import {
  getDisplaySize,
  getInitialOffset,
  clampOffset,
  screenCropToPixelCrop,
} from '../utils/cropMath';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CROP_SIZE = SCREEN_WIDTH;

type CropRouteParams = {
  ImageCrop: { imageUri: string; isBgRemoved?: boolean };
};

const makeStyles = (theme: Theme, topInset: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    // ── Header ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      paddingTop: topInset + 6,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    headerBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
    },

    // ── Body ──
    body: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: theme.colors.background,
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
      borderColor: theme.colors.primary,
    },
    gridLine: {
      position: 'absolute',
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    corner: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderColor: theme.colors.primary,
    },
    cornerTL: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3 },
    cornerTR: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3 },
    cornerBL: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3 },
    cornerBR: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3 },

    // ── Hint ──
    hint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 6,
      backgroundColor: theme.colors.background,
    },
    hintText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },

    // ── Footer actions ──
    footer: {
      paddingHorizontal: 16,
      paddingBottom: 34,
      paddingTop: 8,
      backgroundColor: theme.colors.background,
    },
    footerRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    btnOutline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    btnOutlineDisabled: {
      opacity: 0.45,
    },
    btnOutlineText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    btnBg: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.primary + '15',
    },
    btnBgText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    btnPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
    },
    btnPrimaryDisabled: {
      opacity: 0.45,
    },
    btnPrimaryText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
  });

export function ImageCropScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<CropRouteParams, 'ImageCrop'>>();
  const { imageUri, isBgRemoved: initialBgRemoved } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets.top), [theme, insets.top]);

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

  // Refs
  const originalSizeRef = useRef({ width: 1, height: 1 });
  const displaySizeRef = useRef({ width: CROP_SIZE, height: CROP_SIZE });
  const offsetRef = useRef({ x: 0, y: 0 });
  const offsetAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scaleRef = useRef(1);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const startScaleRef = useRef(1);
  const startOffsetRef = useRef({ x: 0, y: 0 });

  // Capture ref for bg-removed composite (image on white background)
  const captureViewRef = useRef<View>(null);

  const cropTop = bodyHeight > 0 ? (bodyHeight - CROP_SIZE) / 2 : 0;
  const maskHeight = Math.max(0, (bodyHeight - CROP_SIZE) / 2);

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
        const init = getInitialOffset(ds.width, ds.height, CROP_SIZE);
        offsetRef.current = init;
        offsetAnim.setValue(init);
        scaleRef.current = 1;
        scaleAnim.setValue(1);
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
      const minScale = bgRemoved ? 0.5 : 1;
      const newScale = Math.max(minScale, Math.min(4, startScaleRef.current * e.scale));
      scaleRef.current = newScale;
      scaleAnim.setValue(newScale);
    })
    .onEnd(() => {
      const { width: dw, height: dh } = displaySizeRef.current;
      const s = scaleRef.current;
      if (!bgRemoved && s < 1.05) {
        scaleRef.current = 1;
        scaleAnim.setValue(1);
        const init = getInitialOffset(dw, dh, CROP_SIZE);
        offsetRef.current = init;
        offsetAnim.setValue(init);
      } else if (!bgRemoved) {
        const clamped = clampOffset(offsetRef.current, displaySizeRef.current, s, CROP_SIZE);
        offsetRef.current = clamped;
        offsetAnim.setValue(clamped);
      }
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startOffsetRef.current = { ...offsetRef.current };
    })
    .onChange((e) => {
      const newX = startOffsetRef.current.x + e.translationX;
      const newY = startOffsetRef.current.y + e.translationY;
      if (bgRemoved) {
        offsetRef.current = { x: newX, y: newY };
        offsetAnim.setValue({ x: newX, y: newY });
      } else {
        const clamped = clampOffset(
          { x: newX, y: newY },
          displaySizeRef.current,
          scaleRef.current,
          CROP_SIZE,
        );
        offsetRef.current = clamped;
        offsetAnim.setValue(clamped);
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // ── Confirm ──
  const handleConfirm = useCallback(async () => {
    if (!imageReady) return;
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

      // Convert data URI to file before crop (manipulateAsync may fail with large data URIs)
      let cropSourceUri = currentImageUri;
      if (currentImageUri.startsWith('data:image/png;base64,')) {
        const tempPath = `${documentDirectory}images/temp_input_${Date.now()}.png`;
        tempInputPath = tempPath;
        const base64 = currentImageUri.split(',')[1];
        await writeAsStringAsync(tempPath, base64, { encoding: 'base64' });
        cropSourceUri = tempPath;
        // Update originalSize to reflect actual file dimensions
        const sizeResult = await new Promise<{ width: number; height: number }>((resolve) => {
          Image.getSize(cropSourceUri, (w, h) => resolve({ width: w, height: h }), () => resolve({ width: curW, height: curH }));
        });
        originalSizeRef.current = sizeResult;
      }

      // Start bg-removed original save (runs in parallel with crop)
      let bgRemovedOriginalUri: string | undefined;
      let bgSavePromise: Promise<void> | null = null;
      if (bgRemoved && currentImageUri !== imageUri) {
        const fullOriginalPath = `${documentDirectory}images/bg_full_${Date.now()}.png`;
        bgRemovedOriginalUri = fullOriginalPath;
        // cropSourceUri is already a file, so just copy it
        bgSavePromise = copyAsync({ from: cropSourceUri, to: fullOriginalPath });
        bgSavePromise = bgSavePromise.catch((e) => {
          console.error('[ImageCrop] Failed to save bg-removed original:', e);
        });
      }

      // Start crop (runs in parallel with bg save)
      // Always use captureRef for reliable results — manipulateAsync crop can produce
      // empty output on certain PNG/image types when zoomed in
      let cropPromise: Promise<void>;
      const captureView = captureViewRef.current;
      if (captureView) {
        cropPromise = (async () => {
          const capturedUri = await captureRef(captureView, {
            format: isPng ? 'png' : 'jpg',
            quality: 1,
          });
          await copyAsync({ from: capturedUri, to: savedPath });
        })();
      } else {
        // Fallback: manipulateAsync (only if captureView unavailable)
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

      // Await both in parallel
      if (bgSavePromise) {
        await Promise.all([cropPromise, bgSavePromise]);
      } else {
        await cropPromise;
      }

      setCropResult({ uri: savedPath, removeBg: bgRemoved, bgRemovedOriginalUri });
      navigation.goBack();
    } catch (error) {
      console.error('[ImageCrop] Crop failed:', error);
      setCropResult({ uri: imageUri, removeBg: bgRemoved });
      navigation.goBack();
    } finally {
      setIsProcessing(false);
      // Clean up temp file from data URI conversion
      if (tempInputPath) {
        deleteAsync(tempInputPath, { idempotent: true }).catch(() => {});
      }
    }
  }, [imageReady, currentImageUri, bgRemoved, imageUri, navigation]);

  const handleCancel = useCallback(() => {
    setCropResult({ uri: imageUri, removeBg: bgRemoved });
    navigation.goBack();
  }, [imageUri, bgRemoved, navigation]);

  // ── Background removal ──
  const handleRemoveBg = useCallback(async () => {
    if (isRemovingBg) return;
    setIsRemovingBg(true);
    try {
      const result = await removeBackground(currentImageUri);
      if (result) {
        setCurrentImageUri(result);
        setBgRemoved(true);
        // Refresh credits
        getRemoveBgCredits().then(setCreditsInfo).catch(() => {});
      }
    } catch (e) {
      console.error('[ImageCrop] Remove bg failed:', e);
    } finally {
      setIsRemovingBg(false);
    }
  }, [currentImageUri, isRemovingBg]);

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
  }, [imageUri, initialBgRemoved]);

  const showContent = imageReady && bodyHeight > 0;
  const canRemoveBg = bgRemovalConfigured && !isRemovingBg && !isProcessing && !bgRemoved;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>裁剪编辑</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* ── Body ── */}
      <View
        style={styles.body}
        onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}
      >
        {/* Hidden composite view for bg-removed capture (rendered behind everything) */}
        <View
          ref={captureViewRef}
          style={{
            position: 'absolute',
            top: cropTop,
            left: 0,
            width: CROP_SIZE,
            height: CROP_SIZE,
            backgroundColor: '#ffffff',
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
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 10, color: theme.colors.textTertiary, fontSize: 13 }}>
              加载图片中...
            </Text>
          </View>
        )}

        {showContent && (
          <>
            {/* Top mask */}
            {maskHeight > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: maskHeight,
                  backgroundColor: 'rgba(0,0,0,0.42)',
                }}
                pointerEvents="none"
              />
            )}
            {/* Bottom mask */}
            {maskHeight > 0 && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: maskHeight,
                  backgroundColor: 'rgba(0,0,0,0.42)',
                }}
                pointerEvents="none"
              />
            )}

            {/* Crop frame */}
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

      {/* ── Hint ── */}
      <View style={styles.hint}>
        <Ionicons name="hand-left-outline" size={12} color={theme.colors.textTertiary} />
        <Text style={styles.hintText}>
          捏合缩放 · 拖动调整裁剪区域
        </Text>
      </View>

      {/* ── Action bar ── */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {/* Reset */}
          <TouchableOpacity
            style={[styles.btnOutline, isProcessing && styles.btnOutlineDisabled]}
            onPress={handleReset}
            disabled={isProcessing || isRemovingBg}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.btnOutlineText}>重置</Text>
          </TouchableOpacity>

          {/* AI 抠图 */}
          <TouchableOpacity
            style={[
              styles.btnBg,
              (isProcessing || isRemovingBg) && styles.btnOutlineDisabled,
              bgRemoved && { backgroundColor: theme.colors.accent + '18' },
            ]}
            onPress={handleRemoveBg}
            disabled={!canRemoveBg}
            activeOpacity={0.7}
          >
            {isRemovingBg ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons
                name={bgRemoved ? 'checkmark-circle' : 'sparkles'}
                size={16}
                color={bgRemoved ? theme.colors.accent : theme.colors.primary}
              />
            )}
            <Text style={[styles.btnBgText, bgRemoved && { color: theme.colors.accent }]}>
              {isRemovingBg ? '抠图中' : bgRemoved ? '已抠图' : 'AI抠图'}
            </Text>
          </TouchableOpacity>

          {/* Confirm */}
          <TouchableOpacity
            style={[styles.btnPrimary, (isProcessing || !imageReady) && styles.btnPrimaryDisabled]}
            onPress={handleConfirm}
            disabled={isProcessing || !imageReady || isRemovingBg}
            activeOpacity={0.85}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={18} color="#fff" />
            )}
            <Text style={styles.btnPrimaryText}>
              {isProcessing ? '处理中...' : '确认裁剪'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image requirements panel */}
        <View style={{ marginTop: 8, alignItems: 'center' }}>
          <ImageRequirements creditsRemaining={creditsInfo?.remaining ?? null} />
        </View>
      </View>
    </View>
  );
}
