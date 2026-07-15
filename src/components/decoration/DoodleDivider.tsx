import React, { useState } from 'react';
import { StyleSheet, View, Animated, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { useMountEntrance } from './useEntrance';

interface DoodleDividerProps {
  variant?: 'wave' | 'dash';
  doodle?: 'none' | 'star' | 'heart' | 'leaf';
  style?: StyleProp<ViewStyle>;
}

const DOODLE_W = 24;

function doodlePath(type: 'star' | 'heart' | 'leaf'): string {
  switch (type) {
    case 'heart':
      return 'M12,21 C12,21 4,14 4,8.5 C4,5.5 6.5,3 9.5,3 C11,3 12,4.5 12,4.5 C12,4.5 13,3 14.5,3 C17.5,3 20,5.5 20,8.5 C20,14 12,21 12,21 Z';
    case 'leaf':
      return 'M3,21 C3,11 11,3 21,3 C21,13 13,21 3,21 Z';
    case 'star':
    default:
      return 'M12,2 L14.5,9 L22,9.3 L16,14.3 L18,22 L12,17.5 L6,22 L8,14.3 L2,9.3 L9.5,9 Z';
  }
}

export function DoodleDivider({
  variant = 'wave',
  doodle = 'star',
  style,
}: DoodleDividerProps) {
  const { theme } = useTheme();
  const deco = theme.decoration;
  const [width, setWidth] = useState(0);
  const t = useMountEntrance({ from: 0, to: 1, kind: 'timing', timing: { duration: 300 } });

  if (!deco) {
    return (
      <View
        style={[{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }, style]}
      />
    );
  }

  const lineColor = theme.colors.border;
  const accent = theme.colors.primary;
  const mid = width / 2;
  const half = doodle === 'none' ? 0 : DOODLE_W / 2 + 4;
  const leftEnd = Math.max(mid - half, 0);
  const rightStart = mid + half;

  return (
    <Animated.View
      style={[
        {
          height: DOODLE_W,
          opacity: t,
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
        style,
      ]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      pointerEvents="none"
    >
      {width > 0 && (
        <Svg width={width} height={DOODLE_W}>
          {variant === 'dash' ? (
            <>
              <Line x1={0} y1={DOODLE_W / 2} x2={leftEnd} y2={DOODLE_W / 2} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
              <Line x1={rightStart} y1={DOODLE_W / 2} x2={width} y2={DOODLE_W / 2} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
            </>
          ) : (
            <>
              <Path d={`M0,${DOODLE_W / 2} Q${leftEnd / 2},${DOODLE_W / 2 - 5} ${leftEnd},${DOODLE_W / 2}`} stroke={lineColor} strokeWidth={1} fill="none" />
              <Path d={`M${rightStart},${DOODLE_W / 2} Q${(rightStart + width) / 2},${DOODLE_W / 2 + 5} ${width},${DOODLE_W / 2}`} stroke={lineColor} strokeWidth={1} fill="none" />
            </>
          )}
          {doodle !== 'none' && (
            <Path d={doodlePath(doodle)} fill={accent} transform={`translate(${mid - DOODLE_W / 2}, 0)`} />
          )}
        </Svg>
      )}
    </Animated.View>
  );
}
