# OutfitEditor 三项 UX 优化（P1 保存回首页 + P6 单击选中 + P2/P4 撤销重做）

## Context

属性确认 Sheet 任务完成后，继续处理 OutfitEditor 的三项高优先级 UX 问题（摸底报告 P1/P6/P2/P4）：

1. **P1 保存回首页**：首页入口传 `exitTo:{screen:'Home'}`，但新建保存后 `handleConfirmAttributes` 的新建分支无条件 `navigation.reset` 到 GroupDetail，从首页新建的搭配保存后回不到首页。
2. **P6 单击选中**：DraggableItem 的选中靠 `PanGestureHandler` 的 `State.BEGAN` 触发（[OutfitEditorScreen.tsx:110-112](src/screens/outfit/OutfitEditorScreen.tsx#L110)），纯点击（无位移）经常不触发，用户必须"拖一下"才能选中。
3. **P2/P4 撤销重做**：`outfitStore` 的 `undo/redo/saveToHistory` 已实现（[outfitStore.ts:224-244](src/store/outfitStore.ts#L224)），但 UI 没接任何按钮；且 `updateCanvasItem`（拖拽/缩放/旋转的高频写回）不调 `saveToHistory`（[outfitStore.ts:160-166](src/store/outfitStore.ts#L160)），即使接上撤销也撤不了这些操作。

## Goals

- **P1**：从首页新建搭配保存后回到首页 tab；从搭配 tab 新建保存后维持现状（回 GroupDetail）。
- **P6**：点一下单品即选中，与拖拽手势解耦，不再需要"拖一下"。
- **P2/P4**：工具栏接入 undo/redo 按钮；拖拽/缩放/旋转/旋转 handle 在**手势开始时**存一次历史快照，撤销粒度 = 一次完整操作。

## Non-Goals

- 不改手势的拖拽/缩放/旋转算法本身（P5 双数据源、P14 旋转基准角另算）。
- 不接 P3（网格/背景/清空工具栏入口）、P12（图例可关闭）等其余痛点。
- 不改缩略图生成（P13）。
- undo/redo 不做键盘快捷键（移动端无键盘），仅按钮。

## P1：保存回首页

### 现状

`handleConfirmAttributes` 新建分支（[OutfitEditorScreen.tsx:524-537](src/screens/outfit/OutfitEditorScreen.tsx#L524)）无条件：

```ts
navigation.reset({
  index: 1,
  routes: [
    { name: 'Main', params: { screen: '搭配' } },
    { name: 'GroupDetail', params: { groupId, groupName } },
  ],
});
```

`route.params?.exitTo` 完全没看。HomeScreen 传 `exitTo:{screen:'Home'}`（[HomeScreen.tsx:408,508](src/screens/HomeScreen.tsx#L408)）。

### 方案

新建分支改为根据 `exitTo` 决定回哪：

```ts
const exitTo = route.params?.exitTo;
const backToTab = exitTo?.tab || (exitTo?.screen === 'Home' ? '主页' : null);
if (backToTab) {
  // 从首页/其他 tab 进入：回对应 tab
  navigation.reset({
    index: 0,
    routes: [{ name: 'Main' as any, params: { screen: backToTab } }],
  });
} else {
  // 从搭配 tab 进入：回 GroupDetail（现状）
  const gName = groups.find(g => g.id === attrs.groupId)?.name || '';
  navigation.reset({
    index: 1,
    routes: [
      { name: 'Main' as any, params: { screen: '搭配' } },
      { name: 'GroupDetail' as any, params: { groupId: attrs.groupId, groupName: gName } },
    ],
  });
}
```

编辑分支不动（继续走 `exitEditor`）。

### 出口语义约定

| 入口 | exitTo | 保存后回 |
|------|--------|---------|
| 首页快捷入口 | `{screen:'Home'}` | 主页 tab |
| 其他 tab（带 `tab` 字段） | `{tab:'X'}` | X tab |
| 搭配 tab / GroupList / GroupDetail | 无 exitTo 或不匹配 | GroupDetail（所在分组） |

## P6：单击选中

### 现状

DraggableItem 用旧版手势 API（`RotationGestureHandler` > `PinchGestureHandler` > `PanGestureHandler` > `View`），选中靠 `onPanHandlerStateChange` 的 `State.BEGAN`。纯点击时 PanGestureHandler 可能直接 FAIL/CANCEL，`onSelect` 不触发。

### 方案

在最外层包一个 `TapGestureHandler`，专门处理单击选中。TapGestureHandler 与 PanGestureHandler 互斥（单击不触发 Pan，拖拽不触发 Tap），干净解耦。

结构变为：
```
<TapGestureHandler onHandlerStateChange={onTapStateChange}>   ← 新增
  <RotationGestureHandler ...>
    <PinchGestureHandler ...>
      <PanGestureHandler ...>
        <View ...>...</View>
      </PanGestureHandler>
    </PinchGestureHandler>
  </RotationGestureHandler>
</TapGestureHandler>
```

新增处理函数：
```ts
const onTapStateChange = useCallback((event: any) => {
  if (event.nativeEvent.state === State.ACTIVE) {
    onSelect();
  }
}, [onSelect]);
```

`TapGestureHandler` 需从 `react-native-gesture-handler` import（项目已用该库）。保留 `onPanHandlerStateChange` 里 BEGAN 的 `onSelect()`（拖拽开始也选中，行为不变，只是现在单击也能选中了）。

## P2/P4：撤销重做

### P4：手势开始时存历史快照

**决策（用户已确认）**：拖拽/缩放/旋转/旋转 handle 在手势 **BEGAN** 时存一次快照。

`outfitStore.saveToHistory()` 存的是**当前** canvasItems（修改前状态）。所以 BEGAN 时调用 = 存"操作前"，操作中 `updateCanvasItem` 修改（不入历史），撤销回到 BEGAN 快照。一次完整操作一个快照，粒度正确。

#### 实现

DraggableItem 增加可选 prop `onGestureStart?: () => void`。在四个手势的 BEGAN 分支调用：

- `onPanHandlerStateChange` BEGAN（line 111）
- `onPinchHandlerStateChange` BEGAN（line 125）
- `onRotationHandlerStateChange` BEGAN（line 138）
- `onHandlePanStateChange` BEGAN（line 159）

OutfitEditorScreen 渲染 DraggableItem 时传 `onGestureStart={saveToHistory}`。

**不改 `updateCanvasItem` 本身**——它仍不入历史（避免拖拽每帧入历史）。历史入口在 DraggableItem 的手势 BEGAN，单一职责清晰。

**边界**：纯点击（TapGestureHandler）不调 `onGestureStart`，选中不入历史。✓

### P2：工具栏接入 undo/redo 按钮

#### 按钮位置

顶部栏，保存按钮左侧，加两个图标按钮（undo/redo）：

```
[返回]  搭配画板              [↶][↷][保存]
```

- `↶` = `undo-outline`（Ionicons），`↷` = `redo-outline`
- 尺寸 32×32 圆形，`theme.colors.background` 底
- **disabled 态**根据 store 的 `historyIndex` / `history`（OutfitEditorScreen 已解构，line 272-273）：
  - undo 可用：`historyIndex > 0`
  - redo 可用：`historyIndex < history.length - 1`
  - 不可用时 `opacity: 0.3` + `disabled`

#### 实现

顶部栏 JSX（[OutfitEditorScreen.tsx:568-577](src/screens/outfit/OutfitEditorScreen.tsx#L568)）在保存按钮前插入 undo/redo 按钮：

```tsx
<TouchableOpacity
  style={[styles.iconBtn, !canUndo && styles.iconBtnDisabled]}
  onPress={undo}
  disabled={!canUndo}
>
  <Ionicons name="undo-outline" size={20} color={theme.colors.text} />
</TouchableOpacity>
<TouchableOpacity
  style={[styles.iconBtn, !canRedo && styles.iconBtnDisabled]}
  onPress={redo}
  disabled={!canRedo}
>
  <Ionicons name="redo-outline" size={20} color={theme.colors.text} />
</TouchableOpacity>
```

组件内加派生值：
```ts
const canUndo = historyIndex > 0;
const canRedo = historyIndex < history.length - 1;
```

新增样式 `iconBtn`（32×32 圆形）+ `iconBtnDisabled`（opacity 0.3）。

## 文件改动清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 改 | `src/screens/outfit/OutfitEditorScreen.tsx` | P1 新建分支看 exitTo；P6 DraggableItem 包 TapGestureHandler + onGestureStart；P2 顶部栏 undo/redo 按钮 + canUndo/canRedo |

**单文件改动**——三个优化都在 OutfitEditorScreen.tsx 内（DraggableItem 是该文件内的子组件）。

## 验证场景

1. **P1**：从首页「记录穿搭/新建搭配」进编辑器 → 加单品 → 保存 → **回首页 tab**。从搭配 tab GroupList 进 → 保存 → 回 GroupDetail（现状不变）。
2. **P6**：画布上轻点一件单品 → 立即选中（出现删除/旋转/图层按钮），无需拖动。
3. **P2/P4 撤销**：
   - 拖动一件单品到新位置 → 点 undo → 回到拖动前位置；点 redo → 回到拖动后位置。
   - 双指缩放 → undo → 回到缩放前。
   - 旋转 → undo → 回到旋转前。
   - 连续拖 3 次 → undo 3 次逐个回退。
   - 删除一件 → undo → 恢复（删除本就有历史）。
   - 纯点击选中（不拖）→ undo 按钮**不**变可用（选中不入历史）。
4. **按钮 disabled 态**：刚进编辑器（无操作）→ undo/redo 都 disabled（半透明）；操作一次 → undo 可用、redo 不可用；undo 后 → redo 可用。
5. **TypeScript 编译通过**。

## Open Questions（实施时定）

- undo/redo 按钮触发后是否需要保持当前选中单品？建议保持（只改 canvasItems，selectedItemId 不变）——store 的 undo/redo 只 set canvasItems，不动 selectedItemId，天然保持。✓ 无需额外处理。
