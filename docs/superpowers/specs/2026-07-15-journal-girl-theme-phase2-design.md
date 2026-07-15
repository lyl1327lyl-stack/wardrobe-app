# 《手账少女》主题 Phase 2 — 设计规格（纸纹 + 装饰组件库）

> **范围声明：** 本 spec 实现 Phase 2 = **装饰组件库 + 个人中心页接入验证**。复用 Phase 1 已就位的 `Theme.decoration` 字段。全量铺到其他 4 个 tab 属 Phase 3；动效属 Phase 4；图片资产属 Phase 5。

**目标：** 建一套主题感知的装饰组件（纸纹背景、胶带、贴纸徽章、手绘分隔、屏幕包裹器），全部 SVG 实现；切到手账少女时个人中心页可见纸纹/胶带/手绘分隔；其余 4 主题逐像素不变。

**架构：** 每个装饰组件自己 `useTheme()` 读 `theme.decoration`，无 decoration 时渲染为 `null` 或降级为普通元素——无需 Provider（YAGNI）。纸纹/胶带/涂鸦用 `react-native-svg` 绘制。新增屏幕包裹器 `ThemedScreen` 作为 Phase 3 的统一接入点。

**技术栈：** React Native 0.81 / Expo SDK 54 / TypeScript / **react-native-svg（新增依赖）** / `Theme.decoration`（Phase 1）

**测试方法：** 本仓无单测框架。验证 = `npx tsc --noEmit` 编译门 + 手动可视验证（装饰是纯视觉特性）。

---

## 1. 依赖：安装 react-native-svg

- Run: `npx expo install react-native-svg`
- 用途：纸纹 `<Pattern>`、胶带/涂鸦的 SVG 形状与路径。Expo 生态标准库，Phase 1 的"程序化+SVG"已背书。
- 验证：`node -e "console.log(require('./node_modules/react-native-svg/package.json').version)"` 打印版本号。

---

## 2. 装饰组件库（`src/components/decoration/`）

所有组件统一契约：内部 `const { theme } = useTheme()`；当 `!theme.decoration` 时按"降级行为"列渲染（保证非手账主题零变化）。`accentPalette` 等取自 `theme.decoration`。

### 2.1 `PaperBackground.tsx`
- 职责：绝对定位铺满父容器的纸纹背景，`pointerEvents="none"`。
- 行为：读 `theme.decoration`；`paper==='none'` 或无 decoration → 返回 `null`。否则用 `react-native-svg` 的 `<Pattern>` 平铺：
  - `'grid'`：横竖细线网格，线色 `paperLineColor`，间距 20px。
  - `'dots'`：点阵，半径 1，间距 20px。
  - `'lined'`：仅横线，间距 28px（横线笔记本）。
- 实现：`<Svg>` 绝对铺满（`StyleSheet.absoluteFill`）内含 `<Defs><Pattern .../></Defs>` 与一个铺满的 `<Rect fill="url(#paper)"/>`。尺寸用 `onLayout` 取容器宽高（避免写死）。
- Props：无（全从 theme 读）。

### 2.2 `WashiTape.tsx`
- 职责：装饰性胶带条（半透明、带软撕边）。
- 行为：无 decoration → 返回 `null`。否则渲染一个半透明圆角条，颜色取 `accentPalette[paletteIndex % accentPalette.length]` + 约 0.5 alpha，两端用 SVG 路径画轻微不规则撕边，整体可旋转。
- Props：
  ```ts
  interface WashiTapeProps {
    paletteIndex?: number;        // 默认 0，选 accentPalette 的颜色
    width?: number;               // 默认 64
    height?: number;              // 默认 20
    rotation?: number;            // 度，默认 -8
    style?: StyleProp<TextStyle>; // 外层定位（absolute 等）
  }
  ```
- `pointerEvents="none"`。

### 2.3 `StickerBadge.tsx`
- 职责：把子元素包成"贴纸徽章"——圆角、柔阴影、轻微旋转。
- 行为：无 decoration → 直接返回 `<>{children}</>`（保留子元素，不加样式）。否则套一层带阴影 + 微旋转（约 -3°）的圆角容器，背景取 `accentPalette[paletteIndex]`。
- Props：
  ```ts
  interface StickerBadgeProps {
    children: ReactNode;
    paletteIndex?: number;        // 默认 1
    rotate?: number;              // 度，默认 -3
    style?: StyleProp<ViewStyle>;
  }
  ```

