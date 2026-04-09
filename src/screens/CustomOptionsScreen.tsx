import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

type OptionCategory = 'categories' | 'seasons' | 'occasions' | 'styles' | 'sizes';

type RouteParams = {
  CustomOptions: { category?: OptionCategory };
};

interface CategoryConfig {
  key: OptionCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'categories', label: '类型', icon: 'grid-outline' },
  { key: 'seasons', label: '季节', icon: 'flower-outline' },
  { key: 'occasions', label: '场合', icon: 'calendar-outline' },
  { key: 'styles', label: '风格', icon: 'brush-outline' },
  { key: 'sizes', label: '尺码', icon: 'resize-outline' },
];

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    headerRight: {
      width: 40,
    },
    headerSaveBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
    },
    headerSaveBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.white,
    },
    content: {
      flex: 1,
    },
    section: {
      marginTop: 12,
      marginHorizontal: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    sectionIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionInfo: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    sectionCount: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    expandIcon: {},
    optionList: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    // 两级分类样式 - 重新设计
    parentCard: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    parentCardLast: {
      borderBottomWidth: 0,
    },
    parentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 10,
    },
    parentExpandBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    parentInfo: {
      flex: 1,
    },
    parentName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    parentMeta: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    parentActions: {
      flexDirection: 'row',
      gap: 4,
    },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // 子分类列表
    childList: {
      backgroundColor: theme.colors.background,
      paddingLeft: 16,
    },
    childRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingRight: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 10,
    },
    childRowLast: {
      borderBottomWidth: 0,
    },
    childDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.textTertiary,
      marginLeft: 8,
    },
    childName: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    childActions: {
      flexDirection: 'row',
      gap: 2,
    },
    childActionBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // 添加子分类按钮
    addChildBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      marginLeft: 16,
      marginRight: 16,
      marginBottom: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      borderStyle: 'dashed',
    },
    addChildBtnText: {
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    // 一维分类选项
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    optionItemLast: {
      borderBottomWidth: 0,
    },
    optionText: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text,
    },
    optionInUse: {
      color: theme.colors.textTertiary,
    },
    deleteBtn: {
      padding: 8,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    addBtnText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    bottom: {
      height: 40,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modal: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      padding: 24,
      width: '100%',
      maxWidth: 340,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      marginBottom: 16,
      textAlign: 'center',
    },
    modalInput: {
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      marginBottom: 16,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancel: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    modalConfirm: {
      flex: 2,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    modalConfirmText: {
      fontSize: 15,
      color: theme.colors.white,
      fontWeight: '600',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
  });

export function CustomOptionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'CustomOptions'>>();
  const { clothing } = useWardrobeStore();
  const migrateClothingType = useWardrobeStore(state => state.migrateClothingType);

  // Zustand selectors
  const categories = useCustomOptionsStore(state => state.categories);
  const seasons = useCustomOptionsStore(state => state.seasons);
  const occasions = useCustomOptionsStore(state => state.occasions);
  const storeStyles = useCustomOptionsStore(state => state.styles);
  const sizes = useCustomOptionsStore(state => state.sizes);
  const isLoading = useCustomOptionsStore(state => state.isLoading);
  const load = useCustomOptionsStore(state => state.load);
  const updateCategory = useCustomOptionsStore(state => state.updateCategory);
  const resetToDefaults = useCustomOptionsStore(state => state.resetToDefaults);
  const addParent = useCustomOptionsStore(state => state.addParent);
  const renameParent = useCustomOptionsStore(state => state.renameParent);
  const deleteParent = useCustomOptionsStore(state => state.deleteParent);
  const addChild = useCustomOptionsStore(state => state.addChild);
  const renameChild = useCustomOptionsStore(state => state.renameChild);
  const deleteChild = useCustomOptionsStore(state => state.deleteChild);
  const getParentOfChild = useCustomOptionsStore(state => state.getParentOfChild);

  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // 如果传入了特定分类，则进入单分类模式
  const forcedCategory = route.params?.category;
  const [expandedCategory, setExpandedCategory] = useState<OptionCategory | null>(
    forcedCategory || null
  );
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  // Modal 状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<'addParent' | 'addChild' | 'addOption' | 'edit'>('addParent');
  const [editTarget, setEditTarget] = useState<{ parent?: string; child?: string }>({});
  const [newOptionText, setNewOptionText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  // 获取选项列表
  const getOptionsForCategory = (category: OptionCategory): string[] => {
    switch (category) {
      case 'categories':
        return Object.keys(categories);
      case 'seasons':
        return seasons;
      case 'occasions':
        return occasions;
      case 'styles':
        return storeStyles;
      case 'sizes':
        return sizes;
    }
  };

  // 获取子分类
  const getChildrenOf = (parent: string): string[] => {
    return categories[parent] || [];
  };

  // 检查选项是否被使用
  const isOptionInUse = useCallback(
    (category: OptionCategory, value: string): boolean => {
      if (category === 'categories') {
        // 检查任何衣物的 type 是否等于这个子分类
        for (const item of clothing) {
          if (item.type === value) return true;
        }
        // 也检查父分类是否被使用
        const children = getChildrenOf(value);
        for (const child of children) {
          for (const item of clothing) {
            if (item.type === child) return true;
          }
        }
        return false;
      }
      for (const item of clothing) {
        switch (category) {
          case 'seasons':
            if (item.seasons.includes(value)) return true;
            break;
          case 'occasions':
            if (item.occasions.includes(value)) return true;
            break;
          case 'styles':
            if (item.styles && item.styles.includes(value)) return true;
            break;
          case 'sizes':
            if (item.size === value) return true;
            break;
        }
      }
      return false;
    },
    [clothing, categories]
  );

  // 检查子分类是否被使用
  const isChildInUse = (parent: string, child: string): boolean => {
    for (const item of clothing) {
      if (item.type === child) return true;
    }
    return false;
  };

  const handleToggleExpand = (category: OptionCategory) => {
    setExpandedCategory(expandedCategory === category ? null : category);
    if (category !== 'categories') {
      setExpandedParent(null);
    }
  };

  const handleToggleParent = (parent: string) => {
    setExpandedParent(expandedParent === parent ? null : parent);
  };

  // 打开添加弹窗
  const handleAddOption = (category: OptionCategory, parent?: string) => {
    if (parent) {
      setModalMode('addChild');
      setEditTarget({ parent });
    } else if (category === 'categories') {
      setModalMode('addParent');
      setEditTarget({});
    } else {
      setModalMode('addOption');
      setEditTarget({ parent: category });
    }
    setNewOptionText('');
    setShowAddModal(true);
  };

  // 打开编辑弹窗
  const handleEditOption = (category: OptionCategory, parent: string, child?: string) => {
    setModalMode('edit');
    setEditTarget(child ? { parent, child } : { parent });
    setNewOptionText(child || parent);
    setShowAddModal(true);
  };

  // 删除父分类
  const handleDeleteParent = async (parent: string) => {
    const children = getChildrenOf(parent);
    if (children.length > 0) {
      Alert.alert('无法删除', '请先删除该分类下的所有子分类');
      return;
    }
    if (isOptionInUse('categories', parent)) {
      Alert.alert('无法删除', '该分类正被部分衣服使用');
      return;
    }
    Alert.alert('确认删除', `确定要删除分类「${parent}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteParent(parent);
        },
      },
    ]);
  };

  // 删除子分类
  const handleDeleteChild = async (parent: string, child: string) => {
    if (isChildInUse(parent, child)) {
      Alert.alert('无法删除', '该子分类正被部分衣服使用，请先修改这些衣服的分类');
      return;
    }
    Alert.alert('确认删除', `确定要删除「${child}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteChild(parent, child);
        },
      },
    ]);
  };

  // 删除一维分类选项
  const handleDeleteOption = async (category: OptionCategory, index: number) => {
    const opts = getOptionsForCategory(category);
    const value = opts[index];
    if (isOptionInUse(category, value)) {
      Alert.alert('无法删除', '该选项正被部分衣服使用，请先修改这些衣服的分类');
      return;
    }
    Alert.alert('确认删除', `确定要删除选项「${value}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const newOpts = [...opts];
          newOpts.splice(index, 1);
          await updateCategory(category as 'seasons' | 'occasions' | 'styles' | 'sizes', newOpts);
        },
      },
    ]);
  };

  // 保存选项
  const handleSaveOption = async () => {
    if (isSaving) return;
    if (!newOptionText.trim()) {
      Alert.alert('请输入选项名称');
      return;
    }
    const trimmed = newOptionText.trim();

    setIsSaving(true);
    setShowAddModal(false);

    try {
      if (modalMode === 'addParent') {
        if (categories[trimmed]) {
          Alert.alert('分类已存在', '请使用不同的名称');
          return;
        }
        await addParent(trimmed);
      } else if (modalMode === 'addChild') {
        const parent = editTarget.parent!;
        if (categories[parent]?.includes(trimmed)) {
          Alert.alert('子分类已存在', '请使用不同的名称');
          return;
        }
        await addChild(parent, trimmed);
      } else if (modalMode === 'addOption') {
        const cat = editTarget.parent as OptionCategory;
        const opts = getOptionsForCategory(cat);
        if (opts.includes(trimmed)) {
          Alert.alert('选项已存在', '请使用不同的名称');
          return;
        }
        await updateCategory(cat as 'seasons' | 'occasions' | 'styles' | 'sizes', [...opts, trimmed]);
      } else {
        // edit mode
        const { parent, child } = editTarget;
        if (child) {
          // 编辑子分类
          if (child !== trimmed) {
            await renameChild(parent!, child, trimmed);
            // 如果是 type 子分类，需要迁移衣物的 type
            await migrateClothingType(child, trimmed);
          }
        } else if (parent) {
          // 编辑父分类
          if (parent !== trimmed) {
            await renameParent(parent, trimmed);
          }
        }
      }
    } finally {
      setIsSaving(false);
      setNewOptionText('');
      setEditTarget({});
    }
  };

  const handleReset = () => {
    Alert.alert('恢复默认', '确定要恢复所有选项到默认值吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          await resetToDefaults();
        },
      },
    ]);
  };

  // 获取弹窗标题
  const getModalTitle = () => {
    switch (modalMode) {
      case 'addParent': return '添加分类';
      case 'addChild': return '添加子分类';
      case 'addOption': return '添加选项';
      case 'edit': return editTarget.child ? '编辑子分类' : '编辑分类';
    }
  };

  // 获取弹窗提示
  const getModalSubtitle = () => {
    if (modalMode === 'addChild') {
      return `当前分类：${editTarget.parent}`;
    }
    return undefined;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>管理分类选项</Text>
          <View style={styles.headerRight} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {forcedCategory ? `${CATEGORIES.find(c => c.key === forcedCategory)?.label}管理` : '管理分类选项'}
        </Text>
        {forcedCategory ? (
          <TouchableOpacity style={styles.headerSaveBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.headerSaveBtnText}>完成</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.headerBtn} onPress={handleReset}>
            <Ionicons name="refresh" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 如果传入了特定分类参数，只显示该分类；否则显示所有分类列表 */}
        {(forcedCategory ? CATEGORIES.filter(c => c.key === forcedCategory) : CATEGORIES).map((cat) => {
          const catOptions = getOptionsForCategory(cat.key);
          const isExpanded = expandedCategory === cat.key;
          const isSingleCategoryMode = !!forcedCategory;
          const isCategories = cat.key === 'categories';

          return (
            <View key={cat.key} style={styles.section}>
              {!isSingleCategoryMode && (
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => handleToggleExpand(cat.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectionIcon}>
                    <Ionicons name={cat.icon} size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.sectionInfo}>
                    <Text style={styles.sectionTitle}>{cat.label}</Text>
                    <Text style={styles.sectionCount}>
                      {isCategories ? `${catOptions.length} 个分类` : `${catOptions.length} 个选项`}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.textTertiary}
                  />
                </TouchableOpacity>
              )}

              {/* 单分类模式下显示分类标题 */}
              {isSingleCategoryMode && (
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name={cat.icon} size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.sectionInfo}>
                    <Text style={styles.sectionTitle}>{cat.label}</Text>
                    <Text style={styles.sectionCount}>
                      {isCategories ? `${catOptions.length} 个分类` : `${catOptions.length} 个选项`}
                    </Text>
                  </View>
                </View>
              )}

              {/* 两级分类：类型 */}
              {isCategories && (isSingleCategoryMode || isExpanded) && (
                <View style={styles.optionList}>
                  {catOptions.map((parent, idx) => {
                    const children = getChildrenOf(parent);
                    const isParentExpanded = expandedParent === parent;
                    const isLastParent = idx === catOptions.length - 1;
                    return (
                      <View key={parent} style={[styles.parentCard, isLastParent && styles.parentCardLast]}>
                        {/* 父分类行 */}
                        <View style={styles.parentHeader}>
                          <TouchableOpacity
                            style={styles.parentExpandBtn}
                            onPress={() => handleToggleParent(parent)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={isParentExpanded ? 'chevron-down' : 'chevron-forward'}
                              size={16}
                              color={theme.colors.textSecondary}
                            />
                          </TouchableOpacity>
                          <View style={styles.parentInfo}>
                            <Text style={styles.parentName}>{parent}</Text>
                            <Text style={styles.parentMeta}>{children.length} 个子分类</Text>
                          </View>
                          <View style={styles.parentActions}>
                            <TouchableOpacity
                              style={styles.actionBtn}
                              onPress={() => handleEditOption('categories', parent)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="pencil-outline" size={16} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionBtn}
                              onPress={() => handleDeleteParent(parent)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="close-circle-outline" size={16} color={theme.colors.textTertiary} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* 子分类列表 */}
                        {isParentExpanded && children.length > 0 && (
                          <View style={styles.childList}>
                            {children.map((child, childIdx) => {
                              const inUse = isChildInUse(parent, child);
                              const isLast = childIdx === children.length - 1;
                              return (
                                <View key={child} style={[styles.childRow, isLast && styles.childRowLast]}>
                                  <View style={styles.childDot} />
                                  <Text style={styles.childName}>{child}</Text>
                                  <View style={styles.childActions}>
                                    <TouchableOpacity
                                      style={styles.childActionBtn}
                                      onPress={() => handleEditOption('categories', parent, child)}
                                      activeOpacity={0.7}
                                    >
                                      <Ionicons name="pencil-outline" size={14} color={theme.colors.textTertiary} />
                                    </TouchableOpacity>
                                    {!inUse ? (
                                      <TouchableOpacity
                                        style={styles.childActionBtn}
                                        onPress={() => handleDeleteChild(parent, child)}
                                        activeOpacity={0.7}
                                      >
                                        <Ionicons name="close-circle-outline" size={14} color={theme.colors.textTertiary} />
                                      </TouchableOpacity>
                                    ) : (
                                      <Ionicons name="lock-closed-outline" size={14} color={theme.colors.textTertiary} />
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}

                        {/* 添加子分类按钮 */}
                        {isParentExpanded && (
                          <TouchableOpacity
                            style={styles.addChildBtn}
                            onPress={() => handleAddOption('categories', parent)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add-outline" size={16} color={theme.colors.primary} />
                            <Text style={styles.addChildBtnText}>添加子分类</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                  {/* 添加分类按钮 */}
                  <TouchableOpacity
                    style={styles.addChildBtn}
                    onPress={() => handleAddOption('categories')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.addChildBtnText}>添加分类</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 一维分类：季节/场合/风格 */}
              {!isCategories && (isSingleCategoryMode || isExpanded) && (
                <View style={styles.optionList}>
                  {catOptions.map((opt, idx) => {
                    const inUse = isOptionInUse(cat.key, opt);
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.optionItem,
                          idx === catOptions.length - 1 && styles.optionItemLast,
                        ]}
                        onPress={() => handleEditOption(cat.key, opt as any)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            inUse && styles.optionInUse,
                          ]}
                        >
                          {opt}
                        </Text>
                        {!inUse && (
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteOption(cat.key, idx)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons
                              name="close-circle-outline"
                              size={20}
                              color={theme.colors.textTertiary}
                            />
                          </TouchableOpacity>
                        )}
                        {inUse && (
                          <Ionicons
                            name="lock-closed-outline"
                            size={16}
                            color={theme.colors.textTertiary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleAddOption(cat.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.addBtnText}>添加选项</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.bottom} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            {getModalSubtitle() && (
              <Text style={styles.modalSubtitle}>{getModalSubtitle()}</Text>
            )}
            <TextInput
              style={styles.modalInput}
              value={newOptionText}
              onChangeText={setNewOptionText}
              placeholder="输入选项名称"
              placeholderTextColor={theme.colors.textTertiary}
              autoFocus
              maxLength={20}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveOption}
                activeOpacity={0.8}
                disabled={isSaving}
              >
                <Text style={styles.modalConfirmText}>{isSaving ? '保存中...' : '保存'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
