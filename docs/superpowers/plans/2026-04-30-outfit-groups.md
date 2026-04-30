# 搭配分组功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用分组系统替代风格标签，搭配主页按分组卡片宫格展示，支持分组 CRUD。

**Architecture:** 新增 `outfit_groups` 表和 `OutfitGroup` 类型，`Outfit` 以 `groupId` 替代 `style`。GroupListScreen（分组宫格）替代 OutfitsScreen，GroupDetailScreen 展示组内搭配网格，GroupFormModal 处理新建/编辑分组。

**Tech Stack:** React Native, Expo, Zustand, expo-sqlite, react-native-gesture-handler

---

### Task 1: 类型定义更新

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 新增 `OutfitGroup`，移除 `STYLES`，`Outfit.style`→`groupId`**

在 `src/types/index.ts` 中：

添加 `OutfitGroup` 接口（放在 `Outfit` 接口前）：
```typescript
export interface OutfitGroup {
  id: number;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
}
```

修改 `Outfit` 接口，移除 `style?: string`，新增 `groupId: number`：
```typescript
export interface Outfit {
  id: number;
  name: string;
  itemIds: number[];
  groupId: number;
  /** @deprecated 使用 canvasData 替代 */
  itemPositions?: Record<number, OutfitItemPosition>;
  canvasData?: CanvasItemData[];
  canvasBackground?: CanvasBackgroundData;
  thumbnailUri?: string;
  createdAt: string;
}
```

删除 `STYLES` 常量（Line 109）：
```typescript
// 删除这行：
export const STYLES: string[] = ['休闲', '简约', '运动', '通勤', '优雅', '街头', '韩系', '日系', '复古'];
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add OutfitGroup type, replace Outfit.style with groupId, remove STYLES"
```

---

### Task 2: 数据库迁移

**Files:**
- Modify: `src/db/database.ts`

- [ ] **Step 1: 添加 `outfit_groups` 表 + `outfits.groupId` 列迁移**

在 `src/db/database.ts` 的 `getDatabase` 函数中，在 `ensureDefaultWardrobe` 调用前添加迁移逻辑。

在 `addColumnIfNotExists` 块中（Line 148 附近），添加 `groupId` 列检测：
```typescript
await addColumnIfNotExists('outfits', 'groupId', 'INTEGER');
```

在 `ensureDefaultWardrobe(dbInstance!);` 之前，添加表创建和迁移：
```typescript
// 创建分组表
await execSQL(dbInstance, `
  CREATE TABLE IF NOT EXISTS outfit_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    sortOrder INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  )
`);

// 数据迁移：style → group
await migrateStyleToGroup(dbInstance!);
```

在文件末尾（`localDateString` 函数之前）添加迁移函数：
```typescript
async function migrateStyleToGroup(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // 检查是否已有分组数据（避免重复迁移）
    const groupCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM outfit_groups'
    );
    if (groupCount && groupCount.count > 0) return;

    // 检查 groupId 列是否存在
    const hasGroupId = await columnExists(db, 'outfits', 'groupId');
    if (!hasGroupId) return;

    // 检查是否有已设置 groupId 的搭配（迁移完成标志）
    const migrated = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM outfits WHERE groupId IS NOT NULL'
    );
    if (migrated && migrated.count > 0) return;

    // 读取所有搭配的 style 值
    const hasStyle = await columnExists(db, 'outfits', 'style');
    const rows = await db.getAllAsync<{ id: number; style: string }>(
      'SELECT id, style FROM outfits'
    );

    // 收集去重的 style 并创建分组
    const styles = [...new Set(rows.map(r => r.style || '').filter(s => s.trim() !== ''))];
    const groupMap: Record<string, number> = {};
    
    for (const style of styles) {
      const result = await db.runAsync(
        'INSERT INTO outfit_groups (name, description, sortOrder, createdAt) VALUES (?, ?, ?, ?)',
        [style, '', 0, localDateString()]
      );
      groupMap[style] = result.lastInsertRowId;
    }

    // 创建"未分组"默认分组
    const defaultResult = await db.runAsync(
      'INSERT INTO outfit_groups (name, description, sortOrder, createdAt) VALUES (?, ?, ?, ?)',
      ['未分组', '', 999, localDateString()]
    );
    const defaultGroupId = defaultResult.lastInsertRowId;

    // 更新搭配的 groupId
    for (const row of rows) {
      const style = row.style || '';
      const groupId = groupMap[style] || defaultGroupId;
      await db.runAsync('UPDATE outfits SET groupId = ? WHERE id = ?', [groupId, row.id]);
    }
  } catch (e) {
    console.error('[DB Migration] migrateStyleToGroup error:', e);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/db/database.ts
git commit -m "feat: add outfit_groups table and style-to-group data migration"
```

