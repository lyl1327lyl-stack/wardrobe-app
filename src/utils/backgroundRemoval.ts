import { readAsStringAsync, copyAsync, documentDirectory, makeDirectoryAsync, deleteAsync, getInfoAsync } from 'expo-file-system/legacy';
import { manipulateAsync } from 'expo-image-manipulator';
import { REMOVE_BG_API_KEY } from '../config';

const TEMP_DIR = `${documentDirectory}temp_bg/`;

function getApiKey(): string | undefined {
  const key = REMOVE_BG_API_KEY as string;
  if (!key || (key as string).length < 10) {
    return undefined;
  }
  return key;
}

async function ensureTempDir() {
  const info = await getInfoAsync(TEMP_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(TEMP_DIR, { intermediates: true });
  }
}

// Remove background from image using Remove.bg API
export async function removeBackground(imageUri: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('[BackgroundRemoval] API Key 未配置，请编辑 src/config.ts 设置 Remove.bg API Key');
    return null;
  }

  try {
    await ensureTempDir();

    // First resize image using expo-image-manipulator to get a local file
    console.log('[BackgroundRemoval] Resizing image...');
    const manipulated = await manipulateAsync(
      imageUri,
      [{ resize: { width: 1200 } }],
      { compress: 0.9 }
    );
    console.log('[BackgroundRemoval] Manipulated URI:', manipulated.uri);
    console.log('[BackgroundRemoval] Manipulated width:', manipulated.width, 'height:', manipulated.height);

    // Copy to temp file
    const tempFileName = `temp_${Date.now()}.jpg`;
    const tempPath = `${TEMP_DIR}${tempFileName}`;
    await copyAsync({ from: manipulated.uri, to: tempPath });
    console.log('[BackgroundRemoval] Copied to:', tempPath);

    // Read as base64
    const base64Image = await readAsStringAsync(tempPath, { encoding: 'base64' });
    console.log('[BackgroundRemoval] Base64 length:', base64Image.length);
    console.log('[BackgroundRemoval] Base64 prefix:', base64Image.substring(0, 50));

    // Clean up temp file
    await deleteAsync(tempPath, { idempotent: true });

    // Call Remove.bg API
    const formData = new FormData();
    formData.append('image_file_b64', base64Image);
    formData.append('size', 'auto');
    formData.append('format', 'png');

    console.log('[BackgroundRemoval] Sending request to API...');
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData as any,
    });

    console.log('[BackgroundRemoval] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BackgroundRemoval] API error:', response.status, errorText);
      return null;
    }

    // API returns binary PNG, convert Uint8Array to base64
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert Uint8Array to base64 manually
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let base64 = '';
    let i;
    for (i = 0; i < uint8Array.length; i += 3) {
      const a = uint8Array[i];
      const b = uint8Array[i + 1] || 0;
      const c = uint8Array[i + 2] || 0;
      base64 += chars[a >> 2];
      base64 += chars[((a & 3) << 4) | (b >> 4)];
      base64 += chars[((b & 15) << 2) | (c >> 6)];
      base64 += chars[c & 63];
    }
    if (uint8Array.length % 3 === 1) {
      base64 = base64.slice(0, -2) + '==';
    } else if (uint8Array.length % 3 === 2) {
      base64 = base64.slice(0, -1) + '=';
    }
    console.log('[BackgroundRemoval] Result base64 length:', base64.length);

    const dataUri = `data:image/png;base64,${base64}`;

    console.log('[BackgroundRemoval] Success');
    return dataUri;
  } catch (error) {
    console.error('[BackgroundRemoval] Failed:', error);
    return null;
  }
}

export async function isBackgroundRemovalConfigured(): Promise<boolean> {
  const apiKey = getApiKey();
  return !!apiKey;
}
