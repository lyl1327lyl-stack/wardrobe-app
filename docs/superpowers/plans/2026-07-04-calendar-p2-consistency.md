# 日历模块 P2：交互一致性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全 app 统一到一个添加记录面（RecordWearScreen），删除 sheet 内嵌 picker；MonthCalendar 成为唯一月历实现并支持 disableFuture + 可配置图例。

**Architecture:** Task 1 先增强 MonthCalendar 组件（供 T5/T6 用）；T2 让 RecordWearScreen 接受 date/outfitId 参数；T3/T4 把搭配详情与日历 sheet 的添加入口改为跳转 RecordWear；T5 修 RecordWear 日期选择器三项；T6 衣服详情改用组件。N8 随入口统一自然收敛。

**Tech Stack:** React Native + Expo、TypeScript、zustand、react-navigation。

**Reference spec:** [docs/superpowers/specs/2026-07-04-calendar-p2-consistency-design.md](../specs/2026-07-04-calendar-p2-consistency-design.md)

**Testing note:** 每个任务 `npx tsc --noEmit` 验证类型，最后手动走查。

---

## 文件结构

| 操作 | 文件 | 责任 |
|------|------|------|
| 改 | `src/components/MonthCalendar.tsx` | T1：加 `disableFuture` + `legendItems` prop |
| 改 | `src/screens/RecordWearScreen.tsx` | T2：接受 params；T5：选择器 outfitMap/双层卡/图例 |
| 改 | `src/screens/outfit/OutfitDetailScreen.tsx` | T3：「记录穿着」跳 RecordWear |
| 改 | `src/components/WearCalendarSheet.tsx` | T4：删内嵌 picker，添加按钮调 onAddRecord |
| 改 | `src/screens/WearCalendarScreen.tsx` | T4：handleAddRecord 跳转 + useFocusEffect 刷新 |
| 改 | `src/screens/ClothingDetailScreen.tsx` | T6：手搓月历改用 MonthCalendar |

依赖：T1 先行（T5/T6 用新 prop）。T2 先行（T3/T4 跳转目标）。其余可并行。

---

### Task 1: MonthCalendar 加 disableFuture + legendItems

**Files:**
- Modify: `src/components/MonthCalendar.tsx`

- [ ] **Step 1: 扩展 Props 接口**

把 `MonthCalendarProps`（line 20-29）改为：

```ts
export interface LegendItem {
  label: string;
  color?: string;      // 圆点颜色（与 icon 二选一）
  icon?: string;       // Ionicons 图标名
}

export interface MonthCalendarProps {
  year: number;
  month: number;
  today: string;
  wearData: Record<string, ClothingItem[]>;
  onSelectDate: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  outfitMatchMap?: Record<string, { outfitId: number; outfitName: string; outfitThumb: string; extraItemIds?: number[] }>;
  disableFuture?: boolean;
  legendItems?: LegendItem[];
}
```

- [ ] **Step 2: 函数签名解构新 prop**

把函数签名（line 165-174）改为：

```ts
export function MonthCalendar({
  year,
  month,
  today,
  wearData,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  outfitMatchMap,
  disableFuture,
  legendItems,
}: MonthCalendarProps) {
```

- [ ] **Step 3: 日格未来日期禁用**

在日格循环里（line 200-289），`const isFuture = dateStr > today;` 之后加：

```ts
    const isFutureDisabled = disableFuture && isFuture;
```

把该日格的 `<TouchableOpacity>`（约 line 212-224）改为（加 `disabled`，onPress 守卫）：

```tsx
      <TouchableOpacity
        key={dateStr}
        style={[
          styles.dayCell,
          isToday && styles.dayCellToday,
          hasRecords && !isToday && (isFuture ? styles.dayCellPlanned : styles.dayCellHasRecords),
          isFutureDisabled && styles.dayCellEmpty,
          !isSunday && { marginRight: CELL_MARGIN },
          { marginBottom: CELL_MARGIN },
          showOutfitThumb && { overflow: 'hidden' },
        ]}
        onPress={() => { if (!isFutureDisabled) onSelectDate(dateStr); }}
        disabled={isFutureDisabled}
        activeOpacity={0.7}
      >
```

