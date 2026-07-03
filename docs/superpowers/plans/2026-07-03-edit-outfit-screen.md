# 编辑搭配页（EditOutfitScreen）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建编辑搭配页（画板预览 + 属性表单 + 保存，仿编辑衣服），搭配详情编辑按钮跳它；OutfitEditor 加 canvasOnly 模式支持纯画板编辑。

**Architecture:** 新建 EditOutfitScreen（画板预览点击进 OutfitEditor canvasOnly + 属性表单 + 顶部保存写属性）；OutfitEditor 加 canvasOnly 分支（保存只更新画板，goBack 回编辑页）；App.tsx 注册路由 + 详情页入口改跳。

**Tech Stack:** React Native + Expo、TypeScript、`@react-navigation/native`、`zustand`、`useCustomOptionsStore`/`useWardrobeStore`、`react-native-safe-area-context`。

**Reference spec:** [docs/superpowers/specs/2026-07-03-edit-outfit-screen-design.md](../specs/2026-07-03-edit-outfit-screen-design.md)

**Testing note:** 项目无单元测试框架。每个任务用 `npx tsc --noEmit` 验证类型，最后手动走查。

---

## 文件结构

| 操作 | 文件 | 责任 |
|------|------|------|
| 改 | `src/screens/outfit/OutfitEditorScreen.tsx` | 加 canvasOnly 模式（handleSaveCanvasOnly + 保存按钮分支 + handleSaveRef 分支） |
| 新建 | `src/screens/outfit/EditOutfitScreen.tsx` | 编辑搭配页（画板预览 + 属性表单 + 保存） |
| 改 | `App.tsx` | 注册 EditOutfit 路由 |
| 改 | `src/screens/outfit/OutfitDetailScreen.tsx` | 编辑按钮改跳 EditOutfitScreen（去掉 openAttrs） |

顺序：Task 1（OutfitEditor canvasOnly）→ Task 2（EditOutfitScreen，navigate 到 OutfitEditor canvasOnly）→ Task 3（注册路由 + 详情入口）。

---

### Task 1: OutfitEditor 加 canvasOnly 模式

**Files:**
- Modify: `src/screens/outfit/OutfitEditorScreen.tsx`

- [ ] **Step 1: 加 isCanvasOnly 派生 + handleSaveCanvasOnly**

在 `handleConfirmAttributes` 之后（约 line 583，`handleSaveRef.current = handleSave;` 之前），加 canvasOnly 处理。先找到 `handleSaveRef.current = handleSave;`（line 584）。

在 `handleConfirmAttributes` 的闭合 `}, [...]);`（line 583）和 `handleSaveRef.current = handleSave;`（584）之间插入：

```ts
  // canvasOnly 模式（从 EditOutfitScreen 进）：保存只更新画板，不碰属性，goBack
  const isCanvasOnly = !!((route.params as any)?.canvasOnly);
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
    } catch (e: any) {
      thumbnailUri = fallbackUri;
    }
    try {
      const existing = outfits.find(o => o.id === editingOutfitId);
      if (existing) {
        await updateOutfit({
          ...existing,
          itemIds: canvasItems.map(i => i.clothingId),
          canvasData: canvasItems,
          canvasBackground,
          thumbnailUri,
        } as any);
      }
      reset();
      isSaving.current = true;
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('保存失败', error?.message || '请重试');
    } finally {
      setIsSavingOutfit(false);
    }
  }, [canvasItems, canvasBackground, editingOutfitId, outfits, updateOutfit, reset, navigation]);
```

`updateOutfit`、`outfits`、`editingOutfitId`、`generateOutfitThumbnail`、`captureTargetRef`、`isSaving`、`reset`、`setIsSavingOutfit`、`navigation`、`route` 均已在作用域。

- [ ] **Step 2: handleSaveRef 按模式指向正确 handler**

把 `handleSaveRef.current = handleSave;`（line 584）改为：

```ts
  handleSaveRef.current = isCanvasOnly ? handleSaveCanvasOnly : handleSave;
```

（beforeRemove 拦截的「填写并保存」按钮在 canvasOnly 模式下调 handleSaveCanvasOnly。）

- [ ] **Step 3: 顶部保存按钮 onPress 按模式分支**

找到保存按钮（约 line 603-609）：

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

把 `onPress={handleSave}` 改为 `onPress={isCanvasOnly ? handleSaveCanvasOnly : handleSave}`：

