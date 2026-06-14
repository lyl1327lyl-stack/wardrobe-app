# 搭配属性确认 Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 OutfitEditor 保存搭配前，弹底部 Sheet 让用户一站式填写名称/分组/季节/标签/备注（含智能预填），去掉新建后的强 Alert，新建与编辑流程统一。

**Architecture:** 新建独立组件 `OutfitAttributesSheet`（底部 Modal Sheet，复用 WearCalendarSheet 的容器模式）；OutfitEditorScreen 拆分保存逻辑——「保存」按钮只做校验+开 Sheet，Sheet 确认回调里执行真正的写库（含完整属性）。

**Tech Stack:** React Native + Expo、TypeScript、`@react-navigation/native`、`react-native-safe-area-context`、`zustand`（customOptionsStore 提供季节/标签选项池）。

**Reference spec:** [docs/superpowers/specs/2026-06-14-outfit-attributes-sheet-design.md](../specs/2026-06-14-outfit-attributes-sheet-design.md)

**Testing note:** 项目无单元测试框架。每个任务用 `npx tsc --noEmit` 验证类型，最后做手动走查。

---

## 文件结构

| 操作 | 文件 | 责任 |
|------|------|------|
| 新建 | `src/components/OutfitAttributesSheet.tsx` | 属性确认底部 Sheet 组件（纯 UI + local state，通过 props 回传结果） |
| 改 | `src/screens/outfit/OutfitEditorScreen.tsx` | 接入 Sheet：加 state + 预填 memo + 渲染；拆分 handleSave |

`OutfitAttributesSheet` 是纯展示组件，不直接访问 wardrobe/outfit store，只从 `customOptionsStore` 读季节/标签选项池（与 `OutfitDetailScreen:50-51` 一致）。所有写库逻辑留在 OutfitEditorScreen。

---

### Task 1: 创建 OutfitAttributesSheet 组件

**Files:**
- Create: `src/components/OutfitAttributesSheet.tsx`

- [ ] **Step 1: 写入完整组件文件**

创建 `c:/Users/lyl/wardrobe-app/src/components/OutfitAttributesSheet.tsx`，内容如下：

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { OutfitGroup } from '../types';

export interface OutfitAttributes {
  name: string;
  groupId: number;
  seasons: string[];
  tags: string[];
  notes: string;
}

interface Props {
  visible: boolean;
  initial: OutfitAttributes;
  groups: OutfitGroup[];
  onClose: () => void;
  onConfirm: (attrs: OutfitAttributes) => void;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      overflow: 'hidden',
    },
    handle: {
      width: 36, height: 4, backgroundColor: theme.colors.border,
      borderRadius: 2, alignSelf: 'center', marginTop: 12,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    closeBtn: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: theme.colors.background,
      justifyContent: 'center', alignItems: 'center',
    },
    body: { paddingHorizontal: 20, paddingVertical: 16 },
    field: { marginBottom: 18 },
    fieldLabel: {
      fontSize: 12, fontWeight: '600',
      color: theme.colors.textSecondary, marginBottom: 8,
    },
    nameInput: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, color: theme.colors.text,
    },
    notesInput: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, color: theme.colors.text,
      minHeight: 70, textAlignVertical: 'top',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
      backgroundColor: theme.colors.background, borderWidth: 1, borderColor: 'transparent',
    },
    chipActive: {
      backgroundColor: theme.colors.primary + '15',
      borderColor: theme.colors.primary,
    },
    chipText: { fontSize: 13, color: theme.colors.textSecondary },
    chipTextActive: { color: theme.colors.primary, fontWeight: '600' },
    chipRemove: { marginLeft: 4 },
    addTagChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
      borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border,
    },
    addTagText: { fontSize: 13, color: theme.colors.textTertiary },
    tagInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    tagInput: {
      flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: theme.colors.text,
    },
    footer: {
      flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14,
      borderTopWidth: 1, borderTopColor: theme.colors.borderLight,
    },
    saveBtn: {
      flex: 1, backgroundColor: theme.colors.primary,
      paddingVertical: 13, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  });