（`dayCellEmpty` 已存在，把禁用的未来格变透明，与空格一致。）

- [ ] **Step 4: 图例可配置**

把硬编码图例（line 314-327）替换为：

```tsx
      <View style={styles.legend}>
        {(legendItems && legendItems.length > 0 ? legendItems : [
          { label: '已穿着', color: theme.colors.primary + '40' },
          { label: '计划穿着', color: theme.colors.accent + '50' },
          { label: '今天', icon: 'star', iconColor: theme.colors.primary },
        ]).map((item, idx) => (
          <View key={idx} style={styles.legendItem}>
            {item.icon ? (
              <Ionicons name={item.icon as any} size={12} color={(item as any).iconColor || theme.colors.primary} />
            ) : (
              <View style={[styles.legendDot, { backgroundColor: item.color || theme.colors.primary }]} />
            )}
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
```

注意：`iconColor` 不在 LegendItem 接口里，用 `(item as any).iconColor` 取，或给 LegendItem 加 `iconColor?: string`（推荐加）。若加，Step 1 的 LegendItem 加 `iconColor?: string`。

- [ ] **Step 5: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 6: Commit**

```bash
git add src/components/MonthCalendar.tsx
git commit -m "feat: MonthCalendar 加 disableFuture + 可配置 legendItems"
```

---

### Task 2: RecordWearScreen 接受 date/outfitId 路由参数

**Files:**
- Modify: `src/screens/RecordWearScreen.tsx`

- [ ] **Step 1: 引入 useRoute，读 params**

文件顶部 react-navigation import 已有 `useNavigation`。加 `useRoute`：

```ts
import { useNavigation, useRoute } from '@react-navigation/native';
```

组件内（`navigation` 声明附近）加：

```ts
  const route = useRoute<any>();
  const initialDate = route.params?.date as string | undefined;
  const initialOutfitId = route.params?.outfitId as number | undefined;
```

- [ ] **Step 2: 初始 selectedDate 用 param**

找到 `const [selectedDate, setSelectedDate] = useState(todayDateStr());` 改为：

```ts
  const [selectedDate, setSelectedDate] = useState(initialDate || todayDateStr());
```

- [ ] **Step 3: 初始 mode 用 param（有 outfitId 则 outfit）**

找到 `const [mode, setMode] = useState<'items' | 'outfit'>('items');` 改为：

```ts
  const [mode, setMode] = useState<'items' | 'outfit'>(initialOutfitId ? 'outfit' : 'items');
```

- [ ] **Step 4: 日期 effect 支持 outfit 预选（union）**

找到「切换日期时预选当天已有记录」的 `useEffect`（当前仅 `setSelectedIds(records.map(r => r.clothingId))`，deps `[selectedDate]`）。改为：

```ts
  const outfitPresetAppliedRef = useRef(false);
  // 切换日期时，预选当天已有记录（勾选模型）；首次若有 outfitId 预设则 union
  useEffect(() => {
    (async () => {
      const records = await wearRecordsDb.getWearRecordsByDate(selectedDate);
      let ids = records.map(r => r.clothingId);
      if (initialOutfitId && !outfitPresetAppliedRef.current) {
        const outfit = outfits.find(o => o.id === initialOutfitId);
        if (outfit) {
          ids = [...new Set([...ids, ...outfit.itemIds])];
        }
        outfitPresetAppliedRef.current = true;
      }
      setSelectedIds(ids);
    })();
  }, [selectedDate, initialOutfitId, outfits]);
```

顶部 React import 加 `useRef`（若未有）。`outfits` 已在组件内解构。

- [ ] **Step 5: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 6: Commit**

```bash
git add src/screens/RecordWearScreen.tsx
git commit -m "feat: RecordWearScreen 接受 date/outfitId 路由参数（统一添加入口预设）"
```

---

### Task 3: OutfitDetailScreen「记录穿着」跳 RecordWear

**Files:**
- Modify: `src/screens/outfit/OutfitDetailScreen.tsx`

- [ ] **Step 1: 改 handleRecordWear 为导航**

找到 `handleRecordWear`（约 line 75-85，当前内联 addWearRecords + Alert）。替换为：

