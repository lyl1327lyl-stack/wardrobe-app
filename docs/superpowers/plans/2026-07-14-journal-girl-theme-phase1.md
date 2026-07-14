# 《手账少女》主题 Phase 1 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把《手账少女》作为第 5 个主题接入现有主题系统，可切换、配色生效、霞鹜文楷（子集化 ~3.6MB）在标题处可见，现有 4 主题零改动。

**Architecture:** 在 `Theme` 接口追加两个可选字段（`decoration?`、`fonts?`），向後兼容；新增 `journalTheme` 填值；字体经 `expo-font` 预加载，标题组件用条件内联 `fontFamily` 应用。Phase 1 不消费 `decoration`（仅供 Phase 2 组件读取）。

**Tech Stack:** React Native 0.81 / Expo SDK 54 / TypeScript / expo-font / pyftsubset (fonttools) 用于字体子集化

**测试方法（重要适配）：** 本仓**无组件单测框架**。本计划不引入测试框架（YAGNI）。每个任务的验证 = `npx tsc --noEmit` 编译门 + 明确的手动可视验证步骤（主题是纯视觉特性，本来就只能眼看）。无 "写失败测试" 步骤——以 tsc 与手测替代。

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `assets/fonts/LXGWWenKai-Regular.ttf` | 新建（二进制资产） | 子集化霞鹜文楷，标题手写体 |
| `src/utils/theme.ts` | 修改 | 扩展 `Theme` 接口；加 `'journal'` 到 `ThemeId`；新增 `journalTheme`；加入 `themes` map |
| `src/utils/themeStorage.ts` | 修改 | `getStoredThemeId` 合法 id 白名单加 `'journal'` |
| `App.tsx` | 修改 | `AppNavigator` 内 `useFonts` 预加载，并入 `isLoading` 首屏门 |
| `src/screens/PersonalCenterScreen.tsx` | 修改 | `THEME_OPTIONS` 加第 5 项；标题/标签应用手写体 |
| `src/screens/HomeScreen.tsx` | 修改 | 顶部标题应用手写体 |

无新组件、无新工具文件。`decoration` 字段在 Phase 1 由 `journalTheme` 填值但**不被任何组件读取**（有意为之，供 Phase 2 消费）。

---

## Task 1: 引入子集化的霞鹜文楷字体资产

**Files:**
- Create: `assets/fonts/LXGWWenKai-Regular.ttf`（二进制，约 3.5–3.7MB）
- Temp: `.fontscratch/`（本任务结束时删除）

子集化策略：原始全量 TTF 是 25.6MB（含 CJK 扩展区等罕见字），裁剪到 **GB2312（6763 常用汉字）+ ASCII + CJK 标点 + 全角符号**（共 7811 字），实测产出 3.63MB。标题/标签为固定 UI 字符串，覆盖充分；用户输入的极罕见字理论上可能变方块，但 Phase 1 不在用户输入处用手写体，风险近零。

- [ ] **Step 1: 创建字体目录**

```bash
mkdir -p assets/fonts
```

- [ ] **Step 2: 安装 fonttools（子集化工具）**

Run:
```bash
pip install fonttools
```
Expected: 安装成功（已装则提示 already satisfied）。Python 3.14 已在环境。

- [ ] **Step 3: 下载全量原始字体到临时目录**

Run:
```bash
mkdir -p .fontscratch
curl -sL "https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Regular.ttf" -o .fontscratch/full.ttf
```
Expected: `.fontscratch/full.ttf` 约 25.6MB。验证：
```bash
ls -la .fontscratch/full.ttf
xxd .fontscratch/full.ttf | head -1
```
首行应为 `00000000: 0001 0000 ...`（合法 TTF magic）。文件大小约 25575676 字节。

- [ ] **Step 4: 生成 GB2312 字符集文件**

Run:
```bash
python -c "
chars = set()
for i in range(0x20, 0x7F): chars.add(chr(i))
for lead in range(0xA1, 0xF8):
    for trail in range(0xA1, 0xFF):
        try: chars.add(bytes([lead, trail]).decode('gb2312'))
        except Exception: pass
for cp in list(range(0x3000,0x3040))+list(range(0xFF00,0xFFF0))+list(range(0x2010,0x2070)): chars.add(chr(cp))
open('.fontscratch/gb2312.txt','w',encoding='utf-8').write(''.join(sorted(chars)))
print('char count:', len(chars))
"
```
Expected: 打印 `char count: 7811`，生成 `.fontscratch/gb2312.txt`。

- [ ] **Step 5: 子集化字体到 assets/fonts**

