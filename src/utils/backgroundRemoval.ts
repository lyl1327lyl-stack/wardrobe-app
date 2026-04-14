import { readAsStringAsync } from 'expo-file-system/legacy';
import { REMOVE_BG_API_KEY } from '../config';

// Get API key from config
function getApiKey(): string | undefined {
  return REMOVE_BG_API_KEY !== 'YOUR_API_KEY' ? REMOVE_BG_API_KEY : undefined;
}

// Remove background from image using Remove.bg API
export async function removeBackground(imageUri: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('[BackgroundRemoval] API Key 未配置，请编辑 src/config.ts 设置 Remove.bg API Key');
    return null;
  }

  try {
    // Read image as base64
    const base64Image = await readAsStringAsync(imageUri, { encoding: 'base64' });

    // Call Remove.bg API
    const formData = new FormData();
    formData.append('image_file_b64', base64Image);
    formData.append('size', 'auto');
    formData.append('format', 'png');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BackgroundRemoval] API error:', response.status, errorText);
      return null;
    }

    // Get the result as base64
    const resultBase64 = await response.text();

    // The result is a PNG image file
    // Store as data URI
    const dataUri = `data:image/png;base64,${resultBase64}`;

    console.log('[BackgroundRemoval] Success');
    return dataUri;
  } catch (error) {
    console.error('[BackgroundRemoval] Failed:', error);
    return null;
  }
}

// Check if background removal is configured
export async function isBackgroundRemovalConfigured(): Promise<boolean> {
  const apiKey = getApiKey();
  return !!apiKey;
}
