// 裁剪结果传递（模块级 get/set，用于 ImageCropScreen → AddClothingScreen）

export interface CropState {
  offset: { x: number; y: number };
  scale: number;
  rotation: number;
  displayWidth: number;
  displayHeight: number;
}

export interface CropResult {
  uri: string;
  removeBg: boolean;
  /** Full bg-removed PNG (before crop), saved for future re-editing */
  bgRemovedOriginalUri?: string;
  /** Crop state for re-editing (offset, scale, rotation) */
  cropState?: CropState;
}

let _result: CropResult | null = null;

export function setCropResult(result: CropResult) {
  _result = result;
}

export function consumeCropResult(): CropResult | null {
  const r = _result;
  _result = null;
  return r;
}
