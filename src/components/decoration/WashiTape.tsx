import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

interface WashiTapeProps {
  paletteIndex?: number;
  width?: number;
  height?: number;
  rotation?: number;
  style?: StyleProp<ViewStyle>;
}

export function WashiTape({
  paletteIndex = 0,
  width = 64,
  height = 20,
  rotation = -8,
  style,
}: WashiTapeProps) {
  const { theme } = useTheme();
  const deco = theme.decoration;

  if (!deco) return null;

  const color = deco.accentPalette[paletteIndex % deco.accentPalette.length];
  const d = `M0,4 Q${width * 0.25},1 ${width * 0.5},4 T${width},4 L${width},${height - 4} Q${width * 0.75},${height - 1} ${width * 0.5},${height - 4} T0,${height - 4} Z`;

  return (
    <View
      style={[{ width, height, transform: [{ rotate: `${rotation}deg` }] }, style]}
      pointerEvents="none"
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={d} fill={color} fillOpacity={0.5} />
      </Svg>
    </View>
  );
}
