# 日历模块 P0：记录 diff 保存 + 刷新联动 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 RecordWearScreen 覆盖式保存的数据丢失风险（改 diff：先 add 后 delete），并修复 WearCalendarScreen 删除/添加后"最近一周"不刷新的问题。

**Architecture:** store 加 `replaceDayRecords(date, clothingIds)` 收进"覆盖当天"语义，内部 diff（查现有 → toAdd/toRemove → 先 add 后 delete，失败不丢原有数据）；RecordWearScreen 改调它；WearCalendarScreen 抽 `reloadAll`（月历+最近一周），删除/添加回调调它。

**Tech Stack:** React Native + Expo、TypeScript、`zustand`（wardrobeStore）、`expo-sqlite`（wearRecordsDb）。

**Reference spec:** [docs/superpowers/specs/2026-07-03-calendar-p0-data-safety-design.md](../specs/2026-07-03-calendar-p0-data-safety-design.md)

**Testing note:** 项目无单元测试框架。每个任务用 `npx tsc --noEmit` 验证类型，最后手动走查。

---

## 文件结构

| 操作 | 文件 | 责任 |
|------|------|------|
| 改 | `src/store/wardrobeStore.ts` | 加 `replaceDayRecords` action（接口声明 + 实现） |
| 改 | `src/screens/RecordWearScreen.tsx` | handleConfirm 改调 replaceDayRecords；解构更新 |
| 改 | `src/screens/WearCalendarScreen.tsx` | 抽 reloadAll，handleDeleteRecord/handleAddRecord 调它 |

顺序：Task 1（store action）→ Task 2（RecordWearScreen 用它）→ Task 3（WearCalendarScreen 刷新）。Task 2/3 互相独立。

---

### Task 1: store 加 replaceDayRecords

**Files:**
- Modify: `src/store/wardrobeStore.ts`

- [ ] **Step 1: 接口声明加 replaceDayRecords**

找到接口声明（约 line 109-111）：

```ts
  addWearRecords: (clothingIds: number[], date: string) => Promise<number>;
  deleteWearRecord: (id: number) => Promise<void>;
  deleteWearRecordsByDate: (date: string) => Promise<void>;
```

在 `deleteWearRecordsByDate` 之后加一行：

```ts
  addWearRecords: (clothingIds: number[], date: string) => Promise<number>;
  deleteWearRecord: (id: number) => Promise<void>;
  deleteWearRecordsByDate: (date: string) => Promise<void>;
  replaceDayRecords: (clothingIds: number[], date: string) => Promise<void>;
```

- [ ] **Step 2: 实现 replaceDayRecords**

找到 `deleteWearRecordsByDate` 实现的末尾（约 line 869 开始，找到它的闭合 `},`）。在 `deleteWearRecordsByDate` 实现之后加：

```ts
  replaceDayRecords: async (clothingIds, date) => {
    // diff 保存：先 add 新增，再 delete 多余。失败不丢原有数据。
    const existing = await wearRecordsDb.getWearRecordsByDate(date);
    const existingIds = new Set(existing.map(r => r.clothingId));
    const targetSet = new Set(clothingIds);

    const toAdd = clothingIds.filter(id => !existingIds.has(id));
    const toRemove = existing.filter(r => !targetSet.has(r.clothingId));

    // 先 add 新的（失败不影响原有数据）
    if (toAdd.length > 0) {
      await get().addWearRecords(toAdd, date);
    }
    // 再 delete 多余的（add 已成功；失败则留下多余，用户可重试，绝不丢数据）
    for (const rec of toRemove) {
      await get().deleteWearRecord(rec.id);
    }
  },
```

`wearRecordsDb`、`get()` 在 store 作用域内可用（参考 addWearRecords/deleteWearRecordsByDate 的写法）。`addWearRecords`/`deleteWearRecord` 是 store 自身方法，通过 `get()` 调用（它们各自维护 wearCount ±1 和 lastWornAt，diff 自动平衡）。

- [ ] **Step 3: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 4: Commit**

```bash
git add src/store/wardrobeStore.ts
git commit -m "feat: wardrobeStore 加 replaceDayRecords（diff 保存，先 add 后 delete 防数据丢失）"
```

---

### Task 2: RecordWearScreen 改调 replaceDayRecords

**Files:**
- Modify: `src/screens/RecordWearScreen.tsx`

- [ ] **Step 1: 解构替换**

找到（约 line 322-323）：

```ts
  const addWearRecords = useWardrobeStore(s => s.addWearRecords);
  const deleteWearRecordsByDate = useWardrobeStore(s => s.deleteWearRecordsByDate);
```

替换为一个：

