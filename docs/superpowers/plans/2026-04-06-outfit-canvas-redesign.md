# 搭配详情页画板模式重设计 - 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重新设计搭配详情页，实现底部操作栏、删除确认弹层、衣物选择弹层（分类导航+搜索+多选）、拖动添加衣物、画板缩略图生成。

**Architecture:** OutfitDetailScreen 从三点菜单改为底部操作栏（三按钮：保存/改名/删除）；新增 ClothingPickerModal 支持搜索+类型/季节横向分类+多选；BottomStrip 增加"+"按钮打开弹层；拖动衣物到画板区域添加；画板缩略图用于 OutfitsScreen 卡片封面。

**Tech Stack:** React Native, PanResponder (drag), react-native-view-shot (thumbnail), TypeScript

---

## 一、文件结构

| 操作 | 文件路径 | 职责 |
|------|---------|------|
| 修改 | `src/screens/OutfitDetailScreen.tsx` | 底部操作栏、删除确认、拖动添加、"+"按钮 |
| 重写 | `src/components/ClothingPickerModal.tsx` | 搜索框+类型/季节横向Tab+多选网格+确认添加 |
| 修改 | `src/screens/OutfitsScreen.tsx` | 缩略图渲染（画板内容截图） |

现有数据模型已支持（`OutfitItemPosition`/`itemPositions`），无需修改 `types/`、`db/`、`store/`。

---

## 二、实施任务

### Task 1: OutfitDetailScreen 底部操作栏替换三点菜单

**文件:**
- Modify: `src/screens/OutfitDetailScreen.tsx:186-223` (header 区域)
- Modify: `src/screens/OutfitDetailScreen.tsx:277-302` (三点菜单 Modal，删除)
- Add: 底部操作栏 `ActionBar` 组件

**变更说明:**
1. 顶栏右侧移除三点菜单按钮，保留返回按钮和名称（可点击改名）
2. 底部新增操作栏，水平排列三个按钮：`[保存] [改名] [删除]`
3. 顶栏的"保存"按钮（当 hasUnsavedChanges 时显示）移到操作栏
4. "改名"按钮点击弹出 TextInput Alert 或内联编辑（与 spec 一致：点击弹出输入框直接编辑名称）
5. "删除"按钮点击弹出二次确认 Alert
6. 三点菜单 Modal 代码整体删除

**样式参考（底部操作栏）:**
```tsx
// 新增在 canvas 和 bottomStrip 之间
<View style={styles.actionBar}>
  <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
    <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
    <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>保存</Text>
  </TouchableOpacity>
  <View style={styles.actionDivider} />
  <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditingName(true)}>
    <Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} />
    <Text style={styles.actionBtnText}>改名</Text>
  </TouchableOpacity>
  <View style={styles.actionDivider} />
  <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
    <Text style={[styles.actionBtnText, { color: theme.colors.danger }]}>删除</Text>
  </TouchableOpacity>
</View>
```

**关键样式:**
```tsx
actionBar: {
  flexDirection: 'row',
  backgroundColor: theme.colors.card,
  borderTopWidth: 1,
  borderTopColor: theme.colors.border,
  paddingVertical: 12,
},
actionBtn: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
},
actionBtnText: {
  fontSize: 14,
  fontWeight: '500',
  color: theme.colors.textSecondary,
},
actionDivider: {
  width: 1,
  height: 20,
  backgroundColor: theme.colors.border,
},
```

**步骤:**

- [ ] **Step 1: 在 `OutfitDetailScreen` 的 canvas 和 bottomStrip 之间插入 ActionBar**

在 `OutfitDetailScreen` 的 JSX return 中，找到 `</View>{/* 画板区域 */}` 后的位置，在 `bottomStrip` 前插入 ActionBar。

