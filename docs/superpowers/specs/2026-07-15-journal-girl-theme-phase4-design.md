# 《手账少女》主题 Phase 4 — 设计规格（动效层）

> **范围声明：** 本 spec 给手账少女装饰加 mount 入场动效（内置 Animated，无 reanimated）。覆盖胶带展开/贴纸贴上/分隔淡入/翻页淡入 + reduced-motion 降级。真 3D 翻页与手写逐笔显现因 RN 可行性极低，明确排除。

**目标：** 切到手账少女、或在其下切换页面时，装饰以手账感入场动效出现；开启系统"减弱动效"时全部降级为瞬时。其余 4 主题逐像素不变。

**架构：** 用 RN 内置 `Animated`（`useNativeDriver:true`，原生线程流畅）。新建一个共享动效工具文件（reduced-motion 检测 + mount 入场 hook），改 4 个装饰组件接入。无新依赖、无 babel 改动、无原生重建。

**技术栈：** React Native 0.81 / Expo SDK 54 / TypeScript / 内置 `Animated` + `AccessibilityInfo`

**测试方法：** 无单测框架。验证 = `npx tsc --noEmit` 编译门 + 手动可视验证（切手账少女看动效、开系统减弱动效看是否瞬时）。

---

## 1. 引擎决策：内置 Animated，不用 reanimated

- 内置 `Animated` 能满足本 phase 的所有动效（scale/opacity/translateY 入场，`useNativeDriver`）。
- 装 reanimated 需：新增依赖 + `react-native-reanimated/plugin`（必须为 babel 最后一个插件）+ 清 Metro 缓存 + 可能的原生重建——本项目最大的构建风险。本 phase 不需要它的能力，故不引入。
- 唯一内置 Animated 不擅长的（SVG 逐笔 stroke-draw = 手写显现）本就因中文逐字极脆被排除。

---

## 2. 共享动效工具：`src/components/decoration/useEntrance.ts`

新建一个文件，导出两个东西，供 4 个装饰组件复用（DRY）。

### 2.1 `useReduceMotion(): boolean`
```ts
import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

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
```

### 2.2 `useMountEntrance(opts): Animated.Value`
封装"mount 时从 from 动到 to，reduced-motion 时瞬时"的通用逻辑，返回一个 `Animated.Value` 供组件映射到具体属性。
```ts
import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

type Opts = {
  from: number;
  to: number;
  kind: 'spring' | 'timing';
  spring?: Animated.SpringConfig;
  timing?: Animated.TimingConfig;
};

export function useMountEntrance(opts: Opts): Animated.Value {
  const reduce = useReduceMotion();   // 同文件上方已定义，直接调用，无需 import
  const val = useRef(new Animated.Value(opts.to)).current; // 默认终值，避免首帧闪
  useEffect(() => {
    if (reduce) { val.setValue(opts.to); return; }     // 减弱动效：瞬时到终值
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
（`useReduceMotion` 与 `useMountEntrance` 同文件，`useMountEntrance` 直接调用上方已定义的 `useReduceMotion`，无自引用 import。）

---

## 3. 各组件接入动效

每个动效只在手账少女路径生效（组件已 theme-gated：无 decoration 时 WashiTape/DoodleDivider 返回 null 或降级、StickerBadge 透传、ThemedScreen 仅在 theme.decoration 时播）。

> **⚠️ Rules of Hooks（强制）：** WashiTape / StickerBadge / DoodleDivider 现有 `if (!deco) return ...` 早返回。**`useMountEntrance(...)` 必须在这些早返回之前、紧跟 `useTheme()` 之后调用**，且无条件执行——否则违反 Hooks 规则。即使非手账主题会走到早返回，hook 也必须先被调用（值不被使用即可）。

> **`Animated` 导入：** 接入动效的组件需从 `'react-native'` 额外导入 `Animated`，并把对应外层 `<View>` 改为 `<Animated.View>`。

### 3.1 WashiTape — 展开（scaleX 弹簧）
现有外层 `<View>` 改为 `<Animated.View>`，transform 合并静态 rotate 与动画 scaleX：
```tsx
const scaleX = useMountEntrance({ from: 0, to: 1, kind: 'spring', spring: { tension: 70, friction: 8 } });
// style:
<Animated.View
  style={[{ width, height, transform: [{ rotate: `${rotation}deg` }, { scaleX }] }, style]}
  pointerEvents="none">
