export type ClothingType = '上衣' | '裤子' | '裙子' | '鞋子' | '配饰' | '外套';
export type Season = '春' | '夏' | '秋' | '冬';
export type Occasion = '日常' | '工作' | '运动' | '正式' | '休闲';

export interface ClothingItem {
  id: number;
  imageUri: string;
  thumbnailUri: string;
  type: ClothingType;
  color: string;
  brand: string;
  size: string;
  seasons: Season[];
  occasions: Occasion[];
  purchaseDate: string;
  price: number;
  wearCount: number;
  lastWornAt: string | null;
  createdAt: string;
}

export interface Outfit {
  id: number;
  name: string;
  itemIds: number[];
  createdAt: string;
}

export const CLOTHING_TYPES: ClothingType[] = ['上衣', '裤子', '裙子', '鞋子', '配饰', '外套'];
export const SEASONS: Season[] = ['春', '夏', '秋', '冬'];
export const OCCASIONS: Occasion[] = ['日常', '工作', '运动', '正式', '休闲'];
export const COLORS = ['黑色', '白色', '灰色', '红色', '蓝色', '绿色', '黄色', '紫色', '粉色', '棕色', '米色', '其他'];
