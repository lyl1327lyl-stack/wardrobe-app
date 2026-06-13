# 首页平衡型 Dashboard 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首页从"大插画 + 单薄统计 + 冗余 section"重设计为"信息密集 dashboard + 可点击统计 + 今日高亮"，并删除最近添加 section。

**Architecture:** 主要改动集中在 `HomeScreen.tsx`（天气扩展、插画缩小、统计卡多维+跳转、删除最近添加），辅以 `RecentOutfitCard.tsx`（今日行高亮）。不引入新组件，不改动推荐卡。

**Tech Stack:** React Native + Expo、TypeScript、`@react-navigation/native`、`@expo/vector-icons`、`zustand`。

**Reference spec:** [docs/superpowers/specs/2026-06-13-home-screen-redesign-design.md](../specs/2026-06-13-home-screen-redesign-design.md)

**Testing note:** 项目无单元测试框架，每个任务用 `npx tsc --noEmit` 验证类型，最后做一次启动 + 视觉走查。

---

### Task 1: 新增温度→宜穿提示函数 + 更新 Header 天气 chip

**Files:**
- Modify: `src/screens/HomeScreen.tsx`（在文件顶部 helper 区加函数，改 Header JSX）

- [ ] **Step 1: 新增 `getTempHint` 纯函数**

在 [src/screens/HomeScreen.tsx](src/screens/HomeScreen.tsx) 文件中，找到 `function todayDateStr()` 函数（约第 62 行），在它**之前**插入：

```ts
/** 温度区间 → 宜穿提示文字（固定映射） */
function getTempHint(temp: number): string {
  if (temp < 5) return '宜厚款';
  if (temp < 10) return '宜厚款';
  if (temp < 15) return '适中外套';
  if (temp < 20) return '薄外套';
  if (temp < 25) return '宜薄款';
  if (temp < 30) return '清凉短袖';
  return '透气清凉';
}
```

- [ ] **Step 2: 修改 Header 天气 chip 文字**

找到 Header 区域这段（约第 578-594 行）：

```tsx
{weather && (
  <View style={styles.headerWeather}>
    <Ionicons
      name={
        weather.condition === '晴' ? 'sunny' :
        weather.condition === '多云' ? 'partly-sunny' :
        weather.condition === '阴' ? 'cloudy' :
        weather.condition === '雨' ? 'rainy' :
        weather.condition === '雪' ? 'snow' :
        'cloudy'
      }
      size={14}
      color={PALETTE.textSecondary}
    />
    <Text style={styles.headerWeatherText}>{weather.temperature}°C  {weather.city}</Text>
  </View>
)}
```

替换 `<Text>` 行为：

```tsx
<Text style={styles.headerWeatherText}>{weather.temperature}°C · {getTempHint(weather.temperature)}</Text>
```

（去掉 `{weather.city}`，加宜穿提示）

- [ ] **Step 3: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错输出。

- [ ] **Step 4: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: 首页天气扩展为温度+宜穿提示"
```

---

### Task 2: 缩小衣橱插画 banner

**Files:**
- Modify: `src/screens/HomeScreen.tsx`（删常量、改样式）

- [ ] **Step 1: 删除 `ILLUSTRATION_ASPECT` 常量**

找到这行（约第 94 行）并删除：

```ts
const ILLUSTRATION_ASPECT = 1536 / 1024;
```

- [ ] **Step 2: 修改 `styles.illustration` 样式**

找到 `illustration` 样式（约第 159-163 行）：

```ts
illustration: {
  width: CARD_WIDTH,
  height: CARD_WIDTH / ILLUSTRATION_ASPECT,
  resizeMode: 'cover',
},
```

替换为：

```ts
illustration: {
  width: CARD_WIDTH,
  height: 80,
  resizeMode: 'cover',
},
```

- [ ] **Step 3: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错输出。

- [ ] **Step 4: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "style: 首页插画缩小为 80px banner"
```

---

### Task 3: 新增统计 3 维度计算 memo

**Files:**
- Modify: `src/screens/HomeScreen.tsx`（在 `attributeTips` memo 之后加新 memo）

