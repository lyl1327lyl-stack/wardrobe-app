import { create } from 'zustand';
import { ClothingItem, Outfit, ClothingType, Season, Occasion, Scene } from '../types';
import * as clothingDb from '../db/clothing';
import * as outfitDb from '../db/outfit';

// 本地日期字符串，避免时区偏移
function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface WardrobeState {
  clothing: ClothingItem[];
  trashClothing: ClothingItem[];
  soldClothing: ClothingItem[];
  outfits: Outfit[];
  isLoading: boolean;
  filterType: ClothingType | '全部';
  filterSeason: Season | '全部';

  // Actions
  loadData: () => Promise<void>;
  addClothing: (item: Omit<ClothingItem, 'id'>) => Promise<number>;
  updateClothing: (item: ClothingItem) => Promise<void>;
  moveToTrash: (id: number, reason?: string) => Promise<void>;
  restoreFromTrash: (id: number) => Promise<void>;
  permanentDelete: (id: number) => Promise<void>;
  emptyTrash: () => Promise<void>;
  sellClothing: (id: number, soldPrice: number, soldPlatform: string) => Promise<void>;
  restoreFromSold: (id: number) => Promise<void>;
  emptySold: () => Promise<void>;
  deleteClothing: (id: number) => Promise<void>;
  clearAllClothing: () => Promise<void>;
  wearClothing: (id: number) => Promise<void>;
  addOutfit: (outfit: Omit<Outfit, 'id'>) => Promise<number>;
  updateOutfit: (outfit: Outfit) => Promise<void>;
  deleteOutfit: (id: number) => Promise<void>;
  setFilterType: (type: ClothingType | '全部') => void;
  setFilterSeason: (season: Season | '全部') => void;
  getFilteredClothing: () => ClothingItem[];
  getClothingById: (id: number) => ClothingItem | undefined;
  getClothingByIdIncludingTrash: (id: number) => ClothingItem | undefined;
  getClothingByIdIncludingAll: (id: number) => ClothingItem | undefined;
  getColorStats: () => Record<string, number>;
  // 推荐相关
  getRecentWornIds: (days: number) => number[];
  getLeastWornItems: (limit?: number) => ClothingItem[];
  getClothingByType: (type: ClothingType) => ClothingItem[];
  getClothingByScene: (scene: Scene) => ClothingItem[];
  getDaysSinceLastWorn: (id: number) => number | null;
  wearMultipleClothing: (ids: number[]) => Promise<void>;
  migrateClothingType: (oldType: string, newType: string) => Promise<number>;
}