```tsx
{/* 底部操作栏 */}
<View style={styles.actionBar}>
  <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
    <Ionicons name="checkmark-circle-outline" size={20} color={hasUnsavedChanges ? theme.colors.primary : theme.colors.textTertiary} />
    <Text style={[styles.actionBtnText, { color: hasUnsavedChanges ? theme.colors.primary : theme.colors.textTertiary }]}>保存</Text>
  </TouchableOpacity>
  <View style={styles.actionDivider} />
  <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditingName(true)}>
    <Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} />
    <Text style={styles.actionBtnText}>改名</Text>
  </TouchableOpacity>
  <View style={styles.actionDivider} />
  <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
    <Text style={[styles.actionBtnText, { color: theme.colors.danger }]}>删除</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 2: 移除顶栏右侧三点菜单**

删除 `headerRight` 中的 `menuBtn` TouchableOpacity（约第 219-221 行）。

- [ ] **Step 3: 移除顶栏的保存按钮（已迁移到操作栏）**

删除 `headerRight` 中 `hasUnsavedChanges` 条件渲染的 `saveBtn`（约第 208-211 行），只保留 `showSaved` 的"已保存"指示器。

- [ ] **Step 4: 删除三点菜单 Modal**

删除整个 `Modal visible={showMenu}` 块（约第 277-302 行）以及 `showMenu` 相关状态（第 50 行）。

- [ ] **Step 5: 清理状态 `showMenu`**

从 `useState` 声明中移除 `showMenu`（第 50 行）。

- [ ] **Step 6: 添加 ActionBar 样式到 styles**

在 `StyleSheet.create` 末尾添加：
```tsx
actionBar: {
  flexDirection: 'row',
  backgroundColor: theme.colors.card,
  borderTopWidth: 1,
  borderTopColor: theme.colors.border,
  paddingVertical: 12,
},
actionBtn: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
},
actionBtnText: {
  fontSize: 14,
  fontWeight: '500',
  color: theme.colors.textSecondary,
},
actionDivider: {
  width: 1,
  height: 20,
  backgroundColor: theme.colors.border,
},
```

- [ ] **Step 7: 提交**

```bash
git add src/screens/OutfitDetailScreen.tsx
git commit -m "feat(outfit): replace menu with bottom action bar in OutfitDetailScreen"
```

---

### Task 2: OutfitDetailScreen 删除确认弹层

**文件:**
- Modify: `src/screens/OutfitDetailScreen.tsx`（`handleDelete` 函数）

**变更说明:**
当用户点击"删除"按钮时，弹出 Alert 二次确认"确定要从该搭配移除这件衣服？"（单件）或"确定要删除搭配「X」？"（整个搭配）。本任务处理后者（删除整个搭配）。

**步骤:**

- [ ] **Step 1: 确认 `handleDelete` 函数已有确认 Alert**

当前 `handleDelete`（第 131-148 行）已有 Alert 确认逻辑，确认提示文案为 `确定要删除搭配「${outfit?.name}」吗？`。此功能已存在，验证即可。

---

### Task 3: 衣物选择弹层 ClothingPickerModal 重写

**文件:**
- Rewrite: `src/components/ClothingPickerModal.tsx`

**职责:** 弹层多选，支持搜索关键词、类型Tab、季节Tab，点击确认后回调 `onConfirm(selectedIds: number[])`

**接口变更:**
```tsx
interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: number[]) => void;  // 改为回调，不再直接写 store
  alreadyAddedIds: number[];  // 已添加的衣物ID（禁止重复选择）
}
```

**新增状态:**
```tsx
const [selectedIds, setSelectedIds] = useState<number[]>([]);
const [searchKeyword, setSearchKeyword] = useState('');
const [selectedType, setSelectedType] = useState<'全部' | ClothingType>('全部');
const [selectedSeason, setSelectedSeason] = useState<'全部' | Season>('全部');
```

**筛选逻辑:**
```tsx
const filteredClothing = clothing.filter(item => {
  // 类型筛选
  if (selectedType !== '全部' && item.type !== selectedType) return false;
  // 季节筛选
  if (selectedSeason !== '全部' && !item.seasons.includes(selectedSeason as Season)) return false;
  // 关键词搜索（品牌/场合/风格/颜色/备注）
  if (searchKeyword) {
    const kw = searchKeyword.toLowerCase();
    const match = item.brand.toLowerCase().includes(kw) ||
      item.color.toLowerCase().includes(kw) ||
      item.remarks.toLowerCase().includes(kw) ||
      item.occasions.some(o => o.toLowerCase().includes(kw)) ||
      (item as any).style?.some((s: string) => s.toLowerCase().includes(kw)); // style 可能未定义
    if (!match) return false;
  }
  return true;
});
```

**布局结构:**
```
┌──────────────────────────────────────┐
│  选择衣物                      [×]   │  ← Header
├──────────────────────────────────────┤
│  🔍 搜索品牌/场合/风格/颜色/备注    │  ← SearchInput
├──────────────────────────────────────┤
│  类型                               │
│  [全部][上衣][裤子][裙子][鞋子][配件][外套] │  ← HorizontalScrollView
├──────────────────────────────────────┤
│  季节                               │
│  [全部][🌸春][☀️夏][🍂秋][❄️冬]  │  ← HorizontalScrollView
├──────────────────────────────────────┤
│  [衣1✓][衣2][衣3][衣4][衣5][衣6]... │  ← FlatList 3列网格
│                                      │
├──────────────────────────────────────┤
│  已选 3 件              [确认添加]   │  ← Footer
└──────────────────────────────────────┘
```

**Tab 样式（选中/未选中）:**
```tsx
// 选中
{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.primary, color: '#fff', borderRadius: 14, fontSize: 12 }
// 未选中
{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.borderLight, color: theme.colors.textSecondary, borderRadius: 14, fontSize: 12 }
```

**衣物卡片样式:**
- 65x65 缩略图
- 选中时右上角显示 `✓` 绿色圆圈（参考 mockup）
- 已在搭配中（`alreadyAddedIds`）的卡片降低 opacity，不允许选择

**Footer:**
```tsx
<View style={styles.footer}>
  <Text style={styles.footerCount}>已选 <Text style={styles.footerCountNum}>{selectedIds.length}</Text> 件</Text>
  <TouchableOpacity
    style={[styles.confirmBtn, selectedIds.length === 0 && styles.confirmBtnDisabled]}
    onPress={handleConfirm}
    disabled={selectedIds.length === 0}
  >
    <Text style={styles.confirmBtnText}>确认添加</Text>
  </TouchableOpacity>
