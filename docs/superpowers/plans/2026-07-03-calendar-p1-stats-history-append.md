# 日历模块 P1：月度统计 + 单品穿着历史 + 追加模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WearCalendarScreen 加月度概览统计卡片（N3）、ClothingDetailScreen 加穿着记录列表（N4）、RecordWearScreen 取消 2 件限制 + 追加/替换模式（N6）

**Architecture:** 三项独立改动，各自在一个文件内完成。N3 纯 useMemo 聚合已有 wearData；N4 组件内 useEffect 调已有 DB 函数；N6 新增 isAppendMode state + handleConfirm 分支。

**Tech Stack:** React Native + Expo、TypeScript、zustand（wardrobeStore）、expo-sqlite（wearRecordsDb）

**Reference spec:** [docs/superpowers/specs/2026-07-03-calendar-p1-stats-history-append.md](../specs/2026-07-03-calendar-p1-stats-history-append.md)

**Testing note:** 项目无单元测试框架。每个任务用 `npx tsc --noEmit` 验证类型，最后手动走查。

---

## 文件结构

| 操作 | 文件 | 责任 |
|------|------|------|
| 改 | `src/screens/WearCalendarScreen.tsx` | N3：useMemo 聚合 wearData → 月度概览卡片 |
| 改 | `src/screens/ClothingDetailScreen.tsx` | N4：useEffect 加载穿着记录 → 穿着记录列表 |
| 改 | `src/screens/RecordWearScreen.tsx` | N6：isAppendMode + 去掉 2 件限制 + handleConfirm 分支 |

三项独立，互不依赖，可任意顺序执行。

---

### Task 1: N3 — WearCalendarScreen 月度概览统计卡片

**Files:**
- Modify: `src/screens/WearCalendarScreen.tsx`

**概述:** 在 `<MonthCalendar>` 和「最近一周」卡片之间插入一张统计卡片，纯 `useMemo` 从 `wearData` 聚合，不查 DB。

- [ ] **Step 1: 加 useMemo 聚合统计**

在 `outfitMatchMap`（约 line 155）之后、`loadMonthData` 之前加：

```tsx
  // 月度概览统计（N3）
  const monthStats = useMemo(() => {
    const daysWithRecords = Object.entries(wearData).filter(([_, items]) => items.length > 0);
    const wearingDays = daysWithRecords.length;
    const allIds = daysWithRecords.flatMap(([_, items]) => items.map(i => i.id));
    const uniqueItems = new Set(allIds).size;
    const freq = new Map<number, number>();
    allIds.forEach(id => freq.set(id, (freq.get(id) || 0) + 1));
    let maxFreq = 0;
    freq.forEach(v => { if (v > maxFreq) maxFreq = v; });
    const topItems = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ item: allClothingMap.get(id), count }))
      .filter(e => e.item);
    return { wearingDays, uniqueItems, maxFreq, topItems };
  }, [wearData, allClothingMap]);
```

- [ ] **Step 2: 加统计卡片样式**

在 `makeStyles` 的 `recentCountText` 之后（约 line 101）、闭合 `});` 之前加：

```tsx
    // 月度概览统计卡片（N3）
    statsCard: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 18,
      ...theme.shadows.sm,
    },
    statsHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
    },
    statsTitle: {
      fontSize: 14, fontWeight: '600', color: theme.colors.text,
    },
    statsRow: {
      flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14,
    },
    statsItem: {
      alignItems: 'center', flex: 1,
    },
    statsValue: {
      fontSize: 22, fontWeight: '700', color: theme.colors.text,
    },
    statsDesc: {
      fontSize: 11, color: theme.colors.textTertiary, marginTop: 2,
    },
    statsDivider: {
      width: 1, height: 32, backgroundColor: theme.colors.border, alignSelf: 'center',
    },
    statsTopLabel: {
      fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8,
    },
    topItemRow: {
      flexDirection: 'row', gap: 10,
    },
    topItem: {
      flex: 1, alignItems: 'center',
    },
    topItemThumb: {
      width: 48, height: 48, borderRadius: 8, backgroundColor: theme.colors.borderLight,
    },
    topItemName: {
      fontSize: 11, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center',
    },
    topItemCount: {
      fontSize: 10, color: theme.colors.textTertiary, marginTop: 1,
    },
    statsEmpty: {
      fontSize: 12, color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: 8,
    },
```

