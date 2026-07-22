import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../db/database';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { OPTIONS_STORAGE_KEY } from './customOptions';
import { ensureImageDir } from './imageUtils';

const BACKUP_VERSION = 2;
const IMAGE_DIR = `${FileSystem.documentDirectory}images/`;

// 衣物已知列（导入时与实际表列取交集，容错 schema 差异）
const KNOWN_CLOTHING_COLUMNS = [
  'id', 'imageUri', 'thumbnailUri', 'originalImageUri', 'type', 'parentType',
  'color', 'brand', 'size', 'remarks', 'seasons', 'styles', 'fit', 'thickness',
  'purchaseDate', 'price', 'wearCount', 'lastWornAt', 'createdAt', 'wardrobeId',
  'cropState', 'deletedAt', 'discardReason', 'soldAt', 'soldPrice', 'soldPlatform', 'isDraft',
];
// JSON 文本列：原样写回（已是字符串）
const JSON_TEXT_COLUMNS = ['seasons', 'styles', 'cropState'];

/** 收集全量数据（衣物含 废衣篓/已卖出/草稿 + 穿着记录 + 搭配/分组/衣柜 + 自定义选项 + 图片） */
export async function buildBackup(): Promise<any> {
  const db = await getDatabase();
  const clothing = await db.getAllAsync('SELECT * FROM clothing_items');
  const wearRecords = await db.getAllAsync('SELECT * FROM wear_records');
  const s = useWardrobeStore.getState();
  const optionsRaw = await AsyncStorage.getItem(OPTIONS_STORAGE_KEY);

  // 收集所有唯一图片路径（imageUri + thumbnailUri，跳过 originalImageUri 以控制体积）
  const imagePaths = new Set<string>();
  for (const item of clothing as any[]) {
    if (item.imageUri) imagePaths.add(item.imageUri);
    if (item.thumbnailUri) imagePaths.add(item.thumbnailUri);
  }

  // 读取图片文件并转为 base64
  const images: Record<string, string> = {};
  for (const path of imagePaths) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const base64 = await FileSystem.readAsStringAsync(path, {
          encoding: FileSystem.EncodingType.Base64,
        });
        images[path] = base64;
      }
    } catch (e) {
      // 文件无法读取则跳过（导出不中断）
      console.warn('[backup] Failed to read image:', path, e);
    }
  }

  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    clothing,
    wearRecords,
    outfits: s.outfits,
    groups: s.groups,
    wardrobes: s.wardrobes,
    options: optionsRaw ? JSON.parse(optionsRaw) : null,
    images,
  };
}

/** 导出：写文件 + 唤起系统分享 */
export async function exportBackup(): Promise<void> {
  const data = await buildBackup();
  const json = JSON.stringify(data);
  const filename = `${FileSystem.documentDirectory}wardrobe-backup-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(filename, json, { encoding: FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('当前设备不支持分享，无法导出');
  }
  await Sharing.shareAsync(filename, { mimeType: 'application/json', dialogTitle: '备份衣橱数据' });
}

/** 选备份文件并解析 */
export async function pickBackupFile(): Promise<any | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (result.canceled || !result.assets || result.assets.length === 0) return null;
  const file = result.assets[0];
  const content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
  return JSON.parse(content);
}

/** 还原：清空后按备份写回（保留原 id，保证搭配/穿着记录引用有效） */
export async function restoreBackup(data: any): Promise<void> {
  if (!data || data.version < 1 || data.version > BACKUP_VERSION) {
    throw new Error('备份文件版本不兼容');
  }
  const db = await getDatabase();

  // 清空现有数据
  await db.runAsync('DELETE FROM clothing_items');
  await db.runAsync('DELETE FROM wear_records');

  // 还原图片：将 base64 写回新设备的 images 目录，建立 oldPath → newPath 映射
  const pathMap: Record<string, string> = {};
  if (data.images) {
    await ensureImageDir();
    for (const [oldPath, base64] of Object.entries(data.images as Record<string, string>)) {
      try {
        // 从旧路径提取文件名（保留唯一性）
        const filename = oldPath.split(/[\\/]/).pop() || oldPath;
        const newPath = IMAGE_DIR + filename;
        await FileSystem.writeAsStringAsync(newPath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        pathMap[oldPath] = newPath;
      } catch (e) {
        console.warn('[backup] Failed to restore image:', oldPath, e);
      }
    }
  }

  // 取实际表列交集
  const infoCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(clothing_items)');
  const tableCols = infoCols.map(c => c.name);
  const useCols = KNOWN_CLOTHING_COLUMNS.filter(c => tableCols.includes(c));
  const colList = useCols.join(',');
  const placeholders = useCols.map(() => '?').join(',');

  // 写回衣物（保留原 id），同时将图片路径映射为新设备路径
  for (const c of data.clothing || []) {
    // 替换图片路径
    if (c.imageUri && pathMap[c.imageUri]) c.imageUri = pathMap[c.imageUri];
    if (c.thumbnailUri && pathMap[c.thumbnailUri]) c.thumbnailUri = pathMap[c.thumbnailUri];

    const values = useCols.map(col => {
      const v = c[col];
      if (v == null) return null;
      // JSON 文本列：保持字符串
      if (JSON_TEXT_COLUMNS.includes(col)) {
        return typeof v === 'string' ? v : JSON.stringify(v);
      }
      return v;
    });
    await db.runAsync(`INSERT INTO clothing_items (${colList}) VALUES (${placeholders})`, values);
  }

  // 写回穿着记录
  const wrCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(wear_records)');
  const wrTableCols = wrCols.map(c => c.name);
  const wrUseCols = ['clothingId', 'wornDate', 'createdAt', 'clothingThumbnailUri', 'clothingType'].filter(c => wrTableCols.includes(c));
  const wrColList = wrUseCols.join(',');
  const wrPlaceholders = wrUseCols.map(() => '?').join(',');
  for (const r of data.wearRecords || []) {
    const values = wrUseCols.map(col => (r as any)[col] ?? (col === 'clothingThumbnailUri' || col === 'clothingType' ? '' : null));
    await db.runAsync(`INSERT INTO wear_records (${wrColList}) VALUES (${wrPlaceholders})`, values);
  }

  // 还原自定义选项
  if (data.options) {
    await AsyncStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(data.options));
    await useCustomOptionsStore.getState().load();
  }

  // 还原 store：搭配/分组/衣柜
  const wardrobes = data.wardrobes || [];
  useWardrobeStore.setState({
    outfits: data.outfits || [],
    groups: data.groups || [],
    wardrobes,
    currentWardrobeId: wardrobes[0]?.id ?? 1,
    clothing: [],
    trashClothing: [],
    soldClothing: [],
    draftClothing: [],
  });

  // 重新加载衣物到内存
  await useWardrobeStore.getState().loadData();
}
