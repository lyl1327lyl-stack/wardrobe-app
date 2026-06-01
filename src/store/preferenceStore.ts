import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'user_preferences';

export type ComfortVsAppearance = 'comfort' | 'balanced' | 'appearance';

export interface SurveyPreferences {
  preferredStyles: string[];
  preferredColors: string[];
  comfortVsAppearance: ComfortVsAppearance;
  preferredScenes: string[];
}

interface PreferenceState {
  isLoading: boolean;
  surveyCompleted: boolean;

  // Feature 1: feedback
  blacklist: Set<string>;
  likedItemIds: Set<number>;

  // Feature 2: survey
  preferredStyles: string[];
  preferredColors: string[];
  comfortVsAppearance: ComfortVsAppearance;
  preferredScenes: string[];

  // Actions
  load: () => Promise<void>;
  addToBlacklist: (itemIds: number[]) => Promise<void>;
  removeFromBlacklist: (itemIds: number[]) => Promise<void>;
  isBlacklisted: (itemIds: number[]) => boolean;
  addLikedItems: (itemIds: number[]) => Promise<void>;
  removeLikedItems: (itemIds: number[]) => Promise<void>;
  setSurveyPreferences: (prefs: SurveyPreferences) => Promise<void>;
  resetSurvey: () => Promise<void>;
}

interface StoredPrefs {
  blacklist: string[];
  likedItemIds: number[];
  surveyCompleted: boolean;
  preferredStyles: string[];
  preferredColors: string[];
  comfortVsAppearance: ComfortVsAppearance;
  preferredScenes: string[];
}

function toItemKey(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(',');
}

export const usePreferenceStore = create<PreferenceState>((set, get) => ({
  isLoading: true,
  surveyCompleted: false,
  blacklist: new Set(),
  likedItemIds: new Set(),
  preferredStyles: [],
  preferredColors: [],
  comfortVsAppearance: 'balanced',
  preferredScenes: [],

  load: async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFS_KEY);
      if (stored) {
        const p: StoredPrefs = JSON.parse(stored);
        set({
          blacklist: new Set(p.blacklist ?? []),
          likedItemIds: new Set(p.likedItemIds ?? []),
          surveyCompleted: p.surveyCompleted ?? false,
          preferredStyles: p.preferredStyles ?? [],
          preferredColors: p.preferredColors ?? [],
          comfortVsAppearance: p.comfortVsAppearance ?? 'balanced',
          preferredScenes: p.preferredScenes ?? [],
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  addToBlacklist: async (itemIds) => {
    const key = toItemKey(itemIds);
    const blacklist = new Set(get().blacklist);
    blacklist.add(key);
    set({ blacklist });
    await persist(get());
  },

  removeFromBlacklist: async (itemIds) => {
    const key = toItemKey(itemIds);
    const blacklist = new Set(get().blacklist);
    blacklist.delete(key);
    set({ blacklist });
    await persist(get());
  },

  isBlacklisted: (itemIds) => {
    return get().blacklist.has(toItemKey(itemIds));
  },

  addLikedItems: async (itemIds) => {
    const liked = new Set(get().likedItemIds);
    for (const id of itemIds) liked.add(id);
    set({ likedItemIds: liked });
    await persist(get());
  },

  removeLikedItems: async (itemIds) => {
    const liked = new Set(get().likedItemIds);
    for (const id of itemIds) liked.delete(id);
    set({ likedItemIds: liked });
    await persist(get());
  },

  setSurveyPreferences: async (prefs) => {
    set({
      surveyCompleted: true,
      preferredStyles: prefs.preferredStyles,
      preferredColors: prefs.preferredColors,
      comfortVsAppearance: prefs.comfortVsAppearance,
      preferredScenes: prefs.preferredScenes,
    });
    await persist(get());
  },

  resetSurvey: async () => {
    set({
      surveyCompleted: false,
      preferredStyles: [],
      preferredColors: [],
      comfortVsAppearance: 'balanced',
      preferredScenes: [],
    });
    await persist(get());
  },
}));

async function persist(state: PreferenceState): Promise<void> {
  try {
    const data: StoredPrefs = {
      blacklist: [...state.blacklist],
      likedItemIds: [...state.likedItemIds],
      surveyCompleted: state.surveyCompleted,
      preferredStyles: state.preferredStyles,
      preferredColors: state.preferredColors,
      comfortVsAppearance: state.comfortVsAppearance,
      preferredScenes: state.preferredScenes,
    };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[PreferenceStore] persist failed:', e);
  }
}
