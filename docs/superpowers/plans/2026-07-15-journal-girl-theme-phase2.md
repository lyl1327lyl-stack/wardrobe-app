# 《手账少女》主题 Phase 2 — 实现计划（纸纹 + 装饰组件库）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建一套主题感知装饰组件（PaperBackground/WashiTape/StickerBadge/DoodleDivider/ThemedScreen，SVG 实现），并在个人中心页接入验证；其余 4 主题逐像素不变。

**Architecture:** 每个组件自己 `useTheme()` 读 Phase 1 的 `theme.decoration`，无 decoration 时降级渲染（null 或普通元素）。纸纹/胶带/涂鸦用 `react-native-svg` 绘制。`ThemedScreen` 包裹器内嵌 `PaperBackground`，作为 Phase 3 的统一接入点。

**Tech Stack:** React Native 0.81 / Expo SDK 54 / TypeScript / **react-native-svg（新装）** / `Theme.decoration`（Phase 1 已就位）

**测试方法（适配）：** 本仓无单测框架。验证 = `npx tsc --noEmit` 编译门 + 手动可视验证。无 "写失败测试" 步骤。

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `package.json` (+lock) | 修改 | 新增 `react-native-svg` 依赖 |
| `src/components/decoration/PaperBackground.tsx` | 新建 | 绝对铺满的纸纹背景（grid/dots/lined） |
| `src/components/decoration/WashiTape.tsx` | 新建 | 半透明胶带条（撕边、可旋转） |
| `src/components/decoration/StickerBadge.tsx` | 新建 | 贴纸徽章包裹器（阴影+微旋转） |
| `src/components/decoration/DoodleDivider.tsx` | 新建 | 手绘分隔线 + 小涂鸦 |
| `src/components/decoration/ThemedScreen.tsx` | 新建 | 屏幕包裹器 = PaperBackground + 容器 View |
| `src/screens/PersonalCenterScreen.tsx` | 修改 | 根换 ThemedScreen + 加胶带/分隔/贴纸 |

每个装饰组件单一职责、互不依赖（除 ThemedScreen 内嵌 PaperBackground）。组件放 `src/components/decoration/` 子目录，与现有 `src/components/` 平级收拢。

---

## Task 1: 安装 react-native-svg

**Files:** `package.json`（+ lockfile，由 expo 自动改）

- [ ] **Step 1: 安装**

Run:
```bash
npx expo install react-native-svg
```
Expected: 安装成功，`package.json` 出现 `"react-native-svg"` 依赖。

- [ ] **Step 2: 验证版本**

Run:
```bash
node -e "console.log(require('./node_modules/react-native-svg/package.json').version)"
```
Expected: 打印版本号（如 `15.x.x`）。

- [ ] **Step 3: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 4: 提交**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): 安装 react-native-svg 用于手账装饰组件"
```
（若 lockfile 名不同，按实际 `git add`。）

---

## Task 2: PaperBackground 组件

**Files:** Create `src/components/decoration/PaperBackground.tsx`

- [ ] **Step 1: 创建组件**

写入完整内容：
```tsx
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
```
说明：用 `onLayout` 取容器宽高后再画 `<Rect fill="url(#pcPaper)">` 平铺图案；非手账主题直接 `return null`，不挂任何节点。

- [ ] **Step 2: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 3: 提交**

```bash
git add src/components/decoration/PaperBackground.tsx
git commit -m "feat(decoration): 新增 PaperBackground 纸纹背景组件"
```

---

## Task 3: WashiTape 组件

**Files:** Create `src/components/decoration/WashiTape.tsx`

- [ ] **Step 1: 创建组件**

写入完整内容：
```tsx
import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

interface WashiTapeProps {
  paletteIndex?: number;   // 取 accentPalette 的颜色，默认 0
  width?: number;          // 默认 64
  height?: number;         // 默认 20
  rotation?: number;       // 度，默认 -8
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

  // 非手账主题 → 不渲染
  if (!deco) return null;