### 2.4 `DoodleDivider.tsx`
- 职责：手绘风分隔线（SVG 波浪/虚线）+ 可选小涂鸦（星/心/叶）。
- 行为：无 decoration → 渲染普通 `theme.colors.border` 的 1px hairline（`<View style={{height:1, backgroundColor}}>`），与现有分隔一致。否则渲染 SVG 手绘线 + 居中小涂鸦。
- Props：
  ```ts
  interface DoodleDividerProps {
    variant?: 'wave' | 'dash';    // 默认 'wave'
    doodle?: 'none' | 'star' | 'heart' | 'leaf';  // 默认 'star'
    style?: StyleProp<ViewStyle>;
  }
  ```

### 2.5 `ThemedScreen.tsx`
- 职责：屏幕根包裹器 = `<PaperBackground>`（装饰）+ 容器 `<View>`（flex、安全区由调用方处理、转发 style）。替代 `<View style={styles.container}>`。
- 行为：始终渲染容器；`PaperBackground` 子组件自身负责"非手账返回 null"。所以非手账主题下 `ThemedScreen` 渲染为一个普通 `<View>`，与今天的 `<View style={styles.container}>` 等价。
- Props：
  ```ts
  interface ThemedScreenProps {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;   // 通常是 styles.container
  }
  ```
- 结构：
  ```tsx
  <View style={[{ flex: 1 }, style]}>
    <PaperBackground />
    {children}
  </View>
  ```

### 组件职责边界小结
每个组件单一职责、可独立理解与测试：`PaperBackground` 只管铺底纹；`WashiTape` 只管画一条胶带；`StickerBadge` 只管给子元素加贴纸外观；`DoodleDivider` 只管画分隔；`ThemedScreen` 只管把底纹和容器组合。互不依赖（除 `ThemedScreen` 内嵌 `PaperBackground`）。

---

## 3. 个人中心页接入（可见性验证）

`src/screens/PersonalCenterScreen.tsx`：

1. **根容器换为 `ThemedScreen`**：把 `<View style={styles.container}>` 改为 `<ThemedScreen style={styles.container}>`（闭合标签相应改）。`styles.container` 内容不变（`flex:1, backgroundColor`）。`PaperBackground` 绝对铺底，ScrollView 内容浮于其上，卡片间隙露出纸纹。
2. **主题切换区加 `WashiTape`**：在"主题切换" section 卡片右上角放一条 `<WashiTape paletteIndex={2} />`（绝对定位）。
3. **菜单大段之间加 `DoodleDivider`**：在"主题切换"区与第一个 `MENU_ITEMS` 区之间、以及危险操作区之前插入 `<DoodleDivider doodle="star" />`（间距通过外层 margin 控制）。
4. **选中主题卡片加贴纸点缀**（可选，控量）：当前选中主题卡片右上的 `checkBadge` 用 `StickerBadge` 包裹，强化"贴上去"感。

强度准则：纸纹极淡（`paperLineColor` alpha 已 0.16）、胶带仅 1–2 条、分隔细线——不遮挡菜单文字，保证"信息层级清晰，不影响数据查看"。

---

## 4. 向後兼容与回归

- 4 个旧主题无 `decoration` 字段 → 所有装饰组件降级渲染：`PaperBackground`/`WashiTape` 为 `null`，`StickerBadge` 透传子元素，`DoodleDivider` 为普通 hairline，`ThemedScreen` 为普通 `<View>`。
- 因此切到非手账主题时，个人中心页与改动前逐像素一致（重点：无纸纹残留、无胶带、无贴纸）。
- 回归点：切手账少女 → 见纸纹+胶带+手绘分隔；切回任一旧主题 → 恢复原样。

---

## 5. 不在 Phase 2（→ Phase 3+）

- 将 `ThemedScreen`/装饰应用到主页/衣橱/搭配/日历 4 个 tab（Phase 3）
- 翻页/贴纸贴上/胶带展开/手写出现动画（Phase 4，届时安装 `react-native-reanimated`）
- 图片纹理 PNG、贴纸美术资源、性能/对比度打磨（Phase 5）
- 装饰组件的更多变体（如更多 doodle 图形、更多 washi 花色）——按需在后续加，YAGNI

---

## 6. 完成标准（DoD）

- [ ] `react-native-svg` 已安装，版本可查
- [ ] `src/components/decoration/` 下 5 个组件齐备，各自契约如上
- [ ] 个人中心页：根用 `ThemedScreen`、主题切换区有 `WashiTape`、段间有 `DoodleDivider`、选中卡有 `StickerBadge`
- [ ] 切手账少女见纸纹/胶带/手绘分隔；切回 4 旧主题逐像素不变
- [ ] `npx tsc --noEmit` 退出码 0
