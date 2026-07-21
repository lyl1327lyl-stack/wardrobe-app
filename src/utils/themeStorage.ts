import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeId } from './theme';

const THEME_STORAGE_KEY = 'app_theme';

export async function getStoredThemeId(): Promise<ThemeId> {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    // 'journal'(手账少女)暂时从白名单移除 → 已选过的用户会回退到 'wood'。
    // 恢复主题时把 'journal' 加回此数组即可。
    if (stored && ['wood', 'spring', 'summer', 'winter'].includes(stored)) {
      return stored as ThemeId;
    }
  } catch (e) {
    console.warn('Failed to load theme from storage:', e);
  }
  return 'wood';
}

export async function storeThemeId(themeId: ThemeId): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (e) {
    console.warn('Failed to save theme to storage:', e);
  }
}
