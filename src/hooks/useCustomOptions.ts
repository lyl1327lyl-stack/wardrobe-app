import { useState, useEffect, useCallback } from 'react';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { CustomCategories } from '../utils/customOptions';

interface UseCustomOptionsReturn {
  categories: CustomCategories;
  seasons: string[];
  tags: string[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  updateCategory: (category: 'seasons' | 'tags' | 'sizes', options: string[]) => Promise<void>;
  getAllChildTypes: () => string[];
  getParentOfChild: (child: string) => string | undefined;
  getChildrenOf: (parent: string) => string[];
  getParents: () => string[];
}

export function useCustomOptions(): UseCustomOptionsReturn {
  const categories = useCustomOptionsStore(state => state.categories);
  const seasons = useCustomOptionsStore(state => state.seasons);
  const tags = useCustomOptionsStore(state => state.tags);
  const isLoading = useCustomOptionsStore(state => state.isLoading);
  const load = useCustomOptionsStore(state => state.load);
  const updateCategory = useCustomOptionsStore(state => state.updateCategory);
  const getAllChildTypes = useCustomOptionsStore(state => state.getAllChildTypes);
  const getParentOfChild = useCustomOptionsStore(state => state.getParentOfChild);
  const getChildrenOf = useCustomOptionsStore(state => state.getChildrenOf);
  const getParents = useCustomOptionsStore(state => state.getParents);
  const [localLoading, setLocalLoading] = useState(true);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    load().then(() => {
      setLocalLoading(false);
    });
  }, [load]);

  return {
    categories,
    seasons,
    tags,
    isLoading: isLoading || localLoading,
    refresh,
    updateCategory,
    getAllChildTypes,
    getParentOfChild,
    getChildrenOf,
    getParents,
  };
}
