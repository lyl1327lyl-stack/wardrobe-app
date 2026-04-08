import AsyncStorage from '@react-native-async-storage/async-storage';

export const OPTIONS_STORAGE_KEY = 'custom_options';

export interface CustomOptions {
  types: string[];
  seasons: string[];
  occasions: string[];
  styles: string[];
}

export const DEFAULT_OPTIONS: CustomOptions = {
  types: ['上衣', '裤子', '裙子', '鞋子', '配饰', '外套'],
  seasons: ['春', '夏', '秋', '冬'],
  occasions: ['日常', '工作', '运动', '正式', '休闲'],
  styles: ['休闲', '简约', '运动', '通勤', '优雅', '街头', '韩系', '日系', '复古'],
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
