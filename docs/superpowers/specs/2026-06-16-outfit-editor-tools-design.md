# OutfitEditor 工具补全 + 保存防抖（P3 + P7）

## Context

继续 OutfitEditor 优化批次 A 的两项：

1. **P7 保存防抖**：`handleConfirmAttributes` 是 async，但保存按钮无 disabled/loading 态（[OutfitEditorScreen.tsx:602](src/screens/outfit/OutfitEditorScreen.tsx#L602)）。连点会触发多次缩略图生成 + 多次 `addOutfit`，可能写入重复搭配。现有 `isSaving` 是 ref（[line 361](src/screens/outfit/OutfitEditorScreen.tsx#L361)），只服务于 `beforeRemove` 拦截，不驱动 UI。
2. **P3 工具栏补全**：store 的 `setCanvasBackground` / `clearCanvas` 数据模型和画布渲染都支持（[OutfitEditorScreen.tsx:604](src/screens/outfit/OutfitEditorScreen.tsx#L604) 已按 `canvasBackground.value` 渲染底色），但 CanvasToolsBar 只有「分组 + 添加」两个按钮，用户无法改背景色或清空画板——功能半成品。

## Goals

- **P7**：保存进行中按钮 disabled + 显示「保存中…」，防止重复提交。
- **P3**：CanvasToolsBar 增加「背景色」「清空」两个入口。
  - 背景：预设色板（无背景/白/米/浅灰/深灰/黑），点选即应用。
  - 清空：弹 Alert 确认（撤销功能已移除，清空不可逆，必须确认）。

## Non-Goals

- 不做完整调色板（预设色够用）。
- 不补 `toggleGrid`（网格辅助对齐用处小，YAGNI）。
- 不改画布渲染逻辑（已支持 color/none）。
- 不改缩略图生成（P13 另算）。

## P7：保存防抖

### 改动

1. 新增 state（不复用 `isSaving` ref，那是给 beforeRemove 的）：
   ```ts
   const [isSavingOutfit, setIsSavingOutfit] = useState(false);
   ```
2. `handleConfirmAttributes`（[OutfitEditorScreen.tsx:493](src/screens/outfit/OutfitEditorScreen.tsx#L493)）开头加 `setIsSavingOutfit(true);`，catch 分支末尾加 `setIsSavingOutfit(false);`（成功路径会导航离开屏幕，无需 reset）。
3. 保存按钮（顶部栏）：
   ```tsx
   <TouchableOpacity
     style={[styles.saveButton, isSavingOutfit && styles.saveButtonDisabled]}
     onPress={handleSave}
     disabled={isSavingOutfit}
   >
     <Text style={styles.saveButtonText}>{isSavingOutfit ? '保存中…' : '保存'}</Text>
   </TouchableOpacity>
   ```
4. 加样式 `saveButtonDisabled: { opacity: 0.5 }`。

注意：`handleSave`（打开属性 Sheet 的那个）和 `handleConfirmAttributes`（真正写库）是两个函数。防抖加在 `handleConfirmAttributes`（写库的）。`handleSave` 是同步开 Sheet，无需防抖。但为避免用户在 Sheet 确认后等待期间重复操作，Sheet 的「保存搭配」按钮也可加 disabled——不过 Sheet 确认后立即 `setShowAttrSheet(false)` 关闭，重复点击空间小，本次只对顶部保存按钮防抖。

## P3：背景色 + 清空

### CanvasToolsBar 扩展

当前布局（[CanvasToolsBar.tsx](src/components/outfit/CanvasToolsBar.tsx)）：`[分组胶囊(flex:1)] [+添加(44圆形)]`，`space-between`。

改为：`[分组胶囊(flex:1)] [背景图标] [清空图标] [+添加]`。分组胶囊 flex:1 占剩余空间，背景/清空是 36×36 圆形图标按钮，添加保持 44 圆形。

新增 props：
```ts
interface Props {
  onAdd: () => void;
  selectedGroupName?: string;
  onSelectGroup: () => void;
  onBackground: () => void;   // 新增：打开背景色板
  onClear: () => void;        // 新增：清空画板（确认由父组件处理）
}
```

图标：背景 `color-palette-outline`，清空 `trash-outline`。

新增样式 `toolBtn`（36×36 圆形，`theme.colors.background` 底）。

### OutfitEditorScreen 接入

1. 解构 `setCanvasBackground`（当前未解构，store 有该方法）。
2. 加 state `showBgPicker`。
3. 背景色板 Modal（底部 Sheet 风格）：
   ```tsx
   <Modal visible={showBgPicker} transparent animationType="slide" onRequestClose={() => setShowBgPicker(false)}>
     <View style={bgOverlayStyle}>
       <TouchableOpacity style={backdropStyle} activeOpacity={1} onPress={() => setShowBgPicker(false)} />
       <View style={bgCardStyle}>
         <Text>画布背景</Text>
         <View style={swatchRow}>
           {BG_PRESETS.map(p => (
             <TouchableOpacity key={p.label} onPress={() => { setCanvasBackground(p.value); setShowBgPicker(false); }}>
               {/* 色块，「无背景」用棋盘格/斜线表示透明 */}
             </TouchableOpacity>
           ))}
         </View>
       </View>
     </View>
   </Modal>
   ```
4. 预设色板常量：
   ```ts
   const BG_PRESETS = [
     { label: '无', value: { type: 'none' as const, value: '' } },
     { label: '白', value: { type: 'color' as const, value: '#FFFFFF' } },
     { label: '米', value: { type: 'color' as const, value: '#F5EDE3' } },
     { label: '浅灰', value: { type: 'color' as const, value: '#ECECEC' } },
     { label: '深灰', value: { type: 'color' as const, value: '#3D3D3D' } },
     { label: '黑', value: { type: 'color' as const, value: '#1A1A1A' } },
   ];
   ```
5. 清空处理：
   ```ts
   const handleClearCanvas = () => {
     Alert.alert('清空画板', '确定清空所有衣物？此操作不可撤销。', [
       { text: '取消', style: 'cancel' },
       { text: '清空', style: 'destructive', onPress: () => clearCanvas() },
     ]);
   };
   ```
6. CanvasToolsBar 传新 props：
   ```tsx
   <CanvasToolsBar
     onAdd={() => navigation.navigate('ClothingSelection', { source: 'Editor' })}
     selectedGroupName={groups.find(g => g.id === selectedGroupId)?.name}
     onSelectGroup={() => setShowGroupModal(true)}
     onBackground={() => setShowBgPicker(true)}
     onClear={handleClearCanvas}
   />
   ```

### 「无背景」色块视觉

type=none 时画布透明（显示默认底）。色板里「无」用斜线纹理或带边框的空心方块表示，区别于纯白色块。实现：色块用 `backgroundColor` + 对 none 用 `borderWidth: 2, borderColor: theme.colors.border` + 中间一个小斜杠图标。

## 文件改动清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 改 | `src/screens/outfit/OutfitEditorScreen.tsx` | P7 isSavingOutfit state + 保存按钮 disabled；P3 setCanvasBackground 解构、showBgPicker、色板 Modal、handleClearCanvas、CanvasToolsBar 传 props |
| 改 | `src/components/outfit/CanvasToolsBar.tsx` | 加背景/清空图标按钮 + onBackground/onClear props + toolBtn 样式 |

## 验证场景

1. **P7 防抖**：加单品 → 保存 → Sheet 确认 → 快速连点保存按钮（若可见）→ 只写入一次；保存中按钮显示「保存中…」、半透明、不可点。
2. **P3 背景**：点底部「背景」图标 → 弹色板 → 选「米」→ 画布底变米色；选「无」→ 画布回透明；选「黑」→ 深底（衣物图仍清晰）。
3. **P3 清空**：画板有 3 件 → 点「清空」→ 弹「确定清空？不可撤销」→ 取消（画板不变）/ 清空（画板空）。
4. **背景持久化**：设背景为米色 → 保存搭配 → 详情页/再编辑，背景仍是米色（canvasBackground 已写入 outfit）。
5. **TypeScript 编译通过**。

## Open Questions（实施时定）

- 色板 Modal 用底部 Sheet 还是居中卡片？建议底部 Sheet（与属性 Sheet 一致），高度小（只一行色块）。
- 色板是否显示当前选中态（勾/边框高亮）？建议加——当前 canvasBackground 对应的色块加 primary 边框。
