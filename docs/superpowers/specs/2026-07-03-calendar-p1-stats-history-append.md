# 日历模块 P1：月度统计 + 单品穿着历史 + 追加模式（N3 + N4 + N6）

## Context

日历模块 P1 三项改进，均独立于 P0（P0 已完成 diff 保存 + 刷新联动）。

- **N3**：WearCalendarScreen 缺少聚合统计，用户看不到"这个月穿了多少天/多少件"
- **N4**：ClothingDetailScreen 有月历点阵但无"最近穿了哪几天"的列表视图，用户想快速回顾单品穿着轨迹
- **N6**：RecordWearScreen 强制至少 2 件 + 只有"覆盖当天"语义，日常追加 1 件的场景被阻断

N5（计划穿着概念）保留原样不动。

## Goals

- **N3**：WearCalendarScreen 月历和最近一周之间加「月度概览」统计卡片，纯内存聚合 wearData
- **N4**：ClothingDetailScreen 备注和穿搭日历之间加「穿着记录」列表，显示最近 N 次穿着的日期 + 当日搭配上下文
- **N6**：RecordWearScreen 取消 2 件最低限制 → 1 件；加「追加/替换」模式切换

## Non-Goals

- 不动 MonthCalendar 的"计划穿着"概念（N5 保留）
- 不做 N+1 查询优化（P2）
- 不统一三入口（P2）
- 不做穿搭日历的 outfit 能力统一（P2）

## N3：月度概览统计卡片

### 位置

WearCalendarScreen，`<MonthCalendar>` 和「最近一周」卡片之间。

### 数据来源

`wearData` state（`Record<string, ClothingItem[]>`）——月历已有的每日数据。纯 `useMemo` 聚合，不额外查 DB。

### 卡片布局

```
┌──────────────────────────────────┐
│  📊 7月概览                       │
│                                  │
│   穿着天数     穿着件数     最高频次  │
│    18 天       23 件       5 次   │
│                                  │
│   最常穿 Top 3                    │
│   ┌────┐  ┌────┐  ┌────┐        │
│   │ 📷  │  │ 📷  │  │ 📷  │        │
│   └────┘  └────┘  └────┘        │
│   白T恤    牛仔裤    帆布鞋        │
└──────────────────────────────────┘
```

### 统计维度

| 指标 | 计算方式 | 说明 |
|------|---------|------|
| 穿着天数 | `Object.keys(wearData).filter(d => wearData[d].length > 0).length` | 本月有记录的天数 |
| 穿着件数 | `new Set(所有日期的 clothingId).size` | 本月穿过的去重衣物数 |
| 最高频次 | `max(Object.values(频次Map))` | 单件衣物本月最多穿几次 |
| 最常穿 Top 3 | 按频次降序取前 3，显示缩略图 + 名称 | 不足 3 件显示实际数量；0 件显示空状态 |

### 空状态

本月无记录时不显示统计卡片（或显示"本月暂无穿着记录"占位——实施时决定）。

### 实现

- `useMemo` 依赖 `[wearData, currentYear, currentMonth]`
- 缩略图复用 ClothingItem 的 `imageUri`，无图用占位色块
- 样式沿用项目 `makeStyles(theme)` 模式

## N4：单品穿着历史

### 位置

ClothingDetailScreen，备注卡片（`remarksCard`）和穿搭日历卡片（`wearCalendarCard`）之间。

### 数据来源

- `wearRecordsDb.getWearRecordsByClothing(clothingId)`（已有 DB 函数）取最近 15 条
- 每条再通过 `wearRecordsDb.getWearRecordsByDate(date)` 获取当天所有穿着记录（搭配上下文）

### 列表布局

```
┌──────────────────────────────────┐
│  📅 穿着记录                       │
│                                  │
│  7月3日  周三                     │
│  当日搭配: ┌──┐ ┌──┐ ┌──┐        │
│           │📷│ │📷│ │📷│        │
│           └──┘ └──┘ └──┘        │
│  7月1日  周一                     │
│  当日搭配: ┌──┐ ┌──┐             │
│           │📷│ │📷│             │
│           └──┘ └──┘             │
│         ⋮                        │
│        显示更多（共 23 次）         │
└──────────────────────────────────┘
```

