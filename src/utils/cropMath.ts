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
  const scaledW = dw * scale;
  const scaledH = dh * scale;

  if (rotationAngle === 0) {
    const minX = cropSize - scaledW;
    const maxX = 0;
    const minY = cropSize - scaledH;
    const maxY = 0;
    return {
      x: Math.max(minX, Math.min(maxX, offset.x)),
      y: Math.max(minY, Math.min(maxY, offset.y)),
    };
  }

  // Analytical constraints: each crop corner must be inside the rotated rectangle.
  // For corner (px,py), define cx=px-dw/2, cy=py-dh/2:
  //   |cx*cosT + cy*sinT - ox*cosT - oy*sinT| ≤ scaledW/2
  //   |-cx*sinT + cy*cosT + ox*sinT - oy*cosT| ≤ scaledH/2
  // Each gives linear bounds on ox (given oy) and oy (given ox).
  const radians = rotationAngle * Math.PI / 180;
  const cosT = Math.cos(radians);
  const sinT = Math.sin(radians);
  const w2 = scaledW / 2;
  const h2 = scaledH / 2;

  const cd = [
    [0, 0], [cropSize, 0], [0, cropSize], [cropSize, cropSize],
  ].map(([px, py]) => {
    const cx = px - dw / 2;
    const cy = py - dh / 2;
    return { A: cx * cosT + cy * sinT, B: -cx * sinT + cy * cosT };
  });

  // Valid ox range for given oy
  const oxRange = (oy: number): [number, number] => {
    let lo = -Infinity, hi = Infinity;
    for (const { A, B } of cd) {
      if (Math.abs(cosT) > 1e-10) {
        const a = (A - w2 - oy * sinT) / cosT;
        const b = (A + w2 - oy * sinT) / cosT;
        lo = Math.max(lo, Math.min(a, b));
        hi = Math.min(hi, Math.max(a, b));
      }
      if (Math.abs(sinT) > 1e-10) {
        const a = (-B + oy * cosT - h2) / sinT;
        const b = (-B + oy * cosT + h2) / sinT;
        lo = Math.max(lo, Math.min(a, b));
        hi = Math.min(hi, Math.max(a, b));
      }
    }
    return [lo, hi];
  };

  // Valid oy range for given ox
  const oyRange = (ox: number): [number, number] => {
    let lo = -Infinity, hi = Infinity;
    for (const { A, B } of cd) {
      if (Math.abs(sinT) > 1e-10) {
        const a = (A - w2 - ox * cosT) / sinT;
        const b = (A + w2 - ox * cosT) / sinT;
        lo = Math.max(lo, Math.min(a, b));
        hi = Math.min(hi, Math.max(a, b));
      }
      if (Math.abs(cosT) > 1e-10) {
        const a = (B + ox * sinT - h2) / cosT;
        const b = (B + ox * sinT + h2) / cosT;
        lo = Math.max(lo, Math.min(a, b));
        hi = Math.min(hi, Math.max(a, b));
      }
    }
    return [lo, hi];
  };

  // Check if (ox, oy) satisfies ALL corner constraints
  const isValid = (ox: number, oy: number): boolean => {
    for (const { A, B } of cd) {
      const u = A - ox * cosT - oy * sinT;
      const v = -B + ox * sinT + oy * cosT;
      if (Math.abs(u) > w2 + 0.5 || Math.abs(v) > h2 + 0.5) return false;
    }
    return true;
  };

  // Try both clamping orders, pick the one closer to desired offset
  const candidates: Point[] = [];

  // Order A: oy first → ox
  {
    const [oyLo, oyHi] = oyRange(offset.x);
    const oy = Math.max(oyLo, Math.min(oyHi, offset.y));
    const [oxLo, oxHi] = oxRange(oy);
    candidates.push({ x: Math.max(oxLo, Math.min(oxHi, offset.x)), y: oy });
  }

  // Order B: ox first → oy
  {
    const [oxLo, oxHi] = oxRange(offset.y);
    const ox = Math.max(oxLo, Math.min(oxHi, offset.x));
    const [oyLo, oyHi] = oyRange(ox);
    candidates.push({ x: ox, y: Math.max(oyLo, Math.min(oyHi, offset.y)) });
  }

  // Order C: clamp ox to its standalone range, then oy
  {
    let oxLo = -Infinity, oxHi = Infinity;
    for (const { A, B } of cd) {
      if (Math.abs(cosT) > 1e-10) {
        const lo = (A - w2) / cosT, hi = (A + w2) / cosT;
        oxLo = Math.max(oxLo, Math.min(lo, hi));
        oxHi = Math.min(oxHi, Math.max(lo, hi));
      }
    }
    const ox = Math.max(oxLo, Math.min(oxHi, offset.x));
    const [oyLo, oyHi] = oyRange(ox);
    candidates.push({ x: ox, y: Math.max(oyLo, Math.min(oyHi, offset.y)) });
  }

  // Pick the closest valid candidate
  let best: Point | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    if (!isValid(c.x, c.y)) continue;
    const d = (c.x - offset.x) ** 2 + (c.y - offset.y) ** 2;
    if (d < bestDist) { bestDist = d; best = c; }
  }
  if (best) return best;

  // Fallback: binary search from offset toward centered position (guaranteed valid)
  // Centered offset = image center aligns with crop center
  const cx = (cropSize - dw * scale) / 2;
  const cy = (cropSize - dh * scale) / 2;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const mx = offset.x + (cx - offset.x) * mid;
    const my = offset.y + (cy - offset.y) * mid;
    if (isValid(mx, my)) lo = mid; else hi = mid;
  }
  const t = lo;
  return { x: offset.x + (cx - offset.x) * t, y: offset.y + (cy - offset.y) * t };
}

/** AABB-only clamping (loose, used during drag for smooth movement) */
export function clampOffsetAABB(
  offset: Point,
  displaySize: Size,
  scale: number,
  cropSize: number,
  rotationAngle: number = 0,
): Point {
  const { width: dw, height: dh } = displaySize;
  const scaledW = dw * scale;
  const scaledH = dh * scale;

  if (rotationAngle === 0) {
    const minX = cropSize - scaledW;
    const maxX = 0;
    const minY = cropSize - scaledH;
    const maxY = 0;
    return {
      x: Math.max(minX, Math.min(maxX, offset.x)),
      y: Math.max(minY, Math.min(maxY, offset.y)),
    };
  }

  const radians = (Math.abs(rotationAngle) * Math.PI) / 180;
  const cosA = Math.abs(Math.cos(radians));
  const sinA = Math.abs(Math.sin(radians));
  const aabbW = scaledW * cosA + scaledH * sinA;
  const aabbH = scaledW * sinA + scaledH * cosA;

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
