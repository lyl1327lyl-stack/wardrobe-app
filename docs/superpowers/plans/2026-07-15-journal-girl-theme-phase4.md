# 《手账少女》主题 Phase 4 — 实现计划（动效层）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给手账少女装饰加 mount 入场动效（内置 Animated，无 reanimated）——胶带展开、贴纸贴上、分隔淡入、翻页淡入 + reduced-motion 降级；其余 4 主题逐像素不变。

**Architecture:** 新建共享动效工具 `useEntrance.ts`（`useReduceMotion` + `useMountEntrance`），改 4 个装饰组件接入。全部 `useNativeDriver:true`。无新依赖、无 babel 改动。

**Tech Stack:** React Native 0.81 / Expo SDK 54 / TypeScript / 内置 `Animated` + `AccessibilityInfo`

**测试方法（适配）：** 无单测框架。验证 = `npx tsc --noEmit` 编译门 + 手动可视验证（切手账少女看动效、开系统减弱动效看瞬时）。

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/components/decoration/useEntrance.ts` | 新建 | `useReduceMotion` + `useMountEntrance` 共享动效 hook |
| `src/components/decoration/WashiTape.tsx` | 修改 | 加 scaleX 展开动效 |
| `src/components/decoration/StickerBadge.tsx` | 修改 | 加 scale 回弹贴上动效 |
| `src/components/decoration/DoodleDivider.tsx` | 修改 | 加 opacity+translateY 淡入上浮 |
| `src/components/decoration/ThemedScreen.tsx` | 修改 | 子内容翻页淡入（仅 theme.decoration 时） |

**⚠️ 全局规则：** 每个被改组件的 `useMountEntrance(...)` 必须在 `if (!deco) return ...` 早返回**之前**、紧跟 `useTheme()` 之后无条件调用（Hooks 规则）。非手账路径不使用该返回值即可。

---

## Task 1: 新建 `useEntrance.ts`

**Files:** Create `src/components/decoration/useEntrance.ts`

- [ ] **Step 1: 创建文件**

写入完整内容（两个 hook 同文件）：
```ts
import { useState, useEffect, useRef } from 'react';
import { Animated, AccessibilityInfo } from 'react-native';

/** 读取系统"减弱动效"设置，并订阅其变化。 */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (active) setReduced(v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; sub.remove(); };
  }, []);
  return reduced;
}

type EntranceOpts = {
  from: number;
  to: number;
  kind: 'spring' | 'timing';
  spring?: Omit<Animated.SpringAnimationConfig, 'toValue' | 'useNativeDriver'>;
  timing?: Omit<Animated.TimingAnimationConfig, 'toValue' | 'useNativeDriver'>;
};

/**
 * mount 时把一个 Animated.Value 从 from 动到 to；减弱动效时瞬时设为 to。
 * 返回值默认为 to（避免首帧闪），useEffect 内再 setValue(from) 并启动动画。
 * 返回的 Value 供组件映射到具体属性（scale/opacity/interpolate）。
 */