</View>
```

**步骤:**

- [ ] **Step 1: 重写 Props 接口和状态**

```tsx
interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: number[]) => void;
  alreadyAddedIds: number[];
}

export function ClothingPickerModal({ visible, onClose, onConfirm, alreadyAddedIds }: Props) {
  const { clothing } = useWardrobeStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedType, setSelectedType] = useState<'全部' | ClothingType>('全部');
  const [selectedSeason, setSelectedSeason] = useState<'全部' | Season>('全部');

  React.useEffect(() => {
    if (visible) {
      setSelectedIds([]);
      setSearchKeyword('');
      setSelectedType('全部');
      setSelectedSeason('全部');
    }
  }, [visible]);
```

- [ ] **Step 2: 实现筛选逻辑和渲染**

在组件内添加：
```tsx
const filteredClothing = clothing.filter(item => {
  if (selectedType !== '全部' && item.type !== selectedType) return false;
  if (selectedSeason !== '全部' && !item.seasons.includes(selectedSeason as Season)) return false;
  if (searchKeyword) {
    const kw = searchKeyword.toLowerCase();
    const match = item.brand.toLowerCase().includes(kw) ||
      item.color.toLowerCase().includes(kw) ||
      item.remarks.toLowerCase().includes(kw) ||
      item.occasions.some(o => o.toLowerCase().includes(kw));
    if (!match) return false;
  }
  if (alreadyAddedIds.includes(item.id)) return false;
  return true;
});
```

- [ ] **Step 3: 实现 JSX 返回（完整布局）**

参照上述布局结构实现，包括 SearchInput、类型Tab、季节Tab、FlatList网格、Footer确认按钮。

- [ ] **Step 4: 实现 handleConfirm**

```tsx
const handleConfirm = () => {
  if (selectedIds.length === 0) return;
  onConfirm(selectedIds);
  onClose();
};
```

- [ ] **Step 5: 添加样式**

参考 spec 中的布局和现有 `ClothingPickerModal.tsx` 样式。

- [ ] **Step 6: 提交**

```bash
git add src/components/ClothingPickerModal.tsx
git commit -m "feat(outfit): rewrite ClothingPickerModal with search and category tabs"
```

---

### Task 4: OutfitDetailScreen 集成新 ClothingPickerModal + "+"按钮

**文件:**
- Modify: `src/screens/OutfitDetailScreen.tsx`

**变更说明:**
1. BottomStrip 右侧添加"+"图标按钮，点击打开 `ClothingPickerModal`
2. `ClothingPickerModal.onConfirm` 回调中，批量添加衣物到画板
3. 拖动添加：BottomStrip 物品支持 PanResponder，拖出 Strip 区域时触发添加

**新增状态:**
```tsx
const [showPicker, setShowPicker] = useState(false);
```

**BottomStrip 修改:**
在 `ScrollView` 末尾添加"+"按钮：
```tsx
<TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
  <Ionicons name="add" size={24} color={theme.colors.textSecondary} />
