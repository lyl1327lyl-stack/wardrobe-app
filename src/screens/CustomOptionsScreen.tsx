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
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

type OptionCategory = 'categories' | 'seasons' | 'tags' | 'sizes';

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
  { key: 'tags', label: '标签', icon: 'pricetags-outline' },
  { key: 'sizes', label: '尺码', icon: 'resize-outline' },
];

const makeStyles = (theme: Theme) => {
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // ── Header ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 56,
      paddingBottom: 14,
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.2,
    },
    headerDoneBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 16,
      overflow: 'hidden',
    },
    headerDoneBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },

    // ── Content ──
    content: {
      flex: 1,
    },
    list: {
      padding: 16,
      paddingBottom: 40,
    },

    // ── Section Card ──
    section: {
      marginBottom: 12,
      backgroundColor: colors.card,
      borderRadius: 16,
      ...theme.shadows.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 14,
    },
    sectionIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionInfo: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    sectionCount: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
    optionList: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },

    // ── Parent Card ──
    parentCard: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
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
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    parentInfo: {
      flex: 1,
    },
    parentName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    parentMeta: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
    parentActions: {
      flexDirection: 'row',
      gap: 6,
    },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionBtnDanger: {
      backgroundColor: colors.danger + '14',
    },

    // ── Child List ──
    childList: {
      backgroundColor: colors.background,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
    childRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingLeft: 20,
      paddingRight: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 10,
    },
    childRowLast: {
      borderBottomWidth: 0,
    },
    childDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.primary + '60',
    },
    childName: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
    },
    childActions: {
      flexDirection: 'row',
      gap: 4,
    },
    childActionBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },

    // ── Add Child Button ──
    addChildBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 13,
      marginHorizontal: 16,
      marginBottom: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primary + '50',
      borderStyle: 'dashed',
    },
    addChildBtnText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
    },

    // ── Flat Option Item ──
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 10,
    },
    optionItemLast: {
      borderBottomWidth: 0,
    },
    optionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.textTertiary,
    },
    optionText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    optionInUse: {
      color: colors.textTertiary,
    },
    optionLock: {
      padding: 8,
    },

    // ── Bottom Add Button ──
    bottomAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 14,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 14,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    bottomAddBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },

    // ── Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modal: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      ...theme.shadows.lg,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.textTertiary,
      marginBottom: 20,
      textAlign: 'center',
    },
    modalInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      backgroundColor: colors.background,
      marginBottom: 20,
    },
    modalInputIcon: {
      marginRight: 10,
    },
    modalInput: {
      flex: 1,
      paddingVertical: 13,
      fontSize: 16,
      color: colors.text,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancel: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    modalConfirm: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 14,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalConfirmText: {
      fontSize: 15,
      color: '#fff',
      fontWeight: '700',
    },
  });
};