- [ ] **Step 3: 在 JSX 中插入统计卡片**

在 `MonthCalendar` 闭合 `/>` 之后（约 line 318）、`{/* Recent Week Card */}` 注释之前（约 line 320）插入：

```tsx
        {/* 月度概览统计卡片（N3） */}
        {monthStats.wearingDays > 0 && (
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <View style={styles.cardDot} />
              <Text style={styles.statsTitle}>{currentMonth}月概览</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{monthStats.wearingDays}</Text>
                <Text style={styles.statsDesc}>穿着天数</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{monthStats.uniqueItems}</Text>
                <Text style={styles.statsDesc}>穿着件数</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{monthStats.maxFreq}</Text>
                <Text style={styles.statsDesc}>最高频次</Text>
              </View>
            </View>
            {monthStats.topItems.length > 0 && (
              <>
                <Text style={styles.statsTopLabel}>最常穿 Top {monthStats.topItems.length}</Text>
                <View style={styles.topItemRow}>
                  {monthStats.topItems.map(({ item, count }) => (
                    <View key={item!.id} style={styles.topItem}>
                      {(item!.thumbnailUri || item!.imageUri) ? (
                        <Image
                          source={{ uri: item!.thumbnailUri || item!.imageUri }}
                          style={styles.topItemThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.topItemThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="shirt-outline" size={18} color={theme.colors.textTertiary} />
                        </View>
                      )}
                      <Text style={styles.topItemName} numberOfLines={1}>{item!.type || item!.remarks || '--'}</Text>
                      <Text style={styles.topItemCount}>{count} 次</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
```

- [ ] **Step 4: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 5: Commit**

```bash
git add src/screens/WearCalendarScreen.tsx
git commit -m "feat: WearCalendarScreen 加月度概览统计卡片（穿着天数/件数/最高频次/Top3）"
```

---

### Task 2: N4 — ClothingDetailScreen 穿着记录列表

**Files:**
- Modify: `src/screens/ClothingDetailScreen.tsx`

**概述:** 在备注卡片（`remarksCard`）和穿着日历卡片（`calendarCard`）之间插入「穿着记录」列表。默认显示最近 5 条，超过可展开。每条展示日期 + 当日所有穿着衣物的缩略图横排。

- [ ] **Step 1: 加 import（wearRecordsDb 已在 line 29 import，无需改动）**

确认 `import * as wearRecordsDb from '../db/wearRecords';` 已存在（line 29）。确认 `WearRecord` 类型可用——检查 types 文件：

Run: `grep -n "WearRecord" src/types/index.ts || grep -rn "export.*WearRecord" src/types/`
Expected: 确认 WearRecord 类型存在于 `src/types/` 中。若不存在，从 wearRecords.ts 的接口定义可知字段：`{ id: number; clothingId: number; clothingType?: string; clothingThumbnailUri?: string; wornDate: string; createdAt: string; outfitId?: number }`。

- [ ] **Step 2: 加穿着记录 state + 加载逻辑**

在 `const [currentMonth, setCurrentMonth] = ...` 附近（约 line 547-550），`handleSaveImage` 之前加：

```tsx
  // 穿着记录列表（N4）
  const [wearHistory, setWearHistory] = useState<{ date: string; records: any[] }[]>([]);
  const [wearHistoryExpanded, setWearHistoryExpanded] = useState(false);

  const loadWearHistory = useCallback(async () => {
    if (!item || isTrash || isSold || isDraft) return;
    try {
      const records = await wearRecordsDb.getWearRecordsByClothing(item.id);
      // 按日期分组，取最近 15 条
      const grouped: { date: string; records: any[] }[] = [];
      const seen = new Set<string>();
      for (const r of records) {
        if (seen.has(r.wornDate)) continue;
        seen.add(r.wornDate);
        const dayRecords = await wearRecordsDb.getWearRecordsByDate(r.wornDate);
        grouped.push({ date: r.wornDate, records: dayRecords });
        if (grouped.length >= 15) break;
      }
      setWearHistory(grouped);
    } catch (error) {
      console.error('loadWearHistory failed:', error);
    }
  }, [item, isTrash, isSold, isDraft]);

  useEffect(() => {
    loadWearHistory();
  }, [loadWearHistory]);
```

