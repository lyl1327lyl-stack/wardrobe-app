import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_OPTIONS,
  CustomCategories,
  CustomOptions,
  getAllChildren,
  getParentOf,
} from '../utils/customOptions';

const OPTIONS_STORAGE_KEY = 'custom_options';

interface CustomOptionsState extends CustomOptions {
  isLoading: boolean;
  load: () => Promise<void>;
  // 父分类管理
  addParent: (parent: string) => Promise<void>;
  renameParent: (oldParent: string, newParent: string) => Promise<void>;
  deleteParent: (parent: string) => Promise<void>;
  // 子分类管理
  addChild: (parent: string, child: string) => Promise<void>;
  renameChild: (parent: string, oldChild: string, newChild: string) => Promise<void>;
  deleteChild: (parent: string, child: string) => Promise<void>;
  // 一维结构的管理（seasons, occasions, styles, sizes）
  updateCategory: (category: 'seasons' | 'occasions' | 'styles' | 'sizes', options: string[]) => Promise<void>;
  // 工具
  resetToDefaults: () => Promise<void>;
  // 查找方法
  getParentOfChild: (child: string) => string | undefined;
  getAllChildTypes: () => string[];
  getChildrenOf: (parent: string) => string[];
  getParents: () => string[];
}

export const useCustomOptionsStore = create<CustomOptionsState>((set, get) => ({
  categories: DEFAULT_OPTIONS.categories,
  seasons: DEFAULT_OPTIONS.seasons,
  occasions: DEFAULT_OPTIONS.occasions,
  styles: DEFAULT_OPTIONS.styles,
  sizes: DEFAULT_OPTIONS.sizes,
  isLoading: true,

  load: async () => {
    try {
      const stored = await AsyncStorage.getItem(OPTIONS_STORAGE_KEY);
      if (stored) {
        const parsed: CustomOptions = JSON.parse(stored);
        set({
          categories: parsed.categories ?? DEFAULT_OPTIONS.categories,
          seasons: parsed.seasons ?? DEFAULT_OPTIONS.seasons,
          occasions: parsed.occasions ?? DEFAULT_OPTIONS.occasions,
          styles: parsed.styles ?? DEFAULT_OPTIONS.styles,
          sizes: parsed.sizes ?? DEFAULT_OPTIONS.sizes,
          isLoading: false,
        });
      } else {
        // 首次加载或数据被清空，使用默认值
        set({
          categories: DEFAULT_OPTIONS.categories,
          seasons: DEFAULT_OPTIONS.seasons,
          occasions: DEFAULT_OPTIONS.occasions,
          styles: DEFAULT_OPTIONS.styles,
          sizes: DEFAULT_OPTIONS.sizes,
          isLoading: false,
        });
      }
    } catch (error) {
      console.warn('[CustomOptionsStore] load failed, using defaults:', error);
      set({
        categories: DEFAULT_OPTIONS.categories,
        seasons: DEFAULT_OPTIONS.seasons,
        occasions: DEFAULT_OPTIONS.occasions,
        styles: DEFAULT_OPTIONS.styles,
        sizes: DEFAULT_OPTIONS.sizes,
        isLoading: false,
      });
    }
  },

  // 父分类管理
  addParent: async (parent) => {
    const { categories } = get();
    if (categories[parent]) {
      console.warn('[CustomOptionsStore] parent already exists:', parent);
      return;
    }
    const newCategories = { ...categories, [parent]: [] };
    set({ categories: newCategories });
    await saveState(get());
  },

  renameParent: async (oldParent, newParent) => {
    const { categories } = get();
    if (!categories[oldParent]) {
      console.warn('[CustomOptionsStore] parent not found:', oldParent);
      return;
    }
    if (oldParent === newParent) return;

    const newCategories: CustomCategories = {};
    for (const [parent, children] of Object.entries(categories)) {
      if (parent === oldParent) {
        newCategories[newParent] = [...children];
      } else {
        newCategories[parent] = [...children];
      }
    }
    set({ categories: newCategories });
    await saveState(get());
  },

  deleteParent: async (parent) => {
    const { categories } = get();
    if (!categories[parent]) return;

    const newCategories = { ...categories };
    delete newCategories[parent];
    set({ categories: newCategories });
    await saveState(get());
  },

  // 子分类管理
  addChild: async (parent, child) => {
    const { categories } = get();
    if (!categories[parent]) {
      console.warn('[CustomOptionsStore] parent not found:', parent);
      return;
    }
    if (categories[parent].includes(child)) {
      console.warn('[CustomOptionsStore] child already exists:', child);
      return;
    }
    // 禁止添加与已有父分类同名的子分类，避免归属歧义
    if (categories[child] !== undefined) {
      console.warn('[CustomOptionsStore] child name conflicts with existing parent:', child);
      return;
    }
    const newCategories = {
      ...categories,
      [parent]: [...categories[parent], child],
    };
    set({ categories: newCategories });
    await saveState(get());
  },

  renameChild: async (parent, oldChild, newChild) => {
    const { categories } = get();
    if (!categories[parent]) {
      console.warn('[CustomOptionsStore] parent not found:', parent);
      return;
    }
    if (oldChild === newChild) return;

    const newCategories = {
      ...categories,
      [parent]: categories[parent].map(c => c === oldChild ? newChild : c),
    };
    set({ categories: newCategories });
    await saveState(get());
  },

  deleteChild: async (parent, child) => {
    const { categories } = get();
    if (!categories[parent]) return;

    const newCategories = {
      ...categories,
      [parent]: categories[parent].filter(c => c !== child),
    };
    set({ categories: newCategories });
    await saveState(get());
  },

  // seasons, occasions, styles 的管理
  updateCategory: async (category, options) => {
    set({ [category]: options } as any);
    await saveState(get());
  },

  resetToDefaults: async () => {
    set({
      categories: DEFAULT_OPTIONS.categories,
      seasons: DEFAULT_OPTIONS.seasons,
      occasions: DEFAULT_OPTIONS.occasions,
      styles: DEFAULT_OPTIONS.styles,
      sizes: DEFAULT_OPTIONS.sizes,
    });
    await saveState(get());
  },

  // 查找方法
  getParentOfChild: (child) => {
    return getParentOf(get().categories, child);
  },

  getAllChildTypes: () => {
    return getAllChildren(get().categories);
  },

  getChildrenOf: (parent) => {
    return get().categories[parent] || [];
  },

  getParents: () => {
    return Object.keys(get().categories);
  },
}));

// 保存完整状态到 AsyncStorage
async function saveState(state: CustomOptionsState): Promise<void> {
  try {
    await AsyncStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify({
      categories: state.categories,
      seasons: state.seasons,
      occasions: state.occasions,
      styles: state.styles,
      sizes: state.sizes,
    }));
  } catch (error) {
    console.warn('[CustomOptionsStore] save failed:', error);
  }
}