Run:
```bash
python -m fontTools.subset .fontscratch/full.ttf --text-file=.fontscratch/gb2312.txt --output-file=assets/fonts/LXGWWenKai-Regular.ttf --layout-features='*' --drop-tables+=DSIG
```
Expected: 无报错，生成 `assets/fonts/LXGWWenKai-Regular.ttf`。

- [ ] **Step 6: 验证产出字体**

Run:
```bash
ls -la assets/fonts/LXGWWenKai-Regular.ttf
xxd assets/fonts/LXGWWenKai-Regular.ttf | head -1
```
Expected: 文件大小在 **3,500,000 – 3,700,000 字节**之间（实测 3631448）；magic 首行 `0001 0000 ...`（合法 TTF）。若大小明显异常（<1MB 多为出错，>10MB 说明子集未生效），停止排查。

- [ ] **Step 7: 删除临时目录**

Run:
```bash
rm -rf .fontscratch
```
Expected: `.fontscratch` 不复存在；`assets/fonts/LXGWWenKai-Regular.ttf` 保留。

- [ ] **Step 8: 提交字体资产**

```bash
git add assets/fonts/LXGWWenKai-Regular.ttf
git commit -m "assets(font): 引入子集化霞鹜文楷(GB2312,3.6MB)用于手账少女标题"
```

---

## Task 2: 扩展 Theme 接口 + 新增 journalTheme

**Files:**
- Modify: `src/utils/theme.ts`

- [ ] **Step 1: 扩展 ThemeId 与 Theme 接口**

在 `src/utils/theme.ts` 第 1 行，把 `ThemeId` 加上 `'journal'`：

```ts
export type ThemeId = 'wood' | 'spring' | 'summer' | 'winter' | 'journal';
```

在 `Theme` 接口内（`shadows` 字段块之后、接口闭合 `}` 之前，约第 64 行前），追加两个可选字段：

```ts
  decoration?: {
    paper: 'none' | 'grid' | 'dots' | 'lined';
    paperLineColor: string;
    washiTape: boolean;
    stickerStyle: boolean;
    doodleStyle: boolean;
    accentPalette: string[];
  };
  fonts?: {
    heading: string;
  };
```

- [ ] **Step 2: 新增 journalTheme 对象**

在 `winterTheme` 定义结束（约第 222 行）之后、`themes` map（约第 224 行）之前，插入：

```ts
export const journalTheme: Theme = {
  id: 'journal',
  name: '手账少女',
  colors: {
    primary: '#C27D8E',
    primaryLight: '#E6C6CE',
    primaryDark: '#A96677',
    accent: '#A99CC9',
    accentLight: '#CFC6E5',
    secondary: '#F3EEF6',
    background: '#FAF6EE',
    card: '#FFFDF7',
    text: '#473F38',
    textSecondary: '#7B7068',
    textTertiary: '#A89D92',
    border: '#E6DCCF',
    borderLight: '#F1EAE0',
    success: '#6FAE8E',
    warning: '#D9A441',
    danger: '#CF8A8A',
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
  },
  decoration: {
    paper: 'grid',
    paperLineColor: 'rgba(169,156,201,0.16)',
    washiTape: true,
    stickerStyle: true,
    doodleStyle: true,
    accentPalette: ['#9CCFB8', '#A8C8E8', '#B5A8D6', '#E8B4C0'],
  },
  fonts: {
    heading: 'LXGWWenKai',
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};
```

- [ ] **Step 3: 把 journalTheme 加入 themes map**

把 `themes` map（约第 224–229 行）改为：

```ts
export const themes: Record<ThemeId, Theme> = {
  wood: woodTheme,
  spring: springTheme,
  summer: summerTheme,
  winter: winterTheme,
  journal: journalTheme,
};
```

- [ ] **Step 4: 编译验证**

Run:
```bash
npx tsc --noEmit
```
Expected: 无输出、退出码 0。

- [ ] **Step 5: 提交**

```bash
git add src/utils/theme.ts
git commit -m "feat(theme): 扩展Theme接口(decoration/fonts)+新增手账少女主题配色"
```

---

## Task 3: themeStorage 白名单加 journal

**Files:**
- Modify: `src/utils/themeStorage.ts:9`

- [ ] **Step 1: 扩展合法 id 校验**

`src/utils/themeStorage.ts` 第 9 行，把白名单数组加上 `'journal'`：

```ts
    if (stored && ['wood', 'spring', 'summer', 'winter', 'journal'].includes(stored)) {
```

- [ ] **Step 2: 编译验证**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 3: 提交**

```bash
git add src/utils/themeStorage.ts
git commit -m "feat(theme): themeStorage 白名单加 journal"
```

