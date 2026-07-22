// 衣橱接口
export interface Wardrobe {
  id: number;
  name: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
}

// 类型别名 - 使用字符串，用户可自定义
export type ClothingType = string;
export type Season = string;
export type Scene = '工作' | '运动' | '约会' | '宅家';
export type Tag = string;

// 两级分类筛选状态
export interface CategoryFilter {
  parent?: string;
  child?: string;
}

export interface ClothingItem {
  id: number;
  imageUri: string;
  thumbnailUri: string;
  originalImageUri: string;  // 原始图片路径，裁剪/抠图前保留原图
  type: string;
  parentType: string;  // 一级分类名称（空字符串表示直接选了一级分类）
  color: string;
  brand: string;
  size: string;
  remarks: string;
  seasons: string[];
  tags: string[];
  fit: string;
  thickness: string;
  purchaseDate: string;
  price: number;
  wearCount: number;
  lastWornAt: string | null;
  createdAt: string;
  deletedAt?: string | null;
  discardReason?: string | null;
  // 卖出信息
  soldAt?: string | null;
  soldPrice?: number | null;
  soldPlatform?: string | null;
  // 衣橱ID
  wardrobeId: number;
  // 草稿箱
  isDraft?: boolean;
  // 裁剪状态（用于重新编辑时恢复旋转/缩放/位置）
  cropState?: {
    offset: { x: number; y: number };
    scale: number;
    rotation: number;
    displayWidth: number;
    displayHeight: number;
  } | null;
}

/**
 * @deprecated 使用 CanvasItemData 替代
 * 保留类型定义用于读取旧数据
 */
export interface OutfitItemPosition {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasItemData {
  clothingId: number;
  imageUri: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
}

export interface CanvasBackgroundData {
  type: 'color' | 'gradient' | 'none';
  value: string;
}

export interface OutfitGroup {
  id: number;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
}

export interface Outfit {
  id: number;
  name: string;
  itemIds: number[];
  groupId: number;
  /** @deprecated 使用 canvasData 替代 */
  itemPositions?: Record<number, OutfitItemPosition>;
  canvasData?: CanvasItemData[];
  canvasBackground?: CanvasBackgroundData;
  thumbnailUri?: string;
  notes?: string;
  seasons: string[];
  tags: string[];
  createdAt: string;
}

export interface Weather {
  temperature: number; // 摄氏度
  condition: '晴' | '多云' | '阴' | '雨' | '雪' | '雾';
  humidity: number; // 百分比
  city: string;
}

export interface OutfitRecommendation {
  items: ClothingItem[];
  scene: Scene;
  reason: string; // 推荐理由
  score: number; // 匹配度评分 0-100
}

export const SEASONS: string[] = ['春', '夏', '秋', '冬'];
export const SCENES: Scene[] = ['工作', '运动', '约会', '宅家'];
export const FIT_OPTIONS: string[] = ['修身', '标准', '宽松', 'Oversized'];
export const THICKNESS_OPTIONS: string[] = ['薄款', '适中', '加厚', '厚款'];
export const COLORS: string[] = [
  // 黑灰白
  '黑色', '深灰', '浅灰', '灰色', '银灰色',
  '白色', '米白', '米色', '奶油色', '杏色',
  // 红色系
  '红色', '酒红色', '砖红色', '粉红', '玫红色', '桃红色', '橘红色',
  // 蓝色系
  '蓝色', '深蓝', '浅蓝', '藏青色', '天蓝色', '宝蓝色', '湖蓝色', '牛仔蓝', '靛蓝色', '水洗蓝',
  // 绿色系
  '绿色', '军绿色', '墨绿色', '薄荷绿', '翠绿色', '草绿色',
  // 黄橙
  '黄色', '鹅黄色', '柠檬黄', '姜黄色', '芥末黄', '土黄色', '橙色', '金色',
  // 紫粉
  '紫色', '薰衣草', '粉色', '紫红色',
  // 棕卡
  '棕色', '咖啡色', '卡其色', '驼色',
  // 其他
  '青色', '香槟色', '银色', '其他',
];

export const SOLD_PLATFORMS = ['闲鱼', '转转', '得物', '微信', '小红书', '其他'];

// 穿着记录
export interface WearRecord {
  id: number;
  clothingId: number;
  wornDate: string;  // YYYY-MM-DD
  createdAt: string;
  clothingThumbnailUri: string;
  clothingType: string;
}
