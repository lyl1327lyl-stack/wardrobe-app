import * as ImagePicker from 'expo-image-picker';
import {
  documentDirectory,
  makeDirectoryAsync,
  deleteAsync,
  getInfoAsync,
  copyAsync,
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

  // 使用时间戳+随机数确保绝对唯一的文件名，避免 RN Image 缓存问题
  const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 999999)}`;
  const imagePath = `${IMAGE_DIR}img_${uniqueId}.jpg`;
  const thumbnailPath = `${IMAGE_DIR}thumb_${uniqueId}.jpg`;

  let thumbnailUri = thumbnailPath;

  if (removeBg) {
    // 背景移除模式
    const bgRemovedUri = await removeBackground(uri);
    if (bgRemovedUri) {
      // bgRemovedUri 是 data URI (PNG 格式，带透明)
      // 保存完整尺寸 PNG 作为主图
      const mainPngPath = `${IMAGE_DIR}img_${uniqueId}.png`;
      // manipulateAsync 处理 data URI 输出到缓存，再用 copyAsync 复制到永久目录
      const manipulated = await manipulateAsync(
        bgRemovedUri,
        [{ resize: { width: IMAGE_SIZE } }],
        { format: SaveFormat.PNG }
      );
      // 核心修复：立即复制到永久目录
      await copyAsync({ from: manipulated.uri, to: mainPngPath });

      // 生成缩略图
      const thumbnail = await manipulateAsync(
        bgRemovedUri,
        [{ resize: { width: THUMBNAIL_SIZE } }],
        { format: SaveFormat.PNG }
      );
      await copyAsync({ from: thumbnail.uri, to: thumbnailPath });

      console.log('[processImage] Background removed: main saved to', mainPngPath, 'thumb to', thumbnailPath);
      return { imageUri: mainPngPath, thumbnailUri: thumbnailPath };
    } else {
      // API 调用失败，回退到普通处理
      const manipulated = await manipulateAsync(
        uri,
        [{ resize: { width: IMAGE_SIZE } }],
        { compress: 1.0, format: SaveFormat.JPEG }
      );
      await copyAsync({ from: manipulated.uri, to: imagePath });

      const thumbnail = await manipulateAsync(
        uri,
        [{ resize: { width: THUMBNAIL_SIZE } }],
        { compress: 0.9, format: SaveFormat.JPEG }
      );
      await copyAsync({ from: thumbnail.uri, to: thumbnailPath });

      console.log('[processImage] Fallback: main saved to', imagePath, 'thumb to', thumbnailPath);
      return { imageUri: imagePath, thumbnailUri };
    }
  } else {
    // 普通模式
    const manipulated = await manipulateAsync(
      uri,
      [{ resize: { width: IMAGE_SIZE } }],
      { compress: 1.0, format: SaveFormat.JPEG }
    );
    await copyAsync({ from: manipulated.uri, to: imagePath });

    const isPng = uri.toLowerCase().endsWith('.png');
    const thumbnail = await manipulateAsync(
      uri,
      [{ resize: { width: THUMBNAIL_SIZE } }],
      isPng
        ? { format: SaveFormat.PNG }
        : { compress: 0.9, format: SaveFormat.JPEG }
    );
    await copyAsync({ from: thumbnail.uri, to: thumbnailPath });

    console.log('[processImage] Normal: main saved to', imagePath, 'thumb to', thumbnailPath);
    return { imageUri: imagePath, thumbnailUri };
  }
}

export async function deleteImage(imageUri: string, thumbnailUri: string) {
  try {
    await deleteAsync(imageUri, { idempotent: true });
    await deleteAsync(thumbnailUri, { idempotent: true });
  } catch (error) {
    console.error('Failed to delete images:', error);
  }
}