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

  let thumbnailUri = thumbnailPath;

  if (removeBg) {
    // 背景移除模式：主图和缩略图都用移除背景的结果
    const bgRemovedUri = await removeBackground(uri);
    if (bgRemovedUri) {
      // bgRemovedUri 是 data URI (PNG 格式，带透明)
      // 先按主图尺寸保存，再缩放一份缩略图
      const base64Match = bgRemovedUri.match(/base64,(.+)$/);
      if (base64Match) {
        // 保存完整尺寸 PNG 作为主图（imageUri）
        await writeAsStringAsync(imagePath.replace('.jpg', '.png'), base64Match[1], { encoding: 'base64' });
        // 缩放生成缩略图
        const thumbnail = await manipulateAsync(
          `data:image/png;base64,${base64Match[1]}`,
          [{ resize: { width: THUMBNAIL_SIZE } }],
          { format: SaveFormat.PNG }
        );
        const base64Thumb = await readAsStringAsync(thumbnail.uri, { encoding: 'base64' });
        await writeAsStringAsync(thumbnailPath, base64Thumb, { encoding: 'base64' });
        thumbnailUri = thumbnailPath;
        console.log('[processImage] Background removed: saved main as PNG, thumbnail generated');
      }
    } else {
      // API 调用失败，回退到普通处理
      const manipulated = await manipulateAsync(
        uri,
        [{ resize: { width: IMAGE_SIZE } }],
        { compress: 0.9 }
      );
      const base64Image = await readAsStringAsync(manipulated.uri, { encoding: 'base64' });
      await writeAsStringAsync(imagePath, base64Image, { encoding: 'base64' });
      const thumbnail = await manipulateAsync(
        uri,
        [{ resize: { width: THUMBNAIL_SIZE } }],
        { compress: 0.8 }
      );
      const base64Thumb = await readAsStringAsync(thumbnail.uri, { encoding: 'base64' });
      await writeAsStringAsync(thumbnailPath.replace('.png', '.jpg'), base64Thumb, { encoding: 'base64' });
      thumbnailUri = thumbnailPath.replace('.png', '.jpg');
    }
  } else {
    // 普通模式：不移除背景
    const manipulated = await manipulateAsync(
      uri,
      [{ resize: { width: IMAGE_SIZE } }],
      { compress: 0.9 }
    );
    const base64Image = await readAsStringAsync(manipulated.uri, { encoding: 'base64' });
    await writeAsStringAsync(imagePath, base64Image, { encoding: 'base64' });

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

  return { imageUri: imagePath.replace('.jpg', '.png'), thumbnailUri };
}

export async function deleteImage(imageUri: string, thumbnailUri: string) {
  try {
    await deleteAsync(imageUri, { idempotent: true });
    await deleteAsync(thumbnailUri, { idempotent: true });
  } catch (error) {
    console.error('Failed to delete images:', error);
  }
}
