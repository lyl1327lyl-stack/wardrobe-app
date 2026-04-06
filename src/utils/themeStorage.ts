import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeId } from './theme';

const THEME_STORAGE_KEY = 'app_theme';

export async function getStoredThemeId(): Promise<ThemeId> {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (stored && ['light', 'dark', 'wood'].includes(stored)) {
      return stored as ThemeId;
    }
  } catch (e) {
    console.warn('Failed to load theme from storage:', e);
  }
  return 'light';
}

export async function storeThemeId(themeId: ThemeId): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (e) {
    console.warn('Failed to save theme to storage:', e);
  }
}
