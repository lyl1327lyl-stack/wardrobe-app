# OutfitEditor 工具补全 + 保存防抖 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 OutfitEditor 补全背景色/清空工具栏入口（P3）+ 保存按钮防抖（P7）。

**Architecture:** CanvasToolsBar 加「背景」「清空」两个图标按钮；OutfitEditorScreen 接入背景色板 Modal（预设色）和清空确认 Alert；保存按钮加 isSavingOutfit state 防重复提交。store 的 `setCanvasBackground`/`clearCanvas` 已就绪，画布渲染已支持 `canvasBackground.value`。

**Tech Stack:** React Native + Expo、TypeScript、`zustand`（outfitStore）。

**Reference spec:** [docs/superpowers/specs/2026-06-16-outfit-editor-tools-design.md](../specs/2026-06-16-outfit-editor-tools-design.md)

**Testing note:** 项目无单元测试框架。每个任务用 `npx tsc --noEmit` 验证类型，最后手动走查。

---

## 文件结构

| 操作 | 文件 | 责任 |
|------|------|------|
| 改 | `src/components/outfit/CanvasToolsBar.tsx` | 加背景/清空图标按钮 + onBackground/onClear props + toolBtn 样式 |
| 改 | `src/screens/outfit/OutfitEditorScreen.tsx` | P3：setCanvasBackground 解构、色板 Modal、清空确认、传 props；P7：isSavingOutfit 防抖 |

CanvasToolsBar 必须先改（Task 1），OutfitEditorScreen 才能传新 props（Task 2）。Task 3（防抖）独立。

---

### Task 1: CanvasToolsBar 加背景/清空按钮

**Files:**
- Modify: `src/components/outfit/CanvasToolsBar.tsx`

- [ ] **Step 1: Props 接口加 onBackground / onClear**

找到 `interface Props`（约 line 6-10）：

```ts
interface Props {
  onAdd: () => void;
  selectedGroupName?: string;
  onSelectGroup: () => void;
}
```

改为：

```ts
interface Props {
  onAdd: () => void;
  selectedGroupName?: string;
  onSelectGroup: () => void;
  onBackground: () => void;
  onClear: () => void;
}
```

- [ ] **Step 2: 函数签名解构新 props**

找到 `export function CanvasToolsBar({...}: Props)`（约 line 12-16）：

```ts
export function CanvasToolsBar({
  onAdd,
  selectedGroupName,
  onSelectGroup,
}: Props) {
```

改为：

```ts
export function CanvasToolsBar({
  onAdd,
  selectedGroupName,
  onSelectGroup,
  onBackground,
  onClear,
}: Props) {
```

- [ ] **Step 3: JSX 在添加按钮前插入背景/清空按钮**

找到添加按钮 JSX（约 line 46-52）：

```tsx
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={onAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
```

在其**之前**插入背景/清空两个按钮：

```tsx
        <TouchableOpacity
          style={[styles.toolBtn, { backgroundColor: theme.colors.background }]}
          onPress={onBackground}
          activeOpacity={0.7}
        >
          <Ionicons name="color-palette-outline" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, { backgroundColor: theme.colors.background }]}
          onPress={onClear}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={onAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
```

注意：分组胶囊 `groupPill` 有 `flex: 1, marginRight: 12`，会占剩余空间，背景/清空/添加排在右侧。`container` 是 `space-between`，新按钮自然挤到添加按钮左侧。

- [ ] **Step 4: 加 toolBtn 样式**

在 `createStyles` 内，找到 `addButton` 样式（约 line 92-98），在其**之前**加：

```ts
    toolBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
```

- [ ] **Step 5: 类型检查 + 提交**

```bash
cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit
git add src/components/outfit/CanvasToolsBar.tsx
git commit -m "feat: CanvasToolsBar 加背景色/清空按钮入口（P3）"
```

预期 tsc 无报错。

---

### Task 2: OutfitEditorScreen 接入背景色板 + 清空

**Files:**
- Modify: `src/screens/outfit/OutfitEditorScreen.tsx`

- [ ] **Step 1: 解构 setCanvasBackground**

找到 `useOutfitStore()` 解构（约 line 270-290），当前有 `clearCanvas`、`canvasBackground` 等。在 `canvasBackground,` 之后加 `setCanvasBackground,`：

```ts
    canvasBackground,
    setCanvasBackground,
    loadFromOutfit,
```

（`setCanvasBackground` 是 store 已有方法；用 grep 确认：`grep -n "setCanvasBackground" src/store/outfitStore.ts`）

- [ ] **Step 2: 加 showBgPicker state + BG_PRESETS 常量**

在组件内 state 区（`const [showAttrSheet, setShowAttrSheet] = useState(false);` 附近），加：

