# OutfitEditor 三项 UX 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 OutfitEditor 三项 UX 问题——P1 从首页新建保存后回首页、P6 单击即选中、P2/P4 接入撤销重做（拖拽/缩放/旋转手势开始时存历史）。

**Architecture:** 三项改动全部集中在 `OutfitEditorScreen.tsx` 单文件（DraggableItem 是该文件内的子组件）。P1 改 `handleConfirmAttributes` 新建分支的退出逻辑；P2 在顶部栏加 undo/redo 按钮；P6+P4 改 DraggableItem——外包 TapGestureHandler 处理单击，四个手势 BEGAN 时调新 prop `onGestureStart` 存历史。

**Tech Stack:** React Native + Expo、TypeScript、`react-native-gesture-handler`（TapGestureHandler/PanGestureHandler 等）、`zustand`（outfitStore 的 saveToHistory/undo/redo/historyIndex/history）。

**Reference spec:** [docs/superpowers/specs/2026-06-14-outfit-editor-ux-fixes-design.md](../specs/2026-06-14-outfit-editor-ux-fixes-design.md)

**Testing note:** 项目无单元测试框架。每个任务用 `npx tsc --noEmit` 验证类型，最后手动走查手势/按钮。

---

## 文件结构

| 操作 | 文件 | 责任 |
|------|------|------|
| 改 | `src/screens/outfit/OutfitEditorScreen.tsx` | P1 退出逻辑 + P2 undo/redo 按钮 + P6/P4 DraggableItem 手势 |