  const color = deco.accentPalette[paletteIndex % deco.accentPalette.length];
  // 上下两条轻微波浪的撕边路径
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
```

- [ ] **Step 2: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 3: 提交**

```bash
git add src/components/decoration/WashiTape.tsx
git commit -m "feat(decoration): 新增 WashiTape 胶带组件"
```

---

## Task 4: StickerBadge 组件

**Files:** Create `src/components/decoration/StickerBadge.tsx`

- [ ] **Step 1: 创建组件**

写入完整内容：
```tsx
import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface StickerBadgeProps {
  children: ReactNode;
  paletteIndex?: number;   // 默认 1
  rotate?: number;         // 度，默认 -3
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

  // 非手账主题 → 透传子元素，不加样式
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
```

- [ ] **Step 2: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 3: 提交**

```bash
git add src/components/decoration/StickerBadge.tsx
git commit -m "feat(decoration): 新增 StickerBadge 贴纸徽章组件"
```

---

## Task 5: DoodleDivider 组件

**Files:** Create `src/components/decoration/DoodleDivider.tsx`

- [ ] **Step 1: 创建组件**

写入完整内容：
```tsx
import React, { useState } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

interface DoodleDividerProps {
  variant?: 'wave' | 'dash';                                   // 默认 'wave'
  doodle?: 'none' | 'star' | 'heart' | 'leaf';                 // 默认 'star'
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

  // 非手账主题 → 普通 hairline
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
    <View
      style={[{ height: DOODLE_W }, style]}
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
    </View>
  );
}
```

- [ ] **Step 2: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 3: 提交**

```bash
git add src/components/decoration/DoodleDivider.tsx
git commit -m "feat(decoration): 新增 DoodleDivider 手绘分隔组件"
```

---

## Task 6: ThemedScreen 组件

**Files:** Create `src/components/decoration/ThemedScreen.tsx`

- [ ] **Step 1: 创建组件**

写入完整内容：
```tsx
import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { PaperBackground } from './PaperBackground';

interface ThemedScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;   // 通常是 styles.container
}

export function ThemedScreen({ children, style }: ThemedScreenProps) {
  return (
    <View style={[{ flex: 1 }, style]}>
      <PaperBackground />
      {children}
    </View>
  );
}
```
说明：始终渲染容器；`PaperBackground` 自身负责非手账主题返回 null，所以非手账下本组件等价于普通 `<View style={style}>`。

- [ ] **Step 2: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 3: 提交**

```bash
git add src/components/decoration/ThemedScreen.tsx
git commit -m "feat(decoration): 新增 ThemedScreen 屏幕包裹器"
```

---

## Task 7: PersonalCenterScreen 接入验证

**Files:** Modify `src/screens/PersonalCenterScreen.tsx`

按"内容锚点"定位（行号可能因前序任务微移）。先在文件顶部加 import：
```tsx
import { ThemedScreen } from '../components/decoration/ThemedScreen';
import { WashiTape } from '../components/decoration/WashiTape';
import { StickerBadge } from '../components/decoration/StickerBadge';
import { DoodleDivider } from '../components/decoration/DoodleDivider';
```

- [ ] **Step 1: 根容器换为 ThemedScreen**

把开头：
```tsx
    <View style={styles.container}>
```
改为：
```tsx
    <ThemedScreen style={styles.container}>
```
把末尾对应的闭合（`</ScrollView>` 之后那一个 `</View>`，整个 return 的最外层闭合）：
```tsx
      </ScrollView>
    </View>
  );
```
改为：
```tsx
      </ScrollView>
    </ThemedScreen>
  );
```

- [ ] **Step 2: 主题切换区加 WashiTape**

找到"主题切换"所在的 section（含 `<Text ...>主题切换</Text>` 与 `<View style={styles.themeGrid}>`）。在该 `<View style={[styles.section, { marginTop: 12 }]}>` 内部、`themeGrid` 之前插入一条胶带：
```tsx
        <View style={[styles.section, { marginTop: 12 }]}>
          <WashiTape
            paletteIndex={2}
            style={{ position: 'absolute', top: -6, right: 12 }}
          />
          <Text
            style={[
              styles.sectionTitle,
              theme.fonts?.heading
                ? { fontFamily: theme.fonts.heading, fontWeight: '400' }
                : null,
            ]}
          >
            主题切换
          </Text>
          <View style={styles.themeGrid}>
