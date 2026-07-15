# 《手账少女》主题 Phase 3 — 实现计划（五屏应用）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Phase 2 装饰库应用到主页/衣橱/搭配/日历四个 tab——纸纹铺底（ThemedScreen）+ 主页/日历的轻量人设点缀；其余 4 主题逐像素不变。

**Architecture:** 每个 tab 的最外层根 `<View style={styles.container}>` 换成 `<ThemedScreen style={styles.container}>`；HomeScreen 加 1 条胶带 + 2 处手绘分隔，WearCalendarScreen 加 1 处分隔，衣橱/搭配仅纸纹底。复用 Phase 2 组件，无新组件、无新依赖。

**Tech Stack:** React Native 0.81 / Expo SDK 54 / TypeScript / Phase 2 装饰库（`src/components/decoration/`）

**测试方法（适配）：** 无单测框架。验证 = `npx tsc --noEmit` 编译门 + 手动可视验证。

---

## 文件结构

| 文件 | 动作 | 改动 |
|---|---|---|
| `src/screens/HomeScreen.tsx` | 修改 | 根换 ThemedScreen + hero 胶带 + 2 处分隔 |
| `src/screens/WardrobeScreen.tsx` | 修改 | 根换 ThemedScreen（仅纸纹底） |
| `src/screens/outfit/GroupListScreen.tsx` | 修改 | 根换 ThemedScreen（仅纸纹底） |
| `src/screens/WearCalendarScreen.tsx` | 修改 | 根换 ThemedScreen + 1 处分隔 |

装饰风格与 Phase 2 的 PersonalCenter 完全一致（同一套 WashiTape/DoodleDivider）。

---

## Task 1: HomeScreen（手账第一页）

**Files:** Modify `src/screens/HomeScreen.tsx`

按内容锚点定位（行号会随编辑微移）。`theme` 已在组件作用域内（`useTheme()`），`React` 已 import。

- [ ] **Step 1: 加 import**

在组件 import 区加：
```tsx
import { ThemedScreen } from '../components/decoration/ThemedScreen';
import { WashiTape } from '../components/decoration/WashiTape';
import { DoodleDivider } from '../components/decoration/DoodleDivider';
```

- [ ] **Step 2: 根换 ThemedScreen（只换最外层！）**

找到 `return (` 之后缩进最浅的第一个根容器：
```tsx
  return (
    <View style={styles.container}>
```
改为：
```tsx
  return (
    <ThemedScreen style={styles.container}>
```
**关键陷阱：** HomeScreen 内部还有一个 `<ScrollView style={styles.container}>`（复用同名样式）——**绝对不要动它**。只替换 `return (` 之后、最外层那一个 `<View style={styles.container}>`。对应地，把整个 return 的最外层闭合 `</View>`（文件末尾 `);` 之前最后一个、与开标签配对的那个）改为 `</ThemedScreen>`。

- [ ] **Step 3: hero 卡片加 WashiTape（作为最后一个子元素，置于卡片内部右上角）**

"今日穿搭" hero 是 `<View style={styles.todayHero}>`。**注意：`styles.todayHero` 有 `overflow: 'hidden'`**（圆角卡片），所以胶带**必须放在卡片内部**（`top` 为正值），否则会被裁掉不可见。hero 第一个子元素是 `<LinearGradient .../>` 绝对填充背景；把 WashiTape 作为 hero 的**最后一个子元素**插入（在 hero 闭合 `</View>` 之前），这样它会绘制在渐变与内容之上，且位于卡片内右上角（标题在左上、天气在标题下方左侧，右上角留空，不遮挡文字）：
```tsx
          {todayItems.length === 0 && (
            <TouchableOpacity
              style={styles.todayHeroRecordBtn}
              onPress={() => navigation.navigate('RecordWear')}
              activeOpacity={0.7}
            >
              <Text style={styles.todayHeroRecordBtnText}>记录</Text>
            </TouchableOpacity>
          )}
          <WashiTape
            paletteIndex={1}
            style={{ position: 'absolute', top: 6, right: 14 }}
          />
        </View>
```
（仅在 `{todayItems.length === 0 && (...)}` 块之后、hero 的 `</View>` 之前，插入 `<WashiTape .../>` 一段。`top: 6` 是正值——置于卡片内，避开 overflow:hidden 裁剪。）

- [ ] **Step 4: 分隔 1（stats 卡片 ↔ hero 之间）**

stats 卡片之后、hero 注释之前插入（两段都是常驻的，不会悬空）：
```tsx
        </TouchableOpacity>

        <DoodleDivider doodle="star" style={{ marginVertical: 4 }} />

        {/* ── 今日穿搭 Hero（常驻：天气 + 今日 + 已记录单品）── */}
        <View style={styles.todayHero}>
```
（在 stats `</TouchableOpacity>` 与 `{/* ── 今日穿搭 Hero ... */}` 之间插入 `<DoodleDivider .../>`。）

- [ ] **Step 5: 分隔 2（hero ↔ 快捷入口之间）**

hero 闭合之后、快捷入口注释之前插入：
```tsx
        </View>

        <DoodleDivider doodle="leaf" style={{ marginVertical: 4 }} />

        {/* ── 快捷入口 ── */}
        <View style={styles.quickActions}>
```
（在 hero 的 `</View>` 与 `{/* ── 快捷入口 ── */}` 之间插入。）

- [ ] **Step 6: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。常见坑：误改了 ScrollView 的 `styles.container`（应只改最外层 View）；WashiTape/ThemedScreen 闭合标签不匹配。

- [ ] **Step 7: 手动验证**

