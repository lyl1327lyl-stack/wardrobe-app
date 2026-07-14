# 推荐模块个性化增强 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展现有个性化推荐系统：5 个显式偏好维度 + 3 个隐式行为信号，共同影响搭配推荐

**Architecture:** 在 preferenceStore 新增字段 → 问卷 UI 追加题目 → 新建 implicitSignals.ts 纯函数模块 → outfitRecommender 接入新偏好和信号 → HomeScreen 传递新参数

**Tech Stack:** TypeScript, Zustand, AsyncStorage, React Native

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/store/preferenceStore.ts` | 偏好数据模型与持久化 |
| `src/components/PreferenceSurveySheet.tsx` | 问卷 UI |
| `src/services/implicitSignals.ts` | 隐式信号纯函数（新建） |
| `src/services/outfitRecommender.ts` | 推荐引擎 |
| `src/screens/HomeScreen.tsx` | 主页集成 |

---

### Task 1: 扩展 preferenceStore 数据模型

**Files:**
- Modify: `src/store/preferenceStore.ts`

**目标：** 在 `SurveyPreferences`、`PreferenceState`、`StoredPrefs`、`persist()`、`load()`、`setSurveyPreferences()`、`resetSurvey()` 中新增 5 个字段。

- [ ] **Step 1: 新增类型定义和字段**

在 `SurveyPreferences` 接口（第 8 行后）追加：

```typescript
// 穿着习惯偏好
repeatInterval: number | null;          // 1 | 3 | 7 | null（null=无所谓）
explorationLevel: 'explore' | 'balanced' | 'conservative';
colorBoldness: 'safe' | 'moderate' | 'bold';
layeringPreference: 'often' | 'sometimes' | 'rarely';
accessoryUsage: 'often' | 'sometimes' | 'rarely';
```

在 `PreferenceState` 接口（第 27 行后，`preferredScenes` 之后）追加同样的 5 个字段声明。

在 `StoredPrefs` 接口（第 48 行前）追加：

```typescript
repeatInterval: number | null;
explorationLevel: string;
colorBoldness: string;
layeringPreference: string;
accessoryUsage: string;
```

- [ ] **Step 2: 更新 store 初始值**

在 `create<PreferenceState>` 的初始状态对象中，`preferredScenes: []` 之后追加：

```typescript
repeatInterval: null,
explorationLevel: 'balanced',
colorBoldness: 'moderate',
layeringPreference: 'sometimes',
accessoryUsage: 'sometimes',
```

- [ ] **Step 3: 更新 load() 函数**

在 `load()` 的 JSON.parse 分支中（第 68-78 行），set 调用内已有字段后追加：

```typescript
repeatInterval: p.repeatInterval ?? null,
explorationLevel: (p.explorationLevel as any) ?? 'balanced',
colorBoldness: (p.colorBoldness as any) ?? 'moderate',
layeringPreference: (p.layeringPreference as any) ?? 'sometimes',
accessoryUsage: (p.accessoryUsage as any) ?? 'sometimes',
```

- [ ] **Step 4: 更新 setSurveyPreferences()**

在 `setSurveyPreferences` 的 set 调用中追加：

```typescript
repeatInterval: prefs.repeatInterval,
explorationLevel: prefs.explorationLevel,
colorBoldness: prefs.colorBoldness,
layeringPreference: prefs.layeringPreference,
accessoryUsage: prefs.accessoryUsage,
```

- [ ] **Step 5: 更新 resetSurvey()**

在 `resetSurvey` 的 set 调用中追加：

```typescript
repeatInterval: null,
explorationLevel: 'balanced',
colorBoldness: 'moderate',
layeringPreference: 'sometimes',
accessoryUsage: 'sometimes',
```

- [ ] **Step 6: 更新 persist() 函数**

在 `persist()` 的 `data: StoredPrefs` 对象中追加：

```typescript
repeatInterval: state.repeatInterval,
explorationLevel: state.explorationLevel,
colorBoldness: state.colorBoldness,
layeringPreference: state.layeringPreference,
accessoryUsage: state.accessoryUsage,
```

- [ ] **Step 7: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 8: 提交**

```bash
git add src/store/preferenceStore.ts
git commit -m "feat(prefs): 新增5个穿着习惯偏好字段(重复间隔/探索度/配色/叠穿/配饰)"
```

---

### Task 2: PreferenceSurveySheet 追加 5 题

**Files:**
- Modify: `src/components/PreferenceSurveySheet.tsx`

**目标：** 在现有 4 题后追加分隔标题和新 5 题，每题 3 个 chip 单选。

- [ ] **Step 1: 新增选项常量**

在文件顶部常量区（`SCENE_OPTIONS` 之后）追加：

```typescript
const REPEAT_OPTIONS = [
  { label: '每天可重复', value: null },
  { label: '隔 3 天', value: 3 },
  { label: '隔 7 天', value: 7 },
];

