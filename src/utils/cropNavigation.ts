// 裁剪结果传递（模块级 get/set，用于 ImageCropScreen → AddClothingScreen）

export interface CropResult {
  uri: string;
  removeBg: boolean;
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
