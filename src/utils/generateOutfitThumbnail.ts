import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

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
): Promise<string> {
  if (!OutfitComposer) {
    console.warn('[OutfitComposer] Native module not found, using fallback');
    return canvasItems.length > 0 ? canvasItems[0].imageUri : '';
  }

  try {
    const result = await OutfitComposer.compose(canvasItems, THUMB_SIZE, THUMB_SIZE);
    return result.uri;
  } catch (e: any) {
    console.warn('[OutfitComposer] Compose failed:', e?.message || e);
    return canvasItems.length > 0 ? canvasItems[0].imageUri : '';
  }
}