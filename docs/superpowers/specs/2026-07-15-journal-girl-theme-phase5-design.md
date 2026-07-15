# 《手账少女》主题 Phase 5 — 设计规格（打磨）

> **范围声明：** 最终阶段，只做两项高确定性打磨：① 对比度修复（对勾改玫瑰底）② 衣橱/分类页网格卡片贴纸化。性能 pass 与真手绘美术 PNG 明确排除（前者未证实问题=过早优化，后者我无法手绘=需素材）。

**目标：** 修掉已知低对比（白对勾压薄荷绿）；让衣橱/分类页的衣物卡片在手账少女下呈现"贴上去的照片贴纸"质感，兑现"收藏贴纸册"人设。其余 4 主题逐像素不变。

**架构：** StickerBadge 加一个可选 `color` prop；两屏网格卡片外层加 journal-gated 条件 style（白边 + 加重投影）。无新组件、无新依赖。

**技术栈：** React Native 0.81 / Expo SDK 54 / TypeScript / 现有 theme.decoration + 装饰组件

**测试方法：** 无单测框架。验证 = `npx tsc --noEmit` 编译门 + 手动可视验证。

---

## 1. 对比度修复

### 1.1 StickerBadge 加 `color` 覆盖（`src/components/decoration/StickerBadge.tsx`）
现有取色逻辑：`const color = deco.accentPalette[paletteIndex % deco.accentPalette.length];`。加一个可选 `color?: string` prop，**提供时覆盖** accentPalette 取色：
```tsx
interface StickerBadgeProps {
  children: ReactNode;
  paletteIndex?: number;
  rotate?: number;
  color?: string;            // 新增：提供则覆盖 accentPalette 取色
  style?: StyleProp<ViewStyle>;
}

export function StickerBadge({
  children, paletteIndex = 1, rotate = -3, color, style,
}: StickerBadgeProps) {
  // ... useTheme / useMountEntrance / if (!deco) return <>{children}</>;
  const bg = color ?? deco.accentPalette[paletteIndex % deco.accentPalette.length];
  // 用 bg 作为 backgroundColor（替换原 color 变量）
}
```
（无 `color` 时行为与今天完全一致；`!deco` 仍透传 children。）

### 1.2 对勾用玫瑰底（`src/screens/PersonalCenterScreen.tsx`）
当前：`<StickerBadge paletteIndex={0} rotate={-6}>`（mint `#9CCFB8`，白对勾对比不足）。
改为：`<StickerBadge color={theme.colors.primary} rotate={-6}>`（玫瑰 `#C27D8E`，白对勾对比达标，仍是贴纸质感）。

### 1.3 其余对比（复查结论，无需改）
- 标题字 `#473F38` 压纸白 `#FAF6EE`：对比足，不改。
- 纸纹 `rgba(...,0.16)`：极淡，不影响正文，不改。
- 胶带 `fillOpacity:0.5`：装饰性，非承载文字，不改。

---

## 2. 贴纸化网格卡片

### 2.1 WardrobeScreen（`src/screens/WardrobeScreen.tsx`）
衣橱 4 列网格的内联卡片外层（包裹图片+信息的那个元素），journal 主题下加贴纸样式。定义一个样式常量供复用：
```ts
const STICKER_CARD = {
  borderWidth: 3,
  borderColor: theme.colors.white,
  shadowColor: '#000',
  shadowOffset: { width: 2, height: 4 },
  shadowOpacity: 0.16,
  shadowRadius: 10,
  elevation: 5,
};
```
在网格卡片外层 style 数组里条件合并：`[styles.<card>, !!theme.decoration && STICKER_CARD]`。**不加 rotation**（网格内旋转会错位/裁切）。

### 2.2 CategoryDetailScreen（`src/screens/CategoryDetailScreen.tsx`）
3 列网格卡片同样处理：journal 主题下加同一 `STICKER_CARD` 条件样式（白边 + 加重投影）。cost-per-wear 徽章照旧。

### 2.3 样式常量位置
为 DRY 与一致，将 `STICKER_CARD` 的值在两屏各自就地定义（两屏的 `theme` 作用域一致；不强行抽公共模块，避免过度抽象）。两处数值必须一致。

---

## 3. 向後兼容与回归

- `StickerBadge` 无 `color` 时行为不变（其他用法不受影响）。
- 非手账主题（无 `theme.decoration`）：网格卡片无白边、沿用原投影，逐像素不变；对勾在非手账主题下本就不走 StickerBadge 路径（`!deco` 透传）。
- 回归点：手账少女下衣橱/分类卡片呈贴纸质感、对勾玫瑰底清晰；切回 4 旧主题复原。

---

## 4. 明确排除

- **性能 pass**（memo、减少 onLayout 重渲染等）：未证实存在性能问题，过早优化，不做。
- **真手绘贴纸/搭配拼贴专属美术 PNG**：我无法手绘原创美术，需用户提供素材或外采，永久受此限。

---

## 5. 完成标准（DoD）

- [ ] `StickerBadge` 支持 `color` 覆盖；对勾用 `theme.colors.primary` 玫瑰底，白对勾清晰
- [ ] WardrobeScreen + CategoryDetailScreen 网格卡片在 journal 主题下有白边+加重投影（贴纸感），无旋转
- [ ] 切回 4 旧主题：卡片无白边、对勾/装饰行为与 Phase 4 一致
- [ ] `npx tsc --noEmit` 退出码 0

## 项目收尾说明

本 phase 完成后，《手账少女》主题 5 阶段全部交付（Phase 1 配色字体 / 2 装饰库 / 3 五屏应用 / 4 动效 / 5 打磨）。唯一未做的是需原创美术的贴纸/拼贴 PNG——若未来要补，需用户提供素材后单开一个美术接入 spec。
