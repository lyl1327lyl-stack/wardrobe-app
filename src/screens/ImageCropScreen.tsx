import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { documentDirectory, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ensureImageDir } from '../utils/imageUtils';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import jpeg from 'jpeg-js';

/** Pure JS JPEG crop using jpeg-js - bypasses native manipulateAsync bugs */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000; // 32 KB chunks to avoid call stack overflow
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
  }
  return btoa(binary);
}

async function cropJpegPure(
  srcPath: string,
  destPath: string,
  fracX: number,  // left edge as fraction of image width  (0–1)
  fracY: number,  // top  edge as fraction of image height (0–1)
  fracW: number,  // crop width  as fraction of image width  (0–1)
  fracH: number,  // crop height as fraction of image height (0–1)
  quality: number = 0.92
): Promise<{ width: number; height: number }> {
  // 1. Read file as base64 → Uint8Array
  const base64 = await readAsStringAsync(srcPath, { encoding: 'base64' });
  const jpegData = base64ToUint8Array(base64);

  // 2. Decode JPEG to raw RGBA pixels (4 bytes/pixel)
  const rawImage = jpeg.decode(jpegData, { useTArray: true });
  const { width: srcW, height: srcH, data: srcPixels } = rawImage;

  // 3. Convert fractional coords → actual pixel coords (immune to DPR differences)
  const cropX = Math.round(fracX * srcW);
  const cropY = Math.round(fracY * srcH);
  const cropW = Math.round(fracW * srcW);
  const cropH = Math.round(fracH * srcH);
  console.log('[cropJpegPure] decoded:', srcW, srcH, '| crop px:', cropX, cropY, cropW, cropH);

  // 4. Clamp crop rect to image bounds
  const sx = Math.max(0, Math.min(cropX, srcW - 1));
  const sy = Math.max(0, Math.min(cropY, srcH - 1));
  const sw = Math.min(cropW, srcW - sx);
  const sh = Math.min(cropH, srcH - sy);

  // 5. Extract cropped rows in bulk
  const rgbaPixels = new Uint8Array(sw * sh * 4);
  for (let dy = 0; dy < sh; dy++) {
    const srcRowStart = ((sy + dy) * srcW + sx) * 4;
    rgbaPixels.set(srcPixels.subarray(srcRowStart, srcRowStart + sw * 4), dy * sw * 4);
  }

  // 6. Encode RGBA pixels to JPEG — jpeg.encode expects RGBA (4 bytes/pixel)
  const encoded = jpeg.encode({ width: sw, height: sh, data: rgbaPixels }, Math.round(quality * 100));

  // 7. Convert to base64 and write
  const jpegBase64 = uint8ArrayToBase64(encoded.data);
  await writeAsStringAsync(destPath, jpegBase64, { encoding: 'base64' });

  return { width: sw, height: sh };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CROP_SIZE = SCREEN_WIDTH; // 1:1 正方形，宽度=屏幕宽度

// ============ 模块级回调（供 ImagePickerModal 使用）============

let _pendingCropCallback: ((uri: string) => void) | null = null;

/** 注册一次性裁剪回调（由调用方在 navigate 前设置） */
export function registerCropCallback(cb: (uri: string) => void) {
  _pendingCropCallback = cb;
}

/** 消费回调（由 ImageCropScreen 在完成/取消时调用） */
function consumeCropCallback(uri: string) {
  _pendingCropCallback?.(uri);
  _pendingCropCallback = null;
}

// ============ Types ============

type CropRouteParams = {
  ImageCrop: { imageUri: string };
};

export interface CropViewProps {
  imageUri: string;
  onConfirm: (croppedUri: string) => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

// ============ Styles ============

const makeStyles = (theme: Theme, topInset: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: topInset + 6,  // 安全区域 + 少量内边距
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
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
      color: theme.colors.text,
    },
    // body：flex:1，包含图片、遮罩、裁剪框
    body: {
      flex: 1,
      overflow: 'hidden', // 裁剪水平方向溢出的图片部分
      backgroundColor: theme.colors.background,
    },
    // 裁剪框边框层（无 overflow:hidden，仅显示边框和网格）
    cropBorder: {
      position: 'absolute',
      width: CROP_SIZE,
      height: CROP_SIZE,
      left: 0,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    // 网格线
    gridLine: {
      position: 'absolute',
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    // 四角 L 形指示线（用主题主色）
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
    hint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
    },
    hintText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 36,
      paddingTop: 4,
      backgroundColor: theme.colors.background,
    },
    footerButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      backgroundColor: theme.colors.card,
    },
    cancelBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    confirmBtn: {
      flex: 1.6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
    },
    confirmBtnDisabled: {
      opacity: 0.5,
    },
    confirmBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
  });