- [ ] **Step 1: 新增 `wardrobeInsights` useMemo**

找到 `attributeTips` memo（约第 390 行）：

```ts
const attributeTips = useMemo(() => analyzeAttributeGaps(clothing), [clothing]);
```

在它**之后**新增：

```ts
// 统计扩展维度：总价、平均穿着、沉睡件数
const wardrobeInsights = useMemo(() => {
  const active = clothing.filter(c => !c.deletedAt);
  const totalPrice = active.reduce((sum, c) => sum + (c.price || 0), 0);
  const avgWearCount = active.length > 0
    ? active.reduce((sum, c) => sum + (c.wearCount || 0), 0) / active.length
    : 0;
  const SLEEP_THRESHOLD_DAYS = 30;
  const now = Date.now();
  const sleepingCount = active.filter(c => {
    if (!c.lastWornAt) return true; // 从未穿过
    const days = Math.floor((now - new Date(c.lastWornAt).getTime()) / (1000 * 60 * 60 * 24));
    return days > SLEEP_THRESHOLD_DAYS;
  }).length;
  return { totalPrice, avgWearCount, sleepingCount };
}, [clothing]);
```

- [ ] **Step 2: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错输出（memo 暂未被使用，但 TypeScript 不会因未使用变量报错——若开启了 `noUnusedLocals`，则继续 Task 4 让它被使用）。

- [ ] **Step 3: 暂不 Commit**

继续 Task 4 一并 commit。

---

### Task 4: 重写统计卡 JSX（多维 + 可点击跳转）

**Files:**
- Modify: `src/screens/HomeScreen.tsx`（替换 statsCard JSX、新增样式）

- [ ] **Step 1: 替换 statsCard JSX**

找到 statsCard JSX 块（约第 610-633 行）：

```tsx
{/* ── 数据统计条 ── */}
<View style={styles.statsCard}>
  <View style={styles.categoryRow}>
    {categoryStats.slice(0, 4).map(([cat, count], i) => (
      <View key={cat} style={styles.categoryItem}>
        <View style={[styles.categoryIconWrap, { backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] + '20' }]}>
          <Ionicons
            name={(PARENT_ICONS[cat] || 'grid-outline') as any}
            size={18}
            color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
          />
        </View>
        <Text style={styles.categoryCount}>{count}</Text>
        <Text style={styles.categoryName}>{cat}</Text>
      </View>
    ))}
  </View>
  <View style={styles.statsDivider} />
  <View style={styles.totalRow}>
    <Ionicons name="shirt-outline" size={14} color={PALETTE.primary} />
    <Text style={styles.totalLabel}>衣橱总数</Text>
    <Text style={styles.totalCount}>{totalCount} 件</Text>
  </View>
</View>
```

替换为：

```tsx
{/* ── 数据统计卡（可点击跳转统计页）── */}
<TouchableOpacity
  style={styles.statsCard}
  activeOpacity={0.7}
  onPress={() => navigation.navigate('统计')}
>
  <View style={styles.statsHeader}>
    <View style={styles.statsHeaderLeft}>
      <View style={styles.statsHeaderIcon}>
        <Ionicons name="bar-chart-outline" size={14} color={PALETTE.primary} />
      </View>
      <Text style={styles.statsHeaderTitle}>衣橱概况</Text>
    </View>
    <Text style={styles.statsHeaderLink}>查看详情 ›</Text>
  </View>

  <View style={styles.categoryRow}>
    {categoryStats.slice(0, 4).map(([cat, count]) => (
      <View key={cat} style={styles.categoryItem}>
        <Text style={styles.categoryCount}>{count}</Text>
        <Text style={styles.categoryName}>{cat}</Text>
      </View>
    ))}
  </View>

  <View style={styles.statsDivider} />

  <View style={styles.insightsRow}>
    <View style={styles.insightItem}>
      <Text style={styles.insightValue}>¥{wardrobeInsights.totalPrice.toLocaleString()}</Text>
      <Text style={styles.insightLabel}>总价</Text>
    </View>
    <View style={styles.insightItem}>
      <Text style={styles.insightValue}>{wardrobeInsights.avgWearCount.toFixed(1)}</Text>
      <Text style={styles.insightLabel}>次/件</Text>
    </View>
    <View style={styles.insightItem}>
      <Text style={[styles.insightValue, { color: PALETTE.warning }]}>{wardrobeInsights.sleepingCount}</Text>
      <Text style={styles.insightLabel}>沉睡件</Text>
    </View>
    <View style={styles.insightItem}>
      <Text style={styles.insightValue}>{totalCount}</Text>
      <Text style={styles.insightLabel}>总数</Text>
    </View>
  </View>
</TouchableOpacity>
```

