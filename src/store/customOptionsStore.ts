import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_OPTIONS,
  CustomOptions,
} from '../utils/customOptions';

const OPTIONS_STORAGE_KEY = 'custom_options';

interface CustomOptionsState extends CustomOptions {
  isLoading: boolean;
  load: () => Promise<void>;
  updateCategory: (category: keyof CustomOptions, options: string[]) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const useCustomOptionsStore = create<CustomOptionsState>((set, get) => ({
  types: DEFAULT_OPTIONS.types,
  seasons: DEFAULT_OPTIONS.seasons,
  occasions: DEFAULT_OPTIONS.occasions,
  styles: DEFAULT_OPTIONS.styles,
  isLoading: true,

  load: async () => {
    try {
      const stored = await AsyncStorage.getItem(OPTIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          types: parsed.types || DEFAULT_OPTIONS.types,
          seasons: parsed.seasons || DEFAULT_OPTIONS.seasons,
          occasions: parsed.occasions || DEFAULT_OPTIONS.occasions,
          styles: parsed.styles || DEFAULT_OPTIONS.styles,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.warn('[CustomOptionsStore] load failed, using defaults:', error);
      set({ isLoading: false });
    }
  },

  updateCategory: async (category, options) => {
    set({ [category]: options } as any);
    try {
      const state = get();
      await AsyncStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify({
        types: state.types,
        seasons: state.seasons,
        occasions: state.occasions,
        styles: state.styles,
      }));
    } catch (error) {
      console.warn('[CustomOptionsStore] save failed:', error);
    }
  },

  resetToDefaults: async () => {
    set({ ...DEFAULT_OPTIONS });
    try {
      await AsyncStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(DEFAULT_OPTIONS));
    } catch (error) {
      console.warn('[CustomOptionsStore] resetToDefaults save failed:', error);
    }
  },
}));