```tsx
        <TouchableOpacity
          style={[styles.saveButton, isSavingOutfit && styles.saveButtonDisabled]}
          onPress={isCanvasOnly ? handleSaveCanvasOnly : handleSave}
          disabled={isSavingOutfit}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>{isSavingOutfit ? '保存中…' : '保存'}</Text>
        </TouchableOpacity>
```

- [ ] **Step 4: 类型检查 + 提交**

```bash
cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit
git add src/screens/outfit/OutfitEditorScreen.tsx
git commit -m "feat: OutfitEditor 加 canvasOnly 纯画板编辑模式"
```

预期 tsc 0 报错。

---

### Task 2: 新建 EditOutfitScreen

**Files:**
- Create: `src/screens/outfit/EditOutfitScreen.tsx`

- [ ] **Step 1: 写入完整组件文件**

创建 `c:/Users/lyl/wardrobe-app/src/screens/outfit/EditOutfitScreen.tsx`，内容：

```tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../utils/theme';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { useCustomOptionsStore } from '../../store/customOptionsStore';
import { Outfit } from '../../types';

type RootStackParamList = {
  EditOutfit: { outfitId: number };
  OutfitEditor: {
    outfitId?: number;
    mode?: 'create' | 'edit';
    canvasOnly?: boolean;
    groupId?: number;
  };
};

export function EditOutfitScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditOutfit'>>();
  const { outfitId } = route.params;

  const outfits = useWardrobeStore(s => s.outfits);
  const groups = useWardrobeStore(s => s.groups);
  const updateOutfit = useWardrobeStore(s => s.updateOutfit);
  const addGroup = useWardrobeStore(s => s.addGroup);
  const customSeasons = useCustomOptionsStore(s => s.seasons);
  const customTags = useCustomOptionsStore(s => s.tags);

  const outfit = useMemo(() => outfits.find(o => o.id === outfitId), [outfits, outfitId]);
  const currentGroup = groups.find(g => g.id === outfit?.groupId);

  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState<number>(0);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);

  // 初始化 draft
  useEffect(() => {
    if (outfit) {
      setName(outfit.name || '');
      setGroupId(outfit.groupId || 0);
      setSeasons([...(outfit.seasons || [])]);
      setTags([...(outfit.tags || [])]);
      setNotes(outfit.notes || '');
    }
  }, [outfit?.id]);

  const styles = useMemo(() => makeStyles(theme), [theme]);

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
  const handleCreateGroup = async () => {
    const gname = newGroupInput.trim();
    if (!gname) { setShowNewGroupInput(false); return; }
    const id = await addGroup(gname, '');
    setGroupId(id);
    setNewGroupInput('');
    setShowNewGroupInput(false);
  };

  const handleEditCanvas = () => {
    navigation.navigate('OutfitEditor', { outfitId, mode: 'edit', canvasOnly: true });
  };

  const handleSave = async () => {
    if (!outfit) return;
    setIsSubmitting(true);
    try {
      await updateOutfit({
        ...outfit,
        name: name.trim() || outfit.name,
        groupId,
        seasons: [...seasons],
        tags: [...tags],
        notes: notes.trim(),
      } as Outfit);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('保存失败', e?.message || '请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableTags = customTags.filter(t => !tags.includes(t));
  const bg = (outfit as any)?.canvasBackground;
  const previewBg = bg?.type === 'color' ? bg.value : theme.colors.card;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>编辑搭配</Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary }, isSubmitting && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{isSubmitting ? '保存中…' : '保存'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* 画板预览 */}
        <TouchableOpacity style={[styles.canvasPreview, { backgroundColor: previewBg }]} onPress={handleEditCanvas} activeOpacity={0.85}>
          {outfit?.thumbnailUri ? (
            <Image source={{ uri: outfit.thumbnailUri }} style={styles.canvasImage} resizeMode="contain" />
          ) : (
            <View style={styles.canvasPlaceholder}>
              <Ionicons name="images-outline" size={40} color={theme.colors.textTertiary} />
              <Text style={[styles.canvasPlaceholderText, { color: theme.colors.textTertiary }]}>点击编辑画板</Text>
            </View>
          )}
          <View style={[styles.canvasEditBadge, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="create-outline" size={12} color="#fff" />
            <Text style={styles.canvasEditBadgeText}>编辑画板</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          {/* 卡片 1：名称 + 分组 */}
          <View style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>名称</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="搭配名称"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={30}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>分组</Text>
              <View style={styles.chipRow}>
                {groups.map(g => {
                  const active = g.id === groupId;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.chip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }, active && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
                      onPress={() => setGroupId(g.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: theme.colors.textSecondary }, active && { color: theme.colors.primary, fontWeight: '600' }]}>{g.name}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={[styles.addChip, { borderColor: theme.colors.border }]} onPress={() => setShowNewGroupInput(true)}>
                  <Ionicons name="add" size={14} color={theme.colors.textTertiary} />
                  <Text style={[styles.addChipText, { color: theme.colors.textTertiary }]}>新建分组</Text>
                </TouchableOpacity>
              </View>
              {showNewGroupInput && (
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.inlineInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={newGroupInput}
                    onChangeText={setNewGroupInput}
                    placeholder="输入分组名"
                    placeholderTextColor={theme.colors.textTertiary}
                    autoFocus
                    maxLength={20}
                    onSubmitEditing={handleCreateGroup}
                  />
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]} onPress={handleCreateGroup}>
                    <Text style={[styles.chipText, { color: theme.colors.primary, fontWeight: '600' }]}>创建</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* 卡片 2：季节 + 标签 */}
          <View style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>季节</Text>
              <View style={styles.chipRow}>
                {customSeasons.map(s => {
                  const active = seasons.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }, active && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
                      onPress={() => toggleSeason(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: theme.colors.textSecondary }, active && { color: theme.colors.primary, fontWeight: '600' }]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>标签</Text>
              <View style={styles.chipRow}>
                {tags.map(t => (
                  <TouchableOpacity
                    key={`sel-${t}`}
                    style={[styles.chip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
                    onPress={() => toggleTag(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: theme.colors.primary, fontWeight: '600' }]}>{t}</Text>
                    <Ionicons name="close" size={12} color={theme.colors.primary} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
                {availableTags.map(t => (
                  <TouchableOpacity
                    key={`opt-${t}`}
                    style={[styles.chip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                    onPress={() => toggleTag(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.addChip, { borderColor: theme.colors.border }]} onPress={() => setShowTagInput(true)}>
                  <Ionicons name="add" size={14} color={theme.colors.textTertiary} />
                  <Text style={[styles.addChipText, { color: theme.colors.textTertiary }]}>新标签</Text>
                </TouchableOpacity>
              </View>
              {showTagInput && (
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.inlineInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="输入标签名"
                    placeholderTextColor={theme.colors.textTertiary}
                    autoFocus
                    maxLength={20}
                    onSubmitEditing={addCustomTag}
                  />
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]} onPress={addCustomTag}>
                    <Text style={[styles.chipText, { color: theme.colors.primary, fontWeight: '600' }]}>添加</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* 卡片 3：备注 */}
          <View style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>备注</Text>
              <TextInput
                style={[styles.remarksInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="添加备注（可选）"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={200}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: theme.colors.background,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    saveBtn: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
    },
    canvasPreview: {
      marginHorizontal: 16,
      marginTop: 12,
      aspectRatio: 1,
      borderRadius: 16,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    canvasImage: {
      width: '100%',
      height: '100%',
    },
    canvasPlaceholder: {
      alignItems: 'center',
      gap: 8,
    },
    canvasPlaceholderText: {
      fontSize: 13,
    },
    canvasEditBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    canvasEditBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
    },
    section: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    formCard: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      ...theme.shadows.sm,
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    remarksInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      minHeight: 80,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chipText: {
      fontSize: 13,
    },
    addChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
    },
    addChipText: {
      fontSize: 13,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    inlineInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
    },
  });
```

