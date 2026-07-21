export type ThemeId = 'wood' | 'spring' | 'summer' | 'winter' | 'journal';

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
  decoration?: {
    paper: 'none' | 'grid' | 'dots' | 'lined';
    paperLineColor: string;
    washiTape: boolean;
    stickerStyle: boolean;
    doodleStyle: boolean;
    accentPalette: string[];
  };
  fonts?: {
    heading: string;
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

export const woodTheme: Theme = {
  id: 'wood',
  name: '秋日原木',
  colors: {
    primary: '#8B7355',
    primaryLight: '#A89070',
    primaryDark: '#6B5A42',
    accent: '#C17F59',
    accentLight: '#D9A685',
    secondary: '#F7F4EF',
    background: '#F7F4EF',
    card: '#FFFDF9',
    text: '#3D3D3D',
    textSecondary: '#6B6B6B',
    textTertiary: '#9B9B9B',
    border: '#E5DFD6',
    borderLight: '#F0EBE3',
    success: '#5D9E5D',
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

export const springTheme: Theme = {
  id: 'spring',
  name: '春日樱花',
  colors: {
    primary: '#7A9E7E',
    primaryLight: '#96B398',
    primaryDark: '#5F8266',
    accent: '#E8A0A0',
    accentLight: '#F5C4C4',
    secondary: '#FDF5F5',
    background: '#FDFAFB',
    card: '#FFFFFF',
    text: '#3D4A3F',
    textSecondary: '#6B7B6E',
    textTertiary: '#9BA99C',
    border: '#E5DEDE',
    borderLight: '#F5F0F0',
    success: '#6BAF6B',
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

export const summerTheme: Theme = {
  id: 'summer',
  name: '夏日海洋',
  colors: {
    primary: '#4A7B8C',
    primaryLight: '#6B96A5',
    primaryDark: '#3A6272',
    accent: '#F5C842',
    accentLight: '#F8D978',
    secondary: '#F5F9FB',
    background: '#F8FCFD',
    card: '#FFFFFF',
    text: '#2C3E48',
    textSecondary: '#5A6F7D',
    textTertiary: '#8FA5B3',
    border: '#D9E5EA',
    borderLight: '#EEF4F7',
    success: '#5D9E5D',
    warning: '#E5A82C',
    danger: '#C0756B',
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

export const winterTheme: Theme = {
  id: 'winter',
  name: '冬日初雪',
  colors: {
    primary: '#5A6B8C',
    primaryLight: '#7889A5',
    primaryDark: '#465673',
    accent: '#A0B4C8',
    accentLight: '#C5D4E3',
    secondary: '#F5F7FA',
    background: '#FAFBFD',
    card: '#FFFFFF',
    text: '#2C3444',
    textSecondary: '#5A6577',
    textTertiary: '#8A95A5',
    border: '#DDE2E8',
    borderLight: '#F0F2F5',
    success: '#5D9E5D',
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

export const journalTheme: Theme = {
  id: 'journal',
  name: '手账少女',
  colors: {
    primary: '#C27D8E',
    primaryLight: '#E6C6CE',
    primaryDark: '#A96677',
    accent: '#A99CC9',
    accentLight: '#CFC6E5',
    secondary: '#F3EEF6',
    background: '#FAF6EE',
    card: '#FFFDF7',
    text: '#473F38',
    textSecondary: '#7B7068',
    textTertiary: '#A89D92',
    border: '#E6DCCF',
    borderLight: '#F1EAE0',
    success: '#6FAE8E',
    warning: '#D9A441',
    danger: '#CF8A8A',
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
  },
  decoration: {
    paper: 'grid',
    paperLineColor: 'rgba(169,156,201,0.16)',
    washiTape: true,
    stickerStyle: true,
    doodleStyle: true,
    accentPalette: ['#9CCFB8', '#A8C8E8', '#B5A8D6', '#E8B4C0'],
  },
  fonts: {
    heading: 'LXGWWenKai',
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

export const themes: Record<ThemeId, Theme> = {
  wood: woodTheme,
  spring: springTheme,
  summer: summerTheme,
  winter: winterTheme,
  journal: journalTheme,
};

// Backward compatibility - default export is wood theme
export const theme = woodTheme;
