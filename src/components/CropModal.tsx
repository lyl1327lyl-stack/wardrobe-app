import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  Dimensions,
  PanResponder,
  PixelRatio,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

interface Props {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onCrop: (uri: string) => void;
}

// 所有尺寸统一用 dp
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CROP_SIZE_DP = SCREEN_WIDTH; // dp，裁剪框尺寸

// 图片尺寸（Image.getSize 返回的是像素，需要转 dp）
const toDp = (px: number) => px / PixelRatio.get();

interface ImageSizeDp {
  width: number;  // dp
  height: number; // dp
}

const normalizeImage = async (uri: string): Promise<string> => {
  try {
    const result = await manipulateAsync(uri, [{ rotate: 0 }], { compress: 1, format: SaveFormat.JPEG });
    return result.uri;
  } catch (err) {
    console.log('[CropModal] normalizeImage failed:', err);
    return uri;
  }
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#000' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 8, paddingTop: 8, height: 56,
    },
    headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.white },
    cropContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    footer: { paddingHorizontal: 20, paddingBottom: 34, paddingTop: 16 },
    hint: { textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16 },
    btnRow: { flexDirection: 'row', gap: 12 },
    btn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 15, borderRadius: 14,
    },
    btnCancel: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    btnConfirm: { backgroundColor: theme.colors.primary },
    btnText: { fontSize: 15, fontWeight: '600', color: theme.colors.white },
  });

