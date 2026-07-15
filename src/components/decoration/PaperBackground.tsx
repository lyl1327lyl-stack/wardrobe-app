import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, Line, Circle } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

const TILE = 20;

export function PaperBackground() {
  const { theme } = useTheme();
  const deco = theme.decoration;
  const [size, setSize] = useState({ width: 0, height: 0 });

  // 非手账主题 / 关闭纸纹 → 不渲染任何东西
  if (!deco || deco.paper === 'none') return null;

  const line = deco.paperLineColor;
  const ready = size.width > 0 && size.height > 0;

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) =>
        setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
    >
      {ready && (
        <>
          <Defs>
            <Pattern id="pcPaper" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
              {deco.paper === 'grid' && (
                <>
                  <Line x1="0" y1="0" x2={TILE} y2="0" stroke={line} strokeWidth={1} />
                  <Line x1="0" y1="0" x2="0" y2={TILE} stroke={line} strokeWidth={1} />
                </>
              )}
              {deco.paper === 'dots' && <Circle cx={1} cy={1} r={1} fill={line} />}
              {deco.paper === 'lined' && (
                <Line x1="0" y1="0" x2={TILE} y2="0" stroke={line} strokeWidth={1} />
              )}
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill="url(#pcPaper)" />
        </>
      )}
    </Svg>
  );
}