---

### Task 3: 分组数据库操作层

**Files:**
- Create: `src/db/group.ts`

- [ ] **Step 1: 创建 `src/db/group.ts`**

```typescript
import { getDatabase } from './database';
import { OutfitGroup } from '../types';

export interface GroupRow {
  id: number;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
}

function toGroup(row: GroupRow): OutfitGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    sortOrder: row.sortOrder || 0,
    createdAt: row.createdAt,
  };
}

export async function getAllGroups(): Promise<OutfitGroup[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GroupRow>(
    'SELECT * FROM outfit_groups ORDER BY sortOrder ASC, createdAt ASC'
  );
  return rows.map(toGroup);
}

export async function addGroup(name: string, description: string): Promise<number> {
  const db = await getDatabase();
  // 获取最大 sortOrder
  const maxSort = await db.getFirstAsync<{ maxSort: number }>(
    'SELECT MAX(sortOrder) as maxSort FROM outfit_groups'
  );
  const nextSort = (maxSort?.maxSort ?? 0) + 1;
  const result = await db.runAsync(
    'INSERT INTO outfit_groups (name, description, sortOrder, createdAt) VALUES (?, ?, ?, ?)',
    [name, description, nextSort, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function updateGroup(id: number, name: string, description: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE outfit_groups SET name = ?, description = ? WHERE id = ?',
    [name, description, id]
  );
}

export async function deleteGroup(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM outfit_groups WHERE id = ?', [id]);
}

export async function moveOutfitsToGroup(fromGroupId: number, toGroupId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE outfits SET groupId = ? WHERE groupId = ?',
    [toGroupId, fromGroupId]
  );
}

export async function deleteOutfitsByGroup(groupId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM outfits WHERE groupId = ?', [groupId]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/db/group.ts
git commit -m "feat: add group database CRUD operations"
```

---

### Task 4: 搭配数据库层适配 groupId

**Files:**
- Modify: `src/db/outfit.ts`

- [ ] **Step 1: 读写 `groupId` 字段**

修改 `OutfitRow` 接口，新增 `groupId`：
```typescript
export interface OutfitRow {
  id: number;
  name: string;
  itemIds: string;
  itemPositions: string;
  canvasData?: string;
  canvasBackground?: string;
  style?: string;
  groupId?: number;
  thumbnailUri?: string;
  createdAt: string;
}
```

修改 `getAllOutfits` 的 map，添加 `groupId` 读取：
```typescript
return result.map(item => ({
  ...item,
  id: Number(item.id),
  itemIds: JSON.parse(item.itemIds || '[]'),
  itemPositions: JSON.parse(item.itemPositions || '{}'),
  canvasData: item.canvasData ? JSON.parse(item.canvasData) : undefined,
  canvasBackground: item.canvasBackground ? JSON.parse(item.canvasBackground) : undefined,
  style: item.style || '',
  groupId: item.groupId || 0,
  thumbnailUri: item.thumbnailUri,
}));
```

修改 `addOutfit` 函数签名和 SQL，新增 `groupId`：
```typescript
export async function addOutfit(
  outfit: Omit<Outfit, 'id'> & { canvasData?: CanvasItem[]; canvasBackground?: CanvasBackground; groupId: number; thumbnailUri?: string }
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO outfits (name, itemIds, itemPositions, canvasData, canvasBackground, style, groupId, thumbnailUri, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      outfit.name,
      JSON.stringify(outfit.itemIds),
      '{}',
      outfit.canvasData ? JSON.stringify(outfit.canvasData) : '{}',
      outfit.canvasBackground ? JSON.stringify(outfit.canvasBackground) : '{}',
      '',
      outfit.groupId,
      outfit.thumbnailUri || '',
      outfit.createdAt,
    ]
  );
  return result.lastInsertRowId;
}
```

修改 `updateOutfit` 函数，新增 `groupId` 写入：
```typescript
export async function updateOutfit(
  outfit: Outfit & { canvasData?: CanvasItem[]; canvasBackground?: CanvasBackground; groupId: number; thumbnailUri?: string }
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE outfits SET name = ?, itemIds = ?, itemPositions = ?, canvasData = ?, canvasBackground = ?, style = ?, groupId = ?, thumbnailUri = ? WHERE id = ?',
    [
      outfit.name,
      JSON.stringify(outfit.itemIds),
      '{}',
      outfit.canvasData ? JSON.stringify(outfit.canvasData) : '{}',
      outfit.canvasBackground ? JSON.stringify(outfit.canvasBackground) : '{}',
      '',
      outfit.groupId,
      outfit.thumbnailUri || '',
      outfit.id,
    ]
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/db/outfit.ts
git commit -m "feat: add groupId read/write to outfit DB layer"
```