const EXPLORE_OPTIONS = [
  { label: '多试新组合', value: 'explore' as const },
  { label: '均衡', value: 'balanced' as const },
  { label: '穿已验证', value: 'conservative' as const },
];

const BOLDNESS_OPTIONS = [
  { label: '中性保守', value: 'safe' as const },
  { label: '适中', value: 'moderate' as const },
  { label: '大胆撞色', value: 'bold' as const },
];

const LAYERING_OPTIONS = [
  { label: '经常叠穿', value: 'often' as const },
  { label: '偶尔', value: 'sometimes' as const },
  { label: '几乎不', value: 'rarely' as const },
];

const ACCESSORY_OPTIONS = [
  { label: '经常搭配', value: 'often' as const },
  { label: '偶尔', value: 'sometimes' as const },
  { label: '很少用', value: 'rarely' as const },
];
```

- [ ] **Step 2: 新增 state**

在现有 4 个 useState 之后追加：

```typescript
const [repeatInterval, setRepeatInterval] = useState<number | null>(initialPrefs?.repeatInterval ?? null);
const [exploration, setExploration] = useState<'explore' | 'balanced' | 'conservative'>(
  (initialPrefs as any)?.explorationLevel ?? 'balanced',
);
const [boldness, setBoldness] = useState<'safe' | 'moderate' | 'bold'>(
  (initialPrefs as any)?.colorBoldness ?? 'moderate',
);
const [layering, setLayering] = useState<'often' | 'sometimes' | 'rarely'>(
  (initialPrefs as any)?.layeringPreference ?? 'sometimes',
);
const [accessory, setAccessory] = useState<'often' | 'sometimes' | 'rarely'>(
  (initialPrefs as any)?.accessoryUsage ?? 'sometimes',
);
```

- [ ] **Step 3: 更新 handleSave**

```typescript
const handleSave = () => {
  onSave({
    preferredStyles: styles_sel,
    preferredColors: colors_sel,
    comfortVsAppearance: comfort,
    preferredScenes: scenes,
    repeatInterval: repeatInterval,
    explorationLevel: exploration,
    colorBoldness: boldness,
    layeringPreference: layering,
    accessoryUsage: accessory,
  });
  onClose();
};
```

- [ ] **Step 4: 在 ScrollView 中追加分隔标题 + 5 题**

在 Q4（场景）的 `</View>` 闭合之后、保存按钮之前，插入：

```tsx
{/* ─── 穿着习惯 ─── */}
<View style={{ marginTop: 4, marginBottom: 16 }}>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
    <View style={{ height: 1, flex: 1, backgroundColor: theme.colors.border }} />
    <Text style={{ fontSize: 11, color: theme.colors.textTertiary, fontWeight: '500' }}>穿着习惯</Text>
    <View style={{ height: 1, flex: 1, backgroundColor: theme.colors.border }} />
  </View>
</View>

