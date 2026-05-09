import { create } from 'zustand';
import { ClothingItem } from '../types';

const BASE_IMAGE_SIZE = 70;

interface LayoutResult {
  x: number;
  y: number;
  scale: number;
}

function computeItemLayout(itemCount: number, canvasSize: number = 340): LayoutResult[] {
  // 根据件数自适应列数和缩放，确保全部在画板内
  let cols: number;
  let scale: number;

  if (itemCount <= 1) {
    cols = 1; scale = 2.4;
  } else if (itemCount <= 2) {
    cols = 2; scale = 2;
  } else if (itemCount <= 4) {
    cols = 2; scale = 1.8;
  } else if (itemCount <= 6) {
    cols = 2; scale = 1.5;
  } else {
    cols = 3; scale = 1.2;
  }

  const itemSize = BASE_IMAGE_SIZE * scale;
  const gap = 12;
  const cellSize = itemSize + gap;
  const totalRows = Math.ceil(itemCount / cols);

  const gridW = cols * cellSize;
  const gridH = totalRows * cellSize;
  const startX = (canvasSize - gridW) / 2;
  const startY = (canvasSize - gridH) / 2;

  const result: LayoutResult[] = [];
  for (let i = 0; i < itemCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    result.push({
      x: startX + col * cellSize,
      y: startY + row * cellSize,
      scale,
    });
  }
  return result;
}

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
  reset: () => void;
  saveToHistory: () => void;
  loadFromOutfit: (canvasData: CanvasItem[], outfitId: number, background?: CanvasBackground) => void;
}

const initialState = {
  selectedClothings: [],
  canvasItems: [],
  history: [[]],
  historyIndex: 0,
  showGrid: false,
  canvasBackground: { type: 'none', value: '' } as CanvasBackground,
  editingOutfitId: null,
};

export const useOutfitStore = create<OutfitCanvasState>((set, get) => ({
  ...initialState,

  setSelectedClothings: (items) => {
    set({ selectedClothings: items });
    const currentItems = get().canvasItems;
    if (currentItems.length === 0) {
      const layout = computeItemLayout(items.length);
      const canvasItems: CanvasItem[] = items.map((item, index) => ({
        clothingId: item.id,
        imageUri: item.imageUri,
        x: layout[index].x,
        y: layout[index].y,
        scale: layout[index].scale,
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
    // 使用自适应布局，取新加入项的坐标（总件数 = 已有 + 1）
    const newCount = state.canvasItems.length + 1;
    const layout = computeItemLayout(newCount);
    const last = layout[layout.length - 1];
    const newItem: CanvasItem = {
      clothingId: clothing.id,
      imageUri: clothing.imageUri,
      x: last.x,
      y: last.y,
      scale: last.scale,
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

  reset: () => {
    set({ ...initialState });
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

  loadFromOutfit: (canvasData, outfitId, background) => {
    set({
      canvasItems: canvasData,
      editingOutfitId: outfitId,
      canvasBackground: background || { type: 'none', value: '' },
      history: [canvasData],
      historyIndex: 0,
    });
  },
}));
