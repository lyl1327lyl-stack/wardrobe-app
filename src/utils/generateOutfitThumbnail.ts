import { NativeModules } from 'react-native';

type CanvasItem = {
  imageUri: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
};

const THUMB_SIZE = 512;

const { OutfitComposer } = NativeModules;

export async function generateOutfitThumbnail(
  canvasItems: CanvasItem[],
  canvasWidth: number,
  canvasHeight: number,
  baseImageSize: number,
): Promise<string> {
  if (!OutfitComposer) {
    console.warn('[OutfitComposer] Native module not found, using fallback');
    return canvasItems.length > 0 ? canvasItems[0].imageUri : '';
  }

  try {
    const result = await OutfitComposer.compose(
      canvasItems,
      THUMB_SIZE,
      THUMB_SIZE,
      canvasWidth,
      canvasHeight,
      baseImageSize,
    );
    return result.uri;
  } catch (e: any) {
    console.warn('[OutfitComposer] Compose failed:', e?.message || e);
    return canvasItems.length > 0 ? canvasItems[0].imageUri : '';
  }
}