// ============ CropView 可复用组件 ============

export function CropView({
  imageUri,
  onConfirm,
  onCancel,
  confirmLabel = '确认裁剪',
  cancelLabel = '跳过',
}: CropViewProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets.top), [theme, insets.top]);

  const [imageReady, setImageReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // body 区域高度（用于计算裁剪框在 body 中的垂直位置）
  const [bodyHeight, setBodyHeight] = useState(0);
  // 图片显示尺寸（短边 = CROP_SIZE）
  const [displaySize, setDisplaySize] = useState({ width: CROP_SIZE, height: CROP_SIZE });

  const originalSizeRef = useRef({ width: 1, height: 1 });
  const displaySizeRef = useRef({ width: CROP_SIZE, height: CROP_SIZE });
  const startOffsetRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const offsetAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // 裁剪框在 body 内的垂直起点（居中）
  const cropTop = bodyHeight > 0 ? (bodyHeight - CROP_SIZE) / 2 : 0;
  // 遮罩高度（裁剪框上下各一块）
  const maskHeight = Math.max(0, (bodyHeight - CROP_SIZE) / 2);

  // 使用 Image.getSize 获取原始图片尺寸（比 onLoad event 更可靠）
  useEffect(() => {
    if (!imageUri) return;
    Image.getSize(
      imageUri,
      (width, height) => {
        originalSizeRef.current = { width, height };

        const aspectRatio = width / height;
        let displayW: number;
        let displayH: number;

        if (aspectRatio >= 1) {
          // 横图：高度适配 CROP_SIZE，宽度溢出（水平方向被 body overflow:hidden 裁剪）
          displayH = CROP_SIZE;
          displayW = CROP_SIZE * aspectRatio;
        } else {
          // 竖图：宽度适配 CROP_SIZE，高度溢出（超出部分可见但变暗）
          displayW = CROP_SIZE;
          displayH = CROP_SIZE / aspectRatio;
        }

        displaySizeRef.current = { width: displayW, height: displayH };
        setDisplaySize({ width: displayW, height: displayH });

        // 初始居中对齐裁剪框
        const initX = -(displayW - CROP_SIZE) / 2;
        const initY = -(displayH - CROP_SIZE) / 2;
        offsetRef.current = { x: initX, y: initY };
        offsetAnim.setValue({ x: initX, y: initY });
        setImageReady(true);
      },
      (error) => {
        console.error('[CropView] Image.getSize failed:', error);
      }
    );
  }, [imageUri, offsetAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startOffsetRef.current = { ...offsetRef.current };
      },
      onPanResponderMove: (_, gs) => {
        const { width: dw, height: dh } = displaySizeRef.current;
        const minX = -(dw - CROP_SIZE);
        const minY = -(dh - CROP_SIZE);
        const newX = Math.max(minX, Math.min(0, startOffsetRef.current.x + gs.dx));
        const newY = Math.max(minY, Math.min(0, startOffsetRef.current.y + gs.dy));
        offsetRef.current = { x: newX, y: newY };
        offsetAnim.setValue({ x: newX, y: newY });
      },
      onPanResponderRelease: (_, gs) => {
        const { width: dw, height: dh } = displaySizeRef.current;
        const minX = -(dw - CROP_SIZE);
        const minY = -(dh - CROP_SIZE);
        const newX = Math.max(minX, Math.min(0, startOffsetRef.current.x + gs.dx));
        const newY = Math.max(minY, Math.min(0, startOffsetRef.current.y + gs.dy));
        offsetRef.current = { x: newX, y: newY };
        offsetAnim.setValue({ x: newX, y: newY });
      },
    })
  ).current;

  const handleConfirm = async () => {
    if (!imageReady) return;
    setIsProcessing(true);
    try {
      const { x: offsetX, y: offsetY } = offsetRef.current;
      const { width: dw, height: dh } = displaySizeRef.current;

      // Use fractional coordinates so they're immune to DPR differences between
      // Image.getSize (logical px) and jpeg.decode (physical px).
      const fracX = Math.max(0, -offsetX / dw);
      const fracY = Math.max(0, -offsetY / dh);
      const fracW = Math.min(CROP_SIZE / dw, 1 - fracX);
      const fracH = Math.min(CROP_SIZE / dh, 1 - fracY);

      console.log('[CropView] offset:', offsetX, offsetY, '| display:', dw, dh);
      console.log('[CropView] fractions:', fracX.toFixed(3), fracY.toFixed(3), fracW.toFixed(3), fracH.toFixed(3));

      // 确保目录存在
      await ensureImageDir();

      // Step 1: 用 manipulateAsync 原生缩小图片（resize 无 bug，只有 crop 有 bug）
      // 目标最大边 1500px → 解码数据量降低 4~6 倍，速度大幅提升
      const { width: origW, height: origH } = originalSizeRef.current;
      const MAX_DIM = 1500;
      const longerSide = Math.max(origW, origH);
      const resizeAction = longerSide > MAX_DIM
        ? [{ resize: origW >= origH ? { width: MAX_DIM } : { height: MAX_DIM } }]
        : [];  // 图片已足够小，跳过 resize
      const resized = await manipulateAsync(imageUri, resizeAction, {
        format: SaveFormat.JPEG,
        compress: 0.95,
      });

      // Step 2: 纯 JS 对缩小后的图裁剪（坐标用分数，与分辨率无关）
      const savedPath = `${documentDirectory}images/crop_${Date.now()}.jpg`;
      const { width: resultW, height: resultH } = await cropJpegPure(
        resized.uri,
        savedPath,
        fracX,
        fracY,
        fracW,
        fracH,
        0.92
      );
      console.log('[CropView] pureJS crop result:', resultW, resultH);
      onConfirm(savedPath);
    } catch (error) {
      console.error('[CropView] Crop FAILED, returning original:', error);
      onConfirm(imageUri);
    } finally {
      setIsProcessing(false);
    }
  };

  const showContent = imageReady && bodyHeight > 0;

  return (
    <View style={styles.container}>
      {/* 顶部栏：使用 SafeArea insets 精确定位 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>裁剪照片</Text>
        <TouchableOpacity
          onPress={handleConfirm}
          style={styles.headerBtn}
          disabled={isProcessing || !imageReady}
          activeOpacity={0.7}
        >
          <Ionicons
            name="checkmark"
            size={26}
            color={isProcessing || !imageReady ? theme.colors.border : theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* 主体区域：图片 + 遮罩 + 裁剪框 */}
      <View
        style={styles.body}
        onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}
        {...panResponder.panHandlers}
      >
        {/* 图片：绝对定位于 body 内，在裁剪框垂直居中处开始 */}
        <Animated.Image
          source={{ uri: imageUri }}
          style={{
            position: 'absolute',
            width: displaySize.width,
            height: displaySize.height,
            left: 0,
            top: cropTop,
            transform: [
              { translateX: offsetAnim.x },
              { translateY: offsetAnim.y },
            ],
            opacity: showContent ? 1 : 0,
          }}
          resizeMode="cover"
        />

        {/* 加载中 */}
        {!showContent && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}

        {showContent && (
          <>
            {/* 上方遮罩 — 图片可见但变暗 */}
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

            {/* 下方遮罩 */}
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

            {/* 裁剪框：边框 + 三等分网格 + 四角指示线（无 overflow:hidden） */}
            <View
              style={[styles.cropBorder, { top: cropTop }]}
              pointerEvents="none"
            >
              {/* 网格线 */}
              <View style={[styles.gridLine, { width: '100%', height: 1, top: CROP_SIZE / 3 }]} />
              <View style={[styles.gridLine, { width: '100%', height: 1, top: (CROP_SIZE * 2) / 3 }]} />
              <View style={[styles.gridLine, { height: '100%', width: 1, left: CROP_SIZE / 3 }]} />
              <View style={[styles.gridLine, { height: '100%', width: 1, left: (CROP_SIZE * 2) / 3 }]} />

              {/* 四角 L 形 */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </>
        )}
      </View>

      {/* 提示 */}
      <View style={styles.hint}>
        <Ionicons name="hand-left-outline" size={14} color={theme.colors.textTertiary} />
        <Text style={styles.hintText}>拖动图片以调整裁剪区域</Text>
      </View>

      {/* 底部按钮 */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, (isProcessing || !imageReady) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={isProcessing || !imageReady}
            activeOpacity={0.85}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="crop" size={17} color="#fff" />
            )}
            <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ============ ImageCropScreen（独立路由用） ============

export function ImageCropScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<CropRouteParams, 'ImageCrop'>>();
  const { imageUri } = route.params;

  const handleResult = (resultUri: string) => {
    if (_pendingCropCallback) {
      // 由 ImagePickerModal 发起的导航：通过回调传递结果
      consumeCropCallback(resultUri);
    }
    // 不管哪种情况都返回上一页
    navigation.goBack();
  };

  return (
    <CropView
      imageUri={imageUri}
      onConfirm={handleResult}
      onCancel={() => handleResult(imageUri)}
      confirmLabel="确认裁剪"
      cancelLabel="跳过裁剪"
    />
  );
}