export function useMountEntrance(opts: EntranceOpts): Animated.Value {
  const reduce = useReduceMotion();
  const val = useRef(new Animated.Value(opts.to)).current;
  useEffect(() => {
    if (reduce) { val.setValue(opts.to); return; }
    val.setValue(opts.from);
    const anim = opts.kind === 'spring'
      ? Animated.spring(val, { toValue: opts.to, useNativeDriver: true, ...opts.spring })
      : Animated.timing(val, { toValue: opts.to, useNativeDriver: true, ...opts.timing });
    anim.start();
    return () => anim.stop();
  }, [reduce]);
  return val;
}
```

- [ ] **Step 2: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 3: 提交**

```bash
git add src/components/decoration/useEntrance.ts
git commit -m "feat(decoration): 新增 useEntrance 动效工具(reduced-motion+mount入场)"
```

---

## Task 2: 4 个装饰组件接入入场动效

**Files:** Modify WashiTape / StickerBadge / DoodleDivider / ThemedScreen（4 文件）

对每个文件用**完整新内容替换**（避免定位歧义）。先 `Read` 每个文件确认当前内容与下方"新内容"除动效部分外一致。

### 2.1 WashiTape.tsx（完整新内容）
```tsx
import React from 'react';
import { StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { useMountEntrance } from './useEntrance';

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
  const scaleX = useMountEntrance({ from: 0, to: 1, kind: 'spring', spring: { tension: 70, friction: 8 } });

  if (!deco) return null;

  const color = deco.accentPalette[paletteIndex % deco.accentPalette.length];
  const d = `M0,4 Q${width * 0.25},1 ${width * 0.5},4 T${width},4 L${width},${height - 4} Q${width * 0.75},${height - 1} ${width * 0.5},${height - 4} T0,${height - 4} Z`;

  return (
    <Animated.View
      style={[{ width, height, transform: [{ rotate: `${rotation}deg` }, { scaleX }] }, style]}
      pointerEvents="none"
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={d} fill={color} fillOpacity={0.5} />
      </Svg>
    </Animated.View>
  );
}
```

### 2.2 StickerBadge.tsx（完整新内容）
```tsx
import React, { ReactNode } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useMountEntrance } from './useEntrance';

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
  const scale = useMountEntrance({ from: 0.5, to: 1, kind: 'spring', spring: { tension: 80, friction: 5 } });

  if (!deco) return <>{children}</>;

  const color = deco.accentPalette[paletteIndex % deco.accentPalette.length];

  return (
    <Animated.View
      style={[
        {
          backgroundColor: color,
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
```

### 2.3 DoodleDivider.tsx（完整新内容）
```tsx
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
```
（注意：`View` 仍在 react-native import 中保留——非手账早返回分支用到 `<View>`。）

### 2.4 ThemedScreen.tsx（完整新内容）
```tsx
import React, { ReactNode } from 'react';
import { View, Animated, ViewStyle, StyleProp } from 'react-native';
import { PaperBackground } from './PaperBackground';
import { useTheme } from '../../hooks/useTheme';
import { useMountEntrance } from './useEntrance';

interface ThemedScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ThemedScreen({ children, style }: ThemedScreenProps) {
  const { theme } = useTheme();
  const deco = theme.decoration;
  const t = useMountEntrance({ from: 0, to: 1, kind: 'timing', timing: { duration: 380 } });

  return (
    <View style={[{ flex: 1 }, style]}>
      <PaperBackground />
      {deco ? (
        <Animated.View
          style={{
            flex: 1,
            opacity: t,
            transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          {children}
        </Animated.View>
      ) : (
        children
      )}
    </View>
  );
}
```

- [ ] **Step 5: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。常见坑：DoodleDivider 的 react-native import 漏了 `View`（非手账分支要用）；transform 数组里静态 rotate 与动画 scale/scaleX 混用（RN 支持，但确保 `Animated.View`）。

- [ ] **Step 6: 手动验证**

启动 app → 切「手账少女」：
- 胶带从 0 宽展开铺开
- 贴纸徽章（个人中心选中主题卡的对勾）从小弹回贴上
- 手绘分隔淡入上浮
- 切 tab（主页/衣橱/搭配/日历）时子内容上浮淡入（翻页轻量）
然后开系统"减弱动效"（iOS: 设置-辅助功能-动态效果；Android: 开发者选项），重进或切主题：
- 以上动效全部瞬时出现、无运动
切回 4 旧主题：无任何动效（与 Phase 3 一致）。

- [ ] **Step 7: 提交**

```bash
git add src/components/decoration/WashiTape.tsx src/components/decoration/StickerBadge.tsx src/components/decoration/DoodleDivider.tsx src/components/decoration/ThemedScreen.tsx
git commit -m "feat(decoration): 装饰组件接入入场动效(展开/贴上/淡入/翻页)+reduced-motion"
```

---

## Task 3: 回归与最终验证

**Files:** 无（纯验证）

- [ ] **Step 1: 动效回归**

切手账少女，确认 4 类动效（胶带展开/贴纸贴上/分隔淡入/翻页淡入）均播放；开减弱动效后均瞬时。

- [ ] **Step 2: 向後兼容回归**

切 4 旧主题逐 tab 检查：与 Phase 3 完成时一致（无动效、装饰行为不变）。Phase 1/2/3 功能正常。

- [ ] **Step 3: 最终编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 4: 推送**

```bash
git push
```

---

## 完成标准（DoD）

- [ ] `useEntrance.ts` 导出 `useReduceMotion` + `useMountEntrance`
- [ ] 4 组件接入入场动效；`useMountEntrance` 均在早返回之前调用
- [ ] 减弱动效下全部瞬时
- [ ] 手账少女见动效；4 旧主题逐像素不变；Phase 1–3 正常
- [ ] `npx tsc --noEmit` 退出码 0

## 永久排除（不在任何 phase）

真 3D 翻页过渡（需改导航层，ROI 低）、手写逐笔显现（中文逐字极脆）。其余重型美术/打磨属 Phase 5。
