# 《手账少女》主题 Phase 5 — 实现计划（打磨：对比度 + 贴纸卡片）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 修对比度（对勾改玫瑰底）+ 衣橱/分类页网格卡片贴纸化（白边+加重投影，无旋转）；其余 4 主题逐像素不变。

**Architecture：** StickerBadge 加 `color` 覆盖 prop；两屏组件体内算一个 `stickerCard` 条件样式对象（`theme.decoration` 为真才有值，否则 null），并入网格卡片外层 style 数组。无新组件、无新依赖。

**Tech Stack：** React Native 0.81 / Expo SDK 54 / TypeScript / 现有 theme.decoration + StickerBadge

**测试方法（适配）：** 无单测框架。验证 = `npx tsc --noEmit` 编译门 + 手动可视验证。

---

## 文件结构

| 文件 | 动作 | 改动 |
|---|---|---|
| `src/components/decoration/StickerBadge.tsx` | 修改 | 加 `color?: string` 覆盖 prop |
| `src/screens/PersonalCenterScreen.tsx` | 修改 | 对勾 StickerBadge 用 `color={theme.colors.primary}` |
| `src/screens/WardrobeScreen.tsx` | 修改 | 网格卡片加贴纸样式（journal 主题） |
| `src/screens/CategoryDetailScreen.tsx` | 修改 | 网格卡片加贴纸样式（journal 主题） |

---

## Task 1: 对比度修复（StickerBadge color prop + 对勾玫瑰底）

**Files：** `src/components/decoration/StickerBadge.tsx`, `src/screens/PersonalCenterScreen.tsx`

### 1.1 StickerBadge 加 color 覆盖（用完整新内容替换）
`src/components/decoration/StickerBadge.tsx`：
```tsx
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
```
（仅新增 `color?: string` prop 与 `bg = color ?? ...`；其余动效逻辑不变。）

### 1.2 PersonalCenter 对勾用玫瑰底
`src/screens/PersonalCenterScreen.tsx`，把选中主题卡的：
```tsx
                      <StickerBadge paletteIndex={0} rotate={-6}>
```
改为：
```tsx
                      <StickerBadge color={theme.colors.primary} rotate={-6}>
```
（白对勾压玫瑰 `#C27D8E`，对比达标。）

- [ ] **Step 3: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 4: 手动验证**

选「手账少女」→ 个人中心 → 选中主题卡：对勾白底改玫瑰底、清晰可辨（不再压薄荷绿发虚）。

- [ ] **Step 5: 提交**

```bash
git add src/components/decoration/StickerBadge.tsx src/screens/PersonalCenterScreen.tsx
git commit -m "feat(theme): StickerBadge加color覆盖+对勾改玫瑰底修对比度"
```

---

## Task 2: 贴纸化网格卡片（衣橱 + 分类页）

**Files：** `src/screens/WardrobeScreen.tsx`, `src/screens/CategoryDetailScreen.tsx`

两屏都在组件体内（`const { theme } = useTheme();` 之后）加同一个条件样式对象，再并入网格卡片外层 style 数组。

### 2.1 定义 stickerCard 条件样式（两屏相同）

在组件体内（`useTheme()` 之后、return 之前）加：
```ts
  const stickerCard = theme.decoration
    ? {
        borderWidth: 3,
        borderColor: theme.colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
        elevation: 5,
      }
    : null;
```
（`theme.decoration` 为空 → null，卡片样式不变。两屏数值必须一致。）

### 2.2 WardrobeScreen 并入网格卡片

衣橱网格卡片是 `<TouchableOpacity style={[ styles.gridItemTransparentWrap, { width: gridItemSize, height: gridItemSize }, isSelecting && isSelected && styles.gridItemSelected ]} ...>`（在 `filteredClothing.map` 内）。把 `stickerCard` 追加进该 style 数组：
```tsx
                <TouchableOpacity
                  key={`grid-${itemId}-${isSelected}`}
                  style={[
                    styles.gridItemTransparentWrap,
                    { width: gridItemSize, height: gridItemSize },
                    isSelecting && isSelected && styles.gridItemSelected,
                    stickerCard,
                  ]}
                  onPress={...}
```
（仅在数组末尾追加 `, stickerCard`。）

### 2.3 CategoryDetailScreen 并入网格卡片

分类页网格卡片是 `renderItem` 内的 `<TouchableOpacity style={[ styles.card, index % COLUMN_COUNT !== 0 && styles.cardMargin, ... ]}>`。把 `stickerCard` 追加进该 style 数组（末尾）：
```tsx
      <TouchableOpacity
        style={[
          styles.card,
          index % COLUMN_COUNT !== 0 && styles.cardMargin,
          stickerCard,
        ]}
```
（追加 `, stickerCard`。注意保留数组里既有的其余条件项。）

- [ ] **Step 4: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 5: 手动验证**

选「手账少女」→ 衣橱 tab、分类详情页：网格卡片有白边+加重投影，呈"贴上去的照片贴纸"质感，无旋转、不错位。切回 4 旧主题：卡片无白边、复原。

- [ ] **Step 6: 提交**

```bash
git add src/screens/WardrobeScreen.tsx src/screens/CategoryDetailScreen.tsx
git commit -m "feat(theme): 衣橱/分类网格卡片贴纸化(journal白边+投影)"
```

---

## Task 3: 回归与最终验证

**Files：** 无（纯验证）

- [ ] **Step 1: 全量回归**

选「手账少女」逐屏检查：对勾玫瑰底清晰；衣橱/分类卡片贴纸感；Phase 1–4 配色/字体/纸纹/胶带/分隔/动效全在。切 4 旧主题逐屏：与 Phase 4 完成时一致（无白边、对勾不显、装饰复原）。

- [ ] **Step 2: 最终编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 3: 推送**

```bash
git push
```

---

## 完成标准（DoD）

- [ ] StickerBadge 支持 `color` 覆盖；对勾用玫瑰底
- [ ] WardrobeScreen + CategoryDetailScreen 网格卡片 journal 主题下白边+加重投影（无旋转）
- [ ] 切回 4 旧主题逐像素不变；Phase 1–4 正常
- [ ] `npx tsc --noEmit` 退出码 0

## 项目收尾

Phase 5 完成后，《手账少女》五阶段全部交付。唯一未做：需原创美术的贴纸/拼贴 PNG（我做不了）——若要补，需用户提供素材后单开美术接入 spec。