### 交互

- 默认显示最近 5 条，超过时显示"展开全部 N 条"按钮
- 点击某条 → 可选：跳转 WearCalendarSheet（当天详情）。**实施时简化**：仅展示，不跳转——避免引入 sheet 依赖
- 当天其他衣物的缩略图点击无反应（只读展示）
- 无记录时显示"暂无穿着记录"

### 实现

- 组件内 `useEffect` 加载数据（`clothingId` 变化时重新加载）
- 日期格式：`M月D日 周X`
- 缩略图复用 ClothingItem 的 `imageUri`，通过 `allClothing` map 查找
- 样式沿用项目 `makeStyles(theme)` 模式

## N6：取消 2 件限制 + 追加模式

### 取消 2 件最低限制

- `handleConfirm` 中 `selectedIds.length < 2` → `selectedIds.length < 1`（即只判空）
- 确认按钮 `disabled` 条件：`selectedIds.length === 0`
- 最少 1 件即可保存

### 追加 / 替换模式

Header 下方新增 segmented control：

```
┌──────────────────────────────────┐
│  [追加记录]  [重新设置]            │
│  在当天已有基础上添加，不清除已有     │  ← 提示文字
└──────────────────────────────────┘
```

| | 追加模式（默认） | 替换模式 |
|---|---|---|
| **进入时** | 不预选已有记录 | 预选当天已有记录（当前行为） |
| **保存时** | `addWearRecords(selectedIds, date)` 只加不删 | `replaceDayRecords(selectedIds, date)` diff 覆盖 |
| **提示文字** | "在当天已有记录基础上追加" | "将重新设置当天全部穿着记录" |
| **最少件数** | 1 件 | 1 件 |

### 交互细节

- 默认进「追加」模式（日常使用更频繁、更安全）
- 切换模式时**不清空已选**（用户可能只是想换个模式，不是想重选）——与之前设计不同，实施时再确认
- 追加模式下，当天已有记录以提示条显示："今日已记录 N 件：白T恤、牛仔裤…"（从 DB 查一次）
- 已有记录的衣物在列表中显示已选标记（视觉区分，但不可取消——因为它们不是本次操作的对象）

### 实现

- 新增 state：`isAppendMode: boolean`（默认 `true`）
- `handleConfirm` 内分支：追加 → `addWearRecords`；替换 → `replaceDayRecords`
- `useEffect`（`selectedDate` 变化时）：替换模式预选已有记录（当前行为）；追加模式不预选，但查询已有记录用于提示
- 解构新增 `addWearRecords`（替换模式下 `replaceDayRecords` 已在 P0 加入）

## 文件改动清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 改 | `src/screens/WearCalendarScreen.tsx` | N3：加月度概览统计卡片（useMemo 聚合 wearData） |
| 改 | `src/screens/ClothingDetailScreen.tsx` | N4：加穿着记录列表（备注和日历之间） |
| 改 | `src/screens/RecordWearScreen.tsx` | N6：取消 2 件限制 + 追加/替换模式 |

## 验证场景

1. **N3 统计**：月历有 18 天数据 → 卡片显示 18 天 / N 件 / 最高频次 + Top 3 缩略图
2. **N3 空月**：切换到一个无记录的月份 → 卡片不显示或显示空状态
3. **N4 穿着历史**：打开一件常穿衣物 → 备注下方显示最近 5 条记录，含当日搭配缩略图
4. **N4 无记录**：打开一件从未穿过的衣物 → 显示"暂无穿着记录"
5. **N4 展开**：有 15 条记录 → 默认 5 条 + "展开全部 15 条"按钮 → 点击展开
6. **N6 1 件保存**：追加模式选 1 件 → 确认按钮可点击 → 保存成功
7. **N6 追加**：当天已有 2 件 → 追加模式选 1 件新 → 保存后当天共 3 件
8. **N6 替换**：当天已有 3 件 → 切换替换模式 → 预选 3 件 → 取消 1 件 → 保存后当天剩 2 件
9. **N6 切换模式**：追加模式已选 2 件 → 切到替换模式 → 已选保留，预选已有记录合并
10. **TypeScript 编译通过**
