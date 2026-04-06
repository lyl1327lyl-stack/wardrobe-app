import AsyncStorage from '@react-native-async-storage/async-storage';

const BRAND_HISTORY_KEY = 'brand_history';
const MAX_BRANDS = 20;

export async function getBrandHistory(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(BRAND_HISTORY_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to load brand history:', e);
  }
  return [];
}

export async function addBrandToHistory(brand: string): Promise<void> {
  if (!brand.trim()) return;

  const trimmed = brand.trim();

  try {
    const history = await getBrandHistory();
    // Remove if already exists
    const filtered = history.filter(b => b !== trimmed);
    // Add to front
    const newHistory = [trimmed, ...filtered].slice(0, MAX_BRANDS);
    await AsyncStorage.setItem(BRAND_HISTORY_KEY, JSON.stringify(newHistory));
  } catch (e) {
    console.warn('Failed to save brand history:', e);
  }
}

export async function clearBrandHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BRAND_HISTORY_KEY);
  } catch (e) {
    console.warn('Failed to clear brand history:', e);
  }
}