```ts
  const [showBgPicker, setShowBgPicker] = useState(false);
```

在文件顶部模块作用域（`RootStackParamList` 之后、组件函数之前），加 BG_PRESETS 常量：

```ts
const BG_PRESETS: { label: string; value: CanvasBackground }[] = [
  { label: '无', value: { type: 'none', value: '' } },
  { label: '白', value: { type: 'color', value: '#FFFFFF' } },
  { label: '米', value: { type: 'color', value: '#F5EDE3' } },
  { label: '浅灰', value: { type: 'color', value: '#ECECEC' } },
  { label: '深灰', value: { type: 'color', value: '#3D3D3D' } },
  { label: '黑', value: { type: 'color', value: '#1A1A1A' } },
];
```

`CanvasBackground` 已在文件顶部 import（`import { useOutfitStore, CanvasItem, CanvasBackground } from '../../store/outfitStore';`）。

- [ ] **Step 3: 加 handleClearCanvas**

在 `handleConfirmAttributes` 附近（其他 handler 旁），加：

```ts
  const handleClearCanvas = useCallback(() => {
    Alert.alert('清空画板', '确定清空所有衣物？此操作不可撤销。', [
      { text: '取消', style: 'cancel' },
      { text: '清空', style: 'destructive', onPress: () => clearCanvas() },
    ]);
  }, [clearCanvas]);
```

- [ ] **Step 4: CanvasToolsBar 传新 props**

找到 `<CanvasToolsBar ...>`（约 line 759-763）：

```tsx
      <CanvasToolsBar
        onAdd={() => navigation.navigate('ClothingSelection', { source: 'Editor' })}
        selectedGroupName={groups.find(g => g.id === selectedGroupId)?.name}
        onSelectGroup={() => setShowGroupModal(true)}
      />
```

改为：

```tsx
      <CanvasToolsBar
        onAdd={() => navigation.navigate('ClothingSelection', { source: 'Editor' })}
        selectedGroupName={groups.find(g => g.id === selectedGroupId)?.name}
        onSelectGroup={() => setShowGroupModal(true)}
        onBackground={() => setShowBgPicker(true)}
        onClear={handleClearCanvas}
      />
```

- [ ] **Step 5: 渲染背景色板 Modal**

找到属性 Sheet 的渲染（`<OutfitAttributesSheet ...>`，约 line 752-756），在其**之后**、CanvasToolsBar 之前，加背景色板 Modal：

```tsx
      <Modal visible={showBgPicker} transparent animationType="slide" onRequestClose={() => setShowBgPicker(false)}>
        <View style={styles.bgPickerOverlay}>
          <TouchableOpacity style={styles.bgPickerBackdrop} activeOpacity={1} onPress={() => setShowBgPicker(false)} />
          <View style={styles.bgPickerCard}>
            <Text style={styles.bgPickerTitle}>画布背景</Text>
            <View style={styles.bgSwatchRow}>
              {BG_PRESETS.map(preset => {
                const isActive = canvasBackground.type === preset.value.type && canvasBackground.value === preset.value.value;
                const isNone = preset.value.type === 'none';
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.bgSwatch,
                      { backgroundColor: isNone ? theme.colors.card : preset.value.value },
                      isActive && styles.bgSwatchActive,
                    ]}
                    onPress={() => {
                      setCanvasBackground(preset.value);
                      setShowBgPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    {isNone && (
                      <Ionicons name="ban-outline" size={18} color={theme.colors.textTertiary} />
                    )}
                    <Text style={[styles.bgSwatchLabel, isNone && { color: theme.colors.textTertiary }]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
```

- [ ] **Step 6: 加背景色板样式**

在 `createStyles` 内（saveButton 样式附近），加：

```ts
    bgPickerOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    bgPickerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bgPickerCard: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
    },
    bgPickerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 14,
    },
    bgSwatchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    bgSwatch: {
      width: 64,
      height: 64,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    bgSwatchActive: {
      borderColor: theme.colors.primary,
    },
    bgSwatchLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
```

注意 `bgSwatch` 的 label 在深色底（深灰/黑）上会看不清——这是色块预览，用户主要看颜色不是看字，可接受。若想保证可读，可给 label 加文字阴影，但 YAGNI。

- [ ] **Step 7: 类型检查 + 提交**

```bash
cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit
git add src/screens/outfit/OutfitEditorScreen.tsx
git commit -m "feat: OutfitEditor 接入背景色板 Modal + 清空确认（P3）"
```

预期 tsc 无报错。

---

### Task 3: 保存按钮防抖（P7）

**Files:**
- Modify: `src/screens/outfit/OutfitEditorScreen.tsx`

