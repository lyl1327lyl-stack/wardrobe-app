import * as ImagePicker from 'expo-image-picker';
import {
  documentDirectory,
  makeDirectoryAsync,
  deleteAsync,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { removeBackground } from './backgroundRemoval';

const IMAGE_DIR = `${documentDirectory}images/`;
const THUMBNAIL_SIZE = 300;
const IMAGE_SIZE = 1200;

export async function ensureImageDir() {
  const dirInfo = await getInfoAsync(IMAGE_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

export async function pickImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function processImage(uri: string, removeBg: boolean = false): Promise<{ imageUri: string; thumbnailUri: string }> {
  await ensureImageDir();

  const timestamp = Date.now();
  const imagePath = `${IMAGE_DIR}img_${timestamp}.jpg`;
  const thumbnailPath = `${IMAGE_DIR}thumb_${timestamp}.png`; // PNG for transparent background

  // Process main image - resize to reasonable size
  const manipulated = await manipulateAsync(
    uri,
    [{ resize: { width: IMAGE_SIZE } }],
    { compress: 0.9 }
  );

  // Copy the processed images to our own directory
  const base64Image = await readAsStringAsync(manipulated.uri, { encoding: 'base64' });
  await writeAsStringAsync(imagePath, base64Image, { encoding: 'base64' });

  // Try background removal if enabled
  let thumbnailUri = thumbnailPath;
  if (removeBg) {
    const bgRemovedUri = await removeBackground(uri);
    if (bgRemovedUri) {
      // bgRemovedUri is a data URI with PNG format (has transparency)
      // Save as PNG - UI should display with white background
      const base64Match = bgRemovedUri.match(/base64,(.+)$/);
      if (base64Match) {
        const pngPath = thumbnailPath;
        await writeAsStringAsync(pngPath, base64Match[1], { encoding: 'base64' });
        console.log('[processImage] Saved background removed thumbnail as PNG');
        // Keep thumbnailUri as pngPath (with transparency)
      }
    } else {
      // Fallback to regular thumbnail
      const thumbnail = await manipulateAsync(
        uri,
        [{ resize: { width: THUMBNAIL_SIZE } }],
        { compress: 0.8 }
      );
      const base64Thumb = await readAsStringAsync(thumbnail.uri, { encoding: 'base64' });
      // Use jpg for fallback
      await writeAsStringAsync(thumbnailPath.replace('.png', '.jpg'), base64Thumb, { encoding: 'base64' });
      thumbnailUri = thumbnailPath.replace('.png', '.jpg');
    }
  } else {
    // Regular thumbnail without background removal
    const isPng = uri.toLowerCase().endsWith('.png');
    const thumbnail = await manipulateAsync(
      uri,
      [{ resize: { width: THUMBNAIL_SIZE } }],
      isPng ? { format: SaveFormat.PNG } : { compress: 0.8 }
    );
    const base64Thumb = await readAsStringAsync(thumbnail.uri, { encoding: 'base64' });
    const thumbPath = isPng ? thumbnailPath : thumbnailPath.replace('.png', '.jpg');
    await writeAsStringAsync(thumbPath, base64Thumb, { encoding: 'base64' });
    thumbnailUri = thumbPath;
  }

  return { imageUri: imagePath, thumbnailUri };
}

export async function deleteImage(imageUri: string, thumbnailUri: string) {
  try {
    await deleteAsync(imageUri, { idempotent: true });
    await deleteAsync(thumbnailUri, { idempotent: true });
  } catch (error) {
    console.error('Failed to delete images:', error);
  }
}
