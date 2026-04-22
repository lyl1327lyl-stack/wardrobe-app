import React, { useState, useRef, useMemo, useEffect } from 'react';
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
import { documentDirectory, copyAsync } from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ensureImageDir } from '../utils/imageUtils';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

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
      gap: 10,
      alignItems: 'center',
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
    // 旋转按钮：长方形药丸形，带旋转箭头图标
    rotateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      paddingHorizontal: 20,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    rotateBtnDisabled: {
      opacity: 0.5,
    },
    rotateBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
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
  // 当前显示的图片 URI（旋转后变成新图片）
  const [currentImageUri, setCurrentImageUri] = useState(imageUri);
  // 图片显示尺寸（短边 = CROP_SIZE）
  const [displaySize, setDisplaySize] = useState({ width: CROP_SIZE, height: CROP_SIZE });

  const originalSizeRef = useRef({ width: 1, height: 1 });
  const displaySizeRef = useRef({ width: CROP_SIZE, height: CROP_SIZE });
  const renderedSizeRef = useRef({ width: CROP_SIZE, height: CROP_SIZE }); // 实际渲染尺寸（onLayout 测量）
  const startOffsetRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const offsetAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scaleRef = useRef(1);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const startScaleRef = useRef(1);

  // 裁剪框在 body 内的垂直起点（居中）
  const cropTop = bodyHeight > 0 ? (bodyHeight - CROP_SIZE) / 2 : 0;
  // 遮罩高度（裁剪框上下各一块）
  const maskHeight = Math.max(0, (bodyHeight - CROP_SIZE) / 2);

  // 使用 Image.getSize 获取原始图片尺寸（比 onLoad event 更可靠）
  useEffect(() => {
    if (!currentImageUri) return;
    Image.getSize(
      currentImageUri,
      (width, height) => {
        originalSizeRef.current = { width, height };

        // 用 cover 真实缩放公式计算显示尺寸（Math.max 保证至少一边铺满）
        const scale = Math.max(
          CROP_SIZE / width,
          CROP_SIZE / height
        );
        const displayW = width * scale;
        const displayH = height * scale;

        displaySizeRef.current = { width: displayW, height: displayH };
        setDisplaySize({ width: displayW, height: displayH });

        // cover 情况下图片一定超出裁剪框，需要负偏移居中
        const initX = -(displayW - CROP_SIZE) / 2;
        const initY = -(displayH - CROP_SIZE) / 2;
        offsetRef.current = { x: initX, y: initY };
        offsetAnim.setValue({ x: initX, y: initY });
        // 重置缩放
        scaleRef.current = 1;
        scaleAnim.setValue(1);
        console.log('[ImageLoad] orig:', width, height, '| display:', displayW.toFixed(1), displayH.toFixed(1), '| initOffset:', initX.toFixed(1), initY.toFixed(1), '| scale:', scale.toFixed(3));
        setImageReady(true);
      },
      (error) => {
        console.error('[CropView] Image.getSize failed:', error);
      }
    );
  }, [currentImageUri, offsetAnim]);

  // 双指缩放 + 单指拖动（Gesture.Simultaneous 两者同步识别）
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScaleRef.current = scaleRef.current;
      console.log('[Pinch] START scale:', scaleRef.current);
    })
    .onUpdate((e) => {
      const newScale = Math.max(1, Math.min(4, startScaleRef.current * e.scale));
      scaleRef.current = newScale;
      scaleAnim.setValue(newScale);
    })
    .onEnd(() => {
      const { width: dw, height: dh } = displaySizeRef.current;
      const s = scaleRef.current;
      const overX = dw * s - CROP_SIZE;
      const overY = dh * s - CROP_SIZE;
      const minX = dw > CROP_SIZE ? -(overX) : 0;
      const maxX = dw > CROP_SIZE ? 0 : overX;
      const minY = dh > CROP_SIZE ? -(overY) : 0;
      const maxY = dh > CROP_SIZE ? 0 : overY;
      console.log('[Pinch] END scale:', s.toFixed(2), 'offset:', JSON.stringify(offsetRef.current), '| overX:', overX.toFixed(1), 'overY:', overY.toFixed(1), '| bounds X:', minX.toFixed(1), '~', maxX.toFixed(1), 'Y:', minY.toFixed(1), '~', maxY.toFixed(1));
      // 缩放过小时自动弹回 1
      if (scaleRef.current < 1.05) {
        scaleRef.current = 1;
        scaleAnim.setValue(1);
        // 重置 offset 到居中位置
        const { width: dw, height: dh } = displaySizeRef.current;
        const initX = -(dw - CROP_SIZE) / 2;
        const initY = -(dh - CROP_SIZE) / 2;
        offsetRef.current = { x: initX, y: initY };
        offsetAnim.setValue({ x: initX, y: initY });
        console.log('[Pinch] snap to 1x, offset reset:', initX, initY);
      }
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      // 每次手势开始时，同步 startOffset 到当前 offset（修复 pinch 后 startOffset 不一致的问题）
      startOffsetRef.current = { ...offsetRef.current };
    })
    .onChange((e) => {
      const { width: dw, height: dh } = displaySizeRef.current;
      const s = scaleRef.current;

      const deltaX = e.translationX;
      const deltaY = e.translationY;

      // 关键：scale 是以图片中心为基准，所以左上角会产生偏移
      // centerOffset = 缩放后尺寸与原尺寸之差的一半
      const centerOffsetX = (dw * s - dw) / 2;
      const centerOffsetY = (dh * s - dh) / 2;

      const scaledW = dw * s;
      const scaledH = dh * s;

      // 限界：考虑中心缩放后左上角的真实位置
      // minX: 图片右边缘刚好对齐裁剪框右边缘时，左上角的 x
      // maxX: 图片左边缘刚好对齐裁剪框左边缘时，左上角的 x
      const minX = CROP_SIZE - scaledW + centerOffsetX;
      const maxX = centerOffsetX;

      const minY = CROP_SIZE - scaledH + centerOffsetY;
      const maxY = centerOffsetY;

      const rawX = startOffsetRef.current.x + deltaX;
      const rawY = startOffsetRef.current.y + deltaY;

      const newX = Math.max(minX, Math.min(maxX, rawX));
      const newY = Math.max(minY, Math.min(maxY, rawY));

      offsetRef.current = { x: newX, y: newY };
      offsetAnim.setValue({ x: newX, y: newY });
    })
    .onEnd(() => {
      // onChange 已经处理了 clamp，onEnd 不需要额外操作
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const handleConfirm = async () => {
    if (!imageReady) return;
    setIsProcessing(true);
    try {
      // 读取 currentImageUri 的真实尺寸（可能是旋转后的图）
      const { width: curW, height: curH } = await new Promise<{ width: number; height: number }>((resolve) => {
        Image.getSize(currentImageUri, (w, h) => resolve({ width: w, height: h }));
      });

      const { x: offsetX, y: offsetY } = offsetRef.current;
      const { width: dw, height: dh } = displaySizeRef.current;

      const s = scaleRef.current;

      // scale 以图片中心为基准，左上角会产生 centerOffset
      const centerOffsetX = (dw * s - dw) / 2;
      const centerOffsetY = (dh * s - dh) / 2;
      const realOffsetX = offsetX - centerOffsetX;
      const realOffsetY = offsetY - centerOffsetY;

      // 显示像素 -> 原图像素（coverScale = 原图/显示 的比例）
      const { width: imgW, height: imgH } = { width: curW, height: curH };
      const coverScale = Math.max(CROP_SIZE / imgW, CROP_SIZE / imgH);
      // cover 模式下原图和显示的比例是 coverScale
      const pixelX = -realOffsetX / s / coverScale;
      const pixelY = -realOffsetY / s / coverScale;
      const pixelSize = CROP_SIZE / s / coverScale;

      console.log('[Confirm] offset:', offsetX.toFixed(1), offsetY.toFixed(1), '| realOffset:', realOffsetX.toFixed(1), realOffsetY.toFixed(1));
      console.log('[Confirm] dw/dh:', dw.toFixed(1), dh.toFixed(1), '| imgW/imgH:', imgW, imgH, '| coverScale:', coverScale.toFixed(4));
      console.log('[Confirm] pixelX/Y:', pixelX.toFixed(1), pixelY.toFixed(1), '| pixelSize:', pixelSize.toFixed(1));

      await ensureImageDir();

      // 判断是否为 PNG（原图或抠图后），保留透明通道
      const isPng = currentImageUri.toLowerCase().endsWith('.png')
        || currentImageUri.startsWith('data:image/png');
      const savedExt = isPng ? 'png' : 'jpg';
      const savedPath = `${documentDirectory}images/crop_${Date.now()}_${Math.floor(Math.random() * 999999)}.${savedExt}`;
      const outputFormat = isPng ? SaveFormat.PNG : SaveFormat.JPEG;
      console.log('[Crop] currentImageUri:', currentImageUri);
      console.log('[Crop] isPng:', isPng, '| savedExt:', savedExt, '| outputFormat:', outputFormat);
      console.log('[Crop] savedPath:', savedPath);
      const MAX_DIM = 1500;

      // Step 1: 按原图长边 resize
      const step1 = await manipulateAsync(
        currentImageUri,
        imgW > imgH
          ? [{ resize: { width: MAX_DIM } }]
          : [{ resize: { height: MAX_DIM } }],
        isPng ? { format: SaveFormat.PNG } : { format: SaveFormat.JPEG, compress: 0.92 }
      );

      // Step 2: 直接用像素坐标 crop（不需要 frac）
      // step1 和原图的比例
      const step1Scale = step1.width / imgW;
      const originX = Math.max(0, Math.round(pixelX * step1Scale));
      const originY = Math.max(0, Math.round(pixelY * step1Scale));
      const cropW = Math.round(pixelSize * step1Scale);
      const cropH = cropW; // 强制 1:1

      console.log('[Confirm] step1Scale:', step1Scale.toFixed(4), '| step1 size:', step1.width, 'x', step1.height);
      console.log('[Confirm] crop rect => originX:', originX, 'originY:', originY, 'cropW:', cropW, 'cropH:', cropH);

      const step2 = await manipulateAsync(
        step1.uri,
        [{ crop: { originX, originY, width: cropW, height: cropH } }],
        isPng ? { format: SaveFormat.PNG } : { format: SaveFormat.JPEG, compress: 0.92 }
      );
      console.log('[Confirm] step2 size:', step2.width, 'x', step2.height, '| format:', outputFormat);

      await copyAsync({ from: step2.uri, to: savedPath });
      onConfirm(savedPath);
    } catch (error) {
      console.error('[CropView] Crop failed:', error);
      onConfirm(currentImageUri);
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
        <View style={{ flex: 1 }} />
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
      >
        <GestureDetector gesture={composedGesture}>
          <View style={StyleSheet.absoluteFill}>
            {/* 图片：绝对定位于 body 内，在裁剪框垂直居中处开始 */}
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
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                const prev = renderedSizeRef.current;
                if (Math.abs(width - prev.width) > 0.5 || Math.abs(height - prev.height) > 0.5) {
                  renderedSizeRef.current = { width, height };
                  console.log('[ImageLayout] rendered:', width.toFixed(1), height.toFixed(1), '| prev:', prev.width.toFixed(1), prev.height.toFixed(1), '| displaySize:', displaySizeRef.current.width.toFixed(1), displaySizeRef.current.height.toFixed(1));
                }
              }}
            />
          </View>
        </GestureDetector>

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
          {/* 旋转按钮：长方形药丸形 */}
          <TouchableOpacity
            style={[styles.rotateBtn, (isProcessing || !imageReady) && styles.rotateBtnDisabled]}
            onPress={async () => {
              if (isProcessing || !imageReady) return;
              setIsProcessing(true);
              try {
                const rotated = await manipulateAsync(
                  currentImageUri,
                  [{ rotate: 90 }],
                  { format: SaveFormat.JPEG, compress: 1 }
                );
                setCurrentImageUri(rotated.uri);
              } finally {
                setIsProcessing(false);
              }
            }}
            disabled={isProcessing || !imageReady}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={18} color={theme.colors.text} />
            <Text style={styles.rotateBtnText}>旋转</Text>
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
