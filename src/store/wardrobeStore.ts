import { create } from 'zustand';
import { ClothingItem, Outfit, ClothingType, Season, Occasion } from '../types';
import * as clothingDb from '../db/clothing';
import * as outfitDb from '../db/outfit';

interface WardrobeState {
  clothing: ClothingItem[];
  outfits: Outfit[];
  isLoading: boolean;
  filterType: ClothingType | '全部';
  filterSeason: Season | '全部';

  // Actions
  loadData: () => Promise<void>;
  addClothing: (item: Omit<ClothingItem, 'id'>) => Promise<number>;
  updateClothing: (item: ClothingItem) => Promise<void>;
  deleteClothing: (id: number) => Promise<void>;
  wearClothing: (id: number) => Promise<void>;
  addOutfit: (outfit: Omit<Outfit, 'id'>) => Promise<number>;
  deleteOutfit: (id: number) => Promise<void>;
  setFilterType: (type: ClothingType | '全部') => void;
  setFilterSeason: (season: Season | '全部') => void;
  getFilteredClothing: () => ClothingItem[];
  getClothingById: (id: number) => ClothingItem | undefined;
}

export const useWardrobeStore = create<WardrobeState>((set, get) => ({
  clothing: [],
  outfits: [],
  isLoading: false,
  filterType: '全部',
  filterSeason: '全部',

  loadData: async () => {
    set({ isLoading: true });
    try {
      const [clothing, outfits] = await Promise.all([
        clothingDb.getAllClothing(),
        outfitDb.getAllOutfits(),
      ]);
      set({ clothing, outfits, isLoading: false });
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
    }));
  },

  deleteClothing: async (id) => {
    await clothingDb.deleteClothing(id);
    set(state => ({
      clothing: state.clothing.filter(c => c.id !== id),
    }));
  },

  wearClothing: async (id) => {
    await clothingDb.incrementWearCount(id);
    set(state => ({
      clothing: state.clothing.map(c =>
        c.id === id
          ? { ...c, wearCount: c.wearCount + 1, lastWornAt: new Date().toISOString() }
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
}));
