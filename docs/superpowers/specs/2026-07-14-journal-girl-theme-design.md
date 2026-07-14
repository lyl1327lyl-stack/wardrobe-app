# 《手账少女》(Journal Girl) 主题 — 设计规格

> **范围声明：** 本 spec 只实现整体愿景的 **Phase 1（地基 + 色彩 + 字体基建）**。`Theme` 接口按全部阶段设计（一次性定义装饰字段），后续阶段只填值、不改结构。Phase 2–5（纸纹/胶带/贴纸组件、五屏应用、动效层、美术资产打磨）各自独立 spec。

**目标：** 把《手账少女》作为第 5 个主题接入现有主题系统，让用户可在个人中心切换；配色生效；霞鹜文楷打包加载并在标题处可见；现有 4 个主题零改动。

**架构：** 在 `Theme` 接口上追加两个可选字段（`decoration?`、`fonts?`），向後兼容。手账少女主题填值，其余 4 个主题不填即渲染如初。字体通过 `expo-font` 预加载。

**技术栈：** React Native 0.81 / Expo SDK 54 / TypeScript / Zustand / AsyncStorage / expo-font / expo-linear-gradient

---

## 1. 背景与决策

### 1.1 现有主题系统能力边界
- `Theme` = 纯色彩令牌（20 个颜色）+ `spacing` + `borderRadius` + `shadows`
- `ThemeId = 'wood' | 'spring' | 'summer' | 'winter'`，存于 AsyncStorage 单字符串
- 通过 `ThemeProvider` 动态切换，57 个文件经 `useTheme()` 消费
- **无字体系统**（全系统字体）、**无任何纹理/贴纸/涂鸦**、无 `ImageBackground`、无动画层

### 1.2 三项已确认决策
1. **深度：C 完整装饰系统**，分 5 阶段，本 spec = Phase 1。
2. **素材生产：程序化 + SVG 起步**（纸纹/网格用代码画，胶带/分隔/简单贴纸用 SVG，字体打包）。不被美术资源卡住。
3. **字体方向：霞鹜文楷（LXGW WenKai，文艺楷书）**，OFL 开源协议；仅用于标题/标签点缀，正文用系统体保证可读与高级感。

### 1.3 全 5 阶段路线（仅 Phase 1 在本 spec）
1. **地基 + 色彩**（本 spec）：接口扩展、第5主题配色、字体基建、切换器
2. **纸纹 + 装饰组件库**：`PaperBackground` / `WashiTape` / `StickerBadge` / `DoodleDivider` / `DecorationProvider`
3. **五屏应用**：主页（手账第一页）、衣橱（收藏贴纸册）、搭配（拼贴册）、日历（月度计划本）、个人中心（时尚档案）页面级装饰
4. **动效层**：翻页 / 贴纸贴上 / 胶带展开 / 手写出现（含 reduced-motion 降级）
5. **美术资产 + 打磨**：纸纹/胶带/贴纸 PNG 定稿、对比度与性能调优

---

## 2. Theme 接口扩展（按全阶段设计）

在 `src/utils/theme.ts` 的 `Theme` 接口追加两个可选字段。现有 `colors` / `spacing` / `borderRadius` / `shadows` 不变。

```ts
export interface Theme {
  id: ThemeId;
  name: string;
  colors: { /* 现有 20 个令牌不变 */ };
  spacing: { /* 不变 */ };
  borderRadius: { /* 不变 */ };
  shadows: { /* 不变 */ };

  // ── 新增（可选，全部主题可不填）──
  decoration?: {
    paper: 'none' | 'grid' | 'dots' | 'lined';
    paperLineColor: string;          // 网格/点/横线颜色
    washiTape: boolean;              // 是否启用胶带条装饰
    stickerStyle: boolean;           // 卡片是否走贴纸边框样式
    doodleStyle: boolean;            // 是否启用手绘涂鸦分隔/点缀
    accentPalette: string[];         // 装饰轮换色（薄荷/浅蓝/薰衣草/粉…）
  };
  fonts?: {
    heading: string;                 // 标题/标签手写体 family 名
    // body 不定义 = 系统体（保证正文可读）
  };
}
```

