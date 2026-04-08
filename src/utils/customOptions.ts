import AsyncStorage from '@react-native-async-storage/async-storage';

export const OPTIONS_STORAGE_KEY = 'custom_options';

// 两级分类结构：{ 父分类: [子分类1, 子分类2, ...] }
export interface CustomCategories {
  [parent: string]: string[];
}

export const DEFAULT_CATEGORIES: CustomCategories = {
  '上装': ['T恤', '衬衫', '卫衣', '毛衣', '外套'],
  '下装': ['牛仔裤', '休闲裤', '短裤', '裙子'],
  '外套': ['夹克', '风衣', '羽绒服', '西装'],
  '鞋': ['运动鞋', '高跟鞋', '靴子', '凉鞋'],
  '配饰': ['帽子', '围巾', '腰带', '手套'],
  '包包': ['单肩包', '双肩包', '手提包', '钱包'],
};

// 保留 seasons, occasions, styles 的一维结构
export interface CustomOptions {
  categories: CustomCategories;  // 两级分类（替代原来的 types）
  seasons: string[];
  occasions: string[];
  styles: string[];
  sizes: string[];
}

export const DEFAULT_OPTIONS: CustomOptions = {
  categories: DEFAULT_CATEGORIES,
  seasons: ['春', '夏', '秋', '冬'],
  occasions: ['日常', '工作', '运动', '正式', '休闲'],
  styles: ['休闲', '简约', '运动', '通勤', '优雅', '街头', '韩系', '日系', '复古'],
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXL以上', '均码'],
};

export async function loadOptionsFromStorage(): Promise<CustomOptions | null> {
  try {
    const stored = await AsyncStorage.getItem(OPTIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('[CustomOptions] loadOptionsFromStorage error:', error);
    return null;
  }
}

export async function saveOptionsToStorage(options: CustomOptions): Promise<void> {
  try {
    await AsyncStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options));
  } catch (error) {
    console.error('[CustomOptions] saveOptionsToStorage error:', error);
  }
}

export async function clearOptionsStorage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OPTIONS_STORAGE_KEY);
  } catch (error) {
    console.error('[CustomOptions] clearOptionsStorage error:', error);
  }
}

// 工具函数：从 categories 中获取所有子分类
export function getAllChildren(categories: CustomCategories): string[] {
  return Object.values(categories).flat();
}

// 工具函数：根据子分类查找父分类
export function getParentOf(categories: CustomCategories, child: string): string | undefined {
  for (const [parent, children] of Object.entries(categories)) {
    if (children.includes(child)) {
      return parent;
    }
  }
  return undefined;
}
