import { captureRef } from 'react-native-view-shot';
import type { View } from 'react-native';

export async function generateOutfitThumbnail(
  canvasViewRef: React.RefObject<View | null>,
  fallbackUri?: string,
): Promise<string> {
  if (!canvasViewRef.current) {
    return fallbackUri || '';
  }

  try {
    const uri = await captureRef(canvasViewRef, {
      format: 'png',
      quality: 0.85,
      width: 512,
    });
    return uri;
  } catch (e: any) {
    console.warn('[generateOutfitThumbnail] Capture failed:', e?.message || e);
    return fallbackUri || '';
  }
}