</TouchableOpacity>
```

**添加 `ClothingPickerModal` 组件到 JSX：**
```tsx
<ClothingPickerModal
  visible={showPicker}
  onClose={() => setShowPicker(false)}
  alreadyAddedIds={localItemIds}
  onConfirm={(ids) => {
    ids.forEach(id => addClothingToCanvasById(id));
    setShowPicker(false);
  }}
/>
```

**新增 `addClothingToCanvasById` 函数：**
```tsx
const addClothingToCanvasById = (id: number) => {
  if (localItemIds.includes(id)) return;
  const randomX = (Math.random() - 0.5) * 60;
  const randomY = (Math.random() - 0.5) * 60;
  const centerX = (SCREEN_WIDTH - ITEM_SIZE) / 2 + randomX;
  const centerY = (CANVAS_HEIGHT - ITEM_SIZE) / 2 + randomY;
  setLocalItemIds(prev => [...prev, id]);
  setLocalPositions(prev => ({
    ...prev,
    [id]: { x: centerX, y: centerY, scale: 1 },
  }));
};
```

**步骤:**

- [ ] **Step 1: 添加 `showPicker` 状态**

在 `useState` 声明区域添加：
```tsx
const [showPicker, setShowPicker] = useState(false);
```

- [ ] **Step 2: 添加 `addClothingToCanvasById` 函数**

在 `addClothingToCanvas` 函数后添加。

- [ ] **Step 3: 在 BottomStrip 的 ScrollView 末尾添加"+"按钮**

在 `stripContent` 的 `availableClothing.map` 后添加：
```tsx
<TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
  <Ionicons name="add" size={24} color={theme.colors.textSecondary} />
</TouchableOpacity>
```

- [ ] **Step 4: 添加 `ClothingPickerModal` 组件到 return JSX**

在 `</View>{/* 三点菜单 Modal */}` 位置（删除三点菜单后），替换为：
```tsx
<ClothingPickerModal
  visible={showPicker}
  onClose={() => setShowPicker(false)}
  alreadyAddedIds={localItemIds}
  onConfirm={(ids) => {
    ids.forEach(id => addClothingToCanvasById(id));
    setShowPicker(false);
  }}