---

### Task 5: outfitStore 清理

**Files:**
- Modify: `src/store/outfitStore.ts`

- [ ] **Step 1: 移除 style 和 filter 相关字段**

移除 `outfitStore` 中的 `selectedStyle`、`outfitFilter` 字段及对应 actions。

删除以下 state 字段（在 initialState 和 interface 中）：
```typescript
// 删除：
selectedStyle: string;
outfitFilter: string;
```

删除 initialState 中的：
```typescript
// 删除：
selectedStyle: '',
outfitFilter: '全部',
```

删除以下 actions（interface 和实现中）：
```typescript
// 删除 interface 中的：
setSelectedStyle: (style: string) => void;
setOutfitFilter: (filter: string) => void;

// 删除实现中的：
setSelectedStyle: (style) => {
  set({ selectedStyle: style });
},
setOutfitFilter: (filter) => {
  set({ outfitFilter: filter });
},
```

修改 `loadFromOutfit`，去掉 style 参数和 selectedStyle 设置：
```typescript
loadFromOutfit: (canvasData, outfitId, background) => {
  set({
    canvasItems: canvasData,
    editingOutfitId: outfitId,
    canvasBackground: background || { type: 'none', value: '' },
    history: [canvasData],
    historyIndex: 0,
  });
},
```
同步更新 interface 中的签名：
```typescript
loadFromOutfit: (canvasData: CanvasItem[], outfitId: number, background?: CanvasBackground) => void;
```

修改 `reset` 函数，去掉 filter 保留：
```typescript
reset: () => {
  set({ ...initialState });
},
```

- [ ] **Step 2: Commit**

```bash
git add src/store/outfitStore.ts
git commit -m "refactor: remove selectedStyle and outfitFilter from outfitStore"
```

---

### Task 6: wardrobeStore 添加分组状态

**Files:**
- Modify: `src/store/wardrobeStore.ts`

- [ ] **Step 1: 添加 groups 状态和 actions**

在 interface 中添加：
```typescript
// 分组相关
groups: OutfitGroup[];
loadGroups: () => Promise<void>;
addGroup: (name: string, description: string) => Promise<number>;
updateGroup: (id: number, name: string, description: string) => Promise<void>;
deleteGroupWithAction: (id: number, action: 'move' | 'delete_outfits') => Promise<void>;
```

初始状态添加：
```typescript
groups: [],
```

`loadData` 中添加 groups 加载。找到 `loadData` 中的 `Promise.all`：
```typescript
const [clothing, trashClothing, soldClothing, draftClothing, outfits] = await Promise.all([
  clothingDb.getAllClothing(),
  clothingDb.getTrashClothing(),
  clothingDb.getSoldClothing(),
  clothingDb.getDraftClothing(),
  outfitDb.getAllOutfits(),
]);
```
改为：
```typescript
const [clothing, trashClothing, soldClothing, draftClothing, outfits, groups] = await Promise.all([
  clothingDb.getAllClothing(),
  clothingDb.getTrashClothing(),
  clothingDb.getSoldClothing(),
  clothingDb.getDraftClothing(),
  outfitDb.getAllOutfits(),
  groupDb.getAllGroups(),
]);
set({ clothing, trashClothing, soldClothing, draftClothing, outfits, groups, isLoading: false });
```

在文件顶部添加 import：
```typescript
import * as groupDb from '../db/group';
```

在 `addOutfit` 上方的合适位置，添加 group actions：
```typescript
loadGroups: async () => {
  const groups = await groupDb.getAllGroups();
  set({ groups });
},

addGroup: async (name, description) => {
  const id = await groupDb.addGroup(name, description);
  const newGroup: OutfitGroup = {
    id,
    name,
    description,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  };
  set(state => ({ groups: [...state.groups, newGroup] }));
  return id;
},

updateGroup: async (id, name, description) => {
  await groupDb.updateGroup(id, name, description);
  set(state => ({
    groups: state.groups.map(g =>
      g.id === id ? { ...g, name, description } : g
    ),
  }));
},

deleteGroupWithAction: async (id, action) => {
  const { groups } = get();
  const defaultGroup = groups.find(g => g.name === '未分组');
  const defaultGroupId = defaultGroup?.id ?? 1;

  if (action === 'move') {
    // 移动搭配到默认分组
    await groupDb.moveOutfitsToGroup(id, defaultGroupId);
  } else if (action === 'delete_outfits') {
    // 删除分组下所有搭配
    await groupDb.deleteOutfitsByGroup(id);
  }

  await groupDb.deleteGroup(id);
  set(state => ({
    groups: state.groups.filter(g => g.id !== id),
    outfits: action === 'delete_outfits'
      ? state.outfits.filter(o => (o as any).groupId !== id)
      : state.outfits,
  }));
},
```

