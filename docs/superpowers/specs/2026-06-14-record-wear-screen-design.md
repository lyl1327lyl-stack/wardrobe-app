# 记录穿搭全屏页面 — 设计规范

## 概述

将「记录穿搭」从底部弹窗（`ClothingPickerModal`）升级为独立全屏页面（`RecordWearScreen`），提升浏览体验和操作效率。

## 用户场景

- **主要场景**：每天打开，快速勾选今天穿的单品，确认记录
- **次要场景**：补记昨天/前几天漏记录的穿搭
- **辅助场景**：直接从已保存搭配中选一套记录

## 页面结构

```
┌──────────────────────────────┐
│  ← 记录穿搭          📅 日期  │  顶栏：返回 + 标题 + 日期选择器
├──────────────────────────────┤
│   👔 选单品   │   📦 选搭配   │  模式切换 segmented control
├──────────────────────────────┤
│  🔍 搜索品牌/颜色/标签...     │  搜索栏（两种模式通用）
├──────────────────────────────┤
│  [全部][上装][下装][鞋]...   │  分类标签，横向滚动，两级联动
│  [🌸春][☀️夏][🍂秋][❄️冬]   │  季节标签（仅选单品模式）
├──────────────────────────────┤
│                              │
│  选单品：3 列网格，多选       │  FlatList，numColumns=3
│  选搭配：2 列卡片，单选       │  搭配卡片含缩略图 + 名称 + 件数
│                              │
├──────────────────────────────┤
│ [缩略图...] 已选 N 件  [清空] [记录] │  固定底栏
└──────────────────────────────┘
```

## 关键交互

### 模式切换

| 模式 | 选择方式 | 展示 | 确认按钮文案 |
|------|---------|------|-------------|
| 选单品 | 多选 | 3 列单品网格，选中高亮边框 + ✓ 标记 | 「记录 (N)」 |
| 选搭配 | 单选 | 2 列搭配卡片，含缩略图 + 名称 + 件数 + 类别摘要 | 「记录这套搭配」 |

- 切换模式时**保留已选内容**
- 从搭配模式选完后切回单品模式，可增减调整（搭配的每件单品转为已选）
- 从单品模式切到搭配模式，已选单品会被清空（模式切换时用 Alert 确认）

### 日期选择

- 默认日期：今天
- 点击顶栏日期 → 弹出 `MonthCalendar` 组件（从 WearCalendarScreen 抽取的月历卡片）
- 月历支持前后翻页，选中日期后关闭弹窗，顶栏日期更新
- 日期改变时，如果该日已有记录，加载并预选已穿的衣物

### 确认记录

1. 检查已选单品数量 ≥ 2（不足则 Alert 提示）
2. 删除该日已有记录（`deleteWearRecordsByDate`）
3. 写入新记录（`addWearRecords`）
4. 成功后 `navigation.goBack()`，首页通过 `useFocusEffect` 自动刷新今日记录

### 搜索

- 匹配字段：品牌、颜色、标签、备注
- 实时过滤，大小写不敏感
- 搜索结果替代当前网格内容
- 清除搜索词恢复原列表

### 分类筛选（仅选单品模式）

- 一级分类：全部 + 父分类（从 CustomOptionsStore 获取）
- 二级分类：选中父分类后显示子分类行
- 季节筛选：全部/春/夏/秋/冬
- 与搜索词叠加过滤

## 组件架构

### 新建文件

| 文件 | 职责 |
|------|------|
| `src/screens/RecordWearScreen.tsx` | 页面主组件，组合所有子模块 |
| `src/components/MonthCalendar.tsx` | 月历卡片（从 WearCalendarScreen 抽取） |

### 抽取 MonthCalendar

从 `WearCalendarScreen.tsx` 中提取月历渲染逻辑为独立组件：

```ts
interface MonthCalendarProps {
  year: number;
  month: number;
  wearData: Record<string, ClothingItem[]>;
  onSelectDate: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}
```

- 保留 `WearCalendarScreen` 原有的日历卡片 + 月份导航 + 星期标题 + 网格 + 图例
- RecordWearScreen 用 Modal 包裹 MonthCalendar 作为日期选择弹窗
- WearCalendarScreen 改为使用 MonthCalendar 组件（避免重复代码）

### 修改文件

| 文件 | 变更 |
|------|------|
| `App.tsx` | `RootStack.Screen name="RecordWear" component={RecordWearScreen}` |
| `src/screens/HomeScreen.tsx` | 快捷按钮「记录穿搭」跳转目标：`navigate('RecordWear')` |
| `src/screens/WearCalendarScreen.tsx` | 改为使用提取的 `MonthCalendar` 组件 |

## 数据流

```
RecordWearScreen
├── useWardrobeStore → clothing, outfits, addWearRecords, deleteWearRecordsByDate
├── useCustomOptionsStore → categories, getParents, getChildrenOf
├── useTheme → theme
├── 本地状态
│   ├── mode: 'items' | 'outfit'
│   ├── selectedIds: number[]
│   ├── selectedDate: string (默认 todayDateStr())
│   ├── searchKeyword: string
│   ├── selectedCategory: CategoryFilter
│   ├── selectedSeason: '全部' | Season
│   ├── showDatePicker: boolean
│   └── dateWearData: ClothingItem[] (预加载已选日期的记录)
└── 确认时调用
    → deleteWearRecordsByDate(dateStr)
    → addWearRecords(selectedIds, dateStr)
    → goBack()
```

## 样式规范

- 使用 `makeStyles(theme)` 工厂模式，对齐项目主题系统
- 卡片圆角：`theme.borderRadius.lg`
- 主色调：`theme.colors.primary`
- 底栏分割线：`theme.colors.border`
- 阴影：`theme.shadows.sm`
- 顶栏 paddingTop: 56（对齐 HomeScreen header）

## 复用现有代码

| 来源 | 复用内容 |
|------|---------|
| `ClothingPickerModal` | 搜索栏、分类筛选、季节筛选、网格渲染逻辑 |
| `WearCalendarScreen` | 月历渲染逻辑（抽取为 MonthCalendar） |
| `HomeScreen` | `todayDateStr()` 工具函数、顶栏样式 |

## 验证

1. **默认状态**：打开页面，日期为今天，选单品模式，展示全部单品网格
2. **选单品**：点击单品高亮，底栏实时更新缩略图和件数
3. **分类筛选**：选择上装 → 仅显示上装，选二级类型 → 进一步过滤
4. **搜索**：输入关键词实时过滤
5. **日期切换**：点击日期 → 弹出月历 → 选日期 → 日期更新
6. **有记录的日期**：切换到已有记录的日期，预加载显示已穿单品
7. **选搭配模式**：切换到选搭配，展示搭配卡片（2列），点选一套高亮
8. **确认记录**：点记录按钮 → 写入数据库 → 返回首页，今日卡片更新
9. **模式切换保留**：选单品勾了3件 → 切到搭配再切回来 → 3件仍在
10. **TypeScript 编译通过**
