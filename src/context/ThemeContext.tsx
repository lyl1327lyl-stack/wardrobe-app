import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, ThemeId, themes } from '../utils/theme';
import { getStoredThemeId, storeThemeId } from '../utils/themeStorage';

interface ThemeContextValue {
  theme: Theme;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeId, setThemeIdState] = useState<ThemeId>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getStoredThemeId().then(storedId => {
      setThemeIdState(storedId);
      setIsLoading(false);
    });
  }, []);

  const setTheme = async (id: ThemeId) => {
    setThemeIdState(id);
    await storeThemeId(id);
  };

  const value: ThemeContextValue = {
    theme: themes[themeId],
    themeId,
    setTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}
