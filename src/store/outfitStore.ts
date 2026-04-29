import { create } from 'zustand';
import { ClothingItem } from '../types';

export interface CanvasItem {
  clothingId: number;
  imageUri: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
}

export interface CanvasBackground {
  type: 'color' | 'gradient' | 'none';
  value: string; // 颜色值或渐变定义
}

export interface OutfitCanvasState {
  // 选中的衣物（从选择页带来）
  selectedClothings: ClothingItem[];
  // 画板上的items
  canvasItems: CanvasItem[];
  // 历史记录（用于撤销/重做）
  history: CanvasItem[][];
  historyIndex: number;
  // 画板设置
  showGrid: boolean;
  canvasBackground: CanvasBackground;
  // 当前编辑的outfit id（如果是重新编辑）
  editingOutfitId: number | null;
  // 选中的风格
  selectedStyle: string;

  // Actions
  setSelectedClothings: (items: ClothingItem[]) => void;
  addCanvasItem: (clothing: ClothingItem) => void;
  removeCanvasItem: (clothingId: number) => void;
  updateCanvasItem: (clothingId: number, updates: Partial<CanvasItem>) => void;
  bringForward: (clothingId: number) => void;
  sendBackward: (clothingId: number) => void;
  bringToFront: (clothingId: number) => void;
  sendToBack: (clothingId: number) => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  toggleGrid: () => void;
  setCanvasBackground: (background: CanvasBackground) => void;
  setEditingOutfitId: (id: number | null) => void;
  setSelectedStyle: (style: string) => void;
  reset: () => void;
  saveToHistory: () => void;
  loadFromOutfit: (canvasData: CanvasItem[], style: string, outfitId: number, background?: CanvasBackground) => void;
}

const initialState = {
  selectedClothings: [],
  canvasItems: [],
  history: [[]],
  historyIndex: 0,
  showGrid: false,
  canvasBackground: { type: 'none', value: '' } as CanvasBackground,
  editingOutfitId: null,
  selectedStyle: '',
};

export const useOutfitStore = create<OutfitCanvasState>((set, get) => ({
  ...initialState,

  setSelectedClothings: (items) => {
    set({ selectedClothings: items });
    // 只在画板为空时创建新的canvas items
    const currentItems = get().canvasItems;
    if (currentItems.length === 0) {
      const itemsPerRow = 4;
      const cellSize = 90; // BASE_IMAGE_SIZE(70) + 间距(20)
      const canvasItems: CanvasItem[] = items.map((item, index) => ({
        clothingId: item.id,
        imageUri: item.imageUri,
        x: 20 + (index % itemsPerRow) * cellSize,
        y: 20 + Math.floor(index / itemsPerRow) * cellSize,
        scale: 1,
        rotation: 0,
        zIndex: index,
      }));
      set({ canvasItems, history: [canvasItems], historyIndex: 0 });
    }
  },

  addCanvasItem: (clothing) => {
    const state = get();
    const maxZIndex = state.canvasItems.length > 0
      ? Math.max(...state.canvasItems.map(i => i.zIndex))
      : 0;
    const itemsPerRow = 4;
    const cellSize = 90;
    const count = state.canvasItems.length;
    const newItem: CanvasItem = {
      clothingId: clothing.id,
      imageUri: clothing.imageUri,
      x: 30 + (count % itemsPerRow) * cellSize,
      y: 30 + Math.floor(count / itemsPerRow) * cellSize,
      scale: 1,
      rotation: 0,
      zIndex: maxZIndex + 1,
    };
    get().saveToHistory();
    set({ canvasItems: [...state.canvasItems, newItem] });
  },

  removeCanvasItem: (clothingId) => {
    get().saveToHistory();
    set(state => ({
      canvasItems: state.canvasItems.filter(i => i.clothingId !== clothingId),
    }));
  },

  updateCanvasItem: (clothingId, updates) => {
    set(state => ({
      canvasItems: state.canvasItems.map(i =>
        i.clothingId === clothingId ? { ...i, ...updates } : i
      ),
    }));
  },

  bringForward: (clothingId) => {
    get().saveToHistory();
    set(state => {
      const items = [...state.canvasItems];
      const idx = items.findIndex(i => i.clothingId === clothingId);
      if (idx < 0 || idx >= items.length - 1) return state;
      const current = items[idx];
      const next = items[idx + 1];
      const currentZ = current.zIndex;
      items[idx] = { ...current, zIndex: next.zIndex };
      items[idx + 1] = { ...next, zIndex: currentZ };
      items.sort((a, b) => a.zIndex - b.zIndex);
      return { canvasItems: items };
    });
  },

  sendBackward: (clothingId) => {
    get().saveToHistory();
    set(state => {
      const items = [...state.canvasItems];
      const idx = items.findIndex(i => i.clothingId === clothingId);
      if (idx <= 0) return state;
      const current = items[idx];
      const prev = items[idx - 1];
      const currentZ = current.zIndex;
      items[idx] = { ...prev, zIndex: currentZ };
      items[idx - 1] = { ...current, zIndex: prev.zIndex };
      items.sort((a, b) => a.zIndex - b.zIndex);
      return { canvasItems: items };
    });
  },

  bringToFront: (clothingId) => {
    get().saveToHistory();
    set(state => {
      const maxZIndex = Math.max(...state.canvasItems.map(i => i.zIndex));
      return {
        canvasItems: state.canvasItems.map(i =>
          i.clothingId === clothingId ? { ...i, zIndex: maxZIndex + 1 } : i
        ),
      };
    });
  },

  sendToBack: (clothingId) => {
    get().saveToHistory();
    set(state => {
      const minZIndex = Math.min(...state.canvasItems.map(i => i.zIndex));
      return {
        canvasItems: state.canvasItems.map(i =>
          i.clothingId === clothingId ? { ...i, zIndex: minZIndex - 1 } : i
        ),
      };
    });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({
        historyIndex: newIndex,
        canvasItems: [...history[newIndex]],
      });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({
        historyIndex: newIndex,
        canvasItems: [...history[newIndex]],
      });
    }
  },

  clearCanvas: () => {
    get().saveToHistory();
    set({ canvasItems: [] });
  },

  toggleGrid: () => {
    set(state => ({ showGrid: !state.showGrid }));
  },

  setCanvasBackground: (background) => {
    set({ canvasBackground: background });
  },

  setEditingOutfitId: (id) => {
    set({ editingOutfitId: id });
  },

  setSelectedStyle: (style) => {
    set({ selectedStyle: style });
  },

  reset: () => {
    set(initialState);
  },

  saveToHistory: () => {
    const { canvasItems, historyIndex, history } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...canvasItems]);
    // 最多保存50步历史
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  loadFromOutfit: (canvasData, style, outfitId, background) => {
    set({
      canvasItems: canvasData,
      selectedStyle: style,
      editingOutfitId: outfitId,
      canvasBackground: background || { type: 'none', value: '' },
      history: [canvasData],
      historyIndex: 0,
    });
  },
}));
