# 首页重设计：平衡型 Dashboard 优化

## Context

当前首页（`src/screens/HomeScreen.tsx`）作为综合 dashboard，存在以下问题：

1. **衣橱插画占地过大**（高度 ≈ SCREEN_WIDTH / 1.5 ≈ 213px），每天都要滑过，挤占真正重要的内容
2. **统计卡视觉单薄**（只有 4 个类别数字 + 总数），icon 已被 `display: 'none'` 注释掉，不够"仪表盘"
3. **"今日已穿"状态隐蔽**：记录后只能在推荐卡按钮文字（"换成这套"）和近期穿搭的"今天"行里看到，缺乏首屏强提示
4. **近期穿搭信息密度低**：每天一行小缩略图，"今天"行没有视觉差异
5. **"最近添加" section 与衣橱 tab 重复**，价值低
6. **缺少统计页跳转入口**：统计 tab 要切 tab 才能到
7. **天气只显示数字**，没有"今天宜穿什么厚度"的提示

## Goals

- 让首页一屏内能看到更多有用信息（统计多维 + 今日状态）
- 移除冗余 section，让页面止于真正重要的内容
- 让"今日已穿"在首页有视觉强提示（绿色高亮 + ✓）
- 让天气从"信息"变成"穿衣建议"
- 让统计卡成为通往统计详情的入口

## Non-Goals

- 不改推荐卡内部设计（保留现有 2×2 网格 + 换一件栏 + 就穿这套/添加到搭配按钮）
- 不改推荐算法
- 不引入 FAB（用户已确认所有快捷入口都有重复，不需要）
- 不引入快捷入口栏（同上）
- 不增加 "最常穿" 等额外洞察（用户暂不要）

## 最终结构

新首页 `ScrollView` 内自上而下：

1. **Header**：`我的衣橱 ▾` + 天气 chip（含宜穿提示）
2. **插画 banner**（缩小）
3. **统计卡**（可点击跳转）
4. **推荐卡**（保留现有设计）
5. **近期穿搭**（今天行高亮）
6. 页面结束

## 详细设计

### 1. Header 天气 chip 扩展

**当前**：
```
☁ 22°C  上海
```

**新**：
```
☁ 22°C · 宜薄款
```

去掉城市（保留温度 + 天气图标 + 宜穿提示）。

#### 温度→宜穿映射（固定区间）

| 温度区间 | 提示文字 |
|---------|---------|
| `< 5°C` | 宜厚款（羽绒/大衣） |
| `5–10°C` | 宜厚款 |
| `10–15°C` | 适中外套 |
| `15–20°C` | 薄外套 |
| `20–25°C` | 宜薄款 |
| `25–30°C` | 清凉短袖 |
| `≥ 30°C` | 透气清凉 |

实现：在 `HomeScreen.tsx` 加一个纯函数 `getTempHint(temp: number): string`，Header 渲染时调用。

### 2. 插画缩小

**当前**：`src/screens/HomeScreen.tsx:159-163`，`height: CARD_WIDTH / ILLUSTRATION_ASPECT`（≈213px），`resizeMode: 'cover'`

**新**：固定高度 `80px`，`resizeMode: 'cover'`（图片会裁剪但视觉上是个 banner）。

修改 `styles.illustration` 的 `height` 字段即可。

### 3. 统计卡扩展 + 可点击

#### 新增数据维度

| 维度 | 计算 | 显示 |
|------|------|------|
| 总价 | `sum(item.price)` for non-deleted items | `¥1,234`（千分位） |
| 平均穿着次数 | `sum(item.wearCount) / clothing.length`，保留 1 位小数 | `3.2 次/件` |
| 沉睡件数 | `item.lastWornAt == null OR daysFromNow(lastWornAt) > 30` | `3 件` |