- [ ] **Step 2: 新增/替换样式**

在 `styles` 对象内找到现有 `statsCard` ~ `totalRow` 区段，做如下改动：

**a) 改 `statsCard`**：

```ts
statsCard: {
  marginHorizontal: CARD_H_PADDING,
  marginTop: 16,
  backgroundColor: PALETTE.card,
  borderRadius: 16,
  padding: 18,
  shadowColor: PALETTE.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 10,
  elevation: 3,
},
```
（保持不变）

**b) 删除 `categoryIconWrap`**：

```ts
categoryIconWrap: {
  display: 'none' as 'none',
},
```
整段删除。

**c) 新增 `statsHeader`、`statsHeaderLeft`、`statsHeaderIcon`、`statsHeaderTitle`、`statsHeaderLink`、`insightsRow`、`insightItem`、`insightValue`、`insightLabel`**，插在 `categoryRow` 之前：

```ts
statsHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 14,
},
statsHeaderLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
statsHeaderIcon: {
  width: 26,
  height: 26,
  borderRadius: 8,
  backgroundColor: PALETTE.primaryLight,
  justifyContent: 'center',
  alignItems: 'center',
},
statsHeaderTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: PALETTE.text,
},
statsHeaderLink: {
  fontSize: 12,
  color: PALETTE.primary,
  fontWeight: '500',
},
insightsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 4,
},
insightItem: {
  alignItems: 'center',
  flex: 1,
},
insightValue: {
  fontSize: 15,
  fontWeight: '700',
  color: PALETTE.primary,
},
insightLabel: {
  fontSize: 11,
  color: PALETTE.textSecondary,
  marginTop: 2,
},
```

**d) 删除 `totalRow`、`totalLabel`、`totalCount`** 样式（整段删除）。

- [ ] **Step 3: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错输出。

- [ ] **Step 4: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: 首页统计卡扩展多维+可点击跳转统计页"
```

---

### Task 5: 删除"最近添加" section

**Files:**
- Modify: `src/screens/HomeScreen.tsx`（删 JSX、memo、样式、未用常量）

- [ ] **Step 1: 删除"最近添加" JSX**

找到这段（约第 676-742 行，从注释 `{/* ── 最近添加 ── */}` 开始，到对应 emptyState `</View>` 结束），整段删除：

```tsx
{/* ── 最近添加 ── */}
<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>最近添加</Text>
  <TouchableOpacity onPress={goToWardrobe} activeOpacity={0.7}>
    <Text style={styles.sectionLink}>更多 &gt;</Text>
  </TouchableOpacity>
