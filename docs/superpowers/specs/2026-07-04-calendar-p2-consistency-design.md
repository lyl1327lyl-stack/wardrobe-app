# 日历模块 P2：交互一致性（N7 全统一 + N8 + N9 MonthCalendar）

## Context

P2 解决日历/记录模块的交互不一致。审计确认：

- **N7**：添加穿着记录有 4 个入口，行为四分五裂——主页/日历 sheet/搭配详情/衣服详情各用不同界面、不同默认日期、不同写入路径。搭配详情最严重：今天专属、只能 append、无法选日期、看不到当天已有记录。日历 sheet 还内嵌了一套 ~200 行的重复 picker。
- **N8**：搭配记录的基数不一致（RecordWear 单选、sheet 多选），且从不出存 outfitId，日历靠 set-match 反推搭配。
- **N9**：MonthCalendar 有 3 套实现——组件本身 + RecordWear 日期选择器（没传 outfitMatchMap + 双层卡片）+ 衣服详情手搓一套。图例硬编码在组件里。

## Goals

- **N7 全统一**：全 app 只剩**一个**添加记录面 `RecordWearScreen`。搭配详情「记录穿着」、日历 sheet「添加」都改为跳转 RecordWearScreen（带预设日期/搭配）。删掉 sheet 内嵌 picker。
- **N8**：随 N7 收敛——单一添加面 = 单一搭配基数（单选）。搭配详情走 RecordWear 后与主页同语义。
- **N9**：MonthCalendar 成为唯一月历实现。补 outfitMatchMap、修双层卡片、图例可配置、衣服详情改用组件。

## Non-Goals

- **不存 outfitId**（N8 数据模型层）——日历仍靠 set-match 反推搭配。这是更大的数据迁移，留待后续批次。本批只统一 UI 入口与基数。
- 不动 WearRecord 数据模型。
- 不改主页/衣服详情的「单件追加」语义（衣服详情点格加单件是上下文相关的直觉操作，保留）。
- 不做 N10/N11 性能、N12-N15 视觉（P3/P4）。

## N7：统一添加记录入口

### 唯一添加面：RecordWearScreen 接受路由参数

`RecordWear` 路由 params（全部可选）：

```ts
type RecordWearParams = { date?: string; outfitId?: number };
```

- `date`：预设记录日期（默认今天）
- `outfitId`：预设搭配（进入即选中该搭配的衣物 + 切到选搭配模式）

**RecordWearScreen 行为**：

| 来源 | params | 初始 selectedDate | 初始 selectedIds | 初始 mode |
|------|--------|------------------|-----------------|----------|
| 主页快捷 | 无 | 今天 | 当天已有记录（现有行为） | items |
| 日历 sheet「添加」 | `{ date: 选定日 }` | 选定日 | 当天已有记录 | items |
| 搭配详情「记录穿着」 | `{ date: 今天, outfitId }` | 今天 | 当天已有记录 ∪ outfit.itemIds | outfit |

实现要点：
- `selectedDate` 初值 = `params.date || todayDateStr()`
- 若 `outfitId`：找到 outfit，`selectedIds = union(当天已有记录, outfit.itemIds)`，`mode='outfit'`。用一次性 ref 防止日期 effect 在 mount 后覆盖 outfit 预选。
- 日期切换 effect（用户改日期）仍预选新日期的已有记录（现有行为不变）。
- `handleConfirm` 不变（统一 diff 保存 `replaceDayRecords`）。

### 搭配详情 → 跳 RecordWearScreen

`OutfitDetailScreen.handleRecordWear`（当前内联 `addWearRecords(outfit.itemIds, today)` + Alert）改为：

```ts
const handleRecordWear = () => {
  navigation.navigate('RecordWear', { date: todayDateStr(), outfitId: outfit.id });
};
```

删掉内联 addWearRecords 调用与成功/失败 Alert。用户在 RecordWear 里能看到当天已有记录、改日期、diff 保存。

### 日历 sheet「添加」→ 跳 RecordWearScreen

`WearCalendarSheet` 删掉整套内嵌 picker：
- 删 state：`showAddPicker`、`pickerMode`、`selectedAddIds`、`selectedOutfitIds`、picker 相关 filter state
- 删函数：`handleConfirmAdd`、`renderAddPicker`
- 「+」按钮与空状态「添加衣服」按钮 → 调 `onAddRecord()`（已有 prop），由父组件导航

`WearCalendarScreen.handleAddRecord` 改为：

```ts
const handleAddRecord = () => {
  setShowSheet(false);
  navigation.navigate('RecordWear', { date: selectedDate });
};
```

返回后刷新：WearCalendarScreen 加 `useFocusEffect` → `reloadAll()`，确保从 RecordWear 回到日历时月历 + 最近一周更新。

### 主页 / 衣服详情

- 主页：已走 RecordWear（无 param），不变。
- 衣服详情点格加单件：保留内联 `addWearRecord`（上下文直觉操作，单件追加语义合理）。不动。

