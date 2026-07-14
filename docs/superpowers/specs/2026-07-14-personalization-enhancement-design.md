# 推荐模块个性化增强 — 设计文档

> **日期:** 2026-07-14
> **范围:** 偏好系统 + 推荐引擎
> **模式:** 混合模式（显式问卷 + 隐式行为信号）

## 目标

扩展现有个性化推荐系统，新增 5 个显式偏好维度（问卷）和 3 个隐式行为信号（自动分析穿着历史），两者共同影响搭配推荐结果。

## 现状

现有偏好系统（`preferenceStore.ts`）包含 4 个维度：
- `preferredStyles: string[]` — 风格标签，多选
- `preferredColors: string[]` — 色系，多选
- `comfortVsAppearance: 'comfort' | 'balanced' | 'appearance'` — 舒适 vs 外观，单选
- `preferredScenes: string[]` — 场景，多选

推荐引擎（`outfitRecommender.ts`）通过 `scoreOutfits()` 中的加权评分接入偏好。

## 设计

### 1. 数据模型 — 新增 5 个显式字段

在 `SurveyPreferences` 接口中新增：

```typescript
repeatInterval: number | null;          // 1 | 3 | 7 | null（null = 无所谓）
explorationLevel: 'explore' | 'balanced' | 'conservative';
colorBoldness: 'safe' | 'moderate' | 'bold';
layeringPreference: 'often' | 'sometimes' | 'rarely';
accessoryUsage: 'often' | 'sometimes' | 'rarely';
```

**默认值（向后兼容）：** `null` / `'balanced'` / `'moderate'` / `'sometimes'` / `'sometimes'`

**存储：** `StoredPrefs` 同步新增字段，`persist()` 和 `load()` 处理序列化。旧数据加载时字段缺失 → 使用默认值。

### 2. 问卷 UI — 追加 5 题

**文件：** `src/components/PreferenceSurveySheet.tsx`

在现有 4 题后追加分隔标题「穿着习惯」，新增 5 题，每题 3 个 chip 单选：

| # | 问题 | 选项 |
|---|------|------|
| Q5 | 同一件单品隔多久再穿？ | 每天可重复 / 隔 3 天 / 隔 7 天 |
| Q6 | 搭配探索意愿？ | 多试新组合 / 均衡 / 穿已验证 |
| Q7 | 配色大胆程度？ | 中性保守 / 适中 / 大胆撞色 |
| Q8 | 外套/叠穿习惯？ | 经常叠穿 / 偶尔 / 几乎不 |
| Q9 | 包包/配饰使用？ | 经常搭配 / 偶尔 / 很少用 |

交互：chip 单选（点击切换），选中变主色。和现有 UI 风格一致。

原 Q4「场景」保持多选不变。

### 3. 隐式信号引擎

**文件：** `src/services/implicitSignals.ts`（新建）

纯函数模块，三个信号：

#### 3A. 单品冷落度加分 `getIdleBoost`

- 输入：`clothing[]`, `wearRecords[]`
- 逻辑：统计每件单品最近穿着距今天数
  - \> 14 天未穿 → boost +0.08
  - 从未穿过 → boost +0.12
  - 其他 → 0
- 输出：`Map<clothingId, boost>`

#### 3B. 品牌亲和度 `getBrandAffinity`

- 输入：`clothing[]`, `wearRecords[]`
- 逻辑：统计穿着记录中各品牌出现次数，取 Top 3 高频品牌（≥3 次）
- 输出：`Map<clothingId, boost>`（高频品牌单品 +0.05）

#### 3C. 厚薄温度感知 `getThicknessTempComfort`

- 输入：`wearRecords[]`, `clothing[]`, `currentWeather`
- 逻辑：取最近 30 天穿着，按温度区间（5°C 一档）统计用户实际穿的厚薄分布
  - 样本 < 5 → 回退硬编码规则
  - 样本 ≥ 5 → 当前温度下用户常穿的厚薄匹配 +0.06，不匹配 -0.1
- 输出：`Map<clothingId, comfortScore>`

### 4. 推荐引擎接入

**文件：** `src/services/outfitRecommender.ts`

**候选生成阶段（`generateCandidates`）：**
- `fw(id)` 权重函数中接入 `repeatInterval`、`idleBoost`、`brandAffinity`
- `repeatInterval`: 替换 `recencyMultiplier` 中的硬编码窗口（默认 7 → 用户选择的天数）
- `layeringPreference`: 调整 `outerProb`（'often' → 0.70, 'sometimes' → 0.50, 'rarely' → 0.15）
- `accessoryUsage`: 调整 `bagProb`（'often' → 0.70, 'sometimes' → 0.55, 'rarely' → 0.20）

**评分阶段（`scoreOutfits`）：**
- `explorationLevel`: 调整权重分配
  - explore: pairFreq 0.05, freshness 0.30
  - balanced: 保持现有权重
  - conservative: pairFreq 0.25, freshness 0.10
- `colorBoldness`: 
  - safe: CLASH_PAIRS 额外纳入相邻色组合 → 强化保守
  - bold: 放宽 `colorScore` 计算中的冲突惩罚系数（-1.0 → -0.5）
- 隐式信号 `thicknessTempComfort` 追加到 `weatherScore`

**主入口 `generateRecommendations()`：**
- 内部调用 `getWearRecordsByDateRange(最近30天)` 获取穿着历史
- 构建三个隐式信号 Map
- 传入候选生成和评分函数
- 主入口参数签名不变（保持向后兼容）

### 5. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/store/preferenceStore.ts` | 修改 | 新增 5 个字段 + 序列化 |
| `src/components/PreferenceSurveySheet.tsx` | 修改 | 追加 5 题 UI |
| `src/services/implicitSignals.ts` | 新建 | 隐式信号纯函数 |
| `src/services/outfitRecommender.ts` | 修改 | 接入新偏好和隐式信号 |
| `src/screens/HomeScreen.tsx` | 修改 | `loadRecommendations` 内部获取穿着历史 |

### 6. 向后兼容

- 所有新字段有合理默认值
- 旧版 AsyncStorage 数据加载时缺失字段 → 默认值填充
- 问卷 Sheet 可跳过 → 使用默认值
- `generateRecommendations()` 主入口签名不变
- 隐式信号在穿着历史不足（冷启动）时自动回退