- [ ] **Step 1: 加 isSavingOutfit state**

在组件 state 区（`showBgPicker` 附近），加：

```ts
  const [isSavingOutfit, setIsSavingOutfit] = useState(false);
```

（不复用 `isSaving` ref——那个是给 beforeRemove 拦截用的，不触发重渲染。）

- [ ] **Step 2: handleConfirmAttributes 加防抖**

找到 `handleConfirmAttributes`（约 line 493 开头）：

```ts
  const handleConfirmAttributes = useCallback(async (attrs: OutfitAttributes) => {
    // 生成缩略图（隐藏画布，去除选中态）
```

改为（开头加 `setIsSavingOutfit(true)`）：

```ts
  const handleConfirmAttributes = useCallback(async (attrs: OutfitAttributes) => {
    setIsSavingOutfit(true);
    // 生成缩略图（隐藏画布，去除选中态）
```

然后找到该函数的 catch 分支（约 line 554-556）：

```ts
    } catch (error: any) {
      Alert.alert('保存失败', error?.message || '请重试');
    }
  }, [canvasItems, canvasBackground, editingOutfitId, addOutfit, updateOutfit, reset, exitEditor, groups, navigation]);
```

改为（catch 末尾加 `setIsSavingOutfit(false)`——成功路径会导航离开屏幕，无需 reset）：

```ts
    } catch (error: any) {
      setIsSavingOutfit(false);
      Alert.alert('保存失败', error?.message || '请重试');
    }
  }, [canvasItems, canvasBackground, editingOutfitId, addOutfit, updateOutfit, reset, exitEditor, groups, navigation]);
```

- [ ] **Step 3: 保存按钮加 disabled + 文字**

找到顶部栏保存按钮（约 line 572-574）：

```tsx
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
```

改为：

```tsx
        <TouchableOpacity
          style={[styles.saveButton, isSavingOutfit && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSavingOutfit}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>{isSavingOutfit ? '保存中…' : '保存'}</Text>
        </TouchableOpacity>
```

- [ ] **Step 4: 加 saveButtonDisabled 样式**

在 `createStyles` 内，找到 `saveButton` 样式（约 line 798），在其**之后**加：

```ts
    saveButtonDisabled: {
      opacity: 0.5,
    },
```

- [ ] **Step 5: 类型检查 + 手动走查 + 提交**

```bash
cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit
git add src/screens/outfit/OutfitEditorScreen.tsx
git commit -m "feat: OutfitEditor 保存按钮防抖+loading 态（P7）"
```

预期 tsc 无报错。手动走查：加单品 → 保存 → Sheet 确认 → 观察顶部保存按钮变「保存中…」半透明不可点 → 写库完成后导航离开。

---

## Self-Review

**Spec coverage 检查：**

| Spec 要求 | 对应 Task |
|----------|----------|
| P7：isSavingOutfit state + handleConfirmAttributes 防抖 + 保存按钮 disabled/「保存中…」 | Task 3 Step 1-4 |
| P7：不复用 isSaving ref | Task 3 Step 1 注释明确 |
| P3：CanvasToolsBar 加背景/清空按钮 + props | Task 1 Step 1-4 |
| P3：背景预设色板（无/白/米/浅灰/深灰/黑） | Task 2 Step 2（BG_PRESETS）+ Step 5（Modal） |
| P3：清空弹确认（不可撤销） | Task 2 Step 3（handleClearCanvas Alert） |
| P3：setCanvasBackground 解构 + 应用 | Task 2 Step 1（解构）+ Step 5（onPress 调用） |
| P3：色板当前选中态高亮 | Task 2 Step 5（isActive + bgSwatchActive 边框） |

**Placeholder 扫描**：无 TBD/TODO。所有步骤含完整代码。

**Type 一致性**：
- `onBackground` / `onClear` 在 Task 1 Step 1（props 接口）、Step 2（解构）、Task 2 Step 4（传 props）一致，类型 `() => void`。
- `CanvasBackground` 类型在 BG_PRESETS（Task 2 Step 2）和 setCanvasBackground 调用（Step 5）一致。
- `setCanvasBackground` 是 store 已有方法（确认：grep store），签名 `(background: CanvasBackground) => void`。
- `clearCanvas` 已解构（Task 2 直接用），store 已有方法。
- `isSavingOutfit` 在 Task 3 Step 1 定义、Step 2/3 使用，一致。

**依赖顺序**：Task 1（CanvasToolsBar 加 props）→ Task 2（传 props）。Task 2 Step 4 传 `onBackground`/`onClear`，依赖 Task 1 已加这两个 props，否则 tsc 报错。Task 1 先做。Task 3 独立。
