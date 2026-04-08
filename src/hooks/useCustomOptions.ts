import { useState, useEffect, useCallback } from 'react';
import {
  loadOptionsFromStorage,
  DEFAULT_OPTIONS,
  CustomOptions,
} from '../utils/customOptions';
import { useCustomOptionsStore } from '../store/customOptionsStore';

interface UseCustomOptionsReturn {
  options: CustomOptions;
  isLoading: boolean;
  refresh: () => Promise<void>;
  updateCategory: (category: keyof CustomOptions, options: string[]) => Promise<void>;
}

export function useCustomOptions(): UseCustomOptionsReturn {
  const store = useCustomOptionsStore();
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    await store.load();
  }, [store]);

  useEffect(() => {
    store.load().then(() => {
      setIsLoading(false);
    });
  }, []);

  return {
    options: {
      types: store.types,
      seasons: store.seasons,
      occasions: store.occasions,
      styles: store.styles,
    },
    isLoading: store.isLoading || isLoading,
    refresh,
    updateCategory: store.updateCategory,
  };
}