`outfitStore.ts` **不改**——`saveToHistory`/`undo`/`redo`/`historyIndex`/`history` 已全部就绪（[outfitStore.ts:224-244](src/store/outfitStore.ts#L224)）。`updateCanvasItem` 也不改（历史入口放在 DraggableItem 手势 BEGAN，避免每帧入历史）。

---

### Task 1: P1 保存回首页

**Files:**
- Modify: `src/screens/outfit/OutfitEditorScreen.tsx`（`handleConfirmAttributes` 新建分支，约第 524-537 行）

- [ ] **Step 1: 替换新建分支的退出逻辑**

找到 `handleConfirmAttributes` 内的 `else`（新建）分支。当前代码：

```ts
      } else {
        // 新建：写入后 reset 到该搭配所在分组
        await addOutfit(outfitData as any);
        reset();
        isSaving.current = true;
        const gName = groups.find(g => g.id === attrs.groupId)?.name || '';
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Main' as any, params: { screen: '搭配' } },
            { name: 'GroupDetail' as any, params: { groupId: attrs.groupId, groupName: gName } },
          ],
        });
      }
      setShowAttrSheet(false);
```

替换为（根据 `exitTo` 决定回首页 tab 还是 GroupDetail）：

```ts
      } else {
        // 新建：写入后根据入口决定回哪
        await addOutfit(outfitData as any);
        reset();
        isSaving.current = true;
        const exitTo = route.params?.exitTo;
        const backToTab = exitTo?.tab || (exitTo?.screen === 'Home' ? '主页' : null);
        if (backToTab) {
          // 从首页/其他 tab 进入：回对应 tab
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' as any, params: { screen: backToTab } }],
          });
        } else {
          // 从搭配 tab 进入：回 GroupDetail（所在分组）
          const gName = groups.find(g => g.id === attrs.groupId)?.name || '';
          navigation.reset({
            index: 1,
            routes: [
              { name: 'Main' as any, params: { screen: '搭配' } },
              { name: 'GroupDetail' as any, params: { groupId: attrs.groupId, groupName: gName } },
            ],
          });
        }
      }
      setShowAttrSheet(false);
```

`route` 已在组件作用域（`const route = useRoute<RouteProp<RootStackParamList, 'OutfitEditor'>>();` 约 line 252）。`exitTo` 类型是 `{ screen?: string; tab?: string; groupId?: number; groupName?: string }`（RootStackParamList 内），访问 `.tab` / `.screen` 安全。

- [ ] **Step 2: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。若 `exitTo` 类型上没有 `tab` 字段导致报错，在 `route.params?.exitTo` 处加 `(route.params?.exitTo as any)?.tab` 兜底（RootStackParamList 的 OutfitEditor.exitTo 可能没显式声明 tab）。

- [ ] **Step 3: Commit**

```bash
git add src/screens/outfit/OutfitEditorScreen.tsx
git commit -m "fix: 首页入口新建搭配保存后回首页 tab（P1）"
```

---

### Task 2: P2 顶部栏 undo/redo 按钮

**Files:**
- Modify: `src/screens/outfit/OutfitEditorScreen.tsx`（顶部栏 JSX + canUndo/canRedo 派生 + 样式）

- [ ] **Step 1: 加 canUndo/canRedo 派生值**

`undo`、`redo`、`historyIndex`、`history` 已从 `useOutfitStore()` 解构（约 line 266-273）。找到 `const handleSelect = useCallback(...)`（约 line 405）之前的位置，或在解构 store 之后、其他逻辑之前，加派生值：

```ts
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
```

（放在 `const [selectedItemId, ...]` state 声明附近即可，只要在组件函数体内、return 之前。）

- [ ] **Step 2: 顶部栏插入 undo/redo 按钮**

找到顶部栏 JSX（约 line 551-560）：

```tsx
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>搭配画板</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </View>
```

替换为（在 `headerTitle` 和 `saveButton` 之间插入 undo/redo）：

```tsx
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>搭配画板</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconBtn, !canUndo && styles.iconBtnDisabled]}
            onPress={undo}
            disabled={!canUndo}
            activeOpacity={0.7}
          >
            <Ionicons name="undo-outline" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, !canRedo && styles.iconBtnDisabled]}
            onPress={redo}
            disabled={!canRedo}
            activeOpacity={0.7}
          >
            <Ionicons name="redo-outline" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>
```

- [ ] **Step 3: 加 headerRight / iconBtn / iconBtnDisabled 样式**

在 `makeStyles`（或 `createStyles`，文件内的样式工厂）内，找到 `saveButton` 样式（约 line 783），在其**之前**加：

```ts
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconBtnDisabled: {
      opacity: 0.3,
    },
```

- [ ] **Step 4: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 5: Commit**

```bash
git add src/screens/outfit/OutfitEditorScreen.tsx
git commit -m "feat: OutfitEditor 顶部栏接入 undo/redo 按钮（P2）"
```

---

### Task 3: P6 单击选中 + P4 手势开始存历史

**Files:**
- Modify: `src/screens/outfit/OutfitEditorScreen.tsx`（imports + DraggableItemProps + DraggableItem 手势处理 + 渲染处传 onGestureStart）

- [ ] **Step 1: import 加 TapGestureHandler**

找到 `react-native-gesture-handler` 的 import（约 line 17-22）：

```ts
import {
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  State,
} from 'react-native-gesture-handler';
```

加 `TapGestureHandler`：

```ts
import {
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';
```

- [ ] **Step 2: DraggableItemProps 加 onGestureStart**

找到 `interface DraggableItemProps`（约 line 53-65），在 `onSelect: () => void;` 之后加一行：

```ts
  onSelect: () => void;
  onGestureStart?: () => void;
```

- [ ] **Step 3: DraggableItem 解构加 onGestureStart + onTapStateChange**

找到 `function DraggableItem({...}: DraggableItemProps)`（约 line 67-78），在解构里加 `onGestureStart`：

```ts
function DraggableItem({
  item,
  canvasWidth,
  canvasHeight,
  onUpdate,
  onDelete,
  isSelected,
  onSelect,
  onGestureStart,
  isDeleted,
  styles,
  theme,
}: DraggableItemProps) {
```

然后在已有的 `onSelect` 相关逻辑附近（约 line 102-117 `onPanGestureEvent`/`onPanHandlerStateChange` 之前），加 tap 处理函数：

```ts
  const onTapStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      onSelect();
    }
  }, [onSelect]);
```

- [ ] **Step 4: 四个手势 BEGAN 时调 onGestureStart**

修改四个手势的 state change handler，在 BEGAN 分支调 `onGestureStart?.()`：

**a) onPanHandlerStateChange**（约 line 110-117）：