## N8：搭配基数收敛

N7 全统一后，搭配记录只在 RecordWearScreen 发生（单选基数）。sheet 多选 picker 随 Task 4 删除。OutfitDetailScreen 走 RecordWear 后也是单选。基数一致。

数据模型（outfitId 持久化）见 Non-Goals，本批不做。

## N9：MonthCalendar 一致性

### 组件增强（MonthCalendar.tsx）

新增两个可选 prop：

```ts
interface MonthCalendarProps {
  // ...现有
  disableFuture?: boolean;        // 未来日期禁用（greyed + disabled）
  legendItems?: LegendItem[];     // 自定义图例，缺省=现有三项
}
interface LegendItem {
  label: string;
  color?: string;      // 圆点颜色
  icon?: string;       // 图标名（与 color 二选一）
}
```

- `disableFuture`：为 true 时，`dateStr > today` 的格子 `disabled={true}`、不响应 `onSelectDate`、日期文字用 `dayNumberEmpty` 灰色。
- `legendItems`：缺省渲染「已穿着 / 计划穿着 / 今天」三项；宿主可传自定义数组覆盖。

### RecordWear 日期选择器（修 3 处）

1. **补 outfitMatchMap**：RecordWearScreen 已有 `dateWearData` + `outfits`，照 WearCalendarScreen 的算法（`outfitMatchMap` useMemo）计算并传给选择器的 MonthCalendar。
2. **修双层卡片**：当前 `<Modal><View dateModalCard><MonthCalendar/></View></Modal>`，MonthCalendar 自带 `card`，外层 dateModalCard 又是卡片 → 嵌套。改为：Modal 内只放关闭按钮 + MonthCalendar（用其自带 card），去掉 dateModalCard 的卡片背景/圆角/阴影，只保留内边距定位。
3. **图例**：选择器传 `legendItems={[{label:'已穿着',color:primary}, {label:'今天',icon:'star'}]}`（去掉「计划穿着」——选择器场景不需要）。

### 衣服详情改用 MonthCalendar（ClothingDetailScreen）

删除手搓月历（`getCalendarStyles` 的 calendar* 样式 + 内联 dayGrid 渲染 ~1311-1345），改用 `<MonthCalendar>`：

- `wearData`：由 `wearDates` + 当前 `item` 构建 —— `{ [date]: [item] }`（每天显示该衣物自身缩略图）。
- `onSelectDate`：`disableFuture` 已禁未来；recorded → `handleDatePress`（开 sheet）；empty → `handleAddWearDate`（单件追加）。
- 不传 `outfitMatchMap`（单件视图无搭配）。
- 图例：用缺省三项（已穿着/计划/今天），或传自定义；保持原有「已穿着/计划」语义。
- `onPrevMonth/onNextMonth`：复用现有 `prevMonth/nextMonth` + `loadWearDates`。

保留 `getCalendarStyles` 中非月历部分（如有被别处复用）。calendar* 专属样式可删。

## 文件改动清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 改 | `src/components/MonthCalendar.tsx` | 加 `disableFuture` + `legendItems` prop |
| 改 | `src/screens/RecordWearScreen.tsx` | 接受 `{date?,outfitId?}` params + 预选逻辑；日期选择器补 outfitMap/修双层卡/图例 |
| 改 | `src/screens/outfit/OutfitDetailScreen.tsx` | 「记录穿着」改跳 RecordWear |
| 改 | `src/components/WearCalendarSheet.tsx` | 删内嵌 picker，添加按钮调 onAddRecord |
| 改 | `src/screens/WearCalendarScreen.tsx` | handleAddRecord 跳 RecordWear；加 useFocusEffect 刷新 |
| 改 | `src/screens/ClothingDetailScreen.tsx` | 手搓月历改用 MonthCalendar |
| 改 | `App.tsx` / 路由类型 | RecordWear params 类型（如需） |

## 验证场景

1. **主页→记录**：无 param，今天，预选当天已有记录。
2. **搭配详情→记录穿着**：跳 RecordWear，今天，outfit 衣物已选 + 选搭配模式高亮，当天已有记录也勾选（union）。
3. **日历 sheet→添加**：关闭 sheet，跳 RecordWear 预设选定日；记录后返回，月历 + 最近一周已刷新。
4. **sheet 内嵌 picker 已删**：sheet 里点「+」直接跳走，无内嵌选择 UI。
5. **outfit 预选后改日期**：union 行为仅 mount 时；改日期后预选新日期已有记录（不带 outfit）。
6. **RecordWear 日期选择器**：与日历页同一天显示相同的搭配缩略图；无双层卡片；图例无「计划穿着」。
7. **衣服详情月历**：复用组件；已穿日期显示该衣物缩略图；点已穿日期开 sheet；点过去空日期加单件；未来日期禁用。
8. **disableFuture**：未来格子灰色不可点。
9. **图例可配置**：不同宿主图例不同，缺省仍三项。
10. **TypeScript 编译通过。**
