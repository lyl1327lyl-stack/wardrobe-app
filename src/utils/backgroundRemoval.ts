import AsyncStorage from '@react-native-async-storage/async-storage';
import { readAsStringAsync } from 'expo-file-system/legacy';

const REMOVE_BG_API_KEY_STORAGE_KEY = 'remove_bg_api_key';
const REMOVE_BG_CACHE_KEY_PREFIX = 'bg_removed_';

// Get stored API key
export async function getRemoveBgApiKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(REMOVE_BG_API_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

// Store API key
export async function setRemoveBgApiKey(apiKey: string): Promise<void> {
  await AsyncStorage.setItem(REMOVE_BG_API_KEY_STORAGE_KEY, apiKey);
}

// Check if image was already processed (cache)
async function getCacheKey(imageUri: string): Promise<string> {
  return REMOVE_BG_CACHE_KEY_PREFIX + imageUri.substring(imageUri.lastIndexOf('/') + 1);
}

// Remove background from image using Remove.bg API
export async function removeBackground(imageUri: string): Promise<string | null> {
  const apiKey = await getRemoveBgApiKey();
  if (!apiKey) {
    console.log('[BackgroundRemoval] No API key configured');
    return null;
  }

  // Check cache
  const cacheKey = await getCacheKey(imageUri);
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      console.log('[BackgroundRemoval] Using cached result');
      return cached;
    }
  } catch {
    // Cache miss, continue
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

    // The result is a PNG image file, save it
    // Store as data URI for persistence
    const dataUri = `data:image/png;base64,${resultBase64}`;

    // Cache the result
    try {
      await AsyncStorage.setItem(cacheKey, dataUri);
    } catch {
      // Cache failed, continue
    }

    console.log('[BackgroundRemoval] Success');
    return dataUri;
  } catch (error) {
    console.error('[BackgroundRemoval] Failed:', error);
    return null;
  }
}

// Check if background removal is configured
export async function isBackgroundRemovalConfigured(): Promise<boolean> {
  const apiKey = await getRemoveBgApiKey();
  return !!apiKey;
}