</View>
{recentAdditions.length > 0 ? (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.recentStrip}
  >
    {recentAdditions.map(item => (
      // ... 全部内容 ...
    ))}
  </ScrollView>
) : (
  <View style={styles.emptyState}>
    <Ionicons name="add-circle-outline" size={28} color={PALETTE.border} />
    <Text style={styles.emptyText}>去添加你的第一件衣服吧</Text>
  </View>
)}
```

- [ ] **Step 2: 删除 `recentAdditions` memo**

找到并删除（约第 382-388 行）：

```ts
const recentAdditions = useMemo(
  () =>
    [...clothing]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8),
  [clothing],
);
```

- [ ] **Step 3: 删除 `goToWardrobe` 函数**

找到并删除（约第 574 行）：

```ts
const goToWardrobe = () => navigation.navigate('衣橱');
```

- [ ] **Step 4: 删除未使用的常量 `PARENT_ICONS` 和 `CATEGORY_COLORS`**

找到（约第 50-58 行）：

```ts
const PARENT_ICONS: Record<string, string> = {
  '上装': 'shirt-outline',
  '下装': 'layers-outline',
  // ...
};
```

整段删除。

找到（约第 60 行）：

```ts
const CATEGORY_COLORS = [PALETTE.primary, PALETTE.accentRose, PALETTE.accentBlue, PALETTE.accentTaupe];
```

整段删除。

- [ ] **Step 5: 删除未使用的样式**

删除以下样式 key（在 `styles` 对象内）：

- `recentStrip`
- `recentItem`
- `recentImageWrap`
- `recentImage`
- `recentPlaceholder`
- `recentLabel`
- `emptyState`
- `emptyText`
- `sectionHeader`（如果只在最近添加用了——需先 grep 确认）
- `sectionTitle`（同上）
- `sectionLink`（同上）

**重要**：先 grep 确认 `sectionHeader`/`sectionTitle`/`sectionLink` 是否还有其他引用（"今日穿搭推荐" section 也用了 `sectionHeader`/`sectionTitle`）。若有其他引用就**不要删**。

Run: `cd c:/Users/lyl/wardrobe-app && grep -n "sectionHeader\|sectionTitle\|sectionLink" src/screens/HomeScreen.tsx`

Expected: 如果只剩下样式定义本身（没有 JSX 引用），可以删；否则保留。

- [ ] **Step 6: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错输出。若报 `noUnusedLocals` 错误，根据报错继续清理未用变量。

- [ ] **Step 7: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "refactor: 删除首页最近添加 section 及未用样式"
```

---

### Task 6: RecentOutfitCard 今日行高亮

**Files:**
- Modify: `src/components/RecentOutfitCard.tsx`（新增本地 helper、改 dayRow 渲染、加样式）

- [ ] **Step 1: 新增本地 `todayDateStr` 辅助函数**

在 [src/components/RecentOutfitCard.tsx](src/components/RecentOutfitCard.tsx) 文件顶部，找到 `function formatDateLabel` 之前（约第 20 行），插入：

```ts
function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
```

- [ ] **Step 2: 修改 dayRow 渲染**

找到渲染 dayRow 的 map（约第 193-220 行）：

```tsx
{historyDays.map((day, i) => {
  const isLast = i === historyDays.length - 1;
  const maxShow = 5;
  const overflow = day.thumbnails.length - maxShow;
  return (
    <View key={day.date} style={[styles.dayRow, isLast && styles.dayRowLast]}>
      <Text style={styles.dayLabel}>{day.label}</Text>
      <View style={styles.dayThumbs}>
        {day.thumbnails.slice(0, maxShow).map(t => (
          // ...
        ))}
        {overflow > 0 && (
          <View style={styles.moreBadge}>
            <Text style={styles.moreText}>+{overflow}</Text>
          </View>
        )}
      </View>
    </View>
  );
})}
```

替换 `<Text style={styles.dayLabel}>{day.label}</Text>` 这一行，以及 dayRow 容器：

```tsx
{historyDays.map((day, i) => {
  const isLast = i === historyDays.length - 1;
  const isToday = day.date === todayDateStr();
  const maxShow = 5;
  const overflow = day.thumbnails.length - maxShow;
  return (
    <View key={day.date} style={[styles.dayRow, isLast && styles.dayRowLast, isToday && styles.dayRowToday]}>
      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
        {isToday ? `今日 ✓` : day.label}
      </Text>
      <View style={styles.dayThumbs}>
        {day.thumbnails.slice(0, maxShow).map(t => (
          <View key={t.id} style={styles.thumbWrap}>
            {t.uri ? (
              <Image source={{ uri: t.uri }} style={styles.thumbImg} />
            ) : (
              <View style={[styles.thumbWrap, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="shirt-outline" size={16} color="#9B9B9B" />
              </View>
            )}
          </View>
        ))}
        {overflow > 0 && (
          <View style={styles.moreBadge}>
            <Text style={styles.moreText}>+{overflow}</Text>
          </View>
        )}
        {isToday && (
          <Text style={styles.todayCount}>{day.thumbnails.length} 件</Text>
        )}
      </View>
    </View>
  );
})}
```

