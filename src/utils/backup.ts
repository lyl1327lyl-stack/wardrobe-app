import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
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

  // 收集所有唯一图片路径（衣物主图/缩略图/原图 + 搭配缩略图；去重以控制体积）
  const imagePaths = new Set<string>();
  for (const item of clothing as any[]) {
    if (item.imageUri) imagePaths.add(item.imageUri);
    if (item.thumbnailUri) imagePaths.add(item.thumbnailUri);
    if (item.originalImageUri) imagePaths.add(item.originalImageUri);
  }
  for (const o of (s.outfits || [])) {
    if (o.thumbnailUri) imagePaths.add(o.thumbnailUri);
  }

  // 读取图片文件并转为 base64；大图先压缩避免内存溢出（OOM）
  const images: Record<string, string> = {};
  for (const path of imagePaths) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) continue;
      const size = (info as any).size || 0;
      if (size > 1_000_000) {
        // 大图压缩：resize 到 1280px。PNG 保留透明(format PNG)，JPEG 压缩 0.85
        const isPng = path.toLowerCase().endsWith('.png');
        const manip = await manipulateAsync(
          path,
          [{ resize: { width: 1280 } }],
          isPng ? { compress: 1, format: SaveFormat.PNG } : { compress: 0.85, format: SaveFormat.JPEG }
        );
        try {
          images[path] = await FileSystem.readAsStringAsync(manip.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } finally {
          FileSystem.deleteAsync(manip.uri, { idempotent: true }).catch(() => {});
        }
      } else {
        images[path] = await FileSystem.readAsStringAsync(path, {
          encoding: FileSystem.EncodingType.Base64,
        });
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
  await db.runAsync('DELETE FROM outfits');
  await db.runAsync('DELETE FROM outfit_groups');

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
    // 替换图片路径（主图/缩略图/原图）
    if (c.imageUri && pathMap[c.imageUri]) c.imageUri = pathMap[c.imageUri];
    if (c.thumbnailUri && pathMap[c.thumbnailUri]) c.thumbnailUri = pathMap[c.thumbnailUri];
    if (c.originalImageUri && pathMap[c.originalImageUri]) c.originalImageUri = pathMap[c.originalImageUri];

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
    if (r.clothingThumbnailUri && pathMap[r.clothingThumbnailUri]) r.clothingThumbnailUri = pathMap[r.clothingThumbnailUri];
    const values = wrUseCols.map(col => (r as any)[col] ?? (col === 'clothingThumbnailUri' || col === 'clothingType' ? '' : null));
    await db.runAsync(`INSERT INTO wear_records (${wrColList}) VALUES (${wrPlaceholders})`, values);
  }

  // 还原自定义选项
  if (data.options) {
    await AsyncStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(data.options));
    await useCustomOptionsStore.getState().load();
  }

  // 写回搭配（保留原 id；store 中已是解析后的对象，JSON 字段需重新 stringify）
  for (const o of data.outfits || []) {
    // 替换搭配缩略图路径
    if (o.thumbnailUri && pathMap[o.thumbnailUri]) o.thumbnailUri = pathMap[o.thumbnailUri];
    await db.runAsync(
      'INSERT INTO outfits (id, name, itemIds, itemPositions, canvasData, canvasBackground, style, groupId, thumbnailUri, notes, seasons, styles, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        o.id,
        o.name || '',
        JSON.stringify(o.itemIds || []),
        '{}',
        o.canvasData ? JSON.stringify(o.canvasData) : '{}',
        o.canvasBackground ? JSON.stringify(o.canvasBackground) : '{}',
        o.style || '',
        o.groupId || 0,
        o.thumbnailUri || '',
        o.notes || '',
        JSON.stringify(o.seasons || []),
        JSON.stringify(o.tags || []),
        o.createdAt || new Date().toISOString(),
      ]
    );
  }

  // 写回分组（保留原 id）
  for (const g of data.groups || []) {
    await db.runAsync(
      'INSERT INTO outfit_groups (id, name, description, sortOrder, createdAt) VALUES (?,?,?,?,?)',
      [g.id, g.name || '', g.description || '', g.sortOrder || 0, g.createdAt || new Date().toISOString()]
    );
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
