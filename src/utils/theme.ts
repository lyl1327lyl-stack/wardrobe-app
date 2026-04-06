export type ThemeId = 'light' | 'dark' | 'wood';

export interface Theme {
  id: ThemeId;
  name: string;
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    accentLight: string;
    secondary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    borderLight: string;
    success: string;
    warning: string;
    danger: string;
    shadow: string;
    white: string;
    black: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  shadows: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

const baseSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

const baseBorderRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  full: 9999,
};

const baseShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
  },
};

export const lightTheme: Theme = {
  id: 'light',
  name: '浅色',
  colors: {
    primary: '#8B7355',
    primaryLight: '#A69076',
    primaryDark: '#6B5A42',
    accent: '#C4A882',
    accentLight: '#E8D5B0',
    secondary: '#FAF9F7',
    background: '#F9F6F1',
    card: '#FFFFFF',
    text: '#1A1D23',
    textSecondary: '#6B6B6B',
    textTertiary: '#9B9B9B',
    border: '#E8E4DF',
    borderLight: '#F3F1ED',
    success: '#7BA37B',
    warning: '#D4A94A',
    danger: '#C0756B',
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

export const darkTheme: Theme = {
  id: 'dark',
  name: '深色',
  colors: {
    primary: '#E8DED3',
    primaryLight: '#F5EDE5',
    primaryDark: '#D4C4B5',
    accent: '#D4B896',
    accentLight: '#E8D5B0',
    secondary: '#2A2520',
    background: '#2A2520',
    card: '#3D352E',
    text: '#F9F6F1',
    textSecondary: '#B8AFA6',
    textTertiary: '#8A8279',
    border: '#4D453E',
    borderLight: '#3D352E',
    success: '#7BA37B',
    warning: '#D4A94A',
    danger: '#C0756B',
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

export const woodTheme: Theme = {
  id: 'wood',
  name: '原木',
  colors: {
    primary: '#A67B5B',
    primaryLight: '#B8956F',
    primaryDark: '#8B6347',
    accent: '#8B6914',
    accentLight: '#B8942A',
    secondary: '#F5F0E8',
    background: '#F5F0E8',
    card: '#EDE4D8',
    text: '#3D2E1E',
    textSecondary: '#6B5A4A',
    textTertiary: '#9B8B7A',
    border: '#D9CEBF',
    borderLight: '#E8DFD3',
    success: '#7BA37B',
    warning: '#D4A94A',
    danger: '#C0756B',
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

export const themes: Record<ThemeId, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  wood: woodTheme,
};

// Backward compatibility - default export is light theme
export const theme = lightTheme;