export function CropModal({ visible, imageUri, onClose, onCrop }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [imageSizeDp, setImageSizeDp] = useState<ImageSizeDp | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [normalizedUri, setNormalizedUri] = useState<string | null>(null);

  // scale 是 dp/dp = 1，translateX/Y 是 dp
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const scaleRef = useRef(1);
  const translateXRef = useRef(0);
  const translateYRef = useRef(0);
  const imageSizeDpRef = useRef<ImageSizeDp | null>(null);

  const gestureStartTranslateX = useRef(0);
  const gestureStartTranslateY = useRef(0);
  const gestureStartScale = useRef(1);

  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);

  // dp 尺寸下最小缩放
  const getMinScale = useCallback((size: ImageSizeDp) => {
    return Math.max(CROP_SIZE_DP / size.width, CROP_SIZE_DP / size.height);
  }, []);

  // clamp（所有值都是 dp）
  const clamp = useCallback((tx: number, ty: number, s: number) => {
    const size = imageSizeDpRef.current;
    if (!size) return { tx, ty };

    const scaledW = size.width * s;
    const scaledH = size.height * s;

    const maxX = Math.max(0, (scaledW - CROP_SIZE_DP) / 2);
    const maxY = Math.max(0, (scaledH - CROP_SIZE_DP) / 2);

    return {
      tx: Math.max(-maxX, Math.min(maxX, tx)),
      ty: Math.max(-maxY, Math.min(maxY, ty)),
    };
  }, []);

  const getDist = (touches: any[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        gestureStartTranslateX.current = translateXRef.current;
        gestureStartTranslateY.current = translateYRef.current;
        gestureStartScale.current = scaleRef.current;

        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          pinchStartDist.current = getDist(touches);
          pinchStartScale.current = scaleRef.current;
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          const dist = getDist(touches);
          if (pinchStartDist.current > 0) {
            const ratio = dist / pinchStartDist.current;
            let newScale = pinchStartScale.current * ratio;

            if (imageSizeDpRef.current) {
              const minScale = getMinScale(imageSizeDpRef.current);
              newScale = Math.max(newScale, minScale);
            }

            const clamped = clamp(gestureStartTranslateX.current, gestureStartTranslateY.current, newScale);
            scaleRef.current = newScale;
            translateXRef.current = clamped.tx;
            translateYRef.current = clamped.ty;
            setScale(newScale);
            setTranslateX(clamped.tx);
            setTranslateY(clamped.ty);
          }
        } else if (touches.length === 1) {
          const newTx = gestureStartTranslateX.current + gestureState.dx;
          const newTy = gestureStartTranslateY.current + gestureState.dy;
          const clamped = clamp(newTx, newTy, scaleRef.current);

          translateXRef.current = clamped.tx;
          translateYRef.current = clamped.ty;
          setTranslateX(clamped.tx);
          setTranslateY(clamped.ty);
        }
      },

      onPanResponderRelease: () => {
        console.log('[CropModal] Release:', { scale: scaleRef.current, tx: translateXRef.current, ty: translateYRef.current });
      },
    })
  ).current;

  useEffect(() => {
    if (visible && imageUri) {
      setLoading(true);
      setImageSizeDp(null);
      setNormalizedUri(null);

      (async () => {
        try {
          const normalized = await normalizeImage(imageUri);
          setNormalizedUri(normalized);

          // 获取像素尺寸，转成 dp
          Image.getSize(
            normalized,
            (wPx, hPx) => {
              const wDp = toDp(wPx);
              const hDp = toDp(hPx);
              console.log('[CropModal] Image:', wPx, 'x', hPx, 'px =', wDp, 'x', hDp, 'dp, CROP_SIZE_DP:', CROP_SIZE_DP);

              const sizeDp = { width: wDp, height: hDp };
              setImageSizeDp(sizeDp);
              imageSizeDpRef.current = sizeDp;

              const minScale = getMinScale(sizeDp);
              scaleRef.current = minScale;
              translateXRef.current = 0;
              translateYRef.current = 0;
              setScale(minScale);
              setTranslateX(0);
              setTranslateY(0);
              setLoading(false);
            },
            (err) => {
              console.error('[CropModal] getSize error:', err);
              setLoading(false);
            }
          );
        } catch (err) {
          console.error('[CropModal] normalize error:', err);
          setLoading(false);
        }
      })();
    }
  }, [visible, imageUri, getMinScale]);

  const handleCrop = useCallback(async () => {
    if (!normalizedUri || !imageSizeDp) return;

    const s = scaleRef.current;
    const tx = translateXRef.current;
    const ty = translateYRef.current;

    console.log('[CropModal] Crop:', { imageSizeDp, s, tx, ty, CROP_SIZE_DP });

    // 计算裁剪坐标（dp）
    // scale 直接通过 transform 应用在 Image 上，不再通过 width/height 缩放
    // cropW/H = 实际要裁剪的尺寸（dp）
    const cropW = CROP_SIZE_DP / s;
    const cropH = CROP_SIZE_DP / s;

    // cropX/Y: 原图中裁剪区域左上角的位置（dp）
    // 图像在 dp 尺寸下的偏移 = |scaled - crop| / 2 + tx
    // 除以 s 变回原图坐标
    const scaledW = imageSizeDp.width * s;
    const scaledH = imageSizeDp.height * s;
    const cropX = (Math.abs(scaledW - CROP_SIZE_DP) / 2 + tx) / s;
    const cropY = (Math.abs(scaledH - CROP_SIZE_DP) / 2 + ty) / s;

    // 转回像素给 expo-image-manipulator
    const pxPerDp = PixelRatio.get();
    const finalXPx = Math.round(cropX * pxPerDp);
    const finalYPx = Math.round(cropY * pxPerDp);
    const finalWPx = Math.round(cropW * pxPerDp);
    const finalHPx = Math.round(cropH * pxPerDp);

    console.log('[CropModal] Crop rect px:', { x: finalXPx, y: finalYPx, w: finalWPx, h: finalHPx });

    if (finalWPx <= 0 || finalHPx <= 0) {
      console.error('[CropModal] Invalid crop!');
      return;
    }

    setIsCropping(true);
    try {
      const result = await manipulateAsync(
        normalizedUri,
        [
          { crop: { originX: finalXPx, originY: finalYPx, width: finalWPx, height: finalHPx } },
          { resize: { width: Math.round(1200 * pxPerDp) } }
        ],
        { compress: 0.9, format: SaveFormat.JPEG }
      );
      onCrop(result.uri);
    } catch (err) {
      console.error('[CropModal] Crop failed:', err);
    } finally {
      setIsCropping(false);
    }
  }, [normalizedUri, imageSizeDp, onCrop]);

  const handleClose = () => {
    setImageSizeDp(null);
    setNormalizedUri(null);
    onClose();
  };

  if (!visible) return null;

  // 显示尺寸（dp）
  const displayW = imageSizeDp ? imageSizeDp.width * scale : 0;
  const displayH = imageSizeDp ? imageSizeDp.height * scale : 0;

  console.log('[CropModal] Render:', { displayW, displayH, scale, translateX, translateY });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>裁剪照片</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={handleCrop} disabled={isCropping || !imageSizeDp || loading} activeOpacity={0.7}>
            <Ionicons name="checkmark-circle" size={28} color={isCropping || !imageSizeDp || loading ? 'rgba(255,255,255,0.3)' : theme.colors.success} />
          </TouchableOpacity>
        </View>

        <View style={styles.cropContainer}>
          <View style={{ height: (SCREEN_HEIGHT - CROP_SIZE_DP) / 2 - 56, backgroundColor: 'rgba(0,0,0,0.5)' }} />

          <View style={{ flexDirection: 'row', flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />

            <View style={{ width: CROP_SIZE_DP, height: CROP_SIZE_DP, position: 'relative' }} {...panResponder.panHandlers}>
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <View style={{ height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' }} />
              </View>

              {imageSizeDp && displayW > 0 && normalizedUri && (
                <View
                  style={{
                    position: 'absolute',
                    left: CROP_SIZE_DP / 2,
                    top: CROP_SIZE_DP / 2,
                  }}
                >
                  <Image
                    source={{ uri: normalizedUri }}
                    style={{
                      width: imageSizeDp.width,
                      height: imageSizeDp.height,
                      transform: [
                        { translateX: -imageSizeDp.width / 2 + translateX },
                        { translateY: -imageSizeDp.height / 2 + translateY },
                        { scale },
                      ],
                    }}
                    resizeMode="stretch"
                  />
                </View>
              )}

              {loading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff' }}>处理中...</Text>
                </View>
              )}

              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' }} pointerEvents="none" />
            </View>

            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </View>

          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.hint}>拖动调整位置，双指缩放大小</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.btnText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnConfirm]} onPress={handleCrop} disabled={isCropping || !imageSizeDp || loading} activeOpacity={0.8}>
              <Text style={styles.btnText}>{isCropping ? '裁剪中...' : '确认'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