`daysFromNow` 复用已有的 `daysAgo` 函数（[HomeScreen.tsx:67-71](src/screens/HomeScreen.tsx#L67-L71)）。

#### 新布局

```
┌─────────────────────────────────────┐
│ 📊 衣橱概况          查看详情 ›      │  ← header row
├─────────────────────────────────────┤
│  12    8     5     3                │  ← category row（4 类）
│ 上装  下装  鞋   外套                │
├─────────────────────────────────────┤
│ ¥1,234   3.2      3                 │  ← new dimensions row
│ 总价   次/件   沉睡件                │
└─────────────────────────────────────┘
```

- 整张卡 `TouchableOpacity`，`onPress={() => navigation.navigate('统计')}`
- 右上角"查看详情 ›"作为可点击的视觉提示（使用 `theme.colors.primary` 配色）
- 卡片保留 `theme.shadows.lg` 阴影

#### 现有 `categoryIconWrap` 清理

`categoryIconWrap` 已 `display: 'none'`（[HomeScreen.tsx:189-191](src/screens/HomeScreen.tsx#L189-L191)）。本次删除该未用样式及对应的 `CATEGORY_COLORS` 数组、`PARENT_ICONS` 字典（仅 stats 卡使用，移除后没其他引用 → 一并删除）。

需先 grep 确认 `PARENT_ICONS` 在 `HomeScreen.tsx` 内的引用情况：当前在 stats card（已注释 icon）和 recent additions（line 724）使用。`recent additions` section 移除后即可整体删除。

### 4. 推荐卡

完全保留 [OutfitRecommendationCard.tsx](src/components/OutfitRecommendationCard.tsx) 当前实现，无改动。

### 5. 近期穿搭：今天行高亮

修改 [RecentOutfitCard.tsx](src/components/RecentOutfitCard.tsx) 的 dayRow 渲染逻辑：

- 检查 `day.date === todayDateStr()`（新增内部函数或 props）
- 命中时应用高亮样式：
  - 背景：`#EDF5EC`（淡绿）
  - 左侧 label：`#5D9E5D` + ✓ 前缀（如 `今日 ✓`）
  - 右侧追加件数标签：`3 件`（同样绿色）

新增样式 `dayRowToday`，与现有 `dayRow` 通过数组叠加。

### 6. 删除"最近添加" section

删除内容：

- `recentAdditions` useMemo（[HomeScreen.tsx:382-388](src/screens/HomeScreen.tsx#L382-L388)）
- section header（[HomeScreen.tsx:699-704](src/screens/HomeScreen.tsx#L699-L704)）
- 整个 horizontal ScrollView + empty state（[HomeScreen.tsx:705-742](src/screens/HomeScreen.tsx#L705-L742)）
- 相关样式：`recentStrip`、`recentItem`、`recentImageWrap`、`recentImage`、`recentPlaceholder`、`recentLabel`、`emptyState`、`emptyText`

## 文件改动清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 改 | [src/screens/HomeScreen.tsx](src/screens/HomeScreen.tsx) | 天气 chip 扩展、插画缩小、统计卡重写 + 跳转、删除最近添加 section、清理无用样式 |
| 改 | [src/components/RecentOutfitCard.tsx](src/components/RecentOutfitCard.tsx) | 今天行高亮（绿底 + ✓ + 件数） |

## 实施步骤

1. **HomeScreen：天气扩展**
   - 新增 `getTempHint(temp: number): string` 纯函数
   - 修改 Header 内天气 chip 渲染（去城市，加宜穿提示）

2. **HomeScreen：插画缩小**
   - 修改 `styles.illustration.height` 为 `80`，去掉 `ILLUSTRATION_ASPECT` 常量

3. **HomeScreen：统计卡重写**
   - 计算 3 个新维度（总价 / 平均 / 沉睡）的 useMemo
   - 重写 statsCard 内部布局：header row + category row + new dimensions row
   - 包裹 `TouchableOpacity`，`onPress={() => navigation.navigate('统计')}`

4. **HomeScreen：删除最近添加 section**
   - 删除 `recentAdditions` memo
   - 删除 JSX 渲染块
   - 删除相关样式
   - 删除 `PARENT_ICONS`、`CATEGORY_COLORS`（如确认无其他引用）

5. **RecentOutfitCard：今天行高亮**
   - 在 [RecentOutfitCard.tsx](src/components/RecentOutfitCard.tsx) 内部新增本地 `todayDateStr()` 辅助函数（与 HomeScreen 同样实现，无需抽到 utils）
   - 渲染 dayRow 时检查 `day.date === todayDateStr()`，命中则套用 `dayRowToday` 样式 + ✓ 前缀 + 件数标签
   - 注意：`historyDays` 只包含有记录的日期，今日未记录时该行天然不存在

6. **TypeScript 验证**

## 验证场景

1. **首页加载**：插画高度变小（≈80px），一屏能看到更多内容
2. **天气**：根据当前温度显示对应宜穿提示（如 22°C 显示"宜薄款"）
3. **统计卡**：显示 4 类别 + 总价/平均/沉睡 3 维度，整张可点击跳转到统计 tab
4. **近期穿搭**：
   - 今日有记录 → 今天行有绿色背景 + ✓ 标识 + 件数
   - 今日无记录 → 今天行不存在或显示为普通历史行
5. **最近添加**：section 已删除，页面止于近期穿搭
6. **TypeScript 编译通过**

## Open Questions（实施时再决定即可）

- 温度区间边界值（如 25.5°C）归到哪一档？建议向下取整（25.5 → 25–30 区间）。
- 沉睡件阈值（30 天）是否需要后续可配置？暂用常量。
