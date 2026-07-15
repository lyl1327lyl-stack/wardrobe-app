import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface StickerBadgeProps {
  children: ReactNode;
  paletteIndex?: number;
  rotate?: number;
  style?: StyleProp<ViewStyle>;
}

export function StickerBadge({
  children,
  paletteIndex = 1,
  rotate = -3,
  style,
}: StickerBadgeProps) {
  const { theme } = useTheme();
  const deco = theme.decoration;

  if (!deco) return <>{children}</>;

  const color = deco.accentPalette[paletteIndex % deco.accentPalette.length];

  return (
    <View
      style={[
        {
          backgroundColor: color,
          borderRadius: 10,
          paddingHorizontal: 6,
          paddingVertical: 4,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: `${rotate}deg` }],
          ...theme.shadows.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