```ts
  const onPanHandlerStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      onGestureStart?.();
      onSelect();
      startPosition.current = { x: position.x, y: position.y };
    } else if (event.nativeEvent.state === State.END) {
      onUpdate(item.clothingId, { x: position.x, y: position.y });
    }
  }, [item.clothingId, position.x, position.y, onSelect, onUpdate, onGestureStart]);
```

**b) onPinchHandlerStateChange**（约 line 124-130）：

```ts
  const onPinchHandlerStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      onGestureStart?.();
      startScale.current = scale;
    } else if (event.nativeEvent.state === State.END) {
      onUpdate(item.clothingId, { scale });
    }
  }, [item.clothingId, scale, onUpdate, onGestureStart]);
```

**c) onRotationHandlerStateChange**（约 line 137-143）：

```ts
  const onRotationHandlerStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      onGestureStart?.();
      startRotation.current = rotation;
    } else if (event.nativeEvent.state === State.END) {
      onUpdate(item.clothingId, { rotation: ((rotation % 360) + 360) % 360 });
    }
  }, [item.clothingId, rotation, onUpdate, onGestureStart]);
```

**d) onHandlePanStateChange**（约 line 158-165，旋转 handle）：

```ts
  const onHandlePanStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      onGestureStart?.();
      onSelect();
      handleStartRotation.current = rotation;
    } else if (event.nativeEvent.state === State.END) {
      onUpdate(item.clothingId, { rotation: ((rotation % 360) + 360) % 360 });
    }
  }, [item.clothingId, rotation, onSelect, onUpdate, onGestureStart]);
```

- [ ] **Step 5: 最外层包 TapGestureHandler**

找到 DraggableItem 的 return JSX（约 line 169-245），当前最外层是 `<RotationGestureHandler>`。在它**外面**包一层 `<TapGestureHandler>`：

```tsx
  return (
    <TapGestureHandler onHandlerStateChange={onTapStateChange}>
      <RotationGestureHandler
        ref={rotationRef}
        simultaneousHandlers={[panRef, pinchRef]}
        onGestureEvent={onRotationGestureEvent}
        onHandlerStateChange={onRotationHandlerStateChange}
      >
        <PinchGestureHandler
          ref={pinchRef}
          simultaneousHandlers={[panRef, rotationRef]}
          onGestureEvent={onPinchGestureEvent}
          onHandlerStateChange={onPinchHandlerStateChange}
        >
          <PanGestureHandler
            ref={panRef}
            simultaneousHandlers={[pinchRef, rotationRef]}
            onGestureEvent={onPanGestureEvent}
            onHandlerStateChange={onPanHandlerStateChange}
            minPointers={1}
            avgTouches
          >
            <View
              style={[
                styles.canvasItem,
                {
                  left: position.x,
                  top: position.y,
                  zIndex: item.zIndex,
                  width: imageSize,
                  height: imageSize,
                  transform: [{ rotate: `${rotation}deg` }],
                },
              ]}
            >
              {/* ...原有内容保持不变（Image + 选中态边框 + 删除/旋转/图层按钮）... */}
            </View>
          </PanGestureHandler>
        </PinchGestureHandler>
      </RotationGestureHandler>
    </TapGestureHandler>
  );
```

**关键**：只加最外层的 `<TapGestureHandler ...>` 开标签和对应 `</TapGestureHandler>` 闭标签，内层所有内容（RotationGestureHandler 及其内部全部）**原样不动**。注意 JSX 闭合层级：`</TapGestureHandler>` 放在最末、与 `return (` 的最外层配对。

- [ ] **Step 6: 渲染 DraggableItem 处传 onGestureStart**

找到渲染处（约 line 595-607）：

```tsx
              <DraggableItem
                key={item.clothingId}
                item={item}
                canvasWidth={canvasDims.width}
                canvasHeight={canvasDims.height}
                onUpdate={updateCanvasItem}
                onDelete={handleDelete}
                isSelected={selectedItemId === item.clothingId}
                onSelect={() => handleSelect(item.clothingId)}
                isDeleted={deletedClothingIds.includes(item.clothingId)}
                styles={styles}
                theme={theme}
              />
```