启动 app → 主页 → 选「手账少女」。
Expected：背景见极淡网格；"今日穿搭" hero 右上角有一条胶带（叠在渐变之上、可见）；stats 与 hero 之间、hero 与快捷入口之间各有一条带小涂鸦的手绘分隔。切回任一旧主题：纸纹/胶带/分隔全部消失，页面复原。

- [ ] **Step 8: 提交**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat(theme): 主页接入手账装饰(纸纹/hero胶带/手绘分隔)"
```

---

## Task 2: WardrobeScreen + GroupListScreen（仅纸纹底）

**Files:** Modify `src/screens/WardrobeScreen.tsx`, `src/screens/outfit/GroupListScreen.tsx`

两屏都只做根换 ThemedScreen，不加额外装饰（数据密集屏不添乱）。

- [ ] **Step 1: WardrobeScreen 根换**

`src/screens/WardrobeScreen.tsx` 顶部加 import：
```tsx
import { ThemedScreen } from '../components/decoration/ThemedScreen';
```
把 `return (` 之后最外层根：
```tsx
    <View style={styles.container}>
```
改为：
```tsx
    <ThemedScreen style={styles.container}>
```
并把该 return 最外层配对的闭合 `</View>`（`);` 前最后一个）改为 `</ThemedScreen>`。

- [ ] **Step 2: GroupListScreen 根换**

`src/screens/outfit/GroupListScreen.tsx` 顶部加 import（注意路径多一级 `../`）：
```tsx
import { ThemedScreen } from '../../components/decoration/ThemedScreen';
```
把 `return (` 之后最外层根（注意它带内联 bg，**保留内联 bg**）：
```tsx
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
```
改为：
```tsx
    <ThemedScreen style={[styles.container, { backgroundColor: theme.colors.background }]}>
```
并把该 return 最外层配对的闭合 `</View>` 改为 `</ThemedScreen>`。

- [ ] **Step 3: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 4: 手动验证**

选「手账少女」→ 衣橱 tab、搭配 tab：背景均见极淡网格（卡片间隙可见），无其他装饰。切回旧主题：复原。

- [ ] **Step 5: 提交**

```bash
git add src/screens/WardrobeScreen.tsx src/screens/outfit/GroupListScreen.tsx
git commit -m "feat(theme): 衣橱/搭配 tab 铺手账纸纹底"
```

---

## Task 3: WearCalendarScreen（纸纹底 + 1 处分隔）

**Files:** Modify `src/screens/WearCalendarScreen.tsx`

- [ ] **Step 1: 加 import**

```tsx
import { ThemedScreen } from '../components/decoration/ThemedScreen';
import { DoodleDivider } from '../components/decoration/DoodleDivider';
```

- [ ] **Step 2: 根换 ThemedScreen**

`return (` 之后最外层根：
```tsx
    <View style={styles.container}>
```
改为：
```tsx
    <ThemedScreen style={styles.container}>
```
并把该 return 最外层配对的闭合 `</View>` 改为 `</ThemedScreen>`。

- [ ] **Step 3: 连续进度卡 ↔ 视图切换 之间加分隔**

`<StreakProgressCard .../>` 之后、视图切换注释之前插入（StreakProgressCard 常驻，不会悬空）：
```tsx
        <StreakProgressCard
          streakDays={streakDays}
          recorded={monthProgress.recorded}
          total={monthProgress.total}
        />

        <DoodleDivider doodle="star" style={{ marginVertical: 4 }} />

        {/* 月/年 视图切换 */}
        <View style={styles.viewToggleOuter}>
```
（在 `<StreakProgressCard .../>` 与 `{/* 月/年 视图切换 */}` 之间插入 `<DoodleDivider .../>`。）

- [ ] **Step 4: 编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 5: 手动验证**

选「手账少女」→ 日历 tab：背景见极淡网格（=月度计划本质感）；连续进度卡与视图切换之间一条带星的手绘分隔。切回旧主题：复原。

- [ ] **Step 6: 提交**

```bash
git add src/screens/WearCalendarScreen.tsx
git commit -m "feat(theme): 日历 tab 铺纸纹底+进度卡分隔"
```

---

## Task 4: 回归与最终验证

**Files:** 无（纯验证）

- [ ] **Step 1: 五 tab 全量回归**

逐 tab 切换到手账少女：主页（纸纹+hero胶带+2分隔）、衣橱（纸纹）、搭配（纸纹）、日历（纸纹+1分隔）、个人中心（Phase 2 全套）。
Expected：整个 app 呈统一手账纸纹质感，装饰语言一致。

- [ ] **Step 2: 向後兼容回归**

切回暖阳原木/春日/夏日/冬日，逐 tab 检查。
Expected：四个 tab 与 Phase 2 完成时一致——无纸纹、无胶带、无分隔残留（DoodleDivider 退化为 hairline 或在非 section 间位置正常）。Phase 1 标题手写体仍正常。

- [ ] **Step 3: 最终编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 4: 推送**

```bash
git push
```

---

## 完成标准（DoD）

- [ ] 四个 tab 根均换 ThemedScreen（HomeScreen 不误伤内部 ScrollView）
- [ ] HomeScreen：hero 胶带 + 2 处分隔（stats↔hero、hero↔快捷入口）
- [ ] WardrobeScreen / GroupListScreen：纸纹底，无额外装饰
- [ ] WearCalendarScreen：纸纹底 + 进度卡处 1 分隔
- [ ] 手账少女下五 tab 见统一手账质感；其余 4 主题逐像素不变；Phase 1/2 功能正常
- [ ] `npx tsc --noEmit` 退出码 0

## 不在 Phase 3（→ Phase 4/5）

翻页/贴纸/胶带/手写动画（Phase 4，装 reanimated）；贴纸阴影卡片、搭配画布拼贴专属美术、主页 Hero 全面手账化重排（Phase 5）。