- [ ] **Step 2: 类型检查 + 提交**

```bash
cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit
git add src/screens/outfit/EditOutfitScreen.tsx
git commit -m "feat: 新建 EditOutfitScreen 编辑搭配页（画板预览+属性表单）"
```

预期 tsc 0 报错（EditOutfitScreen 自身类型自洽；navigate 到 OutfitEditor 是已注册路由）。

---

### Task 3: 注册路由 + 详情页入口

**Files:**
- Modify: `App.tsx`
- Modify: `src/screens/outfit/OutfitDetailScreen.tsx`

- [ ] **Step 1: App.tsx 加 EditOutfitScreen import + 路由**

在 `App.tsx` 顶部 import 区，找到 outfit 相关 import（如 `import { OutfitDetailScreen } from './src/screens/outfit/OutfitDetailScreen';`），在其下方加：

```ts
import { EditOutfitScreen } from './src/screens/outfit/EditOutfitScreen';
```

在 RootStack 的 Screen 列表里（找到 `<RootStack.Screen name="OutfitDetail" ...>` 附近），加：

```tsx
        <RootStack.Screen
          name="EditOutfit"
          component={EditOutfitScreen}
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
```

- [ ] **Step 2: OutfitDetailScreen 编辑按钮改跳 EditOutfit**

