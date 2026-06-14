# 搭配属性确认 Sheet（保存前一站式填写）

## Context

当前「新建搭配」流程存在属性割裂问题：

- 在 OutfitEditor 画板摆好单品后点「保存」，`outfitData` **只含** `name/itemIds/canvasData/canvasBackground/groupId/thumbnailUri/createdAt`（[OutfitEditorScreen.tsx:478-486](src/screens/outfit/OutfitEditorScreen.tsx#L478)），**不含** seasons/tags/notes。
- 名称被自动拼成「{分组名}搭配」（line 479），导致同分组大量重名。
- 新建后弹 `Alert`「是否编辑季节、标签、备注等属性？」（line 510-541），选「编辑属性」要 `reset` 跳到 `OutfitDetail` 页才能填。
- 编辑模式保存则直接退出，完全碰不到属性。

**核心痛点**：属性被当成「事后补充」，必须创建完再跳页填，割裂了创建流程；且每次新建强弹 Alert 打扰。

## Goals

- 属性（名称、分组、季节、标签、备注）成为**创建/编辑搭配流程的一部分**，在画板内一站式完成，不跳页。
- 通过**智能预填**（季节取交集、标签取并集）把 90% 的填写负担降到「扫一眼点保存」。
- 去掉新建后的强 Alert（P9）。
- 新建与编辑体验一致。

## Non-Goals

- 不改画板本身的拖拽/缩放/旋转/图层交互（另有 P5/P6 优化）。
- 不接入 undo/redo（P2/P4，独立任务）。
- 不改入口路由（P1 保存回首页的 Bug 另行修复，本任务专注属性流程）。
- 不改缩略图生成（P13）。

## 最终交互流程

```
画板摆单品 → 点顶部「保存」
                ↓
        计算「预填属性」+ 弹出 OutfitAttributesSheet（底部 Sheet）
                ↓
        用户确认/微调 → 点「保存搭配」
                ↓
        真正写库（含完整属性）→ 退出编辑器
```

- **新建模式**：Sheet 预填 = 推断值（季节交集、标签并集、默认名称）。
- **编辑模式**：Sheet 预填 = outfit 现有属性值（保留用户之前的手动设定）。
- 去掉原新建分支末尾的 `Alert`（line 508-542），统一走 Sheet → 写库 → 退出。

## 预填规则（关键决策）

| 字段 | 新建预填 | 编辑预填 |
|------|---------|---------|
| 名称 | `{主单品parentType或分组名}搭配`（沿用现有命名习惯，可改） | outfit.name |
| 分组 | selectedGroupId / 入口传入 / 默认「未分组」 | outfit.groupId |
| 季节 | **交集**：所有 canvasItems 对应 clothing 的 seasons 取交集 | outfit.seasons |
| 标签 | **并集**：所有 clothing 的 tags 去重合并 | outfit.tags |
| 备注 | 空 | outfit.notes |

**季节交集算法**：遍历 `canvasItems`，取每件 clothing 的 `seasons`，逐季判断「是否所有单品都含」；单品无 seasons 字段时不参与（忽略）。结果可能为空（单品季节不一致），此时预填空，用户自选。

**编辑模式不重新推断**：即使用户在画板上加减了单品，预填仍用 outfit 已有属性，尊重用户之前的手动设定；用户可在 Sheet 内手动调整。

## 组件设计

### 新组件 `OutfitAttributesSheet.tsx`

`src/components/OutfitAttributesSheet.tsx`

**Props**：
```ts
interface OutfitAttributes {
  name: string;
  groupId: number;
  seasons: string[];
  tags: string[];
  notes: string;
}

interface Props {
  visible: boolean;
  initial: OutfitAttributes;
  groups: OutfitGroup[];           // 分组列表（用于分组选择）
  onClose: () => void;
  onConfirm: (attrs: OutfitAttributes) => void;
}
```

**内部状态**：`name`、`groupId`、`seasons`、`tags`、`notes`，由 `initial` 在 `visible` 切为 true 时初始化（`useEffect` 依赖 `visible` + `initial`）。

**数据来源**：
- 季节选项池：`useCustomOptionsStore(s => s.seasons)`（与 `OutfitDetailScreen:50` 一致）。
- 标签选项池：`useCustomOptionsStore(s => s.tags)`（与 `OutfitDetailScreen:51` 一致）。
- 分组列表：由 props 传入（OutfitEditor 已有 `groups`）。

**UI 结构**（自上而下）：
1. 抓手条 + 标题「完善搭配信息」+ 关闭按钮
2. **名称**：单行 `TextInput`，预填默认值
3. **分组**：横向 `ScrollView`，分组名 chip 单选，选中高亮
4. **季节**：季节 chip 多选（春/夏/秋/冬 + customOptions 扩展），选中高亮
5. **标签**：已选 tag chip（可点 × 删除）+ 未选 tag chip（可点添加）+「+ 新标签」按钮（弹 `Alert.prompt` 或 inline `TextInput` 输入，沿用 AddClothingScreen 惯例）
6. **备注**：多行 `TextInput`
7. 底部「保存搭配」主按钮（调用 `onConfirm`，构造 `OutfitAttributes` 传出）

**样式**：复用 `GroupFormModal` / `WearCalendarSheet` 的底部 Sheet 模式（`KeyboardAvoidingView` + 圆角顶部 + `useSafeAreaInsets`）。

### `OutfitEditorScreen.tsx` 改造

1. **新增 state**：`showAttrSheet: boolean`。
2. **新增预填 memo** `prefillAttributes`：

   `customSeasons` 顶部用 hook 订阅：`const customSeasons = useCustomOptionsStore(s => s.seasons);`，作为 memo 依赖。`defaultGroupId` 复用现有 `handleSave` 内的 `getDefaultGroupId` 逻辑（提到组件作用域或 memo 内联）。

   ```ts
   const prefillAttributes = useMemo<OutfitAttributes>(() => {
     const getDefaultGroupId = () => groups.find(g => g.name === '未分组')?.id || groups[0]?.id || 0;
     if (editingOutfitId) {
       const existing = outfits.find(o => o.id === editingOutfitId);
       return {
         name: existing?.name || '',
         groupId: selectedGroupId ?? existing?.groupId ?? getDefaultGroupId(),
         seasons: existing?.seasons || [],
         tags: existing?.tags || [],
         notes: existing?.notes || '',
       };
     }
     // 新建：推断
     const clothings = canvasItems
       .map(ci => clothing.find(c => c.id === ci.clothingId))
       .filter((c): c is ClothingItem => !!c);
     // 季节交集：所有单品都含的季
     const seasonSets = clothings.map(c => new Set(c.seasons));
     const intersected = customSeasons.filter(s => seasonSets.every(set => set.has(s)));
     // 标签并集：去重合并
     const tagUnion = Array.from(new Set(clothings.flatMap(c => c.tags)));
     const gid = selectedGroupId ?? getDefaultGroupId();
     const mainType = clothings[0]?.parentType || clothings[0]?.type
       || groups.find(g => g.id === gid)?.name || '搭配';
     return {
       name: `${mainType}搭配`,
       groupId: gid,
       seasons: intersected,
       tags: tagUnion,
       notes: '',
     };
   }, [editingOutfitId, outfits, canvasItems, clothing, selectedGroupId, groups, customSeasons]);
   ```
3. **拆分 `handleSave`**：
   - 顶部「保存」按钮 `onPress` 改为 `openAttrSheet`：先校验 `canvasItems.length === 0`（沿用现有提示），通过则 `setShowAttrSheet(true)`。
   - 新增 `handleConfirmAttributes(attrs)`：把原 `handleSave` 里从「生成缩略图」到「写库 + 退出」的逻辑搬进来，`outfitData` 补上 `name: attrs.name`、`groupId: attrs.groupId`、`seasons: attrs.seasons`、`tags: attrs.tags`、`notes: attrs.notes`。
   - 删除原 `handleSave` 末尾新建分支的 `Alert`（line 508-542），新建与编辑统一走「写库 → reset → exitEditor（或 reset 到入口）」。
4. **渲染 Sheet**：
   ```tsx
   <OutfitAttributesSheet
     visible={showAttrSheet}
     initial={prefillAttributes}
     groups={groups}
     onClose={() => setShowAttrSheet(false)}
     onConfirm={handleConfirmAttributes}
   />
   ```

## 数据流

```
[画板单品变化] → prefillAttributes memo 重算（仅新建模式生效，编辑模式读 outfit）
       ↓
点「保存」→ setShowAttrSheet(true)
       ↓
OutfitAttributesSheet(initial=prefillAttributes) → 用户编辑
       ↓
onConfirm(attrs) → handleConfirmAttributes:
   1. 生成缩略图（沿用 captureTargetRef）
   2. 构造 outfitData（含完整 attrs）
   3. editingOutfitId ? updateOutfit : addOutfit
   4. reset() + isSaving.current = true
   5. 退出（新建：reset 到入口/分组；编辑：exitEditor）
```

## 错误处理

- 缩略图生成失败：沿用现有 fallback（`canvasItems[0].imageUri`），不阻断保存。
- 写库失败：沿用现有 `try/catch` + `Alert`「保存失败」。
- 名称为空：允许（用预填默认值；若用户清空，存空字符串，列表用缩略图为主、名称为辅展示，不崩）。

## 文件改动清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/components/OutfitAttributesSheet.tsx` | 属性确认底部 Sheet |
| 改 | `src/screens/outfit/OutfitEditorScreen.tsx` | 拆 handleSave、加 prefill memo、渲染 Sheet、去掉 Alert |

## 验证场景

1. **新建（无预选）**：画板加 2 件 → 保存 → Sheet 弹出，季节预填交集、标签预填并集、名称预填「{主类型}搭配」→ 改个名 → 保存 → 回入口，详情页属性正确。
2. **新建（季节无交集）**：加一件夏装一件冬装 → Sheet 季节预填为空（交集空）→ 用户手选 → 保存。
3. **编辑**：从详情页进编辑 → 改画板单品 → 保存 → Sheet 预填 outfit 现有属性（**不**因单品变化重新推断）→ 改备注 → 保存 → 详情页备注更新。
4. **标签新增**：Sheet 内点「+ 新标签」输入「通勤」→ 出现在已选 → 保存 → 详情页标签含「通勤」。
5. **分组切换**：Sheet 内换分组 → 保存 → 搭配进入新分组。
6. **不再弹 Alert**：新建保存全程无「是否编辑属性」弹窗。
7. **TypeScript 编译通过**。

## Open Questions（实施时定）

- 「+ 新标签」用 `Alert.prompt`（iOS 友好、Android 一般）还是 inline `TextInput`？建议 inline（跨平台一致），参考 AddClothingScreen 的标签输入实现。
- 名称默认值是否要加随机后缀防重名（如「夏季搭配 2」）？暂不加，保持简单；同分组重名由用户改名解决。
