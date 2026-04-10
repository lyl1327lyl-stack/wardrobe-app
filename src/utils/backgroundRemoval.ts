import { readAsStringAsync } from 'expo-file-system/legacy';

// Get API key from environment variable (configured in .env file)
function getApiKey(): string | undefined {
  // In Expo, use Constants.expoConfig or process.env
  // For Expo EAS Build or local dev with .env, use process.env
  return process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY;
}

// Remove background from image using Remove.bg API
export async function removeBackground(imageUri: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('[BackgroundRemoval] No API key configured. Set EXPO_PUBLIC_REMOVE_BG_API_KEY in .env file.');
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