---

## Task 4: App.tsx 预加载字体并入首屏门

**Files:**
- Modify: `App.tsx`（import 区约第 10 行 + `AppNavigator` 约 174–179 行）

- [ ] **Step 1: 确认 expo-font 可用**

Run:
```bash
node -e "console.log(require('./node_modules/expo-font/package.json').version)" 2>/dev/null || echo "MISSING"
```
Expected: 打印版本号（如 `13.x.x`）。若打印 `MISSING`，运行 `npx expo install expo-font` 后再继续。

- [ ] **Step 2: 加 import**

在 `App.tsx` import 区（`import { Ionicons } from '@expo/vector-icons';` 附近）加一行：

```ts
import { useFonts } from 'expo-font';
```

- [ ] **Step 3: 在 AppNavigator 预加载字体并并入首屏门**

把 `AppNavigator`（约第 174 行起）改为：

```ts
function AppNavigator() {
  const { theme, isLoading } = useTheme();
  const [fontsLoaded] = useFonts({
    LXGWWenKai: require('./assets/fonts/LXGWWenKai-Regular.ttf'),
  });

  if (isLoading || !fontsLoaded) {
    return <LoadingScreen />;
  }
```

（仅新增 `useFonts` 调用与把 `if (isLoading)` 改为 `if (isLoading || !fontsLoaded)`；其余 `AppNavigator` 主体不变。）

- [ ] **Step 4: 编译验证**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 5: 手动验证首屏不闪烁**

Run（任选其一）: `npx expo start` 或按既有方式启动 app。
Expected: 启动时短暂显示 LoadingScreen，字体加载完成后进入主界面；无白屏闪烁、无字体相关红屏。

- [ ] **Step 6: 提交**

```bash
git add App.tsx
git commit -m "feat(app): 预加载霞鹜文楷并入首屏 loading 门"
```

---

## Task 5: 切换器加第 5 主题

**Files:**
- Modify: `src/screens/PersonalCenterScreen.tsx:22-25`

- [ ] **Step 1: 加 THEME_OPTIONS 项**

`src/screens/PersonalCenterScreen.tsx` 第 22–25 行的 `THEME_OPTIONS` 数组末尾追加：

```ts
  { id: 'wood', label: '暖阳原木', icon: 'leaf-outline' },
  { id: 'spring', label: '春日樱花', icon: 'flower-outline' },
  { id: 'summer', label: '夏日海洋', icon: 'water-outline' },
  { id: 'winter', label: '冬日初雪', icon: 'snow-outline' },
  { id: 'journal', label: '手账少女', icon: 'book-outline' },
```

- [ ] **Step 2: 编译验证**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 3: 手动验证切换器**

启动 app → 个人中心 → 主题切换区。
Expected: 出现第 5 张「手账少女」卡片（book 图标）。点击选中后：全局底色变 `#FAF6EE`，卡片 `#FFFDF7`，主色按钮变 `#C27D8E` 玫瑰粉；切回其他 4 主题立即恢复原样。（此步字体尚未应用，下个任务做。）

- [ ] **Step 4: 提交**

```bash
git add src/screens/PersonalCenterScreen.tsx
git commit -m "feat(theme): 切换器加手账少女第5主题"
```

---

## Task 6: 标题/标签应用手写体（可见性证明）

**Files:**
- Modify: `src/screens/PersonalCenterScreen.tsx`（3 处 render 站点）
- Modify: `src/screens/HomeScreen.tsx`（1 处 render 站点）

**统一模式：** 在目标 `<Text>` 的 `style` 数组里追加条件样式。当 `theme.fonts?.heading` 存在时用手写体并把字重降为 `400`（霞鹜文楷只有 Regular，保留 `700` 会导致 RN 找不到 bold 变体而回退系统体）；不存在时维持原样。这样其他 4 主题完全不受影响。

```tsx
// 通用追加片段（theme 已在各组件作用域内可用）：
theme.fonts?.heading
  ? { fontFamily: theme.fonts.heading, fontWeight: '400' }
  : null
```

- [ ] **Step 1: PersonalCenterScreen 顶部标题**

`src/screens/PersonalCenterScreen.tsx` 第 307 行：
```tsx
<Text style={styles.headerTitle}>个人中心</Text>
```
改为：
```tsx
<Text
  style={[
    styles.headerTitle,
    theme.fonts?.heading
      ? { fontFamily: theme.fonts.heading, fontWeight: '400' }
      : null,
  ]}
>
  个人中心
</Text>
```

- [ ] **Step 2: PersonalCenterScreen 主题切换区标题**