export function OutfitAttributesSheet({ visible, initial, groups, onClose, onConfirm }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const customSeasons = useCustomOptionsStore(s => s.seasons);
  const customTags = useCustomOptionsStore(s => s.tags);

  const [name, setName] = useState(initial.name);
  const [groupId, setGroupId] = useState(initial.groupId);
  const [seasons, setSeasons] = useState<string[]>(initial.seasons);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [notes, setNotes] = useState(initial.notes);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // 每次打开或预填值变化时重置 local state
  useEffect(() => {
    if (visible) {
      setName(initial.name);
      setGroupId(initial.groupId);
      setSeasons(initial.seasons);
      setTags(initial.tags);
      setNotes(initial.notes);
      setTagInput('');
      setShowTagInput(false);
    }
  }, [visible, initial]);

  const toggleSeason = (s: string) => {
    setSeasons(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  };
  const toggleTag = (t: string) => {
    setTags(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));
  };
  const addCustomTag = () => {
    const t = tagInput.trim();
    if (!t) { setShowTagInput(false); return; }
    if (!tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
    setShowTagInput(false);
  };
  const handleSave = () => {
    onConfirm({ name: name.trim(), groupId, seasons, tags, notes: notes.trim() });
  };

  const availableTags = customTags.filter(t => !tags.includes(t));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>完善搭配信息</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* 名称 */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>名称</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="给这套搭配起个名字"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            {/* 分组 */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>分组</Text>
              <View style={styles.chipRow}>
                {groups.map(g => {
                  const active = g.id === groupId;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setGroupId(g.id)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 季节 */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>季节</Text>
              <View style={styles.chipRow}>
                {customSeasons.map(s => {
                  const active = seasons.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleSeason(s)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 标签 */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>标签</Text>
              <View style={styles.chipRow}>
                {tags.map(t => (
                  <TouchableOpacity
                    key={`sel-${t}`}
                    style={[styles.chip, styles.chipActive]}
                    onPress={() => toggleTag(t)}
                  >
                    <Text style={styles.chipTextActive}>{t}</Text>
                    <Ionicons name="close" size={12} color={theme.colors.primary} style={styles.chipRemove} />
                  </TouchableOpacity>
                ))}
                {availableTags.map(t => (
                  <TouchableOpacity
                    key={`opt-${t}`}
                    style={styles.chip}
                    onPress={() => toggleTag(t)}
                  >
                    <Text style={styles.chipText}>{t}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.addTagChip} onPress={() => setShowTagInput(true)}>
                  <Ionicons name="add" size={14} color={theme.colors.textTertiary} />
                  <Text style={styles.addTagText}>新标签</Text>
                </TouchableOpacity>
              </View>
              {showTagInput && (
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={styles.tagInput}
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="输入标签名"
                    placeholderTextColor={theme.colors.textTertiary}
                    autoFocus
                    onSubmitEditing={addCustomTag}
                  />
                  <TouchableOpacity style={[styles.chip, styles.chipActive]} onPress={addCustomTag}>
                    <Text style={styles.chipTextActive}>添加</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 备注 */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>备注</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="添加备注（可选）"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>保存搭配</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错（组件未被引用，但自身类型完整）。

- [ ] **Step 3: Commit**

```bash
git add src/components/OutfitAttributesSheet.tsx
git commit -m "feat: 新增 OutfitAttributesSheet 搭配属性确认底部弹层"
```

---

### Task 2: OutfitEditorScreen 接入 Sheet（state + 预填 memo + 渲染）

**Files:**
- Modify: `src/screens/outfit/OutfitEditorScreen.tsx`

- [ ] **Step 1: 加 imports**

在 `src/screens/outfit/OutfitEditorScreen.tsx` 顶部 import 区，找到已有的组件 import（如 `import { CanvasToolsBar } from ...`），在其下方加：

```ts
import { OutfitAttributesSheet, OutfitAttributes } from '../../components/OutfitAttributesSheet';
import { useCustomOptionsStore } from '../../store/customOptionsStore';
import { ClothingItem } from '../../types';
```

（`ClothingItem` 若已 import 则跳过该行——先 grep 确认：`grep -n "ClothingItem" src/screens/outfit/OutfitEditorScreen.tsx`，若已有匹配则不加。）

- [ ] **Step 2: 加 state + customSeasons 订阅**

找到 `const [showTooltip, setShowTooltip] = useState(true);`（约第 284 行），在其下方加：

```ts
  const [showAttrSheet, setShowAttrSheet] = useState(false);
  const customSeasons = useCustomOptionsStore(s => s.seasons);
```

- [ ] **Step 3: 加 prefillAttributes memo**

找到 `const handleClearDeleted = useCallback(...)`（约第 293-295 行），在其**之后**加预填 memo：

```ts
  // 保存前预填属性：编辑模式读 outfit 现值；新建模式推断（季节交集、标签并集）
  const prefillAttributes = useMemo<OutfitAttributes>(() => {
    const getDefaultGroupId = () =>
      groups.find(g => g.name === '未分组')?.id || groups[0]?.id || 0;
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
    const intersected = customSeasons.filter(s =>
      seasonSets.length > 0 && seasonSets.every(set => set.has(s)),
    );
    // 标签并集：去重合并
    const tagUnion = Array.from(new Set(clothings.flatMap(c => c.tags)));
    const gid = selectedGroupId ?? getDefaultGroupId();
    const mainType =
      clothings[0]?.parentType ||
      clothings[0]?.type ||
      groups.find(g => g.id === gid)?.name ||
      '搭配';
    return {
      name: `${mainType}搭配`,
      groupId: gid,
      seasons: intersected,
      tags: tagUnion,
      notes: '',
    };
  }, [editingOutfitId, outfits, canvasItems, clothing, selectedGroupId, groups, customSeasons]);
```

- [ ] **Step 4: 渲染 Sheet**

找到编辑器 JSX 末尾的分组 Modal（约第 719-750 行的 `<Modal visible={showGroupModal}...>`），在其**之后**、组件最外层 `</View>` **之前**加：

```tsx
      <OutfitAttributesSheet
        visible={showAttrSheet}
        initial={prefillAttributes}
        groups={groups}
        onClose={() => setShowAttrSheet(false)}
        onConfirm={handleConfirmAttributes}
      />
```

注意：`handleConfirmAttributes` 在 Task 3 创建。本步骤先引用，Task 3 完成前 TypeScript 会报「handleConfirmAttributes 未定义」——**这是预期的**，本任务暂不跑 tsc，Task 3 完成后统一验证。

- [ ] **Step 5: 暂不 Commit**

继续 Task 3 一并 commit（避免中间态类型错误）。

---

### Task 3: 拆分保存流程（开 Sheet + 真正写库 + 去 Alert）

**Files:**
- Modify: `src/screens/outfit/OutfitEditorScreen.tsx`

- [ ] **Step 1: 用新 handleSave（只校验+开 Sheet）替换旧 handleSave**

找到旧 `const handleSave = useCallback(async () => {...}, [...]);`（约第 438-559 行整段，从 `const handleSave = useCallback(async () => {` 到对应的闭合 `}, [canvasItems, editingOutfitId, canvasBackground, navigation, addOutfit, updateOutfit, reset, exitEditor, selectedGroupId, groups, outfits]);`）。

将整段替换为下面两个函数（`handleSave` 改为只开 Sheet；新增 `handleConfirmAttributes` 做真正写库）：

```ts
  // 保存按钮：校验画板非空后打开属性 Sheet
  const handleSave = useCallback(() => {
    if (canvasItems.length === 0) {
      Alert.alert('请添加衣物', '请至少添加一件衣物到画板');
      return;
    }
    setShowAttrSheet(true);
  }, [canvasItems.length]);

  // Sheet 确认后：生成缩略图 + 写库（含完整属性）+ 退出
  const handleConfirmAttributes = useCallback(async (attrs: OutfitAttributes) => {
    setShowAttrSheet(false);

    // 生成缩略图（隐藏画布，去除选中态）
    const fallbackUri = canvasItems.length > 0 ? canvasItems[0].imageUri : '';
    let thumbnailUri = fallbackUri;
    try {
      thumbnailUri = await generateOutfitThumbnail(captureTargetRef, fallbackUri);
    } catch (e: any) {
      thumbnailUri = fallbackUri;
    }

    const outfitData = {
      name: attrs.name,
      itemIds: canvasItems.map(i => i.clothingId),
      canvasData: canvasItems,
      canvasBackground,
      groupId: attrs.groupId,
      seasons: attrs.seasons,
      tags: attrs.tags,
      notes: attrs.notes,
      thumbnailUri,
      createdAt: new Date().toISOString(),
    };

    try {
      if (editingOutfitId) {
        // 编辑：更新后回详情页
        const updatedOutfit = { ...outfitData, id: editingOutfitId };
        await updateOutfit(updatedOutfit as any);
        reset();
        isSaving.current = true;
        exitEditor();
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
    } catch (error: any) {
      Alert.alert('保存失败', error?.message || '请重试');
    }
  }, [canvasItems, canvasBackground, editingOutfitId, addOutfit, updateOutfit, reset, exitEditor, groups, navigation]);
```

注意：
- 旧 `handleSave` 末尾的 `handleSaveRef.current = handleSave;`（约第 560 行）**保留不动**——beforeRemove 拦截依赖它，新 handleSave 签名兼容。
- 旧新建分支的 `Alert.alert('搭配已创建', ...)`（约第 510-541 行）随整段替换被删除，不再弹「是否编辑属性」。

- [ ] **Step 2: 类型检查**

Run: `cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit`
Expected: 无报错。若报 `handleConfirmAttributes 未定义`，检查 Task 2 Step 4 的渲染引用是否在 `handleConfirmAttributes` 定义之前——RN 中 useCallback 顺序不影响（hoisting via const 在同一组件作用域内 JSX 渲染时已定义），但若报错请确认两段都在组件函数体内、return 之前。

- [ ] **Step 3: 手动走查**

启动 app（`npx expo start`），验证：
1. 新建搭配：画板加 2 件 → 点保存 → Sheet 弹出，季节预填交集、标签预填并集、名称预填「{主类型}搭配」→ 改名 → 点「保存搭配」→ 进入所在分组页，详情页属性正确。
2. 新建（季节无交集）：加一件夏装一件冬装 → Sheet 季节预填为空 → 手选 → 保存。
3. 编辑：从详情页进编辑 → 保存 → Sheet 预填 outfit 现有属性（不因单品变化重算）→ 改备注 → 保存 → 回详情页，备注更新。
4. 标签新增：Sheet 内点「新标签」输入「通勤」→ 回车 → 出现在已选 → 保存 → 详情页含「通勤」。
5. 分组切换：Sheet 内换分组 → 保存 → 搭配进入新分组。
6. 全程无「是否编辑属性」Alert。

- [ ] **Step 4: Commit**

```bash
git add src/screens/outfit/OutfitEditorScreen.tsx
git commit -m "feat: 保存搭配前弹属性确认 Sheet（预填+去 Alert），新建编辑统一"
```

---

## Self-Review

**Spec coverage 检查：**

| Spec 要求 | 对应 Task |
|----------|----------|
| 新建 OutfitAttributesSheet 组件（props: visible/initial/groups/onClose/onConfirm） | Task 1 |
| 字段：名称/分组/季节/标签/备注 | Task 1 |
| 季节从 customOptionsStore、标签从 customOptionsStore | Task 1（customSeasons/customTags） |
| 预填规则：编辑读 outfit 现值 | Task 2 Step 3（editingOutfitId 分支） |
| 预填规则：新建季节交集、标签并集、名称默认 | Task 2 Step 3（新建分支） |
| 拆 handleSave：保存按钮只开 Sheet | Task 3 Step 1（handleSave） |
| Sheet 确认后写库含完整属性 | Task 3 Step 1（handleConfirmAttributes，outfitData 含 name/seasons/tags/notes） |
| 去掉新建后 Alert | Task 3 Step 1（旧 Alert 随整段替换删除） |
| 新建+编辑都接入 | Task 3 Step 1（editingOutfitId 分支统一调 handleConfirmAttributes） |

**Placeholder 扫描**：无 TBD/TODO/「类似上文」。所有步骤含完整代码。

**Type 一致性**：
- `OutfitAttributes` 接口在 Task 1 定义，Task 2 Step 3（prefillAttributes 返回类型）与 Task 3 Step 1（handleConfirmAttributes 入参）一致：`{ name, groupId, seasons, tags, notes }`。
- `OutfitGroup` 类型来自 `../types`（项目已有，GroupFormModal 同样引用）。
- `handleConfirmAttributes` 在 Task 2 Step 4 被引用、Task 3 Step 1 定义——同一组件作用域内 const，渲染时已 hoist 可用。
- `generateOutfitThumbnail`、`captureTargetRef`、`isSaving`、`exitEditor`、`reset`、`addOutfit`、`updateOutfit`、`canvasItems`、`canvasBackground`、`editingOutfitId`、`groups`、`navigation`、`outfits`、`selectedGroupId`、`clothing` 均为 OutfitEditorScreen 已有符号（见行号引用），无需新增。

**已知边界（不在本任务范围）**：
- 新建分支保留 `navigation.reset` 到 GroupDetail（沿用旧行为）。Home 入口的 exitTo P1 Bug 另行修复，本任务不恶化。