- [ ] **Step 3: 加样式（在 remarksText 之后，约 line 365）**

在 `makeStyles` 中，`remarksText` 样式之后加：

```tsx
    // 穿着记录列表（N4）
    wearHistoryCard: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 18,
      ...theme.shadows.sm,
    },
    wearHistoryHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    },
    wearHistoryDot: {
      width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary,
    },
    wearHistoryTitle: {
      fontSize: 14, fontWeight: '600', color: theme.colors.text,
    },
    wearHistoryItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    wearHistoryDate: {
      fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6,
    },
    wearHistoryContext: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    wearHistoryContextLabel: {
      fontSize: 11, color: theme.colors.textTertiary, marginRight: 2,
    },
    wearHistoryThumbRow: {
      flexDirection: 'row', gap: 4, flex: 1,
    },
    wearHistoryThumb: {
      width: 32, height: 32, borderRadius: 6, backgroundColor: theme.colors.borderLight,
    },
    wearHistoryEmpty: {
      fontSize: 12, color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: 8,
    },
    wearHistoryExpand: {
      marginTop: 10, alignItems: 'center', paddingVertical: 4,
    },
    wearHistoryExpandText: {
      fontSize: 12, color: theme.colors.primary, fontWeight: '600',
    },
```

- [ ] **Step 4: 在 JSX 中插入穿着记录列表**

在备注卡片（`</View>` 约 line 1149）之后、`{/* 穿着日历卡片 */}` 注释（约 line 1151）之前插入：

```tsx
        {/* 穿着记录列表（N4） */}
        {!isTrash && !isSold && !isDraft && (
          <View style={styles.wearHistoryCard}>
            <View style={styles.wearHistoryHeader}>
              <View style={styles.wearHistoryDot} />
              <Text style={styles.wearHistoryTitle}>穿着记录</Text>
            </View>
            {wearHistory.length === 0 ? (
              <Text style={styles.wearHistoryEmpty}>暂无穿着记录</Text>
            ) : (
              <>
                {(wearHistoryExpanded ? wearHistory : wearHistory.slice(0, 5)).map(({ date, records }) => {
                  const d = new Date(date);
                  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                  const label = `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`;
                  return (
                    <View key={date} style={styles.wearHistoryItem}>
                      <Text style={styles.wearHistoryDate}>{label}</Text>
                      <View style={styles.wearHistoryContext}>
                        <Text style={styles.wearHistoryContextLabel}>当日搭配</Text>
                        <View style={styles.wearHistoryThumbRow}>
                          {records.map((r: any) => {
                            const cloth = allClothingMap.get(r.clothingId);
                            const uri = cloth?.thumbnailUri || cloth?.imageUri || r.clothingThumbnailUri;
                            return uri ? (
                              <Image key={r.id} source={{ uri }} style={styles.wearHistoryThumb} resizeMode="cover" />
                            ) : (
                              <View key={r.id} style={[styles.wearHistoryThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="shirt-outline" size={12} color={theme.colors.textTertiary} />
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  );
                })}
                {wearHistory.length > 5 && !wearHistoryExpanded && (
                  <TouchableOpacity style={styles.wearHistoryExpand} onPress={() => setWearHistoryExpanded(true)} activeOpacity={0.7}>
                    <Text style={styles.wearHistoryExpandText}>展开全部 {wearHistory.length} 条</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
```

- [ ] **Step 5: 确保 allClothingMap 在 ClothingDetailScreen 可用**

ClothingDetailScreen 使用 `allClothing` 变量——检查是否需要构建 `allClothingMap`。查找文件中是否已有类似 map：

Run: `grep -n "allClothingMap\|allClothing" src/screens/ClothingDetailScreen.tsx | head -20`

如果 `allClothingMap` 不存在，需要在组件中加一个 useMemo（从 `clothing` state 构建）。检查 `clothing` 是否已解构。

Run: `grep -n "const clothing = useWardrobeStore" src/screens/ClothingDetailScreen.tsx`

如果不存在，加解构并在 Step 4 的穿着记录中使用 `useMemo` 构建 map。如果存在，直接复用。

