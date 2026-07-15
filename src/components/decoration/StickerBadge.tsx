import React, { ReactNode } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useMountEntrance } from './useEntrance';

interface StickerBadgeProps {
  children: ReactNode;
  paletteIndex?: number;
  rotate?: number;
  color?: string;            // 新增：提供则覆盖 accentPalette 取色
  style?: StyleProp<ViewStyle>;
}

export function StickerBadge({
  children,
  paletteIndex = 1,
  rotate = -3,
  color,
  style,
}: StickerBadgeProps) {
  const { theme } = useTheme();
  const deco = theme.decoration;
  const scale = useMountEntrance({ from: 0.5, to: 1, kind: 'spring', spring: { tension: 80, friction: 5 } });

  if (!deco) return <>{children}</>;

  const bg = color ?? deco.accentPalette[paletteIndex % deco.accentPalette.length];

  return (
    <Animated.View
      style={[
        {
          backgroundColor: bg,
          borderRadius: 10,
          paddingHorizontal: 6,
          paddingVertical: 4,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: `${rotate}deg` }, { scale }],
          ...theme.shadows.sm,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