注意：原代码 `color={theme.colors.textTertiary}` 改为硬编码 `#9B9B9B` 是为了避免在 map 回调中引用 `theme`（确认 `theme` 在作用域内则保留原写法——检查文件顶部 `const { theme } = useTheme();` 是否在组件作用域。是的话保留 `theme.colors.textTertiary`）。

**实现时优先保留原 `theme.colors.textTertiary` 写法**，上面的硬编码只是 fallback。

- [ ] **Step 3: 新增样式**

在 `makeStyles(theme)` 函数内，找到 `dayRowLast` 样式之后，新增：

```ts
dayRowToday: {
  backgroundColor: '#EDF5EC',
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 8,
  marginHorizontal: -2,
  marginVertical: 2,
},
dayLabelToday: {
  color: '#5D9E5D',
  fontWeight: '700',
},
todayCount: {
  fontSize: 10,
  fontWeight: '600',
  color: '#5D9E5D',
  marginLeft: 'auto',
},
```

- [ ] **Step 4: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错输出。

- [ ] **Step 5: Commit**

```bash
git add src/components/RecentOutfitCard.tsx
git commit -m "feat: 近期穿搭卡今日行绿色高亮 + 件数标识"
```

---

### Task 7: 整体类型 + 视觉走查

**Files:**
- 无文件改动，仅验证

- [ ] **Step 1: 全项目类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无任何报错输出。

- [ ] **Step 2: 启动 Expo dev server**

Run: `cd c:/Users/lyl/wardrobe-app && npx expo start`
（手动在 Expo Go 中打开，无法在此自动验证）

- [ ] **Step 3: 视觉走查清单**

按以下场景检查（人工目测）：

1. **天气 chip**：Header 右上角显示 `☁ X°C · 宜 X 款` 格式，无城市名
2. **插画**：高度明显变小（约 80px），呈现为 banner
3. **统计卡**：
   - 顶部有"📊 衣橱概况  查看详情 ›"header
   - 中间 4 个类别数字 + 名称
   - 底部 4 个新维度（总价/次件/沉睡件/总数）
   - 整张卡可点击 → 跳转到统计 tab
4. **推荐卡**：完全保留原样（2×2 网格 + 换一件 + 就穿这套/添加到搭配）
5. **近期穿搭**：
   - 如果今日有记录：今天行有**绿色背景** + `今日 ✓` label + 件数
   - 历史行无背景色
6. **页面底部**：止于近期穿搭，无"最近添加" section
7. **无 TypeScript / 运行时报错**

- [ ] **Step 4: 最终 Commit（如有 fixup）**

如果走查中发现小问题并修复：

```bash
git add <fixed-files>
git commit -m "fix: 首页重设计走查修复"
```

---

## Self-Review

**Spec coverage 检查**：

| Spec 章节 | 对应 Task |
|----------|----------|
| 1. Header 天气 chip 扩展 | Task 1 |
| 2. 插画缩小 | Task 2 |
| 3. 统计卡多维 + 可点击 | Task 3 + Task 4 |
| 4. 推荐卡（保留） | 不需要 Task（明确不改） |
| 5. 近期穿搭今日高亮 | Task 6 |
| 6. 删除最近添加 | Task 5 |

**Placeholder 扫描**：无 TBD/TODO/「类似上文」。所有步骤包含具体代码。

**Type 一致性**：`wardrobeInsights` 在 Task 3 定义、Task 4 使用，字段名（`totalPrice`/`avgWearCount`/`sleepingCount`）一致。`todayDateStr` 在 Task 6 Step 1 定义、Step 2 使用。`navigation.navigate('统计')` 与 `App.tsx:123` 注册的 Tab 名一致。