```ts
  const replaceDayRecords = useWardrobeStore(s => s.replaceDayRecords);
```

（`addWearRecords`/`deleteWearRecordsByDate` 若 grep 确认 RecordWearScreen 内无其他引用即可移除——当前仅 handleConfirm 用。先 grep：`grep -n "addWearRecords\|deleteWearRecordsByDate" src/screens/RecordWearScreen.tsx`，应只有解构处 + handleConfirm 两处，替换后无残留。）

- [ ] **Step 2: handleConfirm 改调 replaceDayRecords**

找到 handleConfirm（约 line 461-474）：

```ts
  const handleConfirm = async () => {
    if (selectedIds.length < 2) {
      Alert.alert('提示', '请至少选择 2 件单品');
      return;
    }
    try {
      await deleteWearRecordsByDate(selectedDate);
      await addWearRecords(selectedIds, selectedDate);
      navigation.goBack();
    } catch (error) {
      console.error('RecordWearScreen handleConfirm failed:', error);
      Alert.alert('记录失败', '保存穿着记录时出错，请重试');
    }
```

把 try 内的两行改为单行 `replaceDayRecords`：

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
```

（其余不变，含闭合 `}` 和后续 `}`。至少 2 件限制保留——N6 在 P1 处理。）

- [ ] **Step 3: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。若报 `addWearRecords`/`deleteWearRecordsByDate` 未定义，说明有残留引用，grep 清理。

- [ ] **Step 4: Commit**

```bash
git add src/screens/RecordWearScreen.tsx
git commit -m "fix: RecordWearScreen 改用 replaceDayRecords diff 保存，消除先删后写的数据丢失风险（N1）"
```

---

### Task 3: WearCalendarScreen 抽 reloadAll 刷新联动

**Files:**
- Modify: `src/screens/WearCalendarScreen.tsx`

- [ ] **Step 1: 加 reloadAll**

找到 `handleDayPress`（约 line 259-262）之前，或 `loadRecentWeek` 定义之后，加 `reloadAll`：

```ts
  const reloadAll = useCallback(async () => {
    await Promise.all([loadMonthData(), loadRecentWeek()]);
  }, [loadMonthData, loadRecentWeek]);
```

`loadMonthData`/`loadRecentWeek` 是组件内已有的 useCallback。`useCallback` 已 import（文件顶部）。

- [ ] **Step 2: handleDeleteRecord / handleAddRecord 改调 reloadAll**

找到（约 line 264-271）：

```ts
  const handleDeleteRecord = async (recordId: number) => {
    await deleteWearRecord(recordId);
    loadMonthData();
  };

  const handleAddRecord = () => {
    loadMonthData();
```

改为：

```ts
  const handleDeleteRecord = async (recordId: number) => {
    await deleteWearRecord(recordId);
    reloadAll();
  };

  const handleAddRecord = () => {
    reloadAll();
```

（`handleAddRecord` 闭合 `};` 保持不变。其余不动。）

- [ ] **Step 3: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 4: 手动走查 + Commit**

走查：月历点某天 → sheet 删一件 → 关闭 sheet → 月历格子更新 + **最近一周也更新**（之前最近一周不变）。

```bash
git add src/screens/WearCalendarScreen.tsx
git commit -m "fix: WearCalendarScreen 删除/添加记录后月历+最近一周同步刷新（N2）"
```

---

## Self-Review

**Spec coverage 检查：**

| Spec 要求 | 对应 Task |
|----------|----------|
| store `replaceDayRecords`（diff：查现有 → toAdd/toRemove → 先 add 后 delete） | Task 1 |
| RecordWearScreen handleConfirm 改调 replaceDayRecords | Task 2 |
| WearCalendarScreen 抽 reloadAll，删除/添加回调都调 | Task 3 |
| 至少 2 件限制保留（N6 留 P1） | Task 2 Step 2 注明保留 |
| 不动 WearRecord 模型 / outfit 模式 / 三入口一致性 | 本 plan 不涉及 |

**Placeholder 扫描**：无 TBD/TODO。所有步骤含完整代码。

**Type 一致性**：
- `replaceDayRecords: (clothingIds: number[], date: string) => Promise<void>` 在 Task 1 Step 1（接口）、Step 2（实现）、Task 2（调用）签名一致。
- `reloadAll` 在 Task 3 Step 1 定义、Step 2 使用，一致。
- `addWearRecords`/`deleteWearRecord` 通过 `get()` 调用（store 内），签名匹配。

**依赖顺序**：Task 1（store action）先建，Task 2（用 replaceDayRecords）依赖它。Task 3 独立（只改 WearCalendarScreen 刷新，不依赖 store 新方法）。