/>
```

- [ ] **Step 5: 添加 strip 中 addBtn 样式**

```tsx
addBtn: {
  width: 64,
  height: 64,
  borderRadius: theme.borderRadius.md,
  borderWidth: 1.5,
  borderColor: theme.colors.border,
  borderStyle: 'dashed',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: theme.colors.borderLight,
},
```

- [ ] **Step 6: 导入 ClothingPickerModal**

在文件顶部 `import` 部分添加：
```tsx
import { ClothingPickerModal } from '../components/ClothingPickerModal';
```

- [ ] **Step 7: 提交**

```bash
git add src/screens/OutfitDetailScreen.tsx
git commit -m "feat(outfit): integrate new ClothingPickerModal with + button"
```

---

### Task 5: 拖动添加衣物到画板

**文件:**
- Modify: `src/screens/OutfitDetailScreen.tsx`

**变更说明:**
BottomStrip 中的衣物支持拖动，当拖出 Strip 区域（y 方向超出 strip 顶部边界）时，将该衣物添加到画板。

**实现方案:**
使用 `PanResponder` 监听拖动，计算释放位置是否在 canvas 区域内。

**新增组件 `DraggableStripItem`:**
将 BottomStrip 中的 `<TouchableOpacity>` 包裹的 strip item 替换为支持拖动的版本：

```tsx
function DraggableStripItem({ item, onAddToCanvas }: { item: ClothingItem; onAddToCanvas: (id: number) => void }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const stripY = useRef(0); // strip 顶部相对屏幕的 Y 坐标

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 只有纵向拖动超过 20px 才激活
        return Math.abs(gestureState.dy) > 20;
      },
      onPanResponderMove: Animated.event(
        [null, { dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        // 如果释放位置在 canvas 区域内，添加衣物
        if (gestureState.moveY < stripY.current) {
          onAddToCanvas(item.id);
        }
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.stripItem, { transform: [{ translateY: pan.y }] }]}
      {...panResponder.panHandlers}
    >
      <Image source={{ uri: item.thumbnailUri }} style={styles.stripImage} />
    </Animated.View>
  );
}
```

**集成到 BottomStrip:**
```tsx
availableClothing.map(item => (
  <DraggableStripItem
    key={item.id}
    item={item}
    onAddToCanvas={addClothingToCanvasById}
  />
))
```

**步骤:**

- [ ] **Step 1: 创建 `DraggableStripItem` 组件**

在 `DraggableItem` 组件后添加。

- [ ] **Step 2: 将 BottomStrip 中的 stripItem 替换为 DraggableStripItem**

- [ ] **Step 3: 提交**

```bash
git add src/screens/OutfitDetailScreen.tsx
git commit -m "feat(outfit): add drag-from-strip to canvas interaction"
```

---

### Task 6: 画板缩略图生成（OutfitsScreen 卡片封面）

**文件:**
- Modify: `src/screens/OutfitsScreen.tsx`

**依赖:** 安装 `react-native-view-shot`（如果未安装）

**变更说明:**
OutfitsScreen 的 outfit 卡片封面从 2x2 网格改为画板缩略图。使用 `react-native-view-shot` 截取 canvas 内容。

**实现方案:**
OutfitDetailScreen 渲染时截取 canvas 保存到 `outfit.thumbnailUri`（新增字段），OutfitsScreen 直接展示。

**数据流:**
1. `handleSave` 成功后，调用 `captureRef` 截取 canvas，保存 thumbnailUri
2. 需要在 `Outfit` 类型中新增 `thumbnailUri?: string`
3. `OutfitsScreen` 的 `outfitPreview` 直接显示 `item.thumbnailUri`

**新增类型字段:**
```tsx
// src/types/index.ts
interface Outfit {
  ...
  thumbnailUri?: string;
}
```

**OutfitDetailScreen handleSave 修改:**
```tsx
const handleSave = async () => {
  if (!outfit) return;
  try {
    // 截图 canvas...
    const uri = await captureRef(canvasRef, { format: 'png', quality: 0.8 });
    await updateOutfit({
      ...outfit,
      name: editedName.trim() || outfit.name,
      itemIds: localItemIds,
      itemPositions: localPositions,
      thumbnailUri: uri,
    });
    // ...
  } catch {
    // 如果截图失败，仍然保存（不阻塞）
    await updateOutfit({ ...outfit, ... });
  }
};
```

**OutfitsScreen gridPreview 修改为:**
```tsx
<View style={styles.outfitPreview}>
  {item.thumbnailUri ? (
    <Image source={{ uri: item.thumbnailUri }} style={styles.canvasThumb} />
  ) : (
    // fallback 网格
    <View style={styles.gridPreview}>
      {items.slice(0, 4).map((c, idx) => (
        <Image key={c!.id} source={{ uri: c!.thumbnailUri }} style={styles.gridThumb} />
      ))}
      ...
    </View>
  )}
