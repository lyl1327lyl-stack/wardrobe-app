import { useThemeContext } from '../context/ThemeContext';

export function useTheme() {
  const { theme, themeId, setTheme, isLoading } = useThemeContext();
  return { theme, themeId, setTheme, isLoading };
}
