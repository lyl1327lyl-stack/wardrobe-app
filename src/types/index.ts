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
export type Occasion = string;
export type Scene = '工作' | '运动' | '约会' | '宅家';
export type Style = string;

// 两级分类筛选状态
export interface CategoryFilter {
  parent?: string;
  child?: string;
}

export interface ClothingItem {
  id: number;
  imageUri: string;
  thumbnailUri: string;
  type: string;
  parentType: string;  // 一级分类名称（空字符串表示直接选了一级分类）
  color: string;
  brand: string;
  size: string;
  remarks: string;
  seasons: string[];
  occasions: string[];
  styles: string[];
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
}

export interface OutfitItemPosition {
  x: number;
  y: number;
  scale: number;
}

export interface Outfit {
  id: number;
  name: string;
  itemIds: number[];
  itemPositions?: Record<number, OutfitItemPosition>;
  thumbnailUri?: string;
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
export const OCCASIONS: string[] = ['日常', '工作', '运动', '正式', '休闲'];
export const SCENES: Scene[] = ['工作', '运动', '约会', '宅家'];
export const STYLES: string[] = ['休闲', '简约', '运动', '通勤', '优雅', '街头', '韩系', '日系', '复古'];
export const COLORS: string[] = ['黑色', '白色', '灰色', '红色', '蓝色', '绿色', '黄色', '紫色', '粉色', '棕色', '米色', '橙色', '青色', '咖啡色', '酒红色', '藏青色', '卡其色', '军绿色', '其他'];

export const SOLD_PLATFORMS = ['闲鱼', '转转', '得物', '微信', '小红书', '其他'];