加一行 `onGestureStart={saveToHistory}`：

```tsx
              <DraggableItem
                key={item.clothingId}
                item={item}
                canvasWidth={canvasDims.width}
                canvasHeight={canvasDims.height}
                onUpdate={updateCanvasItem}
                onDelete={handleDelete}
                isSelected={selectedItemId === item.clothingId}
                onSelect={() => handleSelect(item.clothingId)}
                onGestureStart={saveToHistory}
                isDeleted={deletedClothingIds.includes(item.clothingId)}
                styles={styles}
                theme={theme}
              />
```

`saveToHistory` 已从 `useOutfitStore()` 解构（约 line 274）。

- [ ] **Step 7: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 8: 手动走查**

启动 app（`npx expo start`），验证：
1. **单击选中**：画布上轻点一件单品 → 立即选中（出现删除/旋转/图层按钮），无需拖动。
2. **撤销拖拽**：拖动单品到新位置 → 点 ↶ → 回到拖动前；点 ↷ → 回到拖动后。
3. **撤销缩放**：双指缩放 → ↶ → 回缩放前。
4. **撤销旋转**：旋转 → ↶ → 回旋转前。
5. **连续操作**：连续拖 3 次 → ↶ 3 次逐个回退。
6. **纯点击不入历史**：单击选中（不拖）→ ↶ 按钮不变可用。
7. **按钮 disabled 态**：刚进编辑器无操作 → ↶↷ 都半透明不可点；操作一次 → ↶ 可用、↷ 不可用；↶ 后 → ↷ 可用。

- [ ] **Step 9: Commit**

```bash
git add src/screens/outfit/OutfitEditorScreen.tsx
git commit -m "feat: DraggableItem 单击选中（P6）+ 手势开始存历史快照（P4）"
```

---

## Self-Review

**Spec coverage 检查：**

| Spec 要求 | 对应 Task |
|----------|----------|
| P1：首页入口保存回首页 tab；搭配 tab 入口回 GroupDetail | Task 1（backToTab 判断） |
| P6：单击选中，与拖拽解耦 | Task 3 Step 3（onTapStateChange）+ Step 5（TapGestureHandler 外包） |
| P4：四个手势 BEGAN 时存历史 | Task 3 Step 4（a/b/c/d 四处 BEGAN 调 onGestureStart） |
| P2：顶部栏 undo/redo 按钮 + disabled 态 | Task 2 Step 2（按钮）+ Step 1（canUndo/canRedo） |
| 历史入口在 DraggableItem 而非 updateCanvasItem | Task 3 Step 6（传 onGestureStart={saveToHistory}），store 不改 |
| 纯点击不入历史 | Task 3 Step 3 的 onTapStateChange 只调 onSelect，不调 onGestureStart |

**Placeholder 扫描**：无 TBD/TODO。所有步骤含完整代码（含「原有内容保持不变」的注释明确指出哪里不动）。

**Type 一致性**：
- `onGestureStart?: () => void` 在 Task 3 Step 2（props 接口）、Step 3（解构）、Step 4（调用 `onGestureStart?.()`）、Step 6（传 `saveToHistory`）一致。
- `onTapStateChange` 在 Step 3 定义、Step 5 使用，一致。
- `canUndo`/`canRedo` 在 Task 2 Step 1 定义、Step 2 使用，一致。
- `saveToHistory` 是 store 已有方法（[outfitStore.ts:274 解构]），签名 `() => void`，匹配 `onGestureStart` 类型。

**JSX 闭合层级提醒**：Task 3 Step 5 在最外层加 `<TapGestureHandler>` 包裹，闭合标签 `</TapGestureHandler>` 必须在 `return (` 的最末、原 `</RotationGestureHandler>` 之后。实现者需仔细核对缩进和闭合，避免 JSX 嵌套错乱（这是本任务最容易出错的一步）。
