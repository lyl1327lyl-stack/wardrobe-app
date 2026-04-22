import { create } from 'zustand';
import { ClothingItem, Outfit, ClothingType, Season, Occasion, Scene, Wardrobe, WearRecord } from '../types';
import * as clothingDb from '../db/clothing';
import * as outfitDb from '../db/outfit';
import * as wardrobeDb from '../db/wardrobeDb';
import * as wearRecordsDb from '../db/wearRecords';

// 本地日期字符串，避免时区偏移
function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface WardrobeState {
  // 衣物相关
  clothing: ClothingItem[];
  trashClothing: ClothingItem[];
  soldClothing: ClothingItem[];
  draftClothing: ClothingItem[];
  outfits: Outfit[];
  isLoading: boolean;
  filterType: ClothingType | '全部';
  filterSeason: Season | '全部';

  // 穿着记录相关
  wearRecords: WearRecord[];

  // 衣橱相关
  wardrobes: Wardrobe[];
  currentWardrobeId: number;
  isWardrobeLoading: boolean;

  // Actions - 衣物
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
  getClothingByIdIncludingDrafts: (id: number) => ClothingItem | undefined;
  getColorStats: () => Record<string, number>;
  // 推荐相关
  getRecentWornIds: (days: number) => number[];
  getLeastWornItems: (limit?: number) => ClothingItem[];
  getClothingByType: (type: ClothingType) => ClothingItem[];
  getClothingByScene: (scene: Scene) => ClothingItem[];
  getDaysSinceLastWorn: (id: number) => number | null;
  wearMultipleClothing: (ids: number[]) => Promise<void>;
  migrateClothingType: (oldType: string, newType: string) => Promise<number>;
  // 批量操作
  moveMultipleToTrash: (ids: number[], reason?: string) => Promise<void>;
  restoreMultipleFromTrash: (ids: number[]) => Promise<void>;
  sellMultipleClothing: (ids: number[], soldPrice: number, soldPlatform: string) => Promise<void>;
  restoreMultipleFromSold: (ids: number[]) => Promise<void>;
  permanentDeleteMultiple: (ids: number[]) => Promise<void>;

  // Actions - 草稿箱
  loadDrafts: () => Promise<void>;
  saveDraft: (item: Omit<ClothingItem, 'id'> & { id?: number }) => Promise<number>;
  publishDraft: (id: number) => Promise<void>;
  publishMultipleDrafts: (ids: number[]) => Promise<void>;
  deleteDraft: (id: number) => Promise<void>;
  deleteAllDrafts: () => Promise<void>;

  // Actions - 衣橱
  loadWardrobes: () => Promise<void>;
  addWardrobe: (name: string) => Promise<number>;
  updateWardrobe: (id: number, name: string) => Promise<void>;
  deleteWardrobe: (id: number, action: 'move' | 'trash' | 'delete') => Promise<void>;
  setCurrentWardrobe: (id: number) => void;
  getCurrentWardrobe: () => Wardrobe | undefined;
  getDefaultWardrobeId: () => number;
  moveClothingToWardrobe: (clothingId: number, targetWardrobeId: number) => Promise<void>;
  moveMultipleClothingToWardrobe: (clothingIds: number[], targetWardrobeId: number) => Promise<void>;

  // 穿着记录 Actions
  loadWearRecords: () => Promise<void>;
  addWearRecord: (clothingId: number, date: string) => Promise<number>;
  addWearRecords: (clothingIds: number[], date: string) => Promise<number>;
  deleteWearRecord: (id: number) => Promise<void>;
  getWearDatesByClothing: (clothingId: number) => string[];
  getWearRecordsByDate: (date: string) => WearRecord[];
  getWearCount: (clothingId: number) => number;
}

