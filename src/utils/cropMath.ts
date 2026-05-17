// 裁剪坐标计算纯函数

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/** 计算 cover-fit 显示尺寸（短边填满 cropSize） */
export function getDisplaySize(imageW: number, imageH: number, cropSize: number): Size {
  const scale = Math.max(cropSize / imageW, cropSize / imageH);
  return { width: imageW * scale, height: imageH * scale };
}

/** cover-fit 下图片初始左上角偏移（居中，负值表示图片超出裁剪框） */
export function getInitialOffset(displayW: number, displayH: number, cropSize: number): Point {
  return {
    x: -(displayW - cropSize) / 2,
    y: -(displayH - cropSize) / 2,
  };
}

/**
 * 限界：确保缩放/平移/旋转后裁剪框内不出现空白
 * @param offset 当前左上角偏移
 * @param displaySize cover-fit 显示尺寸
 * @param scale 用户缩放倍数 (1~4)
 * @param cropSize 裁剪框边长
 * @param rotationAngle 当前旋转角度（度）
 */
export function clampOffset(
  offset: Point,
  displaySize: Size,
  scale: number,
  cropSize: number,
  rotationAngle: number = 0,
): Point {
  const { width: dw, height: dh } = displaySize;

  // Account for rotation — first compute the AABB of the rotated+scaled image.
  // The visual display applies scale * rotationScale, so the effective dimensions
  // include both the user zoom and the rotation coverage factor.
  const radians = (Math.abs(rotationAngle) * Math.PI) / 180;
  const cosA = Math.abs(Math.cos(radians));
  const sinA = Math.abs(Math.sin(radians));
  const rotationScale = cosA + sinA;
  const effectiveW = dw * scale * rotationScale;
  const effectiveH = dh * scale * rotationScale;
  const aabbW = effectiveW * cosA + effectiveH * sinA;
  const aabbH = effectiveW * sinA + effectiveH * cosA;

  // AABB center = image center = (dw/2 + offset.x, dh/2 + offset.y)
  // Constraint: AABB must fully cover crop frame [0, cropSize]
  const minX = cropSize - dw / 2 - aabbW / 2;
  const maxX = aabbW / 2 - dw / 2;
  const minY = cropSize - dh / 2 - aabbH / 2;
  const maxY = aabbH / 2 - dh / 2;

  return {
    x: Math.max(minX, Math.min(maxX, offset.x)),
    y: Math.max(minY, Math.min(maxY, offset.y)),
  };
}

/**
 * 屏幕空间 → 原始图像素坐标
 * 含用户缩放、偏移和旋转角度
 */
export function screenCropToPixelCrop(
  offset: Point,
  scale: number,
  displaySize: Size,
  originalSize: Size,
  cropSize: number,
): CropRect {
  const { width: dw, height: dh } = displaySize;
  const { width: imgW, height: imgH } = originalSize;

  // centerOffset 补偿
  const centerOffsetX = (dw * scale - dw) / 2;
  const centerOffsetY = (dh * scale - dh) / 2;
  const realOffsetX = offset.x - centerOffsetX;
  const realOffsetY = offset.y - centerOffsetY;

  const coverScale = Math.max(cropSize / imgW, cropSize / imgH);
  const pixelX = -realOffsetX / scale / coverScale;
  const pixelY = -realOffsetY / scale / coverScale;
  const pixelSize = cropSize / scale / coverScale;

  // Clamp to image bounds to prevent "y + height must be <= bitmap.height()"
  const originX = Math.max(0, Math.min(pixelX, imgW - pixelSize));
  const originY = Math.max(0, Math.min(pixelY, imgH - pixelSize));
  const safeW = Math.min(pixelSize, imgW - originX);
  const safeH = Math.min(pixelSize, imgH - originY);

  return {
    originX,
    originY,
    width: safeW,
    height: safeH,
  };
}