**为何可选字段而非联合类型/平行表：** 向後兼容、单一数据源、57 个消费方无需改动。消费方读 `theme.decoration?.paper` / `theme.fonts?.heading`，undefined 时 fallback 到现有行为（无纸纹、系统字体）。

**Phase 1 只在以下位置消费这两个字段：**
- `theme.fonts?.heading`：少量标题 Text（见 §6 可见性清单）。
- `theme.decoration`：Phase 1 **不消费**，仅由手账少女主题填值，供 Phase 2 组件读取。Phase 1 的 spec 不写任何 `PaperBackground` / `WashiTape` 组件。

---

## 3. 《手账少女》配色（journalTheme）

映射到现有 20 个色彩令牌。方向：暖纸白 + 米黄底 + 浅粉主色 + 薰衣草辅助，暖墨色文字，牛皮纸边框——可爱治愈但不幼龄，保留高级感。

| 令牌 | 色值 | 用途/说明 |
|---|---|---|
| background | `#FAF6EE` | 米黄纸白（暖象牙底） |
| card | `#FFFDF7` | 纸白，卡片浮起于底色 |
| primary | `#C27D8E` | 浅粉/玫瑰，主按钮底 |
| primaryLight | `#E6C6CE` | 粉调浅色（高亮/未选态） |
| primaryDark | `#A96677` | 深玫瑰（按压态、衬白字） |
| accent | `#A99CC9` | 薰衣草紫（次要高亮） |
| accentLight | `#CFC6E5` | 浅薰衣草 |
| secondary | `#F3EEF6` | 薰衣草白（区块底纹） |
| text | `#473F38` | 暖墨色（纸上钢笔感） |
| textSecondary | `#7B7068` | 暖灰副文本 |
| textTertiary | `#A89D92` | 浅暖灰占位/弱信息 |
| border | `#E6DCCF` | 牛皮纸边框 |
| borderLight | `#F1EAE0` | 浅纸边框 |
| success | `#6FAE8E` | 薄荷绿（贴合调色板） |
| warning | `#D9A441` | 暖琥珀 |
| danger | `#CF8A8A` | 柔玫红（比纯红不刺眼） |
| shadow | `#000000` | 标准 |
| white | `#FFFFFF` | 标准 |
| black | `#000000` | 标准 |

> 注：`primary` 用作按钮底配白字。`#C27D8E` 上 16px 粗体白字对比度满足大文本 AA；按钮文案均为粗体大号，符合现有各主题用法。

### 3.1 decoration 配置（Phase 1 仅填值，Phase 2 起消费）
```ts
decoration: {
  paper: 'grid',
  paperLineColor: 'rgba(169,156,201,0.16)',   // 极淡薰衣草网格
  washiTape: true,
  stickerStyle: true,
  doodleStyle: true,
  accentPalette: ['#9CCFB8', '#A8C8E8', '#B5A8D6', '#E8B4C0'], // 薄荷/浅蓝/薰衣草/粉
},
fonts: { heading: 'LXGWWenKai' },
```

---

## 4. 字体打包

- **来源：** LXGW WenKai（霞鹜文楷）Regular，SIL OFL 1.1 协议，可打包分发。GitHub: `lxgw/LxgwWenKai`，文件 `LxgwWenKai-Regular.ttf`。
- **存放：** `assets/fonts/LxgwWenKai-Regular.ttf`（约 5–8MB）。
- **加载：** `App.tsx` 顶部用 `expo-font` 的 `useFonts` 预加载：
  ```ts
  const [fontsLoaded] = useFonts({
    LXGWWenKai: require('./assets/fonts/LxgwWenKai-Regular.ttf'),
  });
  ```
  与现有 `isLoading`（主题加载）合并为统一首屏阻塞条件：`if (themeIsLoading || !fontsLoaded) return <SplashOrNull/>`。沿用现有首屏 loading 视觉，不新增 splash 资源。