在 `src/screens/outfit/OutfitDetailScreen.tsx` 找到 header 编辑按钮的 onPress（当前 navigate OutfitEditor + openAttrs）：

```tsx
          onPress={() => {
            navigation.navigate('OutfitEditor', {
              outfitId,
              mode: 'edit',
              groupId: outfit.groupId,
              openAttrs: true,
              exitTo: { screen: 'OutfitDetail', outfitId, groupId: outfit.groupId, groupName: currentGroup?.name || groupName },
            });
          }}
```

改为：

```tsx
          onPress={() => {
            navigation.navigate('EditOutfit', { outfitId });
          }}
```

同时把该文件的 `RootStackParamList` 加 `EditOutfit: { outfitId: number };`（在 OutfitDetail/OutfitEditor 同级）：

```ts
type RootStackParamList = {
  OutfitDetail: { outfitId: number; groupId?: number; groupName?: string };
  EditOutfit: { outfitId: number };
  OutfitEditor: {
    outfitId?: number;
    mode?: 'create' | 'edit';
    groupId?: number;
    openAttrs?: boolean;
    exitTo?: { screen: string; outfitId?: number; groupId?: number; groupName?: string };
  };
  ClothingDetail: { id: number; source?: string };
};
```

- [ ] **Step 3: 类型检查 + 手动走查 + 提交**

```bash
cd c:/Users/lyl/wardrobe-app && npx tsc --noEmit
git add App.tsx src/screens/outfit/OutfitDetailScreen.tsx
git commit -m "feat: 注册 EditOutfit 路由 + 搭配详情编辑按钮跳编辑搭配页"
```

预期 tsc 0 报错。手动走查：
1. 搭配详情点「编辑」→ EditOutfitScreen（画板预览 + 属性表单预填）。
2. 改名称/季节/标签 → 保存 → 回详情页，属性更新。
3. 点画板预览 → OutfitEditor（无属性 Sheet）→ 改画板 → 保存 → 回 EditOutfitScreen，预览刷新，属性未被覆盖。
4. 新建搭配（搭配 tab FAB）仍走原流程不受影响。

---

## Self-Review

**Spec coverage 检查：**

| Spec 要求 | 对应 Task |
|----------|----------|
| 新建 EditOutfitScreen（画板预览 + 属性表单 + 保存） | Task 2 |
| 画板预览点击 → OutfitEditor canvasOnly | Task 2 handleEditCanvas + Task 1 canvasOnly |
| OutfitEditor canvasOnly：保存只更新画板、不弹 Sheet、goBack | Task 1 handleSaveCanvasOnly |
| EditOutfitScreen 保存 → updateOutfit 写属性 | Task 2 handleSave |
| 搭配详情编辑按钮 → EditOutfitScreen | Task 3 Step 2 |
| 路由注册 | Task 3 Step 1 |
| 属性字段（名称/分组+新建/季节/标签+新增/备注） | Task 2（复用 OutfitAttributesSheet 模式） |
| 新建流程不动 | Task 1/2/3 均不碰新建入口 |

**Placeholder 扫描**：无 TBD/TODO。所有步骤含完整代码。

**Type 一致性**：
- `canvasOnly?: boolean` 在 Task 1（route.params as any 读取）、Task 2（RootStackParamList.OutfitEditor）、Task 3（OutfitDetailScreen RootStackParamList 未加 canvasOnly 但详情页不再传它，OK）一致。
- `EditOutfit: { outfitId: number }` 在 Task 2（自身 RootStackParamList）、Task 3（OutfitDetailScreen RootStackParamList + App.tsx 注册）一致。
- `handleSaveCanvasOnly` 在 Task 1 Step 1 定义、Step 2/3 使用，签名一致。
- `updateOutfit` 已在 OutfitEditor 解构（line 298），EditOutfitScreen 也解构（Task 2）。

**依赖顺序**：Task 1（OutfitEditor 支持 canvasOnly）→ Task 2（EditOutfitScreen navigate 到 OutfitEditor canvasOnly）→ Task 3（注册 EditOutfit 路由让详情页能跳）。Task 2 的 navigate('OutfitEditor') 是已注册路由，tsc 可过；Task 3 注册 EditOutfit 让运行时 navigate('EditOutfit') 生效。
