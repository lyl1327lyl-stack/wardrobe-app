# 2026-04-05 画板搭配详情页开发记录

## 背景

衣柜 APP 的搭配详情页（OutfitDetailScreen）原有体验较为死板，用户无法自由管理搭配内的衣物位置。本次迭代目标是将搭配详情页改造为**自由画板模式**。

---

## 已完成功能

### 1. 画板基础实现

- **拖动功能**：使用 React Native 内置 `Animated.ValueXY` + `PanResponder` 实现，无需第三方手势库
- **位置追踪**：`useRef` 跟踪当前位置，避免闭包陷阱
- **画板尺寸**：宽 = 屏幕宽，高 = 屏幕宽 × 1.2
- **衣物大小**：120×120px

### 2. 数据持久化

- **数据库**：`outfits` 表新增 `itemPositions TEXT` 列，存储 JSON 序列化的 `Record<number, OutfitItemPosition>`
- **迁移脚本**：`addColumnIfNotExists` 确保向后兼容
- **类型定义**：`OutfitItemPosition { x, y, scale }`

### 3. 添加/移除衣服

- **底部Strip**：横向滚动展示未入搭配的衣服，点击添加
- **添加位置**：出现在画板中央（带随机偏移）
- **移除**：点击画板衣物显示删除按钮（右上角 × 图标）

### 4. 保存机制（本次迭代）

- **问题**：拖动位置自动保存，用户无确认感
- **修改为显式保存**：新增 `pendingPositions` + `pendingItemIds` 本地状态，所有修改先暂存，只有点「保存」才写入数据库
- **保存按钮**：顶栏右侧，有未保存修改时才显示
- **已保存提示**：保存成功后显示「已保存 ✓」1.5秒

### 5. 退出确认

- **问题**：未保存退出时修改丢失
- **实现**：
  - 点击左上角返回箭头：检测 `hasUnsavedChanges`，弹确认框
  - 手机硬件返回键：监听 `BackHandler.addEventListener`

### 6. 其他修复

- **Header paddingTop**：所有页面统一改为 56px，避免状态栏遮挡
- **OutfitPickerModal**：修复 `handleConfirm` 直接调用 `updateOutfit` 而非先暂存

---

## 遇到的问题与修复

### 问题1：Metro 无法解析 react-native-reanimated

**现象**：`Unable to resolve react-native-reanimated` despite 已在 `package.json`

**尝试方案**：
- 回退 reanimated 版本（v4 → v3.19.5 → v3.10.1）
- 各种 metro.config.js 配置修改

**最终解决方案**：完全移除 reanimated + gesture-handler，改用 React Native 内置 `Animated` + `PanResponder`

### 问题2：PanResponder 拖动位置累积误差

**现象**：多次拖动后衣物位置越来越偏

**根因**：`PanResponder` 中使用了闭包捕获的 `initialX/Y`，这些值只在组件挂载时设置一次，后续拖动基于错误的基础值

**修复**：引入 `useRef` 追踪实际当前位置
```typescript
const currentX = useRef(initialX);
const currentY = useRef(initialY);

onPanResponderMove: (_, gestureState) => {
  pan.setValue({
    x: currentX.current + gestureState.dx,
    y: currentY.current + gestureState.dy,
  });
},
onPanResponderRelease: (_, gestureState) => {
  currentX.current += gestureState.dx;
  currentY.current += gestureState.dy;
  onPositionChange(currentX.current, currentY.current, currentScale.current);
},
```

### 问题3：语法错误

**现象**：`Unexpected token (249:2)` — 末尾多了一个 `);`

**修复**：删除多余括号

### 问题4：删除按钮位置

**现象**：删除按钮和保存按钮并列在顶栏右侧，删除是危险操作容易误触

**待解决**：正在讨论UI方案（A.弱化视觉权重 B.改为文字链接 C.收纳到菜单 D.移至底部操作栏）

---

## 待完成内容

- [ ] 画板删除按钮位置方案确定与实施
- [ ] 画板衣物支持缩放（当前只支持拖动）
- [ ] 三套主题系统
- [ ] 自定义属性系统（风格字段、分类自定义）
- [ ] 品牌字段补全
- [ ] 批量操作（废衣篓/已卖出）
- [ ] 已卖出统计面板
- [ ] 抠图功能

---

## 关键文件变更

| 文件 | 变更 |
|------|------|
| `src/types/index.ts` | 新增 `OutfitItemPosition` 接口，`Outfit` 新增 `itemPositions` |
| `src/db/database.ts` | outfits 表新增 `itemPositions` 列迁移 |
| `src/db/outfit.ts` | 读写 `itemPositions` JSON |
| `src/store/wardrobeStore.ts` | `updateOutfit` 透传新字段 |
| `src/components/OutfitPickerModal.tsx` | `handleConfirm` 调用 `updateOutfit` 写入数据库 |
| `src/screens/OutfitDetailScreen.tsx` | 完全重写为画板模式 |
| `src/screens/OutfitsScreen.tsx` | header paddingTop: 16→56 |
| `src/screens/StatsScreen.tsx` | header paddingTop: 20→56 |

---

## 技术债务

- `babel.config.js` 和 `metro.config.js` 已删除（不再需要 reanimated）
- `DraggableClothing.tsx` 组件已删除（内置实现替代）