- [ ] **Step 2: Commit**

```bash
git add src/store/wardrobeStore.ts
git commit -m "feat: add groups state and CRUD actions to wardrobeStore"
```

---

### Task 7: GroupListScreen — 分组主页

**Files:**
- Create: `src/screens/outfit/GroupListScreen.tsx`

- [ ] **Step 1: 创建分组列表主页**

```typescript
import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../hooks/useTheme';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { OutfitGroup } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / NUM_COLUMNS;

type RootStackParamList = {
  GroupDetail: { groupId: number; groupName: string };
};

export function GroupListScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const groups = useWardrobeStore(state => state.groups);
  const outfits = useWardrobeStore(state => state.outfits);

  const [showFormModal, setShowFormModal] = useState(false);

  const groupOutfitCount = useCallback((groupId: number) => {
    return outfits.filter(o => (o as any).groupId === groupId).length;
  }, [outfits]);

  const groupPreviews = useCallback((groupId: number) => {
    return outfits
      .filter(o => (o as any).groupId === groupId)
      .slice(0, 3)
      .map(o => o.thumbnailUri)
      .filter(Boolean) as string[];
  }, [outfits]);

  const navigateToGroup = useCallback((groupId: number, groupName: string) => {
    navigation.navigate('GroupDetail', { groupId, groupName });
  }, [navigation]);

  const renderGroupCard = ({ item }: { item: OutfitGroup }) => {
    const count = groupOutfitCount(item.id);
    const previews = groupPreviews(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => navigateToGroup(item.id, item.name)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '18' }]}>
            <Text style={[styles.countText, { color: theme.colors.primary }]}>{count}套</Text>
          </View>
        </View>
        <View style={styles.previewRow}>
          {previews.length > 0 ? (
            previews.map((uri, idx) => (
              <Image
                key={idx}
                source={{ uri }}
                style={[styles.previewImage, { backgroundColor: theme.colors.borderLight }]}
                resizeMode="cover"
              />
            ))
          ) : (
            <View style={[styles.previewPlaceholder, { backgroundColor: theme.colors.borderLight }]}>
              <Ionicons name="shirt-outline" size={18} color={theme.colors.textTertiary} />
            </View>
          )}
          {count > 3 && (
            <View style={[styles.previewMore, { backgroundColor: theme.colors.borderLight }]}>
              <Text style={[styles.previewMoreText, { color: theme.colors.textTertiary }]}>+{count - 3}</Text>
            </View>
          )}
        </View>
        {item.description ? (
          <Text style={[styles.cardDesc, { color: theme.colors.textTertiary }]} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  const data = [...groups, { id: -1, name: '', description: '', sortOrder: 999, createdAt: '' } as OutfitGroup];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>我的搭配</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textTertiary }]}>
            共 {groups.length} 个分组
          </Text>
        </View>
      </View>

      <FlatList
        data={data}
        renderItem={({ item }) => {
          if (item.id === -1) {
            return (
              <TouchableOpacity
                style={[styles.card, styles.addCard]}
                onPress={() => setShowFormModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={32} color={theme.colors.textTertiary} />
                <Text style={[styles.addCardText, { color: theme.colors.textTertiary }]}>新建分组</Text>
              </TouchableOpacity>
            );
          }
          return renderGroupCard({ item });
        }}
        keyExtractor={item => item.id.toString()}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        extraData={isFocused}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.borderLight }]}>
              <Ionicons name="folder-open-outline" size={40} color={theme.colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>还没有分组</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
              创建分组来管理你的搭配
            </Text>
            <TouchableOpacity
              style={[styles.emptyCreateBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowFormModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCreateBtnText}>创建分组</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <GroupFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
      />
    </View>
  );
}

const createStyles = (theme: any, insets: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: { fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
    headerSubtitle: { fontSize: 13, marginTop: 2 },
    gridContent: { padding: GRID_PADDING },
    gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
    card: {
      width: CARD_WIDTH,
      borderRadius: 16,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardName: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
    countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    countText: { fontSize: 11, fontWeight: '600' },
    previewRow: { flexDirection: 'row', gap: 4, marginBottom: 8, minHeight: 44 },
    previewImage: { width: 44, height: 44, borderRadius: 6 },
    previewPlaceholder: {
      width: 44, height: 44, borderRadius: 6,
      alignItems: 'center', justifyContent: 'center',
    },
    previewMore: {
      width: 44, height: 44, borderRadius: 6,
      alignItems: 'center', justifyContent: 'center',
    },
    previewMoreText: { fontSize: 11, fontWeight: '600' },
    cardDesc: { fontSize: 11, lineHeight: 16 },
    addCard: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
      shadowOpacity: 0,
      elevation: 0,
    },
    addCardText: { fontSize: 13, marginTop: 6 },
    empty: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 40, paddingTop: 80,
    },
    emptyIconWrap: {
      width: 88, height: 88, borderRadius: 44,
      justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    emptyCreateBtn: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
    },
    emptyCreateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  });
```