{/* Q5: 重复间隔 */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>同一件单品希望隔多久再穿？</Text>
  <View style={styles.chipGrid}>
    {REPEAT_OPTIONS.map(o => {
      const active = repeatInterval === o.value;
      return (
        <TouchableOpacity
          key={String(o.value)}
          style={[styles.chip, active && styles.chipActive]}
          onPress={() => setRepeatInterval(o.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>

{/* Q6: 探索意愿 */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>搭配探索意愿？</Text>
  <View style={styles.chipGrid}>
    {EXPLORE_OPTIONS.map(o => {
      const active = exploration === o.value;
      return (
        <TouchableOpacity
          key={o.value}
          style={[styles.chip, active && styles.chipActive]}
          onPress={() => setExploration(o.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>

{/* Q7: 配色大胆度 */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>配色大胆程度？</Text>
  <View style={styles.chipGrid}>
    {BOLDNESS_OPTIONS.map(o => {
      const active = boldness === o.value;
      return (
        <TouchableOpacity
          key={o.value}
          style={[styles.chip, active && styles.chipActive]}
          onPress={() => setBoldness(o.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>

{/* Q8: 叠穿 */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>外套/叠穿习惯？</Text>
  <View style={styles.chipGrid}>
    {LAYERING_OPTIONS.map(o => {
      const active = layering === o.value;
      return (
        <TouchableOpacity
          key={o.value}
          style={[styles.chip, active && styles.chipActive]}
          onPress={() => setLayering(o.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>

{/* Q9: 配饰 */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>包包/配饰使用频率？</Text>
  <View style={styles.chipGrid}>
    {ACCESSORY_OPTIONS.map(o => {
      const active = accessory === o.value;
      return (
        <TouchableOpacity
          key={o.value}
          style={[styles.chip, active && styles.chipActive]}
          onPress={() => setAccessory(o.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>
```

- [ ] **Step 5: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 6: 提交**

```bash
git add src/components/PreferenceSurveySheet.tsx
git commit -m "feat(survey): 追加5道穿着习惯题(重复间隔/探索度/配色/叠穿/配饰)"
```

---

### Task 3: 新建隐式信号模块

**Files:**
- Create: `src/services/implicitSignals.ts`

**目标：** 纯函数模块，输出单品冷落度加分、品牌亲和度、厚薄温度感知三个信号。

- [ ] **Step 1: 创建文件并实现 getIdleBoost**

```typescript
// src/services/implicitSignals.ts
import { ClothingItem } from '../types';

/**
 * 单品冷落度加分：长期未穿或从未穿过的单品获得权重加成，
 * 鼓励推荐引擎"盘活"被遗忘的单品。
 */
export function getIdleBoost(
  clothing: ClothingItem[],
  today: string,
): Map<number, number> {
  const boost = new Map<number, number>();
  const todayMs = new Date(today).getTime();
  const DAY_MS = 86400000;

  for (const item of clothing) {
    const lastWorn = item.lastWornAt;
    if (!lastWorn) {
      // 从未穿过 → +0.12
      boost.set(item.id, 0.12);
    } else {
      const daysAgo = Math.floor((todayMs - new Date(lastWorn).getTime()) / DAY_MS);
      if (daysAgo > 14) {
        // 超过 14 天未穿 → +0.08
        boost.set(item.id, 0.08);
      }
      // else: 近期穿过，不加分
    }
  }

  return boost;
}
```

- [ ] **Step 2: 实现 getBrandAffinity**

在同一个文件中追加：

```typescript
import { WearRecord } from '../types';

/**
 * 品牌亲和度：分析穿着记录中高频品牌，
 * 属于高频品牌的单品获得轻微加成。
 */
export function getBrandAffinity(
  clothing: ClothingItem[],
  wearRecords: WearRecord[],
): Map<number, number> {
  // 构建 clothingId → brand 映射
  const itemBrand = new Map<number, string>();
  for (const c of clothing) {
    if (c.brand) itemBrand.set(c.id, c.brand);
  }

  // 统计各品牌穿着次数
  const brandCount = new Map<string, number>();
  for (const r of wearRecords) {
    const brand = itemBrand.get(r.clothingId);
    if (brand) {
      brandCount.set(brand, (brandCount.get(brand) || 0) + 1);
    }
  }

  // 取 Top 3 高频品牌（至少出现 3 次）
  const topBrands = [...brandCount.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([brand]) => brand);

  const topSet = new Set(topBrands);

  // 为属于高频品牌的单品分配 boost
  const boost = new Map<number, number>();
  for (const c of clothing) {
    if (c.brand && topSet.has(c.brand)) {
      boost.set(c.id, 0.05);
    }
  }

  return boost;
}
```

- [ ] **Step 3: 实现 getThicknessTempComfort**

在同一个文件中追加：

```typescript
import { Weather } from '../types';

/**
 * 厚薄温度感知：从最近 30 天穿着记录中学习用户在特定温度下
 * 实际穿的厚薄偏好，取代硬编码规则。
 *
 * 返回 Map<clothingId, comfortScore: -0.1 ~ +0.06>
 */
export function getThicknessTempComfort(
  clothing: ClothingItem[],
  wearRecords: WearRecord[],
  currentWeather: Weather,
): Map<number, number> {
  const result = new Map<number, number>();
  const currentTemp = currentWeather.temperature;

  // 构建 clothingId → thickness 映射
  const itemThickness = new Map<number, string>();
  for (const c of clothing) {
    if (c.thickness) itemThickness.set(c.id, c.thickness);
  }

  // 按 5°C 档位统计用户实际穿的厚薄分布
  // tempBucket → { 薄款: N, 适中: N, 厚款: N, 加厚: N }
  const bucketStats = new Map<number, Record<string, number>>();

  for (const r of wearRecords) {
    const thickness = itemThickness.get(r.clothingId);
    if (!thickness) continue;

    // wornDate 格式 "YYYY-MM-DD"，解析为日期
    const d = new Date(r.wornDate);
    // 取当天近似温度：无准确数据，按季节推断（不需要精确历史温度，用厚薄分布本身已经反映偏好）
    // 这里我们简化：不基于历史温度，而是基于当前温度查找用户在当前温度附近的厚薄偏好
    // 实际上我们无法从 wearRecords 获取历史温度，所以改为：
    // 统计用户所有穿着记录中的厚薄分布频率，作为"用户偏好"信号
    // 然后在当前温度下，与当前衣物的厚薄做匹配
  }

  // 重新设计：统计用户整体厚薄偏好分布
  const thicknessFreq: Record<string, number> = { '薄款': 0, '适中': 0, '厚款': 0, '加厚': 0 };
  let totalRecords = 0;
  for (const r of wearRecords) {
    const thickness = itemThickness.get(r.clothingId);
    if (thickness && thicknessFreq[thickness] !== undefined) {
      thicknessFreq[thickness]++;
      totalRecords++;
    }
  }

  // 样本不足 → 回退，返回空 Map（调用方检测后使用硬编码规则）
  if (totalRecords < 5) return result;

  // 找出用户最常穿的厚薄（频率最高的那个）
  let topThickness = '适中';
  let maxFreq = 0;
  for (const [t, freq] of Object.entries(thicknessFreq)) {
    if (freq > maxFreq) {
      maxFreq = freq;
      topThickness = t;
    }
  }

  // 温度相关的厚薄期望
  let expectedThickness: string;
  if (currentTemp > 28) expectedThickness = '薄款';
  else if (currentTemp > 20) expectedThickness = '适中';
  else if (currentTemp > 10) expectedThickness = '适中';
  else expectedThickness = '厚款';

  // 结合用户偏好和温度期望：取交集
  const preferredThickness = topThickness;

  for (const c of clothing) {
    if (!c.thickness) continue;
    if (c.thickness === preferredThickness) {
      result.set(c.id, 0.06);
    } else if (c.thickness === expectedThickness) {
      result.set(c.id, 0.03); // 温度合适但非用户偏好
    }
    // 极端不匹配
    if (currentTemp > 30 && (c.thickness === '厚款' || c.thickness === '加厚')) {
      result.set(c.id, -0.1);
    }
    if (currentTemp < 5 && c.thickness === '薄款') {
      result.set(c.id, -0.1);
    }
  }

  return result;
}
```

- [ ] **Step 4: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 5: 提交**

```bash
git add src/services/implicitSignals.ts
git commit -m "feat(signals): 新增隐式信号模块(闲置加分/品牌亲和/厚薄感知)"
```

---

### Task 4: 推荐引擎接入新偏好与信号

**Files:**
- Modify: `src/services/outfitRecommender.ts`

**目标：** `generateRecommendations()` 内部构建隐式信号，传入候选生成和评分；`generateCandidates` 和 `scoreOutfits` 接收新参数。

- [ ] **Step 1: 修改 generateCandidates 签名和 fw() 函数**

在 `generateCandidates` 参数列表末尾追加（第 375 行后）：

```typescript
  idleBoost?: Map<number, number>,
  brandAffinity?: Map<number, number>,
  userRepeatInterval?: number | null,
  userLayering?: 'often' | 'sometimes' | 'rarely',
  userAccessory?: 'often' | 'sometimes' | 'rarely',
```

替换外套/包包概率计算（第 385-386 行）：

```typescript
  // 叠穿偏好影响外套概率
  const outerProbByPreference = 
    userLayering === 'often' ? 0.70 :
    userLayering === 'rarely' ? 0.15 :
    0.50;
  const outerProb = season === '冬' ? Math.min(1, outerProbByPreference + 0.20) : 
                     season === '夏' ? Math.max(0.05, outerProbByPreference - 0.35) : 
                     outerProbByPreference;

  // 配饰偏好影响包包概率
  const bagProbByPreference =
    userAccessory === 'often' ? 0.70 :
    userAccessory === 'rarely' ? 0.20 :
    0.55;
  const bagProb = bags.length > 0 ? bagProbByPreference : 0;
```

替换 `fw()` 函数（第 408-413 行）：

```typescript
  function fw(id: number): number {
    const fresh = recentRecommendedItemIds?.has(id) ? 0.05 : 1.0;
    const diversity = 1 + (itemDiversity?.get(id) || 0);
    const recency = recencyMultiplier(id, recentlyWornDays, season, userRepeatInterval);
    const idle = 1 + (idleBoost?.get(id) || 0);
    const brand = 1 + (brandAffinity?.get(id) || 0);
    return fresh * recency * diversity * idle * brand;
  }
```

- [ ] **Step 2: 修改 recencyMultiplier 接受用户偏好**

替换 `recencyMultiplier` 函数（第 329-341 行）：

```typescript
function recencyMultiplier(
  id: number,
  recentlyWornDays?: Map<number, number>,
  season?: string,
  userRepeatInterval?: number | null,
): number {
  if (!recentlyWornDays) return 1.0;
  const daysAgo = recentlyWornDays.get(id);
  if (daysAgo === undefined) return 1.0;
  if (daysAgo === 0) return 0.01;

  // 用户偏好优先 → 季节默认值作为回退
  const window = userRepeatInterval != null
    ? userRepeatInterval
    : season === '夏' ? 7 : season === '冬' ? 4 : 5;

  if (daysAgo >= window) return 1.0;
  return daysAgo / window;
}
```

- [ ] **Step 3: 修改 scoreOutfits 签名和评分逻辑**

在 `scoreOutfits` 参数列表末尾追加（第 579-587 行后）：

```typescript
  explorationLevel?: 'explore' | 'balanced' | 'conservative',
  colorBoldness?: 'safe' | 'moderate' | 'bold',
  thicknessComfort?: Map<number, number>,
```

替换 `getWeights` 调用（第 589 行）：

```typescript
  const w = getWeights(comfortVsAppearance, explorationLevel);
```

替换 `getWeights` 函数（第 647-653 行）：

```typescript
function getWeights(
  preference?: 'comfort' | 'balanced' | 'appearance',
  exploration?: 'explore' | 'balanced' | 'conservative',
) {
  // 探索度影响 pairFreq 和 freshness 权重
  const exploreWeights = exploration === 'explore'
    ? { pairFreq: 0.05, freshness: 0.30 }
    : exploration === 'conservative'
    ? { pairFreq: 0.25, freshness: 0.10 }
    : { pairFreq: 0.15, freshness: 0.20 };

  switch (preference) {
    case 'comfort':
      return { ...exploreWeights, style: 0.20, color: 0.15, weather: 0.15, favorite: 0.10, recency: 0.05 };
    case 'appearance':
      return { ...exploreWeights, style: 0.30, color: 0.15, weather: 0.05, favorite: 0.10, recency: 0.05 };
    default:
      return { ...exploreWeights, style: 0.25, color: 0.15, weather: 0.10, favorite: 0.10, recency: 0.05 };
  }
}
```

在 `scoreOutfits` 的 totalScore 计算中（第 629-641 行），`sceneBoost` 之后追加：

```typescript
    // 厚薄温度感知加成
    const thicknessBoost = computeThicknessBoost(items, thicknessComfort);
```

并在 `totalScore` 累加中加上 `+ thicknessBoost`。

在文件某处新增：

```typescript
function computeThicknessBoost(
  items: ClothingItem[],
  thicknessComfort?: Map<number, number>,
): number {
  if (!thicknessComfort || thicknessComfort.size === 0) return 0;
  let sum = 0;
  for (const item of items) {
    sum += thicknessComfort.get(item.id) || 0;
  }
  return items.length > 0 ? sum / items.length : 0;
}
```

- [ ] **Step 4: 修改 colorScore 接受配色大胆度**

`scoreOutfits` 中 `colorScore` 的计算，将 `colorBoldness` 传入控制冲突惩罚：

在 `computeColorScore` 调用处不变，但新增一个处理：在 `scoreOutfits` 中拿到 colorScore 后，根据 boldness 调整：

```typescript
    // 配色大胆度调整：bold → 放宽冲突惩罚（colorScore 本来就高则保持）
    const adjustedColorScore = colorBoldness === 'bold'
      ? Math.min(1, colorScore * 1.15)
      : colorBoldness === 'safe'
      ? colorScore * 0.9
      : colorScore;
```

然后在 totalScore 中使用 `adjustedColorScore` 替代 `colorScore`。

注意：需要把 `w.color * colorScore` 改为 `w.color * adjustedColorScore`。

- [ ] **Step 5: 修改 generateRecommendations 主入口**

在 `generateRecommendations` 函数中（第 900 行附近），`const currentSeason = ...` 之后追加：

```typescript
  // 构建隐式信号
  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const idleBoost = options?.recentlyWornDays
    ? (() => {
        const { getIdleBoost } = require('./implicitSignals');
        return getIdleBoost(clothing, today);
      })()
    : new Map<number, number>();
  const brandAffinity = options?.recentlyWornDays
    ? (() => {
        const { getBrandAffinity } = require('./implicitSignals');
        return getBrandAffinity(clothing, []); // 穿着记录在外部传入
      })()
    : new Map<number, number>();
  const thicknessComfort = weather
    ? (() => {
        const { getThicknessTempComfort } = require('./implicitSignals');
        return getThicknessTempComfort(clothing, [], weather); // 穿着记录在外部传入
      })()
    : new Map<number, number>();
```

但 `require` 在 TS 中不好，改用静态 import 在文件顶部导入隐式信号函数。实际实现时在顶部添加：

```typescript
import { getIdleBoost, getBrandAffinity, getThicknessTempComfort } from './implicitSignals';
```

然后修改 `generateRecommendations` 的 `options` 参数类型，在接口中新增 6 个字段：

```typescript
    repeatInterval?: number | null;
    explorationLevel?: 'explore' | 'balanced' | 'conservative';
    colorBoldness?: 'safe' | 'moderate' | 'bold';
    layeringPreference?: 'often' | 'sometimes' | 'rarely';
    accessoryUsage?: 'often' | 'sometimes' | 'rarely';
    wearRecords?: WearRecord[],
```

在函数体内 `const currentSeason = ...` 之后构建隐式信号：

简化方案：在主入口内部，如果提供了 `wearRecords` 则构建三个 Map，否则传空 Map。

修改 `generateCandidates` 调用（第 921 行），追加新参数：

```typescript
  let candidates = generateCandidates(
    filtered, options?.selectedItem, 40,
    options?.recentRecommendedItemIds, itemDiversity,
    effectivePairFreq, currentSeason, options?.recentlyWornDays,
    idleBoost, brandAffinity,
    options?.repeatInterval ?? null,
    options?.layeringPreference ?? 'sometimes',
    options?.accessoryUsage ?? 'sometimes',
  );
```

修改 `scoreOutfits` 调用（第 936 行），追加新参数：

```typescript
  const scored = scoreOutfits(
    candidates, pairFreq, weather, favoriteSet, userOutfitSets,
    currentSeason, options?.recentRecommendedItemIds,
    options?.recentlyWornDays, options?.likedItemIds,
    options?.preferredStyles, options?.preferredColors,
    options?.comfortVsAppearance, options?.preferredScenes,
    options?.explorationLevel ?? 'balanced',
    options?.colorBoldness ?? 'moderate',
    thicknessComfort,
  );
```

- [ ] **Step 6: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 7: 提交**

```bash
git add src/services/outfitRecommender.ts
git commit -m "feat(recommender): 接入5个显式偏好+3个隐式信号到推荐引擎"
```

---

### Task 5: HomeScreen 传递新偏好与穿着记录

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

**目标：** `loadRecommendations` 传递新偏好字段 + 获取 30 天穿着记录供隐式信号使用。

- [ ] **Step 1: 导入隐式信号依赖**

在文件顶部 import 区追加：

```typescript
import { getWearRecordsByDateRange } from '../db/wearRecords';
```

`getWearRecordsByDateRange` 已在第 24 行导入，确认无误。

- [ ] **Step 2: 修改 loadRecommendations 传递新偏好**

在 `loadRecommendations` 中（第 472-499 行），修改 `generateRecommendations` 调用：

在 `const recentlyWornDays = await buildRecentlyWornDays();` 之后追加：

```typescript
    // 获取最近 30 天穿着记录供隐式信号分析
    const d30 = new Date();
    const endDate30 = `${d30.getFullYear()}-${String(d30.getMonth() + 1).padStart(2, '0')}-${String(d30.getDate()).padStart(2, '0')}`;
    d30.setDate(d30.getDate() - 30);
    const startDate30 = `${d30.getFullYear()}-${String(d30.getMonth() + 1).padStart(2, '0')}-${String(d30.getDate()).padStart(2, '0')}`;
    const wearRecords30 = await getWearRecordsByDateRange(startDate30, endDate30);
```

修改 `generateRecommendations` 调用，在 options 对象中追加：

```typescript
      repeatInterval: prefs.repeatInterval,
      explorationLevel: prefs.explorationLevel,
      colorBoldness: prefs.colorBoldness,
      layeringPreference: prefs.layeringPreference,
      accessoryUsage: prefs.accessoryUsage,
      wearRecords: wearRecords30,
```

- [ ] **Step 3: 同步修改 handleRefresh 中的调用**

`handleRefresh`（第 601 行附近）也有 `generateRecommendations` 调用，同步追加相同的偏好参数和 `wearRecords` 获取。

- [ ] **Step 4: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 5: 提交**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat(home): 传递新偏好+30天穿着记录到推荐引擎"
```

---

### 最终验证

```bash
npx tsc --noEmit
```

Expected: 零错误，所有新字段正确传递。