export const useWardrobeStore = create<WardrobeState>((set, get) => ({
  clothing: [],
  trashClothing: [],
  soldClothing: [],
  outfits: [],
  isLoading: false,
  filterType: '全部',
  filterSeason: '全部',

  loadData: async () => {
    set({ isLoading: true });
    try {
      const [clothing, trashClothing, soldClothing, outfits] = await Promise.all([
        clothingDb.getAllClothing(),
        clothingDb.getTrashClothing(),
        clothingDb.getSoldClothing(),
        outfitDb.getAllOutfits(),
      ]);
      set({ clothing, trashClothing, soldClothing, outfits, isLoading: false });
    } catch (error) {
      console.error('Failed to load data:', error);
      set({ isLoading: false });
    }
  },

  addClothing: async (item) => {
    const id = await clothingDb.addClothing(item);
    const newItem = { ...item, id };
    set(state => ({ clothing: [newItem, ...state.clothing] }));
    return id;
  },

  updateClothing: async (item) => {
    await clothingDb.updateClothing(item);
    set(state => ({
      clothing: state.clothing.map(c => c.id === item.id ? item : c),
      soldClothing: state.soldClothing.map(c => c.id === item.id ? item : c),
    }));
  },

  moveToTrash: async (id, reason = '') => {
    await clothingDb.softDeleteClothing(id, reason);
    const item = get().clothing.find(c => c.id === id);
    if (item) {
      const deletedItem = { ...item, deletedAt: localDateString(), discardReason: reason };
      set(state => ({
        clothing: state.clothing.filter(c => c.id !== id),
        trashClothing: [deletedItem, ...state.trashClothing],
      }));
    }
  },

  restoreFromTrash: async (id) => {
    await clothingDb.restoreClothing(id);
    const item = get().trashClothing.find(c => c.id === id);
    if (item) {
      const restoredItem = { ...item, deletedAt: null };
      set(state => ({
        trashClothing: state.trashClothing.filter(c => c.id !== id),
        clothing: [restoredItem, ...state.clothing],
      }));
    }
  },

  permanentDelete: async (id) => {
    await clothingDb.permanentDeleteClothing(id);
    set(state => ({
      trashClothing: state.trashClothing.filter(c => c.id !== id),
      soldClothing: state.soldClothing.filter(c => c.id !== id),
    }));
  },

  emptyTrash: async () => {
    const { trashClothing } = get();
    for (const item of trashClothing) {
      await clothingDb.permanentDeleteClothing(item.id);
    }
    set({ trashClothing: [] });
  },

  sellClothing: async (id, soldPrice, soldPlatform) => {
    await clothingDb.sellClothing(id, soldPrice, soldPlatform);
    const item = get().clothing.find(c => c.id === id);
    if (item) {
      // 使用本地日期避免时区偏移问题
      const now = new Date();
      const soldAtStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const soldItem = {
        ...item,
        soldAt: soldAtStr,
        soldPrice,
        soldPlatform,
        deletedAt: null,
        discardReason: null,
      };
      set(state => ({
        clothing: state.clothing.filter(c => c.id !== id),
        soldClothing: [soldItem, ...state.soldClothing],
      }));
    }
  },

  restoreFromSold: async (id) => {
    await clothingDb.restoreSoldClothing(id);
    const item = get().soldClothing.find(c => c.id === id);
    if (item) {
      const restoredItem = {
        ...item,
        soldAt: null,
        soldPrice: null,
        soldPlatform: null,
      };
      set(state => ({
        soldClothing: state.soldClothing.filter(c => c.id !== id),
        clothing: [restoredItem, ...state.clothing],
      }));
    }
  },

  emptySold: async () => {
    const { soldClothing } = get();
    for (const item of soldClothing) {
      await clothingDb.permanentDeleteClothing(item.id);
    }
    set({ soldClothing: [] });
  },

  deleteClothing: async (id) => {
    await clothingDb.deleteClothing(id);
    set(state => ({
      clothing: state.clothing.filter(c => c.id !== id),
    }));
  },

  clearAllClothing: async () => {
    await clothingDb.deleteAllClothing();
    set({ clothing: [], trashClothing: [], soldClothing: [] });
  },

  wearClothing: async (id) => {
    await clothingDb.incrementWearCount(id);
    set(state => ({
      clothing: state.clothing.map(c =>
        c.id === id
          ? { ...c, wearCount: c.wearCount + 1, lastWornAt: localDateString() }
          : c
      ),
    }));
  },

  addOutfit: async (outfit) => {
    const id = await outfitDb.addOutfit(outfit);
    const newOutfit = { ...outfit, id };
    set(state => ({ outfits: [newOutfit, ...state.outfits] }));
    return id;
  },

  updateOutfit: async (outfit) => {
    await outfitDb.updateOutfit(outfit);
    set(state => ({
      outfits: state.outfits.map(o => o.id === outfit.id ? outfit : o),
    }));
  },

  deleteOutfit: async (id) => {
    await outfitDb.deleteOutfit(id);
    set(state => ({
      outfits: state.outfits.filter(o => o.id !== id),
    }));
  },

  setFilterType: (type) => set({ filterType: type }),
  setFilterSeason: (season) => set({ filterSeason: season }),

  getFilteredClothing: () => {
    const { clothing, filterType, filterSeason } = get();
    return clothing.filter(item => {
      if (filterType !== '全部' && item.type !== filterType) return false;
      if (filterSeason !== '全部' && !item.seasons.includes(filterSeason as Season)) return false;
      return true;
    });
  },

  getClothingById: (id) => {
    return get().clothing.find(c => c.id === id);
  },

  getClothingByIdIncludingTrash: (id) => {
    const state = get();
    return state.clothing.find(c => c.id === id) || state.trashClothing.find(c => c.id === id);
  },

  getClothingByIdIncludingAll: (id) => {
    const state = get();
    return (
      state.clothing.find(c => c.id === id) ||
      state.trashClothing.find(c => c.id === id) ||
      state.soldClothing.find(c => c.id === id)
    );
  },

  getColorStats: () => {
    const { clothing } = get();
    const stats: Record<string, number> = {};
    clothing.forEach(item => {
      if (item.color) {
        stats[item.color] = (stats[item.color] || 0) + 1;
      }
    });
    return stats;
  },

  getRecentWornIds: (days: number) => {
    const { clothing } = get();
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const recentIds: number[] = [];
    clothing.forEach(item => {
      if (item.lastWornAt) {
        const lastWorn = new Date(item.lastWornAt);
        if (lastWorn >= cutoff) {
          recentIds.push(item.id);
        }
      }
    });
    return recentIds;
  },

  getLeastWornItems: (limit = 10) => {
    const { clothing } = get();
    return [...clothing]
      .sort((a, b) => a.wearCount - b.wearCount)
      .slice(0, limit);
  },

  getClothingByType: (type: ClothingType) => {
    return get().clothing.filter(item => item.type === type);
  },

  getClothingByScene: (scene: Scene) => {
    const { clothing } = get();
    // 场景到场合的映射
    const sceneOccasionMap: Record<Scene, Occasion[]> = {
      '工作': ['工作', '正式'],
      '运动': ['运动'],
      '约会': ['休闲', '正式'],
      '宅家': ['日常', '休闲'],
    };
    const occasions = sceneOccasionMap[scene] || ['日常'];
    return clothing.filter(item =>
      item.occasions.some(o => occasions.includes(o))
    );
  },

  getDaysSinceLastWorn: (id: number) => {
    const item = get().clothing.find(c => c.id === id);
    if (!item?.lastWornAt) return null;
    const now = new Date();
    const lastWorn = new Date(item.lastWornAt);
    return Math.floor((now.getTime() - lastWorn.getTime()) / (1000 * 60 * 60 * 24));
  },

  wearMultipleClothing: async (ids: number[]) => {
    const promises = ids.map(id => clothingDb.incrementWearCount(id));
    await Promise.all(promises);
    set(state => ({
      clothing: state.clothing.map(c =>
        ids.includes(c.id)
          ? { ...c, wearCount: c.wearCount + 1, lastWornAt: localDateString() }
          : c
      ),
    }));
  },

  migrateClothingType: async (oldType: string, newType: string) => {
    const count = await clothingDb.migrateClothingType(oldType, newType);
    // Update in-memory state for all lists that might contain this type
    set(state => ({
      clothing: state.clothing.map(c => c.type === oldType ? { ...c, type: newType } : c),
      soldClothing: state.soldClothing.map(c => c.type === oldType ? { ...c, type: newType } : c),
    }));
    return count;
  },
}));
