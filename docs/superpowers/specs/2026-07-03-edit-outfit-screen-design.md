# 编辑搭配页（EditOutfitScreen）—— 仿编辑衣服界面

## Context

当前编辑搭配的流程：搭配详情点「编辑」→ 跳 OutfitEditor（画板编辑器）→ 默认弹属性 Sheet（`openAttrs`）改属性 → 保存。用户反馈这个"跳画板编辑器 + 弹 Sheet"的体验不直观，想要一个**仿编辑衣服界面（AddClothingScreen）的独立编辑页**：画板预览在上方 + 属性表单在下方常驻 + 顶部保存按钮，点画板预览才进画板编辑器。

编辑衣服界面（AddClothingScreen）的布局模式：Header（返回/标题/保存）+ ScrollView（图片区 4:3 可点击 + 下方 formCard 卡片表单），保存只在顶部，无固定底栏。搭配属性 5 字段（名称/分组/季节/标签/备注）在 `OutfitAttributesSheet` 里已有现成实现可搬。

## Goals

- 新建 `EditOutfitScreen`：画板预览在上 + 属性表单（名称/分组/季节/标签/备注）在下 + 顶部保存按钮，仿 AddClothingScreen 布局。
- 画板预览点击 → 进 OutfitEditor「纯画板编辑」模式：保存只更新画板（canvasData/canvasBackground/thumbnailUri），**不弹属性 Sheet、不碰属性**，返回 EditOutfitScreen。
- EditOutfitScreen 保存 → `updateOutfit` 写属性（name/groupId/seasons/tags/notes），画板部分已是最新（OutfitEditor 存过）。
- 搭配详情的「编辑」按钮改跳 EditOutfitScreen（不再跳 OutfitEditor + openAttrs）。

## Non-Goals

- **新建搭配流程不改**：本次只做"编辑现有搭配"。新建仍走原流程（ClothingSelection → OutfitEditor + 属性 Sheet）。
- 不抽共享样式文件（EditOutfitScreen 内自建样式，复用 formCard/chip 等模式的值，不强求 import 共享）。
- 不改 OutfitEditor 的新建/其他编辑入口行为，只加 canvasOnly 分支。

## 页面设计：EditOutfitScreen

`src/screens/outfit/EditOutfitScreen.tsx`（新建）

### 布局（仿 AddClothingScreen 三段式）

```
KeyboardAvoidingView
├─ Header（左返回 / 中「编辑搭配」/ 右「保存」胶囊，disabled=isSubmitting）
└─ ScrollView
   ├─ 画板预览区（4:3，thumbnail，点击 → OutfitEditor canvasOnly）
   └─ section（paddingHorizontal 16）
      ├─ formCard 1：名称（TextInput）+ 分组（chip 单选 + 新建分组）
      ├─ formCard 2：季节（chip 多选）+ 标签（chip 多选 + 新标签）
      └─ formCard 3：备注（多行 TextInput）
```

### 路由参数

`EditOutfit: { outfitId: number }`。进页后从 store 读 outfit，初始化 draft。

### State（draft）

```ts
const [name, setName] = useState('');
const [groupId, setGroupId] = useState<number>(0);
const [seasons, setSeasons] = useState<string[]>([]);
const [tags, setTags] = useState<string[]>([]);
const [notes, setNotes] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
// 标签/分组 inline 输入
const [tagInput, setTagInput] = useState('');
const [showTagInput, setShowTagInput] = useState(false);
const [newGroupInput, setNewGroupInput] = useState('');
const [showNewGroupInput, setShowNewGroupInput] = useState(false);
```

outfit 加载后用 useEffect 初始化 draft（依赖 outfit?.id）。

### 画板预览区

- 显示 `outfit.thumbnailUri`（`Image resizeMode="contain"`，白底）。
- 点击 → `navigation.navigate('OutfitEditor', { outfitId, mode:'edit', canvasOnly: true, exitTo: { screen: 'EditOutfit' } })`。
- 无缩略图时显示占位（相机图标 +「点击编辑画板」）。
- 从 OutfitEditor 返回后，thumbnail 自动刷新（store 的 outfit 已被 OutfitEditor 更新，订阅自动重渲染）。

### 属性表单字段（复用 OutfitAttributesSheet 的实现模式）

| 字段 | UI | 选项来源 |
|------|----|----|
| 名称 | 单行 TextInput（maxLength 30） | — |
| 分组 | chip 单选 +「新建分组」虚线 chip + inline 输入（addGroup → setGroupId） | `useWardrobeStore groups` + `addGroup` |
| 季节 | chip 多选 | `useCustomOptionsStore seasons` |
| 标签 | 已选 chip（×删除）+ 可选 chip +「新标签」虚线 chip + inline 输入 | `useCustomOptionsStore tags` |
| 备注 | 多行 TextInput（maxLength 200） | — |

（分组新建、标签新增逻辑直接照搬 OutfitAttributesSheet 的 handleCreateGroup / addCustomTag。）

### 保存（handleSave）

```ts
const handleSave = async () => {
  if (!outfit) return;
  setIsSubmitting(true);
  try {
    await updateOutfit({
      ...outfit,
      name: name.trim() || outfit.name,  // 空名保留原名
      groupId,
      seasons: [...seasons],
      tags: [...tags],
      notes: notes.trim(),
      // canvasData/canvasBackground/thumbnailUri 保留 outfit 现值（OutfitEditor 已更新画板）
    } as Outfit);
    navigation.goBack();
  } catch (e) {
    Alert.alert('保存失败', ...);
  } finally {
    setIsSubmitting(false);
  }
};
```

