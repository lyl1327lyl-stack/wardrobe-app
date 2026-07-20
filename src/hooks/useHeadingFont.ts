import { TextStyle } from 'react-native';
import { useTheme } from './useTheme';

/**
 * 有 fonts.heading 的主题（如手账少女）返回手写标题样式；
 * 其余主题返回 null（保留系统字体）。
 *
 * 用法：
 *   const hf = useHeadingFont();
 *   <Text style={[styles.headerTitle, hf]}>标题</Text>
 *
 * fontWeight 强制 '400'：霞鹜文楷只有 Regular，保留原 '700' 会导致
 * RN 找不到 bold 变体而回退系统字。
 */
export function useHeadingFont(): TextStyle | null {
  const { theme } = useTheme();
  return theme.fonts?.heading
    ? { fontFamily: theme.fonts.heading, fontWeight: '400' }
    : null;
}