（实施时由子代理确认并处理。）

- [ ] **Step 6: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 7: Commit**

```bash
git add src/screens/ClothingDetailScreen.tsx
git commit -m "feat: ClothingDetailScreen 加穿着记录列表（日期+当日搭配缩略图，默认5条可展开）"
```

---

### Task 3: N6 — RecordWearScreen 取消 2 件限制 + 追加/替换模式

**Files:**
- Modify: `src/screens/RecordWearScreen.tsx`

**概述:** 去掉「至少 2 件」校验；新增 `isAppendMode` state（默认 true）；追加模式不预选 + 调 `addWearRecords`；替换模式预选 + 调 `replaceDayRecords`（已有）；header 下方加 segmented control 切换。

- [ ] **Step 1: 解构新增 addWearRecords**

当前 line 322：
```tsx
  const replaceDayRecords = useWardrobeStore(s => s.replaceDayRecords);
```

改为：
```tsx
  const addWearRecords = useWardrobeStore(s => s.addWearRecords);
  const replaceDayRecords = useWardrobeStore(s => s.replaceDayRecords);
```

- [ ] **Step 2: 加 isAppendMode state + 当天已有记录提示**

在 `const [mode, setMode] = ...`（line 326）之后、`const [selectedIds, ...]`（line 327）之前加：

```tsx
  const [isAppendMode, setIsAppendMode] = useState(true);
  const [todayExistingItems, setTodayExistingItems] = useState<ClothingItem[]>([]);
```

在 `useEffect`（selectedDate 变化时预选，约 line 387-393）处，改为按模式分支：

```tsx
  // When selectedDate changes, load existing records
  useEffect(() => {
    (async () => {
      const records = await wearRecordsDb.getWearRecordsByDate(selectedDate);
      const ids = records.map(r => r.clothingId);
      if (isAppendMode) {
        // 追加模式：不预选，但记录已有衣物用于提示
        const map = new Map<number, ClothingItem>();
        for (const c of clothing) map.set(c.id, c);
        setTodayExistingItems(records.map(r => map.get(r.clothingId) || ({
          id: r.clothingId,
          imageUri: r.clothingThumbnailUri || '',
          thumbnailUri: r.clothingThumbnailUri || '',
          originalImageUri: '',
          type: r.clothingType || '已删除',
          parentType: '',
          color: '', brand: '', size: '', remarks: '',
          seasons: [], tags: [], fit: '', thickness: '',
          purchaseDate: '', price: 0, wearCount: 0, lastWornAt: null,
          createdAt: '', wardrobeId: 0,
        } as ClothingItem)).filter(Boolean));
        setSelectedIds([]);
      } else {
        // 替换模式：预选已有（当前行为）
        setSelectedIds(ids);
        setTodayExistingItems([]);
      }
    })();
  }, [selectedDate, isAppendMode, clothing]);
```

- [ ] **Step 3: 去掉 2 件限制**

`handleConfirm`（约 line 460-472）：把 `selectedIds.length < 2` 改为 `selectedIds.length < 1`，并根据模式选不同 store 方法：

```tsx
  const handleConfirm = async () => {
    if (selectedIds.length < 1) {
      Alert.alert('提示', '请至少选择 1 件单品');
      return;
    }
    try {
      if (isAppendMode) {
        await addWearRecords(selectedIds, selectedDate);
      } else {
        await replaceDayRecords(selectedIds, selectedDate);
      }
      navigation.goBack();
    } catch (error) {
      console.error('RecordWearScreen handleConfirm failed:', error);
      Alert.alert('记录失败', '保存穿着记录时出错，请重试');
    }
  };
```

- [ ] **Step 4: 更新 Footer 按钮 disabled 条件**

Footer 中确认按钮（约 line 714-723）：`selectedIds.length < 2` → `selectedIds.length === 0`：

```tsx
          <TouchableOpacity
            style={[styles.confirmBtn, selectedIds.length === 0 && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={selectedIds.length === 0}
            activeOpacity={0.7}
          >
            <Text style={styles.confirmBtnText}>
              {mode === 'outfit' ? '记录这套搭配' : `记录 (${selectedIds.length})`}
            </Text>
          </TouchableOpacity>
```

- [ ] **Step 5: 加追加/替换切换 UI + 已有记录提示样式**