保存按钮：`disabled={isSubmitting}`，文案 `isSubmitting ? '保存中…' : '保存'`。

## OutfitEditor「纯画板」模式（canvasOnly）

### 触发

`route.params.canvasOnly === true` 时进入纯画板模式。

### 行为差异

| 行为 | 普通模式（现状） | canvasOnly 模式 |
|------|------|------|
| 顶部保存按钮 | 校验 → 开属性 Sheet | 校验 → 直接保存画板（不开 Sheet） |
| 保存内容 | 完整 outfitData（含属性来自 Sheet） | 只更新 canvasData/canvasBackground/thumbnailUri，**保留 outfit 的 name/seasons/tags/notes/groupId** |
| 退出 | reset 到分组/exitTo | `navigation.goBack()`（回 EditOutfitScreen） |

### 实现

新增 `handleSaveCanvasOnly`：

```ts
const handleSaveCanvasOnly = useCallback(async () => {
  if (canvasItems.length === 0) {
    Alert.alert('请添加衣物', '请至少添加一件衣物到画板');
    return;
  }
  setIsSavingOutfit(true);
  const fallbackUri = canvasItems.length > 0 ? canvasItems[0].imageUri : '';
  let thumbnailUri = fallbackUri;
  try {
    thumbnailUri = await generateOutfitThumbnail(captureTargetRef, fallbackUri);
  } catch { thumbnailUri = fallbackUri; }
  try {
    const existing = outfits.find(o => o.id === editingOutfitId);
    if (existing) {
      await updateOutfit({
        ...existing,
        canvasData: canvasItems,
        canvasBackground,
        thumbnailUri,
      } as any);
    }
    reset();
    isSaving.current = true;
    navigation.goBack();  // 回 EditOutfitScreen
  } catch (error: any) {
    Alert.alert('保存失败', error?.message || '请重试');
  } finally {
    setIsSavingOutfit(false);
  }
}, [canvasItems, canvasBackground, editingOutfitId, outfits, updateOutfit, reset, navigation]);
```

顶部保存按钮 onPress：
```ts
onPress={() => (route.params as any)?.canvasOnly ? handleSaveCanvasOnly() : handleSave()}
```

`updateOutfit` 需从 `useWardrobeStore` 解构（当前 OutfitEditor 已解构 addOutfit，需补 updateOutfit）。

## 搭配详情入口改造

`OutfitDetailScreen` 顶部「编辑」按钮（当前 `onPress` navigate OutfitEditor + openAttrs）改为：

```ts
navigation.navigate('EditOutfit', { outfitId });
```

去掉 openAttrs（不再需要）。OutfitEditor 的 openAttrs 逻辑保留（无害，新建流程不用但留着不碍事）。

## 路由注册

`App.tsx` RootStack 加：
```tsx
<RootStack.Screen name="EditOutfit" component={EditOutfitScreen} options={{ headerShown: false, presentation: 'card' }} />
```

各页面的本地 `RootStackParamList` 类型加 `EditOutfit: { outfitId: number }`（OutfitDetailScreen、EditOutfitScreen 自身、OutfitEditor 的 exitTo 引用）。

## 文件改动清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/screens/outfit/EditOutfitScreen.tsx` | 编辑搭配页（画板预览 + 属性表单 + 保存） |
| 改 | `src/screens/outfit/OutfitEditorScreen.tsx` | 加 canvasOnly 模式（handleSaveCanvasOnly + 保存按钮分支 + 解构 updateOutfit） |
| 改 | `src/screens/outfit/OutfitDetailScreen.tsx` | 编辑按钮改跳 EditOutfitScreen（去掉 openAttrs） |
| 改 | `App.tsx` | 注册 EditOutfit 路由 |

## 验证场景

1. **进入编辑**：搭配详情点「编辑」→ 进入 EditOutfitScreen，画板预览 + 属性表单（预填 outfit 现值）。
2. **改属性保存**：改名称/季节/标签 → 顶部保存 → 回详情页，属性已更新。
3. **编辑画板**：点画板预览 → OutfitEditor（纯画板，无属性 Sheet）→ 拖动单品 → 保存 → 回 EditOutfitScreen，画板预览刷新。
4. **画板不改属性**：OutfitEditor 纯画板保存后，回 EditOutfitScreen，属性（名称/季节等）**未被覆盖**（保留原值）。
5. **分组新建**：分组 chip 末尾「新建分组」→ 输入 → 自动选中。
6. **标签新增**：同上。
7. **新建搭配不受影响**：搭配 tab FAB 新建仍走 ClothingSelection → OutfitEditor + 属性 Sheet。
8. **TypeScript 编译通过**。

## Open Questions（实施时定）

- EditOutfitScreen 画板预览的宽高比：4:3（同 AddClothing 图片）还是 1:1（搭配缩略图常是方画板）？建议 1:1（搭配画板是正方形，OutfitEditor 画布也是正方形 CANVAS_WIDTH）。
- 返回未保存检查：EditOutfitScreen 是否加"未保存确认"（仿 AddClothing handleBack）？建议加（属性改了未保存弹确认），但可后置。