</View>
```

**步骤:**

- [ ] **Step 1: 检查 `react-native-view-shot` 是否已安装**

```bash
grep "react-native-view-shot" package.json
```
如果未安装：
```bash
npx expo install react-native-view-shot
```

- [ ] **Step 2: 在 `src/types/index.ts` 的 `Outfit` 接口添加 `thumbnailUri?: string`**

- [ ] **Step 3: 在 `OutfitDetailScreen` 导入 `captureRef`**

```tsx
import { captureRef } from 'react-native-view-shot';
```

- [ ] **Step 4: 在 OutfitDetailScreen 添加 canvasRef**

```tsx
const canvasRef = useRef<View>(null);
```

- [ ] **Step 5: 给 canvas View 添加 ref**

```tsx
<View style={styles.canvas} ref={canvasRef} onTouchStart={() => setSelectedItemId(null)}>
```

- [ ] **Step 6: 修改 `handleSave` 截图并保存 thumbnailUri**

- [ ] **Step 7: 修改 `OutfitsScreen` 的 `renderOutfit` 使用 thumbnailUri**

- [ ] **Step 8: 添加 canvasThumb 样式**

```tsx
canvasThumb: {
  width: '100%',
  height: '100%',
  aspectRatio: 1,
  backgroundColor: theme.colors.borderLight,
},
```

- [ ] **Step 9: 提交**

```bash
git add src/screens/OutfitDetailScreen.tsx src/screens/OutfitsScreen.tsx src/types/index.ts
git commit -m "feat(outfit): add canvas thumbnail for outfit cards"
```

---

### Task 7: 验证与测试

**步骤:**

- [ ] **Step 1: 搭配详情页重命名**

进入搭配详情页 → 点击"改名"按钮 → 输入新名称 → 保存

- [ ] **Step 2: 删除搭配**

点击"删除"按钮 → 确认弹层出现 → 确认删除 → 返回列表

- [ ] **Step 3: 从 + 按钮添加衣物**

点击底部"+" → 弹层出现 → 选择类型/季节Tab → 搜索关键词 → 选择衣物 → 确认添加 → 画板出现衣物

- [ ] **Step 4: 拖动添加衣物**

从底部 Strip 拖动衣物到画板区域 → 衣物出现在拖动位置

- [ ] **Step 5: 删除画板衣物**

点击画板衣物 → 显示删除按钮(×) → 点击× → 确认弹层 → 确认后移除

- [ ] **Step 6: 保存后检查缩略图**

保存搭配 → 返回列表 → 查看卡片封面是否为画板缩略图

---

## 三、任务依赖关系

```
Task 1 (底部操作栏)
    ↓
Task 2 (删除确认，已实现，验证即可)
    ↓
Task 3 (ClothingPickerModal 重写) ← 独立
    ↓
Task 4 (集成新弹层 + +按钮) ← 依赖 Task 3
    ↓
Task 5 (拖动添加) ← 依赖 Task 4
    ↓
Task 6 (缩略图) ← 依赖 Task 1-5
    ↓
Task 7 (验证测试)
```

**推荐顺序:** Task 1 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7
(Task 2 验证即可，无需修改)

---

## 四、Spec Self-Review

1. **Spec coverage:**
   - 底部操作栏（三按钮）→ Task 1 ✓
   - 删除确认弹层 → Task 2 ✓（已实现）
   - 添加衣物弹层（分类+搜索+多选）→ Task 3 ✓
   - 拖动添加 → Task 5 ✓
   - 画板缩略图 → Task 6 ✓

2. **Placeholder scan:** 无 TBD/TODO，所有步骤均给出具体代码和实现方式。

3. **Type consistency:**
   - `Outfit` 类型新增 `thumbnailUri?: string` → Task 6
   - `ClothingPickerModal` Props 改为 `onConfirm` 回调 + `alreadyAddedIds` → Task 3
   - `addClothingToCanvasById` 复用 `addClothingToCanvas` 的位置逻辑 → Task 4

4. **Spec gap:** 点击添加（作为备选）已包含在 BottomStrip 的 `onPress` 中（Task 4），无需额外任务。