- **注册名：** `LXGWWenKai`，与 `theme.fonts.heading` 一致。
- **应用：** 通过 `theme.fonts?.heading` 读取；undefined 时组件 fallback 到系统字体（不写死 family）。
- **降级：** 字体加载失败不阻塞 app——`useFonts` 失败时标题仍以系统体渲染，记录 warn。

---

## 5. 切换器接入

`src/screens/PersonalCenterScreen.tsx`：
- `ThemeId`（在 `theme.ts`）追加 `'journal'`：`export type ThemeId = 'wood' | 'spring' | 'summer' | 'winter' | 'journal';`
- `themes` map 追加 `journal: journalTheme`。
- `themeStorage.ts` 的合法 id 白名单数组追加 `'journal'`（`getStoredThemeId` 校验）。
- `PersonalCenterScreen` 的 `THEME_OPTIONS` 追加：
  ```ts
  { id: 'journal', label: '手账少女', icon: 'book-outline' },
  ```
- 切换器现有逻辑（卡片网格、选中徽标、`handleThemeChange`）零改动——它是数据驱动的。

---

## 6. Phase 1 可见性清单（让字体可被肉眼验证）

Phase 1 不做纸纹/胶带/贴纸（Phase 2+）。为保证霞鹜文楷"装上即能看到"，在以下标题组件读 `theme.fonts?.heading` 并应用（仅当存在时）：

- `HomeScreen` 顶部标题区
- `PersonalCenterScreen` 标题 + 各 section 标题
- `PersonalCenterScreen` 切换器里手账少女卡片的 label（用该主题自身字体预览）

> 全量标题应用（所有屏）属于 Phase 2/3 系统化工作，不在本 spec。本清单是"最小可见性证明"：切换到手账少女后，能看到暖纸配色 + 标题手写体生效，且切回其他主题立即恢复系统体。

---

## 7. 向後兼容与回归

- 现有 `wood` / `spring` / `summer` / `winter` 主题对象**不新增任何字段**（`decoration` / `fonts` 保持 undefined）。
- 消费方对新字段一律 `?.` 可选链读取，undefined → 现有行为。因此切到非手账主题时，UI 与今天逐像素一致。
- 回归点：切换四主题 → 外观无变化；切换到手账少女 → 配色变暖纸玫瑰薰衣草 + 指定标题手写体；切回 → 立即恢复。

---

## 8. 测试方法

本仓无组件测试框架，以手动验证 + TypeScript 编译为主：
1. `npx tsc --noEmit` 零错误。
2. 启动 app（Expo），个人中心 → 主题切换：
   - 手账少女卡片出现，label 以霞鹜文楷预览。
   - 选中后：全局底色变 `#FAF6EE`，卡片 `#FFFDF7`，主按钮 `#C27D8E`，§6 标题显手写体。
3. 切回暖阳原木/春日樱花/夏日海洋/冬日初雪：外观与改动前一致（重点确认无字体残留、无配色泄漏）。
4. 杀进程重进：手账少女选择持久化（AsyncStorage），字体重新加载，首屏不闪烁。

---

## 9. 不在本 spec 的内容（Phase 2–5）

明确排除，避免范围蔓延：
- 任何 `PaperBackground` / `WashiTape` / `StickerBadge` / `DoodleDivider` / `DecorationProvider` 组件（Phase 2）
- 各屏（主页/衣橱/搭配/日历/个人中心）的装饰化重排（Phase 3）
- 翻页/贴纸贴上/胶带展开/手写出现动画（Phase 4）
- 图片纹理 PNG、贴纸美术资源、性能/对比度打磨（Phase 5）
- 全量标题手写体应用（Phase 2/3）

`Theme.decoration` 字段在 Phase 1 由手账少女填值但**暂不被任何组件读取**——这是有意为之：先把数据模型与配色字体地基打牢，Phase 2 组件直接消费，无需再改 `theme.ts`。