```
（scaleX 0→1，沿胶带长度铺开，~450ms 感。）

### 3.2 StickerBadge — 贴上（scale 回弹弹簧）
手账路径的外层 `<View>` 改为 `<Animated.View>`，transform 合并静态 rotate 与动画 scale：
```tsx
const scale = useMountEntrance({ from: 0.5, to: 1, kind: 'spring', spring: { tension: 80, friction: 5 } });
// 仅手账分支：
<Animated.View style={[{ ...bg/shadow..., transform: [{ rotate: `${rotate}deg` }, { scale }] }, style]}>
```
（scale 0.5→1 带回弹，啪地贴上，~400ms 感。非手账仍 `return <>{children}</>` 不变。）

### 3.3 DoodleDivider — 淡入上浮（opacity + translateY）
手账路径返回的 `<View>` 改为 `<Animated.View>`，由一个 `Animated.Value` 同时驱动 opacity 与 translateY（interpolate）：
```tsx
const t = useMountEntrance({ from: 0, to: 1, kind: 'timing', timing: { duration: 300 } });
// 手账分支：
<Animated.View
  style={[{
    height: DOODLE_W,
    opacity: t,
    transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  }, style]}
  onLayout={...} pointerEvents="none">
```
（非手账仍返回普通 hairline `<View>` 不变。）

### 3.4 ThemedScreen — 翻页淡入（子内容上浮淡入）
仅当 `theme.decoration` 存在时，给 children 包一层 `Animated.View` 做入场；无 decoration 时直接渲染 children（与今天一致）：
```tsx
const deco = theme.decoration;
const t = useMountEntrance({ from: 0, to: 1, kind: 'timing', timing: { duration: 380 } });
return (
  <View style={[{ flex: 1 }, style]}>
    <PaperBackground />
    {deco ? (
      <Animated.View style={{ flex: 1, opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        {children}
      </Animated.View>
    ) : children}
  </View>
);
```
（`theme.decoration` 缺失 → 不包动画层、直接 children，等价今天。）

---

## 4. 触发与向后兼容

- **触发：** 动效在 mount 时播放一次。切到手账少女时装饰从 null 变为挂载→动效触发；手账少女下切换页面时 `ThemedScreen` 重新挂载→翻页淡入。`useEffect` 依赖 `[reduce]`，仅在减弱动效状态变化时重算。
- **向后兼容：** 4 个旧主题无 `decoration` → WashiTape/DoodleDivider 返回 null、StickerBadge 透传 children、ThemedScreen 直接渲染 children 无动画层。逐像素与 Phase 3 一致。
- **性能：** 全部 `useNativeDriver:true`，动画在原生线程，不阻塞 JS。入场一次性的、短时长（≤450ms），不持续消耗。

---

## 5. 不在 Phase 4（→ Phase 5 / 永久排除）

- 真 3D 翻页过渡（需改底部 tab 导航层，ROI 低，永久排除）
- 手写逐笔显现（中文逐字极脆，永久排除）
- 贴纸阴影卡片、拼贴专属美术、对比度/性能打磨（Phase 5）
- 持续循环动效（YAGNI，不做）

---

## 6. 完成标准（DoD）

- [ ] `src/components/decoration/useEntrance.ts` 导出 `useReduceMotion` + `useMountEntrance`
- [ ] WashiTape 展开、StickerBadge 贴上、DoodleDivider 淡入上浮、ThemedScreen 翻页淡入
- [ ] 开系统"减弱动效"后：四者全部瞬时出现、无运动
- [ ] 切到手账少女/其下切页面可见入场动效；切回 4 旧主题逐像素不变
- [ ] `npx tsc --noEmit` 退出码 0
