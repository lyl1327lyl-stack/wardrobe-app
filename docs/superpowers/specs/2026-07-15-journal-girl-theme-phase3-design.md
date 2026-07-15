# 《手账少女》主题 Phase 3 — 设计规格（五屏应用）

> **范围声明：** 本 spec 把 Phase 2 装饰库应用到主页/衣橱/搭配/日历四个 tab。**轻量点缀**——纸纹铺底（ThemedScreen）+ 每屏少量人设装饰，复用现有组件，不动卡片内部布局。重型重设（贴纸阴影卡片/拼贴专属美术）属 Phase 5；动效属 Phase 4。

**目标：** 四个 tab 全部呈现手账纸纹底，主页作为"手账第一页"加胶带+手绘分隔点缀；切到手账少女时整个 app 是一本统一的手账；其余 4 主题逐像素不变。

**架构：** 复用 Phase 2 的 `ThemedScreen`（= 纸纹背景 + 容器）与 `WashiTape`/`DoodleDivider`。每个 tab 的根 `<View style={styles.container}>` 换成 `<ThemedScreen style={styles.container}>`；在指定 section 加少量装饰。无新组件、无新依赖。

**技术栈：** React Native 0.81 / Expo SDK 54 / TypeScript / Phase 2 装饰库（`src/components/decoration/`）/ react-native-svg

**测试方法：** 无单测框架。验证 = `npx tsc --noEmit` 编译门 + 手动可视验证（逐屏切手账少女看装饰、切回看是否复原）。

---

## 1. 基础层：四个 tab 换 ThemedScreen（统一、机械）

四个 tab 屏的根均为 `<View style={styles.container}>`，统一替换为 `<ThemedScreen style={styles.container}>`（开标签 + 对应最外层闭标签）。`styles.container` 内容不变；`ThemedScreen` 转发该 style 到内层 View 并在其下渲染 `PaperBackground`。

| 屏 | 文件 | 根位置（约） |
|---|---|---|
| 主页 | `src/screens/HomeScreen.tsx` | `return (` 后第一个 `<View style={styles.container}>` |
| 衣橱 | `src/screens/WardrobeScreen.tsx` | `return (` 后第一个 `<View style={styles.container}>` |
| 搭配 | `src/screens/outfit/GroupListScreen.tsx` | `return (` 后 `<View style={[styles.container, { backgroundColor: theme.colors.background }]}>`（保留其内联 bg） |
| 日历 | `src/screens/WearCalendarScreen.tsx` | `return (` 后第一个 `<View style={styles.container}>` |

**重要（HomeScreen 陷阱）：** HomeScreen 内部还有一个 `<ScrollView style={styles.container}>` 复用了同名样式——**只替换最外层根 View，不动 ScrollView**。判定法：替换 `return (` 之后、缩进最浅的那一个 `<View style={styles.container}>` 及其匹配闭标签。

每个屏替换后，各加一行 import：
```tsx
import { ThemedScreen } from '../components/decoration/ThemedScreen';
```
（GroupListScreen 在 `src/screens/outfit/`，路径为 `../../components/decoration/ThemedScreen`。）

---

## 2. 每屏人设点缀（轻量）

装饰风格与 Phase 2 的 PersonalCenter 完全一致（同一套胶带/分隔组件），保证全 app 装饰语言统一。强度遵循"可爱不幼龄 + 不影响数据查看"：纸纹极淡，点缀克制。

### 2.1 HomeScreen（手账第一页）—— 最丰富
作为手账第一页，在纸纹底之上加：
- **WashiTape**：贴在"今日穿搭" hero 卡片右上角（`style={{ position:'absolute', top:-6, right:12 }}`，`paletteIndex={1}`）。
- **DoodleDivider ×2**：插在主要 section 之间——AI 推荐区之前一条（`doodle="star"`）、最近搭配区之前一条（`doodle="leaf"`），`style={{ marginVertical: 4 }}`。
- import：`WashiTape`、`DoodleDivider`。

### 2.2 WardrobeScreen（收藏贴纸册）—— 仅纸纹底
4 列衣物网格坐落在大网格纸上，天然就是"收藏贴纸册"观感。**不加额外装饰**，避免在密集数据屏上添乱（遵守"不影响数据查看"）。

### 2.3 GroupListScreen / 搭配（拼贴册）—— 仅纸纹底
搭配列表屏仅铺纸纹底即可（真正的拼贴发生在画布编辑器，本屏只需纸感）。**不加额外装饰**。

### 2.4 WearCalendarScreen / 日历（月度计划本）—— 纸纹底 + 1 处分隔
- **DoodleDivider ×1**：插在"连续穿搭进度卡"与月历之间（`doodle="star"`，`style={{ marginVertical: 4 }}`）。日历坐落在大网格纸上=月度计划本。
- import：`DoodleDivider`。

---

## 3. 向後兼容与回归

- 四个旧主题无 `decoration` → `ThemedScreen` 退化为普通 `<View style={...}>`（等价于原 `<View style={styles.container}>`），`PaperBackground`/`WashiTape` 返回 null，`DoodleDivider` 退化为普通 hairline。
- 因此切到非手账主题时，四个 tab 与改动前逐像素一致。
- 回归点：逐 tab 切手账少女见纸纹（+ 主页胶带/分隔、日历分隔）；切回任一旧主题恢复原样。
- 与 Phase 2 一致：装饰组件只在有 `theme.decoration` 时生效，散落安全。

---

## 4. 不在 Phase 3（→ Phase 4/5）

- 翻页/贴纸贴上/胶带展开/手写出现动画（Phase 4，届时装 `react-native-reanimated`）
- 重型每屏重设：贴纸阴影衣物卡片、搭配画布拼贴专属美术、主页 Hero 全面手账化重排（Phase 5）
- 更多装饰变体（更多 doodle/花色）按需后加（YAGNI）

---

## 5. 完成标准（DoD）

- [ ] 四个 tab 屏根均换为 `ThemedScreen`（仅最外层根，HomeScreen 不误伤 ScrollView）
- [ ] HomeScreen：hero 胶带 + 2 处手绘分隔
- [ ] WardrobeScreen / GroupListScreen：纸纹底，无额外装饰
- [ ] WearCalendarScreen：纸纹底 + 1 处手绘分隔
- [ ] 切手账少女：四 tab 见纸纹，主页/日历有点缀；切回 4 旧主题逐像素不变
- [ ] `npx tsc --noEmit` 退出码 0