export function CustomOptionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'CustomOptions'>>();
  const { clothing, trashClothing, soldClothing, draftClothing } = useWardrobeStore();
  const migrateClothingType = useWardrobeStore(state => state.migrateClothingType);
  const migrateClothingParentType = useWardrobeStore(state => state.migrateClothingParentType);
  const migrateClothingSize = useWardrobeStore(state => state.migrateClothingSize);
  const migrateClothingTag = useWardrobeStore(state => state.migrateClothingTag);
  const migrateClothingSeason = useWardrobeStore(state => state.migrateClothingSeason);

  // Zustand selectors
  const categories = useCustomOptionsStore(state => state.categories);
  const seasons = useCustomOptionsStore(state => state.seasons);
  const storeTags = useCustomOptionsStore(state => state.tags);
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
  const [editTarget, setEditTarget] = useState<{ category?: OptionCategory; parent?: string; child?: string }>({});
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
      case 'tags':
        return storeTags;
      case 'sizes':
        return sizes;
    }
  };

  // 获取子分类
  const getChildrenOf = (parent: string): string[] => {
    return categories[parent] || [];
  };

  // 检查选项是否被使用（含废衣篓/已卖出/草稿，避免删后留孤立引用）
  const isOptionInUse = useCallback(
    (category: OptionCategory, value: string): boolean => {
      const allItems = [...clothing, ...trashClothing, ...soldClothing, ...draftClothing];
      if (category === 'categories') {
        // 检查任何衣物的 type 是否等于这个子分类
        for (const item of allItems) {
          if (item.type === value) return true;
        }
        // 也检查父分类是否被使用
        const children = getChildrenOf(value);
        for (const child of children) {
          for (const item of allItems) {
            if (item.type === child) return true;
          }
        }
        return false;
      }
      for (const item of allItems) {
        switch (category) {
          case 'seasons':
            if (item.seasons.includes(value)) return true;
            break;
          case 'tags':
            if (item.tags && item.tags.includes(value)) return true;
            break;
          case 'sizes':
            if (item.size === value) return true;
            break;
        }
      }
      return false;
    },
    [clothing, trashClothing, soldClothing, draftClothing, categories]
  );

  // 检查子分类是否被使用（含废衣篓/已卖出/草稿）
  const isChildInUse = (parent: string, child: string): boolean => {
    const allItems = [...clothing, ...trashClothing, ...soldClothing, ...draftClothing];
    for (const item of allItems) {
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
    setEditTarget(child ? { category, parent, child } : { category, parent });
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
          await updateCategory(category as 'seasons' | 'tags' | 'sizes', newOpts);
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
        await updateCategory(cat as 'seasons' | 'tags' | 'sizes', [...opts, trimmed]);
      } else {
        // edit mode
        const { category, parent, child } = editTarget;
        if (category && category !== 'categories') {
          // 一维选项改名（标签/季节/尺码）：先迁移衣物，再持久化选项
          if (parent && parent !== trimmed) {
            if (category === 'tags') await migrateClothingTag(parent, trimmed);
            else if (category === 'seasons') await migrateClothingSeason(parent, trimmed);
            else if (category === 'sizes') await migrateClothingSize(parent, trimmed);
            const opts = getOptionsForCategory(category);
            await updateCategory(category as 'seasons' | 'tags' | 'sizes', opts.map(o => o === parent ? trimmed : o));
          }
        } else if (child) {
          // 编辑子分类：先迁移衣物 type，再持久化（避免中途失败留下孤立选项）
          if (child !== trimmed) {
            await migrateClothingType(child, trimmed);
            await renameChild(parent!, child, trimmed);
          }
        } else if (parent) {
          // 编辑父分类：先迁移衣物 parentType，再持久化
          if (parent !== trimmed) {
            await migrateClothingParentType(parent, trimmed);
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

  // ── Icon palette (rotating) ──
  const ICON_PALETTES: [string, string][] = [
    ['#6B7FD7', '#8B9FE8'],
    ['#E8B4A0', '#F0C8B4'],
    ['#00B894', '#34D399'],
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>管理分类选项</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {forcedCategory ? `${CATEGORIES.find(c => c.key === forcedCategory)?.label}管理` : '管理分类选项'}
        </Text>
        {forcedCategory ? (
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.headerDoneBtn}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.headerDoneBtnText}>完成</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.headerBtn} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {(forcedCategory ? CATEGORIES.filter(c => c.key === forcedCategory) : CATEGORIES).map((cat, catIdx) => {
          const catOptions = getOptionsForCategory(cat.key);
          const isExpanded = expandedCategory === cat.key;
          const isSingleCategoryMode = !!forcedCategory;
          const isCategories = cat.key === 'categories';
          const [iconC1, iconC2] = ICON_PALETTES[catIdx % ICON_PALETTES.length];

          return (
            <View key={cat.key} style={styles.section}>
              {/* Section Header */}
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => !isSingleCategoryMode && handleToggleExpand(cat.key)}
                activeOpacity={isSingleCategoryMode ? 1 : 0.7}
                disabled={isSingleCategoryMode}
              >
                <LinearGradient
                  colors={[iconC1, iconC2]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.sectionIconWrap}
                >
                  <Ionicons name={cat.icon} size={20} color="#fff" />
                </LinearGradient>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionTitle}>{cat.label}</Text>
                  <Text style={styles.sectionCount}>
                    {isCategories ? `${catOptions.length} 个分类` : `${catOptions.length} 个选项`}
                  </Text>
                </View>
                {!isSingleCategoryMode && (
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.colors.textTertiary}
                  />
                )}
              </TouchableOpacity>

              {/* ── Two-level: Categories ── */}
              {isCategories && (isSingleCategoryMode || isExpanded) && (
                <View style={styles.optionList}>
                  {catOptions.map((parent, idx) => {
                    const children = getChildrenOf(parent);
                    const isParentExpanded = expandedParent === parent;
                    const isLastParent = idx === catOptions.length - 1;

                    return (
                      <View key={parent} style={[styles.parentCard, isLastParent && styles.parentCardLast]}>
                        {/* Parent row */}
                        <TouchableOpacity
                          style={styles.parentHeader}
                          onPress={() => handleToggleParent(parent)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.parentExpandBtn}>
                            <Ionicons
                              name={isParentExpanded ? 'chevron-down' : 'chevron-forward'}
                              size={16}
                              color={theme.colors.textSecondary}
                            />
                          </View>
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
                              <Ionicons name="pencil" size={15} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnDanger]}
                              onPress={() => handleDeleteParent(parent)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        {/* Child list */}
                        {isParentExpanded && (
                          <>
                            {children.length > 0 && (
                              <View style={styles.childList}>
                                {children.map((child, childIdx) => {
                                  const inUse = isChildInUse(parent, child);
                                  const isLast = childIdx === children.length - 1;
                                  return (
                                    <View key={child} style={[styles.childRow, isLast && styles.childRowLast]}>
                                      <View style={styles.childDot} />
                                      <Text style={[styles.childName, inUse && styles.optionInUse]}>{child}</Text>
                                      <View style={styles.childActions}>
                                        <TouchableOpacity
                                          style={styles.childActionBtn}
                                          onPress={() => handleEditOption('categories', parent, child)}
                                          activeOpacity={0.7}
                                        >
                                          <Ionicons name="pencil" size={13} color={theme.colors.textTertiary} />
                                        </TouchableOpacity>
                                        {inUse ? (
                                          <Ionicons name="lock-closed-outline" size={14} color={theme.colors.textTertiary} style={{ marginHorizontal: 4 }} />
                                        ) : (
                                          <TouchableOpacity
                                            style={styles.childActionBtn}
                                            onPress={() => handleDeleteChild(parent, child)}
                                            activeOpacity={0.7}
                                          >
                                            <Ionicons name="trash-outline" size={13} color={theme.colors.danger} />
                                          </TouchableOpacity>
                                        )}
                                      </View>
                                    </View>
                                  );
                                })}
                              </View>
                            )}

                            {/* Add sub-category */}
                            <TouchableOpacity
                              style={styles.addChildBtn}
                              onPress={() => handleAddOption('categories', parent)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="add-outline" size={16} color={theme.colors.primary} />
                              <Text style={styles.addChildBtnText}>添加子分类</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    );
                  })}

                  {/* Add parent category */}
                  <TouchableOpacity onPress={() => handleAddOption('categories')} activeOpacity={0.85}>
                    <LinearGradient
                      colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.bottomAddBtn}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text style={styles.bottomAddBtnText}>添加分类</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Flat: Tags / Sizes ── */}
              {!isCategories && (isSingleCategoryMode || isExpanded) && (
                <View style={styles.optionList}>
                  {catOptions.map((opt, idx) => {
                    const inUse = isOptionInUse(cat.key, opt);
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.optionItem, idx === catOptions.length - 1 && styles.optionItemLast]}
                        onPress={() => handleEditOption(cat.key, opt as any)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.optionDot} />
                        <Text style={[styles.optionText, inUse && styles.optionInUse]}>{opt}</Text>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleEditOption(cat.key, opt as any)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil" size={15} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        {inUse ? (
                          <View style={styles.optionLock}>
                            <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textTertiary} />
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnDanger]}
                            onPress={() => handleDeleteOption(cat.key, idx)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity onPress={() => handleAddOption(cat.key)} activeOpacity={0.85}>
                    <LinearGradient
                      colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.bottomAddBtn}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text style={styles.bottomAddBtnText}>添加选项</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ── Add/Edit Modal ── */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            {getModalSubtitle() ? (
              <Text style={styles.modalSubtitle}>{getModalSubtitle()}</Text>
            ) : null}
            <View style={styles.modalInputWrap}>
              <Ionicons
                name="create-outline"
                size={18}
                color={theme.colors.textTertiary}
                style={styles.modalInputIcon}
              />
              <TextInput
                style={styles.modalInput}
                value={newOptionText}
                onChangeText={setNewOptionText}
                placeholder="输入名称"
                placeholderTextColor={theme.colors.textTertiary}
                autoFocus
                maxLength={20}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={handleSaveOption}
                activeOpacity={0.85}
                disabled={isSaving}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.modalConfirm}
                >
                  <Text style={styles.modalConfirmText}>{isSaving ? '保存中...' : '保存'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