```
（保留原有 sectionTitle 与 themeGrid 的全部内容不变；仅插入 `<WashiTape .../>` 一行。）

- [ ] **Step 3: 主题区与菜单区之间加 DoodleDivider**

在该 section 闭合 `</View>`（themeGrid 与"Menu Sections"之间）之后插入：
```tsx
        </View>

        <DoodleDivider doodle="star" style={{ marginVertical: 4 }} />

        {/* Menu Sections */}
        {MENU_ITEMS.map((section) => (
```

- [ ] **Step 4: 危险操作区之前加 DoodleDivider**

把 `MENU_ITEMS.map` 的返回从单层 `<View>` 改为 `<React.Fragment>`，并在 `section.title === '危险操作'` 时前置一条分隔：
```tsx
        {MENU_ITEMS.map((section) => (
          <React.Fragment key={section.title}>
            {section.title === '危险操作' && (
              <DoodleDivider doodle="heart" style={{ marginVertical: 4 }} />
            )}
            <View style={[styles.section, { marginTop: 12 }]}>
```
并把该 section 对应的闭合由：
```tsx
            ))}
          </View>
        ))}
```
改为：
```tsx
            ))}
          </View>
          </React.Fragment>
        ))}
```
（确保 `React` 已 import——文件顶部已有 `import React ...`，确认在。）

- [ ] **Step 5: 选中主题卡片用 StickerBadge 包裹对勾**

把样式 `checkBadge` 改为仅保留定位（去掉尺寸/圆角/居中，交给 StickerBadge）：
```tsx
    checkBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
    },
```
把渲染处：
```tsx
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                    </View>
                  )}
```
改为：
```tsx
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <StickerBadge paletteIndex={0} rotate={-6}>
                        <Ionicons name="checkmark" size={13} color={theme.colors.white} />
                      </StickerBadge>
                    </View>
                  )}
```

- [ ] **Step 6: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 7: 手动验证（关键）**

启动 app → 个人中心 → 选中「手账少女」。
Expected：
- 整页背景见极淡薰衣草网格（卡片间隙可见）。
- "主题切换"卡片右上角有一条旋转的胶带。
- "主题切换"区与下方菜单之间、危险操作区之前各有一条带小涂鸦（星/心）的手绘分隔。
- 选中的主题卡片右上对勾呈贴纸徽章（带阴影、微旋转）。
切回暖阳原木/春日/夏日/冬日：以上装饰全部消失，页面与改动前一致（重点：无纸纹、无胶带、无贴纸残留）。

- [ ] **Step 8: 提交**

```bash
git add src/screens/PersonalCenterScreen.tsx
git commit -m "feat(theme): 个人中心页接入手账装饰(纸纹/胶带/分隔/贴纸)"
```

---

## Task 8: 回归与最终验证

**Files:** 无（纯验证）

- [ ] **Step 1: 五主题回归**

启动 app → 个人中心，依次切换 暖阳原木 → 春日樱花 → 夏日海洋 → 冬日初雪 → 手账少女 → 回暖阳原木。
Expected: 前 4 主题外观与 Phase 1 完成时一致（无装饰、纸纹/胶带/贴纸均不出现）；手账少女显全套装饰。

- [ ] **Step 2: 字体仍在（Phase 1 回归）**

手账少女下标题仍显霞鹜文楷（Phase 1 功能未受影响）。
Expected: 标题手写体正常。

- [ ] **Step 3: 最终编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 4: 推送**

```bash
git push
```

---

## 完成标准（DoD）

- [ ] `react-native-svg` 已装
- [ ] `src/components/decoration/` 下 5 个组件齐备，契约如各 Task
- [ ] 个人中心页：ThemedScreen 根 + 主题区 WashiTape + 两处 DoodleDivider + 选中卡 StickerBadge
- [ ] 手账少女显全套装饰；其余 4 主题逐像素不变；Phase 1 字体仍正常
- [ ] `npx tsc --noEmit` 退出码 0

## 不在 Phase 2（→ Phase 3+）

装饰应用到主页/衣橱/搭配/日历（Phase 3）；翻页/贴纸/胶带/手写动画（Phase 4，届时装 reanimated）；图片纹理 PNG 与贴纸美术、性能/对比度打磨（Phase 5）。