在 `makeStyles` 中，`modeTabTextActive` 之后（约 line 99）加：

```tsx
    // 追加/替换模式切换（N6）
    appendHint: {
      marginHorizontal: 16,
      marginBottom: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.primary + '10',
      borderRadius: 8,
    },
    appendHintText: {
      fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16,
    },
    appendHintBold: {
      fontWeight: '700', color: theme.colors.primary,
    },
```

在 header 之后、mode toggle 之前（约 line 557 之前）加切换 UI：

```tsx
      {/* 追加/替换模式切换（N6） */}
      <View style={[styles.modeRow, { marginTop: 0 }]}>
        <TouchableOpacity
          style={[styles.modeTab, isAppendMode && styles.modeTabActive]}
          onPress={() => setIsAppendMode(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeTabText, isAppendMode && styles.modeTabTextActive]}>追加记录</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, !isAppendMode && styles.modeTabActive]}
          onPress={() => setIsAppendMode(false)}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeTabText, !isAppendMode && styles.modeTabTextActive]}>重新设置</Text>
        </TouchableOpacity>
      </View>

      {/* 提示文字（N6） */}
      <View style={styles.appendHint}>
        <Text style={styles.appendHintText}>
          {isAppendMode
            ? '追加模式：在当天已有记录基础上添加，不清除已有记录'
            : '替换模式：重新设置当天全部穿着记录'}
        </Text>
      </View>
```

- [ ] **Step 6: 追加模式下展示当天已有记录**

在 appendHint 之后（约 line 596）、search 之前，加条件渲染：

```tsx
      {/* 追加模式下已有记录提示（N6） */}
      {isAppendMode && todayExistingItems.length > 0 && (
        <View style={[styles.appendHint, { backgroundColor: theme.colors.borderLight }]}>
          <Text style={styles.appendHintText}>
            今日已记录 <Text style={styles.appendHintBold}>{todayExistingItems.length} 件</Text>
            ：{todayExistingItems.slice(0, 5).map(i => i.type).join('、')}
            {todayExistingItems.length > 5 ? ` 等` : ''}
          </Text>
        </View>
      )}
```

- [ ] **Step 7: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 8: Commit**

```bash
git add src/screens/RecordWearScreen.tsx
git commit -m "feat: RecordWearScreen 取消2件限制 + 追加/替换模式切换（N6）"
```

---

## Self-Review

**Spec coverage 检查：**

| Spec 要求 | 对应 Task |
|----------|----------|
| N3 月度概览卡片（穿着天数/件数/最高频次/Top3） | Task 1 |
| N3 数据来源 wearData 纯内存聚合 | Task 1 Step 1 |
| N3 空月不显示卡片 | Task 1 Step 3（`wearingDays > 0` 条件） |
| N4 穿着记录列表（备注和日历之间） | Task 2 |
| N4 默认 5 条，可展开 | Task 2 Step 4 |
| N4 每条 date + 当日搭配缩略图 | Task 2 Step 4 |
| N4 无记录空状态 | Task 2 Step 4（`wearHistory.length === 0`） |
| N6 取消 2 件限制 → 1 件 | Task 3 Step 3 |
| N6 追加模式（默认）+ 替换模式 | Task 3 Step 2 + Step 5 |
| N6 追加不预选，替换预选 | Task 3 Step 2 |
| N6 追加调 addWearRecords，替换调 replaceDayRecords | Task 3 Step 3 |
| N6 提示文字 + 已有记录展示 | Task 3 Step 5 + Step 6 |

**Placeholder 扫描**：无 TBD/TODO。Step 5 中 `allClothingMap` 可用性注明由子代理确认处理（合理的实施时判断，非占位符）。

**Type 一致性**：
- `monthStats` 类型由 useMemo 推导，字段名一致（`wearingDays`, `uniqueItems`, `maxFreq`, `topItems`）
- `wearHistory` state 类型 `{ date: string; records: any[] }[]`，与加载逻辑和渲染一致
- `isAppendMode` boolean，useState/useEffect/handleConfirm 统一
- `addWearRecords` 签名 `(clothingIds: number[], date: string) => Promise<number>`，调用签名匹配

**依赖顺序**：Task 1/2/3 互相独立，可并行。
