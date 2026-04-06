import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClothingType, Season, Occasion, Style } from '../types';

const OPTIONS_STORAGE_KEY = 'custom_options';

export interface CustomOptions {
  types: ClothingType[];
  seasons: Season[];
  occasions: Occasion[];
  styles: Style[];
}

const DEFAULT_OPTIONS: CustomOptions = {
  types: ['上衣', '裤子', '裙子', '鞋子', '配饰', '外套'],
  seasons: ['春', '夏', '秋', '冬'],
  occasions: ['日常', '工作', '运动', '正式', '休闲'],
  styles: ['休闲', '简约', '运动', '通勤', '优雅', '街头', '韩系', '日系', '复古'],
};

export async function getCustomOptions(): Promise<CustomOptions> {
  try {
    const stored = await AsyncStorage.getItem(OPTIONS_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_OPTIONS, ...JSON.parse(stored) };
    }
    return DEFAULT_OPTIONS;
  } catch {
    return DEFAULT_OPTIONS;
  }
}

export async function saveCustomOptions(options: CustomOptions): Promise<void> {
  await AsyncStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options));
}

export async function getCustomTypes(): Promise<ClothingType[]> {
  const opts = await getCustomOptions();
  return opts.types;
}

export async function getCustomSeasons(): Promise<Season[]> {
  const opts = await getCustomOptions();
  return opts.seasons;
}

export async function getCustomOccasions(): Promise<Occasion[]> {
  const opts = await getCustomOptions();
  return opts.occasions;
}

export async function getCustomStyles(): Promise<Style[]> {
  const opts = await getCustomOptions();
  return opts.styles;
}

export async function updateCustomTypes(types: ClothingType[]): Promise<void> {
  const opts = await getCustomOptions();
  opts.types = types;
  await saveCustomOptions(opts);
}

export async function updateCustomSeasons(seasons: Season[]): Promise<void> {
  const opts = await getCustomOptions();
  opts.seasons = seasons;
  await saveCustomOptions(opts);
}

export async function updateCustomOccasions(occasions: Occasion[]): Promise<void> {
  const opts = await getCustomOptions();
  opts.occasions = occasions;
  await saveCustomOptions(opts);
}

export async function updateCustomStyles(styles: Style[]): Promise<void> {
  const opts = await getCustomOptions();
  opts.styles = styles;
  await saveCustomOptions(opts);
}

export async function resetToDefaults(): Promise<void> {
  await saveCustomOptions(DEFAULT_OPTIONS);
}