```ts
  const handleRecordWear = useCallback(() => {
    if (!outfit?.itemIds || outfit.itemIds.length === 0) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    navigation.navigate('RecordWear' as any, { date: dateStr, outfitId: outfit.id });
  }, [outfit?.itemIds, outfit?.id, navigation]);
```

- [ ] **Step 2: 移除未用的 addWearRecords**

确认 `addWearRecords` 在 OutfitDetailScreen 内无其他引用（grep `addWearRecords`）。若无，删除解构 `const addWearRecords = useWardrobeStore(s => s.addWearRecords);`（约 line 46）。

Run: `grep -n "addWearRecords" src/screens/outfit/OutfitDetailScreen.tsx`

- [ ] **Step 3: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 4: Commit**

```bash
git add src/screens/outfit/OutfitDetailScreen.tsx
git commit -m "refactor: OutfitDetail 记录穿着改跳 RecordWear（统一添加面，可选日期+diff保存）"
```

---

### Task 4: WearCalendarSheet 删内嵌 picker，添加跳 RecordWear

**Files:**
- Modify: `src/components/WearCalendarSheet.tsx`
- Modify: `src/screens/WearCalendarScreen.tsx`

**子步骤 4a：WearCalendarSheet 删 picker**

- [ ] **Step 1: 删 picker 相关 state**

删除（约 line 379-385）：

```ts
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'items' | 'outfits'>('items');
  const [selectedAddIds, setSelectedAddIds] = useState<number[]>([]);
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<number[]>([]);
  const [filterSeason, setFilterSeason] = useState<string>('全部');
  const [filterTag, setFilterTag] = useState<string>('全部');
  const [filterType, setFilterType] = useState<string>('全部');
```

（保留 `records`、`loading`。）

- [ ] **Step 2: 删 picker 重置 effect**

删除（约 line 400-409）：

```ts
  useEffect(() => {
    if (!showAddPicker) {
      setSelectedAddIds([]);
      setSelectedOutfitIds([]);
      setPickerMode('items');
      setFilterSeason('全部');
      setFilterTag('全部');
      setFilterType('全部');
    }
  }, [showAddPicker]);
```

并把 line 393-397 的 effect 里 `setShowAddPicker(false);` 也删除（保留 `loadRecords()`）：

```ts
  useEffect(() => {
    if (visible && date) {
      loadRecords();
    }
  }, [visible, date]);
```

- [ ] **Step 3: 删 toggleAddSelect / handleConfirmAdd / 相关 memo / renderAddPicker**

删除 `toggleAddSelect`、`handleConfirmAdd`、picker 过滤 memo（filterOutfits 等，若仅 picker 用）、`renderAddPicker`、`renderItem`（若仅 picker 用）、`renderOutfitItem` 等 picker 专属函数。grep 确认每个被删函数无其他引用：

Run: `grep -n "toggleAddSelect\|handleConfirmAdd\|renderAddPicker\|selectedAddIds\|selectedOutfitIds\|pickerMode\|filterSeason\|filterTag\|filterType\|clothingTypes" src/components/WearCalendarSheet.tsx`

逐个确认仅在被删代码内引用后删除。`addWearRecords` 若仅 handleConfirmAdd 用，也删解构。

- [ ] **Step 4: header「+」按钮与空状态「添加衣服」改为调 onAddRecord**

header 的 `+` 按钮（约 line 825-833）：

```tsx
            {records.length > 0 && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => onAddRecord?.()}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color={theme.colors.white} />
              </TouchableOpacity>
            )}
```

（去掉 `!showAddPicker &&` 前缀。）

content 区（约 line 839-861）改为：

```tsx
          <View style={styles.content}>
            {records.length === 0 ? (
              <>
                <Text style={styles.emptyText}>该日期暂无穿着记录</Text>
                <TouchableOpacity
                  style={[styles.confirmAddBtn, { marginTop: 16 }]}
                  onPress={() => onAddRecord?.()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmAddBtnText}>添加衣服</Text>
                </TouchableOpacity>
              </>
            ) : (
              <FlatList
                data={records}
                renderItem={renderItem}
                keyExtractor={item => String(item.id)}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
```