> 注意：GroupFormModal 在 Task 8 中创建，此处先 import 但会报错。实际开发时按顺序执行。

- [ ] **Step 2: Commit**

```bash
git add src/screens/outfit/GroupListScreen.tsx
git commit -m "feat: add GroupListScreen with card grid layout"
```

---

### Task 8: GroupFormModal — 新建/编辑分组弹窗

**Files:**
- Create: `src/screens/outfit/GroupFormModal.tsx`

- [ ] **Step 1: 创建分组表单 Modal**

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../hooks/useTheme';
import { useWardrobeStore } from '../../store/wardrobeStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  editGroup?: { id: number; name: string; description: string } | null;
}

export function GroupFormModal({ visible, onClose, editGroup }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const addGroup = useWardrobeStore(state => state.addGroup);
  const updateGroup = useWardrobeStore(state => state.updateGroup);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = !!editGroup;

  useEffect(() => {
    if (editGroup) {
      setName(editGroup.name);
      setDescription(editGroup.description);
    } else {
      setName('');
      setDescription('');
    }
  }, [editGroup, visible]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (isEdit) {
        await updateGroup(editGroup!.id, trimmed, description.trim());
      } else {
        await addGroup(trimmed, description.trim());
      }
      onClose();
    } catch (e) {
      console.error('Failed to save group:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.handle} />
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {isEdit ? '编辑分组' : '新建分组'}
              </Text>

              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>名称</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }]}
                value={name}
                onChangeText={setName}
                placeholder="输入分组名称"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={20}
                autoFocus
              />

              <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>
                描述（选填）
              </Text>
              <TextInput
                style={[styles.input, styles.descInput, {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder="简单描述这个分组..."
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={50}
                multiline
              />

              <TouchableOpacity
                style={[styles.saveBtn, {
                  backgroundColor: name.trim() ? theme.colors.primary : theme.colors.borderLight,
                }]}
                onPress={handleSave}
                disabled={!name.trim() || saving}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>{saving ? '保存中...' : '确认'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  descInput: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  saveBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/outfit/GroupFormModal.tsx
git commit -m "feat: add GroupFormModal for create/edit group"
```

---

### Task 9: GroupDetailScreen — 分组详情页

**Files:**
- Create: `src/screens/outfit/GroupDetailScreen.tsx`

- [ ] **Step 1: 创建分组详情页（搭配网格 + 分组管理菜单）**

```typescript
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../hooks/useTheme';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { GroupFormModal } from './GroupFormModal';
import { Outfit } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / NUM_COLUMNS;

type RootStackParamList = {
  GroupDetail: { groupId: number; groupName: string };
  ClothingSelection: { source?: 'Outfits' | 'Editor'; groupId?: number } | undefined;
  OutfitEditor: {
    selectedIds?: number[];
    outfitId?: number;
    mode?: 'create' | 'edit';
    groupId?: number;
    exitTo?: { screen: string; tab: string };
  };
};

export function GroupDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GroupDetail'>>();
  const { groupId, groupName } = route.params;

  const outfits = useWardrobeStore(state => state.outfits);
  const groups = useWardrobeStore(state => state.groups);
  const deleteOutfits = useWardrobeStore(state => state.deleteOutfits);
  const deleteGroupWithAction = useWardrobeStore(state => state.deleteGroupWithAction);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: number; name: string; description: string } | null>(null);

  const group = groups.find(g => g.id === groupId);
  const groupOutfits = useMemo(() => {
    return outfits.filter(o => (o as any).groupId === groupId);
  }, [outfits, groupId]);

  const handleCreateOutfit = useCallback(() => {
    navigation.navigate('ClothingSelection', { source: 'Outfits', groupId });
  }, [navigation, groupId]);

  const handleEditOutfit = useCallback((outfitId: number) => {
    if (isSelectMode) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(outfitId) ? next.delete(outfitId) : next.add(outfitId);
        return next;
      });
    } else {
      navigation.navigate('OutfitEditor', {
        outfitId,
        mode: 'edit',
        groupId,
        exitTo: { screen: 'Main', tab: '搭配' },
      });
    }
  }, [isSelectMode, navigation, groupId]);

  const handleLongPress = useCallback((outfitId: number) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedIds(new Set([outfitId]));
    }
  }, [isSelectMode]);

  const handleCancelSelect = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBatchDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    await deleteOutfits(ids);
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, [selectedIds, deleteOutfits]);

  const handleMenuAction = useCallback(() => {
    Alert.alert(
      groupName,
      '管理分组',
      [
        {
          text: '编辑分组',
          onPress: () => {
            if (group) {
              setEditingGroup({ id: group.id, name: group.name, description: group.description });
              setShowFormModal(true);
            }
          },
        },
        {
          text: '删除分组',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '删除分组',
              `确定要删除「${groupName}」吗？`,
              [
                { text: '取消', style: 'cancel' },
                {
                  text: '移入未分组',
                  onPress: () => deleteGroupWithAction(groupId, 'move'),
                },
                {
                  text: '同时删除搭配',
                  style: 'destructive',
                  onPress: () => {
                    deleteGroupWithAction(groupId, 'delete_outfits');
                    navigation.goBack();
                  },
                },
              ],
            );
          },
        },
        { text: '取消', style: 'cancel' },
      ],
    );
  }, [groupName, group, groupId, deleteGroupWithAction, navigation]);

  const renderOutfitCard = ({ item }: { item: Outfit }) => {
    const thumbUri = item.thumbnailUri;
    const isSelected = selectedIds.has(item.id);
    const count = item.itemIds?.length || 0;
    const bg = (item as any).canvasBackground;
    const frameColor = bg?.type === 'color' ? bg.value : theme.colors.card;

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && { borderWidth: 2.5, borderColor: theme.colors.primary }]}
        onPress={() => handleEditOutfit(item.id)}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.85}
      >
        {isSelectMode && (
          <View style={[styles.checkbox, isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}
        <View style={[styles.cardThumb, { backgroundColor: frameColor }]}>
          <View style={styles.cardInnerFrame}>
            {thumbUri ? (
              <Image source={{ uri: thumbUri }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={[styles.cardPlaceholder, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="shirt-outline" size={28} color={theme.colors.textTertiary} />
              </View>
            )}
            <View style={styles.cardGradient} pointerEvents="none">
              <View style={styles.cardCountBadge}>
                <Text style={styles.cardCountText}>{count}件</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          {isSelectMode ? (
            <>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>已选 {selectedIds.size} 项</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleCancelSelect}>
                  <Text style={[styles.actionText, { color: theme.colors.primary }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleBatchDelete} disabled={selectedIds.size === 0} style={{ marginLeft: 16 }}>
                  <Text style={[styles.actionText, { color: theme.colors.danger, opacity: selectedIds.size === 0 ? 0.4 : 1 }]}>
                    删除
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.headerInfo}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{groupName}</Text>
                {group?.description ? (
                  <Text style={[styles.headerDesc, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                    {group.description} · {groupOutfits.length}套
                  </Text>
                ) : (
                  <Text style={[styles.headerDesc, { color: theme.colors.textTertiary }]}>
                    {groupOutfits.length}套
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.menuBtn} onPress={handleMenuAction}>
                <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Grid */}
      {groupOutfits.length > 0 ? (
        <FlatList
          data={groupOutfits}
          renderItem={renderOutfitCard}
          keyExtractor={item => item.id.toString()}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          extraData={{ isSelectMode, selectedCount: selectedIds.size, isFocused }}
        />
      ) : (
        <View style={styles.empty}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.borderLight }]}>
            <Ionicons name="shirt-outline" size={40} color={theme.colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>暂未搭配</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
            点击下方按钮创建第一套搭配
          </Text>
          <TouchableOpacity
            style={[styles.emptyCreateBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleCreateOutfit}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyCreateBtnText}>创建搭配</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      {groupOutfits.length > 0 && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={handleCreateOutfit} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Group Edit Modal */}
      <GroupFormModal
        visible={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingGroup(null);
        }}
        editGroup={editingGroup}
      />
    </View>
  );
}

const createStyles = (theme: any, insets: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: theme.colors.background,
      alignItems: 'center', justifyContent: 'center',
    },
    headerInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    headerDesc: { fontSize: 12, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    actionText: { fontSize: 15, fontWeight: '500' },
    menuBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    gridContent: { padding: GRID_PADDING },
    gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
    card: {
      width: CARD_WIDTH,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
      backgroundColor: theme.colors.card,
    },
    cardThumb: { aspectRatio: 1, padding: 10 },
    cardInnerFrame: { flex: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' },
    cardImage: { width: '100%', height: '100%' },
    cardPlaceholder: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
    },
    cardGradient: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
      paddingHorizontal: 8, paddingBottom: 8,
    },
    cardCountBadge: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    },
    cardCountText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    checkbox: {
      position: 'absolute', top: 8, right: 8, zIndex: 10,
      width: 24, height: 24, borderRadius: 12,
      borderWidth: 2, borderColor: theme.colors.border,
      backgroundColor: 'rgba(255,255,255,0.9)',
      alignItems: 'center', justifyContent: 'center',
    },
    empty: {
      flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
    },
    emptyIconWrap: {
      width: 88, height: 88, borderRadius: 44,
      justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    emptyCreateBtn: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
    },
    emptyCreateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    fab: {
      position: 'absolute', right: 20, bottom: 36,
      width: 58, height: 58, borderRadius: 29,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
  });
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/outfit/GroupDetailScreen.tsx
git commit -m "feat: add GroupDetailScreen with outfit grid and group management"
```

---

### Task 10: OutfitEditorScreen 适配 groupId

**Files:**
- Modify: `src/screens/outfit/OutfitEditorScreen.tsx`

- [ ] **Step 1: 移除 StyleSelector，改用 groupId**

在 `OutfitEditorScreen.tsx` 中：

移除 `StyleSelector` import（Line 26）：
```typescript
// 删除：
import { StyleSelector } from '../../components/outfit/StyleSelector';
```

更新 route type，新增 `groupId`：
```typescript
type RootStackParamList = {
  ClothingSelection: { source?: 'Outfits' | 'Editor'; groupId?: number } | undefined;
  OutfitEditor: {
    selectedIds?: number[];
    outfitId?: number;
    mode?: 'create' | 'edit';
    groupId?: number;
    exitTo?: { screen: string; tab: string };
  };
};
```

从 route 读取 groupId，从 outfit 数据中读取已有 groupId：
```typescript
const groupIdFromRoute = route.params?.groupId;
```

修改 `handleSave` 中的 outfitData，用 `groupId` 替代 `selectedStyle`：
```typescript
const groupId = (editingOutfitId && canvasItems.length > 0)
  ? outfits.find(o => o.id === editingOutfitId)?.groupId || groupIdFromRoute || groups[0]?.id || 0
  : groupIdFromRoute || groups[0]?.id || 0;

const outfitData = {
  name: `${groups.find(g => g.id === groupId)?.name || '未分组'}搭配`,
  itemIds: canvasItems.map(i => i.clothingId),
  canvasData: canvasItems,
  canvasBackground,
  groupId,
  thumbnailUri,
  createdAt: new Date().toISOString(),
};
```

需要从 store 读取 groups：
```typescript
const { addOutfit, updateOutfit, outfits, groups } = useWardrobeStore();
```

删除 `selectedStyle` 相关逻辑：
```typescript
// 删除：
const { ... selectedStyle, setSelectedStyle, ... } = useOutfitStore();
```

修改 `loadFromOutfit` 调用（不再传 style）：
```typescript
// 将：
loadFromOutfit(canvasData, style, outfitId, background);
// 改为：
loadFromOutfit(canvasData, outfitId, background);
```

移除 `StyleSelector` 组件的渲染（Line 512 附近）：
```typescript
// 删除：
<StyleSelector selectedStyle={selectedStyle} onStyleChange={setSelectedStyle} />
```

修改 `generateOutfitThumbnail` 相关的 outfit name，用 group 名替代 style 名。

- [ ] **Step 2: Commit**

```bash
git add src/screens/outfit/OutfitEditorScreen.tsx
git commit -m "refactor: replace StyleSelector with groupId in OutfitEditor"
```

---

### Task 11: ClothingSelectionScreen 传递 groupId

**Files:**
- Modify: `src/screens/outfit/ClothingSelectionScreen.tsx`

- [ ] **Step 1: 在 route params 中添加 groupId，跳转时传给 OutfitEditor**

修改 route type：
```typescript
type RootStackParamList = {
  ClothingSelection: { source?: 'Outfits' | 'Editor'; groupId?: number } | undefined;
  OutfitEditor: { selectedIds?: number[]; exitTo?: { screen: string; tab: string }; groupId?: number };
};
```

在 `handleNext` 中，source === 'Outfits' 时传递 groupId：
```typescript
const groupIdFromRoute = route.params?.groupId;

const handleNext = useCallback(() => {
  const selectedItems = clothing.filter(c => selectedIds.includes(c.id));

  if (source === 'Editor') {
    const newItems = selectedItems.filter(c => !existingIds.includes(c.id));
    newItems.forEach(item => addCanvasItem(item));
    navigation.goBack();
  } else {
    resetOutfitStore();
    setSelectedClothings(selectedItems);
    navigation.navigate('OutfitEditor', {
      selectedIds: [...selectedIds],
      groupId: groupIdFromRoute,
      exitTo: { screen: 'Main', tab: '搭配' },
    });
  }
}, [selectedIds, clothing, existingIds, source, navigation, addCanvasItem, setSelectedClothings, resetOutfitStore, groupIdFromRoute]);
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/outfit/ClothingSelectionScreen.tsx
git commit -m "feat: pass groupId through ClothingSelection to OutfitEditor"
```

---

### Task 13: 导航配置更新

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: 注册新路由，替换旧页面**

在 `App.tsx` 中：

移除 `OutfitsScreen` import：
```typescript
// 删除：
import { OutfitsScreen } from './src/screens/OutfitsScreen';
```

添加新 import：
```typescript
import { GroupListScreen } from './src/screens/outfit/GroupListScreen';
import { GroupDetailScreen } from './src/screens/outfit/GroupDetailScreen';
```

在 `MainTabs` 中，修改搭配 Tab：
```typescript
// 将：
<Tab.Screen name="搭配" component={OutfitsScreen} options={{ headerShown: false }} />
// 改为：
<Tab.Screen name="搭配" component={GroupListScreen} options={{ headerShown: false }} />
```

在 `RootStack.Navigator` 中，添加 GroupDetail 路由（放在 OutfitEditor 之前）：
```typescript
<RootStack.Screen
  name="GroupDetail"
  component={GroupDetailScreen}
  options={{
    headerShown: false,
    presentation: 'card',
  }}
/>
```

- [ ] **Step 2: Commit**

```bash
git add App.tsx
git commit -m "feat: register GroupListScreen and GroupDetailScreen in navigation"
```

---

### Task 14: 清理旧文件

**Files:**
- Delete: `src/screens/OutfitsScreen.tsx`
- Delete: `src/components/outfit/StyleSelector.tsx`

- [ ] **Step 1: 删除旧文件**

```bash
git rm src/screens/OutfitsScreen.tsx
git rm src/components/outfit/StyleSelector.tsx
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove deprecated OutfitsScreen and StyleSelector"
```

---

### Task 15: 修复 OutfitEditor 无分组默认值

**Files:**
- Modify: `src/screens/outfit/OutfitEditorScreen.tsx`

- [ ] **Step 1: 确保旧搭配没有 groupId 时 fallback 到"未分组"**

在 `handleSave` 中，最终 fallback 逻辑为：
```typescript
// 获取 groupId 的优先级：
// 1. 编辑已有搭配时，保留原 groupId
// 2. 从 route params 获取（从 GroupDetailScreen 新建时传入）
// 3. "未分组" 默认分组
const getDefaultGroupId = () => {
  const defaultGroup = groups.find(g => g.name === '未分组');
  return defaultGroup?.id || groups[0]?.id || 0;
};

let groupId: number;
if (editingOutfitId) {
  const existingOutfit = outfits.find(o => o.id === editingOutfitId);
  groupId = existingOutfit?.groupId || groupIdFromRoute || getDefaultGroupId();
} else {
  groupId = groupIdFromRoute || getDefaultGroupId();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/outfit/OutfitEditorScreen.tsx
git commit -m "fix: add fallback to default group when groupId is missing"
```

---

### Task 16: 端到端验证

- [ ] **Step 1: 验证数据迁移**

启动应用，检查控制台无迁移错误。检查"未分组"和对应 style 名的分组已创建。

- [ ] **Step 2: 验证分组 CRUD**

- 新建分组 → 确认卡片宫格中出现
- 编辑分组（修改名称和描述） → 确认更新
- 删除分组（选"移入未分组"）→ 确认搭配保留在"未分组"
- 删除分组（选"同时删除"）→ 确认搭配也被删除

- [ ] **Step 3: 验证搭配创建**

- 进分组 → FAB → 选衣物 → 编辑器保存 → 确认搭配出现在该分组
- 编辑已有搭配 → 保存 → 确认仍在原分组

- [ ] **Step 4: 验证批量删除**

- 长按搭配卡牌 → 多选 → 删除 → 确认删除成功

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: end-to-end validation completed" --allow-empty
```
