# 搭配分组功能设计与实现规格

## 概述

用分组系统替代当前风格标签（style），搭配主页按分组模块展示，点击进入分组查看搭配列表。

## 一、数据模型

### 新增类型

```typescript
interface OutfitGroup {
  id: number;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
}
```

### Outfit 类型变更

- 移除 `style?: string`
- 新增 `groupId: number`（每个搭配必须属于一个分组，单分组模式）

### STYLES 常量

- 移除 `STYLES` 常量（9个预设风格）

### 数据库

- 新建 `outfit_groups` 表：
  ```sql
  CREATE TABLE IF NOT EXISTS outfit_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    sortOrder INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  );
  ```
- `outfits` 表新增 `groupId INTEGER` 列
- `style` 列保留但不使用（废弃标记）

## 二、数据迁移

首次启动时：
1. 检测 `outfits` 表是否有 `groupId` 列
2. 读取所有搭配的 `style` 值，去重
3. 为每个不同的 style 创建同名 `OutfitGroup`
4. 将该 style 下的搭配 `groupId` 设为对应分组 ID
5. 无 style 的搭配 → 归入"未分组"默认分组
6. 合并相同的 style 名（如多个搭配都是"休闲"→ 共用一个分组）
7. 若没有任何搭配，也创建"未分组"默认分组

## 三、导航与页面结构

```
搭配 Tab
  └── GroupListScreen（分组卡片宫格）
        ├── GroupDetailScreen（组内搭配网格 2列）
        │     ├── ClothingSelection → OutfitEditor（新建搭配）
        │     └── OutfitEditor（编辑已有搭配）
        ├── GroupFormModal（新建/编辑分组，底部 Sheet）
        └── 删除分组弹窗（Alert）
```

### 变更
- GroupListScreen 替代当前的 OutfitsScreen
- GroupDetailScreen 新增（类似当前 OutfitsScreen 的网格部分，去掉筛选条）
- 去掉主页面右上角 "+" 按钮
- 去掉风格筛选条

## 四、GroupListScreen 布局

- 2列卡片宫格
- 每个卡片：分组名 + 前3张搭配缩略图预览 + 数量角标 + 描述文字
- 末尾虚线卡片："+" 新建分组入口
- 标题"我的搭配"，副标题显示总分组数
- 空状态：引导创建第一个分组

## 五、GroupDetailScreen 布局

- 顶部栏：分组名 + 描述 + 数量 + 右侧"⋯"菜单
- 内容：2列搭配卡片网格（保留现有卡片样式，含缩略图、件数徽章）
- 卡片去掉风格标签徽章（style badge），保留件数徽章
- FAB：右下角创建新搭配按钮
- 长按卡牌：批量多选删除模式
- "⋯" 菜单选项：编辑分组 / 删除分组

## 六、分组 CRUD

### 新建分组
- 入口：宫格末尾虚线卡片、空状态引导按钮
- 底部 Sheet：名称（必填）+ 描述（选填）+ 确认

### 编辑分组
- 入口：分组详情页"⋯"→"编辑分组"
- 底部 Sheet，预填当前名称和描述

### 删除分组
- 入口：分组详情页"⋯"→"删除分组"
- Alert 弹窗三选项：
  - "移入未分组"—保留搭配移入默认分组
  - "同时删除搭配"—全部删除（红色 destructive）
  - "取消"

## 七、编辑器适配

- 移除 `StyleSelector` 组件（不再选风格）
- `outfitStore` 移除 `selectedStyle`、`outfitFilter`、`setSelectedStyle`、`setOutfitFilter`
- 保存搭配时用当前分组 `groupId` 替代 `style`
- 从 GroupDetailScreen 进入编辑器 → 新建搭配自动归入该分组
- 编辑已有搭配 → 保持原分组不变

## 八、文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types/index.ts` | 修改 | 新增 `OutfitGroup`，移除 `STYLES`，`Outfit.style`→`groupId` |
| `src/db/database.ts` | 修改 | 新增 `outfit_groups` 表 + `outfits.groupId` 列迁移 |
| `src/db/outfit.ts` | 修改 | 新增 CRUD 方法，适配新字段 |
| `src/db/group.ts` | 新增 | 分组数据库操作 |
| `src/store/wardrobeStore.ts` | 修改 | 新增 groups 状态 + 分组 actions |
| `src/store/outfitStore.ts` | 修改 | 移除 selectedStyle/outfitFilter |
| `src/screens/outfit/GroupListScreen.tsx` | 新增 | 分组列表主页 |
| `src/screens/outfit/GroupDetailScreen.tsx` | 新增 | 分组详情页（搭配网格） |
| `src/screens/outfit/GroupFormModal.tsx` | 新增 | 新建/编辑分组 Sheet |
| `src/screens/outfit/OutfitEditorScreen.tsx` | 修改 | 移除 StyleSelector，适配 groupId |
| `src/screens/OutfitsScreen.tsx` | 删除 | 被 GroupListScreen 替代 |
| `src/components/outfit/StyleSelector.tsx` | 删除 | 不再需要 |
| `App.tsx` | 修改 | 导航配置更新 |

## 九、验证方式

1. 首次启动后 style → group 数据迁移正确
2. 新建/编辑/删除分组功能正常
3. 分组卡片宫格正确显示缩略图 + 数量
4. 进分组后搭配网格显示正确
5. 创建搭配保存到正确分组
6. 编辑搭配后分组不变
7. 删除分组弹窗两选项分别验证
8. 空状态显示正常（无分组、分组内无搭配）