第 317 行：
```tsx
<Text style={styles.sectionTitle}>主题切换</Text>
```
改为：
```tsx
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
```

- [ ] **Step 3: PersonalCenterScreen 其余 section 标题（菜单区）**

第 353 行（`MENU_ITEMS.map` 内）：
```tsx
<Text style={section.title === '危险操作' ? [styles.sectionTitle, { color: theme.colors.danger }] : styles.sectionTitle}>
  {section.title}
</Text>
```
改为：
```tsx
<Text
  style={[
    styles.sectionTitle,
    section.title === '危险操作' ? { color: theme.colors.danger } : null,
    theme.fonts?.heading
      ? { fontFamily: theme.fonts.heading, fontWeight: '400' }
      : null,
  ]}
>
  {section.title}
</Text>
```

- [ ] **Step 4: PersonalCenterScreen 主题卡片 label（用手账少女自身字体预览）**

第 336–338 行：
```tsx
<Text style={[styles.themeLabel, { color: optionTheme.colors.text }]}>
  {option.label}
</Text>
```
改为（注意：用 `optionTheme` 的字体而非当前 `theme`，使每张卡片用各自主题字体预览）：
```tsx
<Text
  style={[
    styles.themeLabel,
    { color: optionTheme.colors.text },
    optionTheme.fonts?.heading
      ? { fontFamily: optionTheme.fonts.heading, fontWeight: '400' }
      : null,
  ]}
>
  {option.label}
</Text>
```

- [ ] **Step 5: HomeScreen 顶部标题**

`src/screens/HomeScreen.tsx` 第 698 行：
```tsx
<Text style={styles.headerTitle}>{scopeWardrobeName}</Text>
```
改为：
```tsx
<Text
  style={[
    styles.headerTitle,
    theme.fonts?.heading
      ? { fontFamily: theme.fonts.heading, fontWeight: '400' }
      : null,
  ]}
>
  {scopeWardrobeName}
</Text>
```

- [ ] **Step 6: 编译验证**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 7: 手动验证手写体生效**

启动 app → 个人中心 → 选中「手账少女」。
Expected: 「个人中心」标题、各 section 标题、以及手账少女卡片 label 显霞鹜文楷（笔画楷书手写感）；切回任一旧主题，标题立即恢复系统粗体（无字体残留）。回主页，顶部衣橱名标题在手账少女下也显手写体。

- [ ] **Step 8: 提交**

```bash
git add src/screens/PersonalCenterScreen.tsx src/screens/HomeScreen.tsx
git commit -m "feat(theme): 标题/标签应用霞鹜文楷(手账少女可见性证明)"
```

---

## Task 7: 全量回归与持久化验证

**Files:** 无（纯验证）

- [ ] **Step 1: 五主题切换回归**

启动 app → 个人中心，依次切换 暖阳原木 → 春日樱花 → 夏日海洋 → 冬日初雪 → 手账少女 → 再回暖阳原木。
Expected: 前 4 主题外观与改动前逐像素一致（无配色泄漏、无字体残留）；手账少女显暖纸配色 + 手写标题。

- [ ] **Step 2: 持久化验证**

在手账少女主题下杀掉 app 进程，重新启动。
Expected: 启动后仍是手账少女主题（AsyncStorage 持久化生效）；字体重新加载、首屏 LoadingScreen 后进入，无闪烁、无字体相关红屏。

- [ ] **Step 3: 最终编译门**

Run: `npx tsc --noEmit`
Expected: 无输出、退出码 0。

- [ ] **Step 4（可选）: 推送**

```bash
git push
```

---

## Phase 1 完成标准（DoD）

- [ ] `assets/fonts/LXGWWenKai-Regular.ttf` 存在，3.5–3.7MB，合法 TTF
- [ ] `Theme` 接口含可选 `decoration?` / `fonts?`；`ThemeId` 含 `'journal'`；`themes.journal` 存在
- [ ] `themeStorage` 白名单含 `'journal'`
- [ ] `App.tsx` 预加载字体并入首屏门
- [ ] 切换器有第 5 张「手账少女」卡片
- [ ] 手账少女下指定标题显霞鹜文楷，其余 4 主题零变化
- [ ] `npx tsc --noEmit` 退出码 0
- [ ] 切换 + 杀进程重启均通过

## 不在 Phase 1（后续独立 spec）

`decoration` 字段在 Phase 1 **仅填值不消费**。以下留给 Phase 2+：`PaperBackground`/`WashiTape`/`StickerBadge`/`DoodleDivider` 组件、五屏装饰化、翻页/贴纸/胶带/手写动画、图片纹理与贴纸资产、全量标题手写体应用。
