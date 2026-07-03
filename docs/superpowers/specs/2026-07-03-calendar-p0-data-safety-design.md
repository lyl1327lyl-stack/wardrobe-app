# 日历模块 P0：记录保存数据安全 + 刷新联动（N1 + N2）

## Context

日历模块 P0 两个数据正确性问题：

- **N1 覆盖式保存无事务**：[RecordWearScreen.tsx:467](src/screens/RecordWearScreen.tsx#L467) `handleConfirm` 先 `deleteWearRecordsByDate(整天)` 再 `addWearRecords(重写)`。中途失败（add 抛错）→ 当天原始记录已被删且未恢复 → **数据丢失**。进入页面时还会预选当天全部记录（编辑语义），用户感知是"编辑"，但底层是"先全删再写"。
- **N2 刷新不联动**：[WearCalendarScreen.tsx:264-271](src/screens/WearCalendarScreen.tsx#L264) 删除/添加记录后只调 `loadMonthData()`，**漏了 `loadRecentWeek`**。结果月历格子更新了，"最近一周"卡片还显示旧数据，UI 与 DB 不一致。Sheet 自己又 `loadRecords` 刷一遍（[WearCalendarSheet.tsx:461](src/components/WearCalendarSheet.tsx#L461)），三套刷新各刷各的。

## Goals

- **N1**：消除"先删后写"的数据丢失窗口。保存改为 **diff（增量）**：新增的 add、多余的 delete，**先 add 后 delete**，任何中途失败都不丢原有数据。
- **N2**：删除/添加后月历 + 最近一周同步刷新。

## Non-Goals

- 不动"至少 2 件限制"和"追加 vs 编辑语义"（N6，P1）。
- 不改 WearRecord 数据模型。
- 不改 outfit 模式 / 三入口一致性（N7/N8，P2）。
- 不做事务/批量 SQL（diff 已足够安全，YAGNI）。

## N1：diff 保存

### 方案：store 加 `replaceDayRecords(date, clothingIds)`

把"覆盖当天记录"的语义收进 store，内部做安全 diff。UI 只调一个方法，不碰 delete/add 细节。

**新 action**（`wardrobeStore.ts`，仿 `addWearRecords`/`deleteWearRecordsByDate`）：

```ts
replaceDayRecords: async (clothingIds: number[], date: string) => {
  const existing = await wearRecordsDb.getWearRecordsByDate(date);
  const existingIds = new Set(existing.map(r => r.clothingId));
  const targetSet = new Set(clothingIds);

  const toAdd = clothingIds.filter(id => !existingIds.has(id));
  const toRemove = existing.filter(r => !targetSet.has(r.clothingId));

  // 先 add 新的（失败也不影响原有数据）
  if (toAdd.length > 0) {
    await get().addWearRecords(toAdd, date);
  }
  // 再 delete 多余的（add 已成功，删多余的；失败则留下多余，用户可重试，不丢数据）
  for (const rec of toRemove) {
    await get().deleteWearRecord(rec.id);
  }
},
```

**关键安全保证**：
- 不再"先删全部"——原有记录直到 add 成功后才删多余的。
- `addWearRecords` 内部已对当天去重（[wardrobeStore.ts:785](src/store/wardrobeStore.ts#L785)），toAdd 是真正新增的。
- 顺序 **add → delete**：最坏情况是 add 成功后 delete 失败 → 当天多了几件（用户重存即可），**绝不会少**。
- wearCount/lastWornAt 由 addWearRecords（+1）和 deleteWearRecord（-1）各自维护，diff 自动平衡。

### RecordWearScreen 改动

[handleConfirm](src/screens/RecordWearScreen.tsx#L461)：

```ts
const handleConfirm = async () => {
  if (selectedIds.length < 2) {
    Alert.alert('提示', '请至少选择 2 件单品');
    return;
  }
  try {
    await replaceDayRecords(selectedIds, selectedDate);
    navigation.goBack();
  } catch (error: any) {
    console.error('RecordWearScreen handleConfirm failed:', error);
    Alert.alert('记录失败', error?.message || '保存穿着记录时出错，请重试');
  }
};
```

- 解构 `replaceDayRecords`（替代 `deleteWearRecordsByDate` + `addWearRecords`，这两个若 RecordWearScreen 不再用可从解构移除——grep 确认）。
- 至少 2 件限制保留（N6 在 P1 处理）。

## N2：刷新联动

### WearCalendarScreen 抽 reloadAll

把 `loadMonthData` + `loadRecentWeek` 合成一个 `reloadAll`，删除/添加回调都调它。

```ts
const reloadAll = useCallback(async () => {
  await Promise.all([loadMonthData(), loadRecentWeek()]);
}, [loadMonthData, loadRecentWeek]);

const handleDeleteRecord = useCallback(async (recordId: number) => {
  await deleteWearRecord(recordId);
  reloadAll();
}, [deleteWearRecord, reloadAll]);

const handleAddRecord = useCallback(() => {
  reloadAll();
}, [reloadAll]);
```

（当前 `handleDeleteRecord`/`handleAddRecord` 只调 `loadMonthData`，补上 `loadRecentWeek`。）

### WearCalendarSheet

Sheet 自己的 `loadRecords`（删完刷当天列表）保留。Sheet 通过 `onDeleteRecord`/`onAddRecord` 回调通知父组件，父组件 `reloadAll` 刷月历+最近一周。两层刷新各司其职：sheet 刷当天列表，父刷月历+最近一周。**联动**通过回调实现。

## 文件改动清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 改 | `src/store/wardrobeStore.ts` | 加 `replaceDayRecords` action（diff：先 add 后 delete） |
| 改 | `src/screens/RecordWearScreen.tsx` | handleConfirm 改调 replaceDayRecords；解构更新 |
| 改 | `src/screens/WearCalendarScreen.tsx` | 抽 reloadAll，handleDeleteRecord/handleAddRecord 调它 |

## 验证场景

1. **N1 数据安全**：编辑某天 3 件 → 减到 2 件保存 → 当天剩 2 件（diff 删了 1 件），wearCount 对应 -1。模拟 add 失败（断网/抛错）→ 原有 3 件仍在（不丢）。
2. **N1 新增**：空的一天加 3 件 → 全 add，无 delete。
3. **N1 全删**：当天 3 件全取消保存 → 全 delete（toAdd 空，toRemove 3 个）。注意：当前 UI 至少 2 件限制，全删场景暂时不可达，但 store 支持。
4. **N2 刷新**：月历点某天 → sheet 删一件 → 关闭 sheet → 月历格子更新 + **最近一周也更新**（之前最近一周不变）。
5. **N2 添加**：sheet 加一件 → 月历 + 最近一周都更新。
6. **TypeScript 编译通过**。

## Open Questions（实施时定）

- `replaceDayRecords` 里 `addWearRecords` 返回写入数量，是否需要在 UI 提示"已记录 N 件"？保持现状（静默 goBack）即可。
- `deleteWearRecord` 逐条 await（toRemove 多时慢），是否批量？当前一天最多十几件，串行可接受，YAGNI。