export const useWardrobeStore = create<WardrobeState>((set, get) => ({
  // 衣物相关初始状态
  clothing: [],
  trashClothing: [],
  soldClothing: [],
  draftClothing: [],
  outfits: [],
  isLoading: false,
  filterType: '全部',
  filterSeason: '全部',

  // 穿着记录相关初始状态
  wearRecords: [],

  // 衣橱相关初始状态
  wardrobes: [],
  currentWardrobeId: 1,
  isWardrobeLoading: false,

  // ============ 衣物 Actions ============

  loadData: async () => {
    set({ isLoading: true });
    try {
      const [clothing, trashClothing, soldClothing, draftClothing, outfits] = await Promise.all([
        clothingDb.getAllClothing(),
        clothingDb.getTrashClothing(),
        clothingDb.getSoldClothing(),
        clothingDb.getDraftClothing(),
        outfitDb.getAllOutfits(),
      ]);
      set({ clothing, trashClothing, soldClothing, draftClothing, outfits, isLoading: false });
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
      draftClothing: state.draftClothing.map(c => c.id === item.id ? item : c),
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
      clothing: state.clothing.filter(c => c.id !== id),
      trashClothing: state.trashClothing.filter(c => c.id !== id),
      soldClothing: state.soldClothing.filter(c => c.id !== id),
    }));
  },

  emptyTrash: async () => {
    const { trashClothing } = get();
    const ids = trashClothing.map(c => c.id);
    for (const item of trashClothing) {
      await clothingDb.permanentDeleteClothing(item.id);
    }
    set(state => ({
      clothing: state.clothing.filter(c => !ids.includes(c.id)),
      trashClothing: [],
    }));
  },

  sellClothing: async (id, soldPrice, soldPlatform) => {
    await clothingDb.sellClothing(id, soldPrice, soldPlatform);
    const item = get().clothing.find(c => c.id === id);
    if (item) {
      const soldAtStr = localDateString();
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

  getClothingByIdIncludingDrafts: (id) => {
    const state = get();
    return (
      state.clothing.find(c => c.id === id) ||
      state.draftClothing.find(c => c.id === id)
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
    set(state => ({
      clothing: state.clothing.map(c => c.type === oldType ? { ...c, type: newType } : c),
      soldClothing: state.soldClothing.map(c => c.type === oldType ? { ...c, type: newType } : c),
    }));
    return count;
  },

  moveMultipleToTrash: async (ids, reason = '') => {
    const { clothing } = get();
    const itemsToMove = clothing.filter(c => ids.includes(c.id));
    const deletedItems = itemsToMove.map(item => ({
      ...item,
      deletedAt: localDateString(),
      discardReason: reason,
    }));
    await Promise.all(ids.map(id => clothingDb.softDeleteClothing(id, reason)));
    set(state => ({
      clothing: state.clothing.filter(c => !ids.includes(c.id)),
      trashClothing: [...deletedItems, ...state.trashClothing],
    }));
  },

  restoreMultipleFromTrash: async (ids) => {
    const { trashClothing } = get();
    const itemsToRestore = trashClothing.filter(c => ids.includes(c.id));
    const restoredItems = itemsToRestore.map(item => ({ ...item, deletedAt: null }));
    await Promise.all(ids.map(id => clothingDb.restoreClothing(id)));
    set(state => ({
      trashClothing: state.trashClothing.filter(c => !ids.includes(c.id)),
      clothing: [...restoredItems, ...state.clothing],
    }));
  },

  sellMultipleClothing: async (ids, soldPrice, soldPlatform) => {
    const { clothing } = get();
    const itemsToSell = clothing.filter(c => ids.includes(c.id));
    const soldAtStr = localDateString();
    const soldItems = itemsToSell.map(item => ({
      ...item,
      soldAt: soldAtStr,
      soldPrice,
      soldPlatform,
      deletedAt: null,
      discardReason: null,
    }));
    await Promise.all(ids.map(id => clothingDb.sellClothing(id, soldPrice, soldPlatform)));
    set(state => ({
      clothing: state.clothing.filter(c => !ids.includes(c.id)),
      soldClothing: [...soldItems, ...state.soldClothing],
    }));
  },

  restoreMultipleFromSold: async (ids) => {
    const { soldClothing } = get();
    const itemsToRestore = soldClothing.filter(c => ids.includes(c.id));
    const restoredItems = itemsToRestore.map(item => ({
      ...item,
      soldAt: null,
      soldPrice: null,
      soldPlatform: null,
    }));
    await Promise.all(ids.map(id => clothingDb.restoreSoldClothing(id)));
    set(state => ({
      soldClothing: state.soldClothing.filter(c => !ids.includes(c.id)),
      clothing: [...restoredItems, ...state.clothing],
    }));
  },

  permanentDeleteMultiple: async (ids) => {
    await Promise.all(ids.map(id => clothingDb.permanentDeleteClothing(id)));
    set(state => ({
      clothing: state.clothing.filter(c => !ids.includes(c.id)),
      trashClothing: state.trashClothing.filter(c => !ids.includes(c.id)),
      soldClothing: state.soldClothing.filter(c => !ids.includes(c.id)),
    }));
  },

  // ============ 草稿箱 Actions ============

  loadDrafts: async () => {
    try {
      const draftClothing = await clothingDb.getDraftClothing();
      set({ draftClothing });
    } catch (error) {
      console.error('[WardrobeStore] Failed to load drafts:', error);
    }
  },

  saveDraft: async (item) => {
    const id = await clothingDb.saveClothingDraft(item);
    // 重新加载草稿箱
    const draftClothing = await clothingDb.getDraftClothing();
    set({ draftClothing });
    return id;
  },

  publishDraft: async (id) => {
    await clothingDb.publishDraft(id);
    const draftClothing = await clothingDb.getDraftClothing();
    const clothing = await clothingDb.getAllClothing();
    set({ draftClothing, clothing });
  },

  publishMultipleDrafts: async (ids) => {
    await clothingDb.publishAllDrafts(ids);
    const draftClothing = await clothingDb.getDraftClothing();
    const clothing = await clothingDb.getAllClothing();
    set({ draftClothing, clothing });
  },

  deleteDraft: async (id) => {
    await clothingDb.deleteDraft(id);
    set(state => ({
      draftClothing: state.draftClothing.filter(c => c.id !== id),
    }));
  },

  deleteAllDrafts: async () => {
    await clothingDb.deleteAllDrafts();
    set({ draftClothing: [] });
  },

  // ============ 衣橱 Actions ============

  loadWardrobes: async () => {
    set({ isWardrobeLoading: true });
    try {
      const wardrobes = await wardrobeDb.getAllWardrobes();
      const defaultWardrobe = wardrobes.find(w => w.isDefault);
      const targetId = defaultWardrobe?.id ?? 1;
      set(state => ({
        wardrobes,
        // 只在还没有选中衣橱时设置默认值
        currentWardrobeId: state.currentWardrobeId ?? targetId,
        isWardrobeLoading: false,
      }));
    } catch (error) {
      console.error('[WardrobeStore] Failed to load wardrobes:', error);
      set({ isWardrobeLoading: false });
    }
  },

  addWardrobe: async (name) => {
    const id = await wardrobeDb.addWardrobe(name);
    const newWardrobe: Wardrobe = {
      id,
      name,
      icon: '',
      isDefault: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    set(state => ({ wardrobes: [...state.wardrobes, newWardrobe] }));
    return id;
  },

  updateWardrobe: async (id, name) => {
    await wardrobeDb.updateWardrobe(id, name);
    set(state => ({
      wardrobes: state.wardrobes.map(w =>
        w.id === id ? { ...w, name } : w
      ),
    }));
  },

  deleteWardrobe: async (id, action) => {
    const { wardrobes, currentWardrobeId } = get();
    const wardrobe = wardrobes.find(w => w.id === id);
    if (!wardrobe || wardrobe.isDefault) {
      console.warn('[WardrobeStore] Cannot delete default wardrobe');
      return;
    }

    const defaultWardrobe = wardrobes.find(w => w.isDefault);
    const targetWardrobeId = defaultWardrobe?.id ?? 1;

    switch (action) {
      case 'move':
        await wardrobeDb.moveClothingToWardrobe(id, targetWardrobeId);
        break;
      case 'trash':
        await wardrobeDb.moveClothingToTrash(id);
        break;
      case 'delete':
        await wardrobeDb.permanentlyDeleteClothingInWardrobe(id);
        break;
    }

    await wardrobeDb.deleteWardrobe(id);
    set(state => ({
      wardrobes: state.wardrobes.filter(w => w.id !== id),
      currentWardrobeId: state.currentWardrobeId === id ? targetWardrobeId : state.currentWardrobeId,
    }));
  },

  setCurrentWardrobe: (id) => {
    set({ currentWardrobeId: id });
  },

  getCurrentWardrobe: () => {
    const { wardrobes, currentWardrobeId } = get();
    return wardrobes.find(w => w.id === currentWardrobeId);
  },

  getDefaultWardrobeId: () => {
    const { wardrobes } = get();
    return wardrobes.find(w => w.isDefault)?.id ?? 1;
  },

  moveClothingToWardrobe: async (clothingId, targetWardrobeId) => {
    await wardrobeDb.moveClothingToWardrobe(clothingId, targetWardrobeId);
  },

  moveMultipleClothingToWardrobe: async (clothingIds, targetWardrobeId) => {
    await clothingDb.moveMultipleClothingToWardrobe(clothingIds, targetWardrobeId);
    // 更新内存状态
    set(state => ({
      clothing: state.clothing.map(c =>
        clothingIds.includes(c.id) ? { ...c, wardrobeId: targetWardrobeId } : c
      ),
    }));
  },

  // ============ 穿着记录 Actions ============

  loadWearRecords: async () => {
    // 穿着记录不需要预加载，按需查询
  },

  addWearRecord: async (clothingId, date) => {
    const id = await wearRecordsDb.addWearRecord(clothingId, date);
    // 持久化 wearCount 到数据库（这样应用重启后仍能正确恢复）
    await clothingDb.incrementWearCount(clothingId, date);
    // 更新内存状态
    const { clothing } = get();
    const item = clothing.find(c => c.id === clothingId);
    if (item) {
      const newCount = (item.wearCount || 0) + 1;
      set(state => ({
        clothing: state.clothing.map(c =>
          c.id === clothingId
            ? { ...c, wearCount: newCount, lastWornAt: date }
            : c
        ),
      }));
    }
    return id;
  },

  addWearRecords: async (clothingIds, date) => {
    // 获取当天已有的记录
    const existingRecords = await wearRecordsDb.getWearRecordsByDate(date);
    const alreadyRecordedIds = new Set(existingRecords.map(r => r.clothingId));

    // 只对未记录的衣服添加记录
    const toRecord = clothingIds.filter(id => !alreadyRecordedIds.has(id));
    if (toRecord.length === 0) return 0;

    await wearRecordsDb.addWearRecords(toRecord, date);
    // 持久化 wearCount 到数据库
    for (const clothingId of toRecord) {
      await clothingDb.incrementWearCount(clothingId, date);
    }
    // 批量更新衣物的 wearCount 和 lastWornAt
    set(state => ({
      clothing: state.clothing.map(c =>
        toRecord.includes(c.id)
          ? { ...c, wearCount: (c.wearCount || 0) + 1, lastWornAt: date }
          : c
      ),
    }));
    return toRecord.length;
  },

  deleteWearRecord: async (id) => {
    // 先获取记录以找到 clothingId
    const record = await wearRecordsDb.getWearRecordById(id);
    if (!record) return;

    const { clothingId } = record;

    // 删除记录
    await wearRecordsDb.deleteWearRecord(id);

    // 持久化 wearCount 递减到数据库
    await clothingDb.decrementWearCount(clothingId);

    // 获取剩余记录的最新日期
    const lastDate = await wearRecordsDb.getLastWornDateFromRecords(clothingId);

    // 更新内存状态
    set(state => ({
      clothing: state.clothing.map(c =>
        c.id === clothingId
          ? { ...c, wearCount: Math.max(0, (c.wearCount || 0) - 1), lastWornAt: lastDate }
          : c
      ),
    }));
  },

  getWearDatesByClothing: (_clothingId) => {
    return [];
  },

  getWearRecordsByDate: (_date) => {
    return [];
  },

  getWearCount: (_clothingId) => {
    return 0;
  },
}));