（`renderItem` 若保留给 records 列表用则不删——确认它是 records 列表渲染器还是 picker 渲染器。从代码看 line 540 `renderItem` 是 records 列表渲染器，保留。）

- [ ] **Step 5: 删 picker 专属样式**

删除 picker 相关 StyleSheet 键（pickerCard、pickerMode*、filterChip*、outfitGrid*、confirmAddBtn 系列…… 但 `confirmAddBtn`/`confirmAddBtnText` 仍被空状态「添加衣服」按钮用，保留）。grep 确认每个样式是否还被引用，无引用才删。

Run: `grep -n "pickerMode\|filterChip\|outfitGrid" src/components/WearCalendarSheet.tsx`

- [ ] **Step 6: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。有未用变量/style 警告则清理。

**子步骤 4b：WearCalendarScreen 跳转 + 刷新**

- [ ] **Step 7: handleAddRecord 改跳转**

`src/screens/WearCalendarScreen.tsx` 找到 `handleAddRecord`（约 line 273-275，当前 `() => { reloadAll(); }`）改为：

```ts
  const handleAddRecord = () => {
    if (selectedDate) {
      setShowSheet(false);
      navigation.navigate('RecordWear' as any, { date: selectedDate });
    }
  };
```

- [ ] **Step 8: 加 useFocusEffect 返回后刷新**

`WearCalendarScreen` 已 import `useEffect/useCallback`。从 `@react-navigation/native` 加 `useFocusEffect`：

```ts
import { useNavigation, useFocusEffect } from '@react-navigation/native';
```

组件内 `reloadAll` 定义之后加：

```ts
  useFocusEffect(
    useCallback(() => {
      reloadAll();
    }, [reloadAll])
  );
```

- [ ] **Step 9: 类型检查 + Commit**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

```bash
git add src/components/WearCalendarSheet.tsx src/screens/WearCalendarScreen.tsx
git commit -m "refactor: 日历 sheet 删内嵌 picker，添加入口统一跳 RecordWear（N7）"
```

---

### Task 5: RecordWear 日期选择器 补 outfitMap + 修双层卡 + 图例

**Files:**
- Modify: `src/screens/RecordWearScreen.tsx`

- [ ] **Step 1: 计算 outfitMatchMap**

组件内（`dateWearData` state 附近）加 memo：

```ts
  const outfitMatchMap = useMemo(() => {
    const map: Record<string, { outfitId: number; outfitName: string; outfitThumb: string; extraItemIds: number[] }> = {};
    for (const [dateStr, items] of Object.entries(dateWearData)) {
      const itemIds = new Set(items.map(i => i.id));
      for (const outfit of outfits) {
        if (outfit.itemIds.length === 0) continue;
        if (outfit.itemIds.every(cid => itemIds.has(cid))) {
          const extraItemIds = items.filter(i => !outfit.itemIds.includes(i.id)).map(i => i.id);
          map[dateStr] = {
            outfitId: outfit.id,
            outfitName: outfit.name,
            outfitThumb: outfit.thumbnailUri || '',
            extraItemIds,
          };
          break;
        }
      }
    }
    return map;
  }, [dateWearData, outfits]);
```

- [ ] **Step 2: 选择器 MonthCalendar 传 outfitMatchMap + legendItems**

找到日期选择器 Modal 内的 `<MonthCalendar>`（约 line 825-839）。加 props：

```tsx
            <MonthCalendar
              year={calYear}
              month={calMonth}
              today={today}
              wearData={dateWearData}
              onSelectDate={handleDateSelect}
              onPrevMonth={() => {
                if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
                else { setCalMonth(calMonth - 1); }
              }}
              onNextMonth={() => {
                if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
                else { setCalMonth(calMonth + 1); }
              }}
              outfitMatchMap={outfitMatchMap}
              legendItems={[
                { label: '已穿着', color: theme.colors.primary + '40' },
                { label: '今天', icon: 'star', iconColor: theme.colors.primary },
              ]}
            />
```

- [ ] **Step 3: 修双层卡片**

找到 `dateModalCard` 样式（约 line 308-313，当前 `{ backgroundColor: card, borderRadius: 20, padding: 16, ...shadows.lg }`）。改为只做定位容器，不带卡片底：

```ts
    dateModalCard: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
```

