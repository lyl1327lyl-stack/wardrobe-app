import * as ImagePicker from 'expo-image-picker';
import {
  documentDirectory,
  makeDirectoryAsync,
  copyAsync,
  deleteAsync,
  getInfoAsync,
} from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const IMAGE_DIR = `${documentDirectory}images/`;
const THUMBNAIL_SIZE = 300;

export async function ensureImageDir() {
  const dirInfo = await getInfoAsync(IMAGE_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

export async function pickImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function processImage(uri: string): Promise<{ imageUri: string; thumbnailUri: string }> {
  await ensureImageDir();

  const timestamp = Date.now();
  const imagePath = `${IMAGE_DIR}img_${timestamp}.png`;
  const thumbnailPath = `${IMAGE_DIR}thumb_${timestamp}.jpg`;

  // Process and save original image
  const manipulated = await manipulateAsync(uri, [], { compress: 0.9, format: SaveFormat.PNG });
  await copyAsync({ from: manipulated.uri, to: imagePath });

  // Create thumbnail
  const thumbnail = await manipulateAsync(
    uri,
    [{ resize: { width: THUMBNAIL_SIZE } }],
    { compress: 0.8, format: SaveFormat.JPEG }
  );
  await copyAsync({ from: thumbnail.uri, to: thumbnailPath });

  return { imageUri: imagePath, thumbnailUri: thumbnailPath };
}

export async function deleteImage(imageUri: string, thumbnailUri: string) {
  try {
    await deleteAsync(imageUri, { idempotent: true });
    await deleteAsync(thumbnailUri, { idempotent: true });
  } catch (error) {
    console.error('Failed to delete images:', error);
  }
}