（去掉 backgroundColor/borderRadius/shadow。MonthCalendar 自带 card 提供卡片视觉。`dateModalClose` 关闭按钮保留，浮在月历上方。）

- [ ] **Step 4: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 5: Commit**

```bash
git add src/screens/RecordWearScreen.tsx
git commit -m "fix: RecordWear 日期选择器补 outfitMap + 去双层卡 + 精简图例（N9）"
```

---

### Task 6: ClothingDetailScreen 月历改用 MonthCalendar

**Files:**
- Modify: `src/screens/ClothingDetailScreen.tsx`

- [ ] **Step 1: 引入 MonthCalendar + today 常量**

顶部 import（已有 wearRecordsDb）。加：

```ts
import { MonthCalendar } from '../components/MonthCalendar';
```

组件内（`today` 相关，`currentMonth` state 附近）加：

```ts
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
```

（确认 `useMemo` 已 import —— 文件已用 useMemo。）

- [ ] **Step 2: 用 MonthCalendar 替换手搓月历卡片**

找到 `{/* 穿着日历卡片 */}` 整块（约 line 1277-1356，从 `{!isTrash && !isSold && !isDraft && (` 到对应闭合 `)}`）。替换为：

```tsx
        {/* 穿着日历卡片 */}
        {!isTrash && !isSold && !isDraft && item && (
          <MonthCalendar
            year={currentMonth.year}
            month={currentMonth.month}
            today={todayStr}
            wearData={wearDates.reduce((acc, d) => {
              acc[d] = [item];
              return acc;
            }, {} as Record<string, ClothingItem[]>)}
            onSelectDate={(dateStr) => {
              if (wearDates.includes(dateStr)) {
                handleDatePress(dateStr);
              } else {
                handleAddWearDate(dateStr);
              }
            }}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            disableFuture
          />
        )}
```

（`handleDatePress`/`handleAddWearDate`/`prevMonth`/`nextMonth`/`wearDates`/`item`/`currentMonth` 均已存在，复用。`ClothingItem` 类型已 import。）

- [ ] **Step 3: 删除 getCalendarStyles（若仅月历用）**

确认 `getCalendarStyles` 内所有键是否还被别处引用：

Run: `grep -n "getCalendarStyles" src/screens/ClothingDetailScreen.tsx`

若替换后无引用，删除整个 `getCalendarStyles = useMemo(() => StyleSheet.create({...}))` 块（约 line 756 起）。

- [ ] **Step 4: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。有未用样式/变量则清理。

- [ ] **Step 5: Commit**

```bash
git add src/screens/ClothingDetailScreen.tsx
git commit -m "refactor: ClothingDetail 月历改用 MonthCalendar 组件（N9 统一实现）"
```

---

## Self-Review

**Spec coverage：**

| Spec 要求 | Task |
|----------|------|
| RecordWear 接受 date/outfitId + 预选 union | T2 |
| OutfitDetail 记录穿着跳 RecordWear | T3 |
| Sheet 删内嵌 picker + 添加跳转 | T4 |
| WearCalendarScreen handleAddRecord 跳转 + focus 刷新 | T4 Step 7-8 |
| MonthCalendar disableFuture + legendItems | T1 |
| RecordWear 选择器 outfitMap + 双层卡 + 图例 | T5 |
| ClothingDetail 改用 MonthCalendar | T6 |
| N8 随入口统一收敛（single outfit 基数） | T3/T4 后唯一面 = RecordWear |

**Placeholder 扫描**：无 TBD。删除类步骤（T4 Step 3/5、T6 Step 3）注明「grep 确认无引用后删」，属合理实施时判断。

**Type 一致性**：
- `LegendItem { label, color?, icon?, iconColor? }` T1 定义，T5 使用（icon+iconColor）一致。
- `disableFuture: boolean` T1 定义，T6 使用。
- RecordWear params `{ date?: string; outfitId?: number }` T2 读取，T3/T4 写入一致（`navigation.navigate('RecordWear', { date, outfitId })`）。

**依赖顺序**：T1（组件）→ T5/T6 用。T2（params）→ T3/T4 跳转目标。建议顺序：T1 → T2 → T3 → T4 → T5 → T6。
