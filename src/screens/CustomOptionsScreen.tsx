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

type OptionCategory = 'types' | 'seasons' | 'occasions' | 'styles';

type RouteParams = {
  CustomOptions: { category?: OptionCategory };
};

interface CategoryConfig {
  key: OptionCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'types', label: '类型', icon: 'shirt-outline' },
  { key: 'seasons', label: '季节', icon: 'flower-outline' },
  { key: 'occasions', label: '场合', icon: 'calendar-outline' },
  { key: 'styles', label: '风格', icon: 'brush-outline' },
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
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
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
  });

export function CustomOptionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'CustomOptions'>>();
  const { clothing } = useWardrobeStore();
  const migrateClothingType = useWardrobeStore(state => state.migrateClothingType);

  // ✅ Zustand 必须用 selector 订阅，否则 UI 不会响应更新
  const types = useCustomOptionsStore(state => state.types);
  const seasons = useCustomOptionsStore(state => state.seasons);
  const occasions = useCustomOptionsStore(state => state.occasions);
  const storeStyles = useCustomOptionsStore(state => state.styles);
  const isLoading = useCustomOptionsStore(state => state.isLoading);
  const load = useCustomOptionsStore(state => state.load);
  const updateCategory = useCustomOptionsStore(state => state.updateCategory);
  const resetToDefaults = useCustomOptionsStore(state => state.resetToDefaults);

  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // 如果传入了特定分类，则进入单分类模式（不显示分类列表，直接展开该分类）
  const forcedCategory = route.params?.category;
  const [expandedCategory, setExpandedCategory] = useState<OptionCategory | null>(
    forcedCategory || null
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalCategory, setAddModalCategory] = useState<OptionCategory | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newOptionText, setNewOptionText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const getOptionsForCategory = (category: OptionCategory): string[] => {
    switch (category) {
      case 'types':
        return types;
      case 'seasons':
        return seasons;
      case 'occasions':
        return occasions;
      case 'styles':
        return storeStyles;
    }
  };

  const updateCategoryOptions = async (category: OptionCategory, newOptions: string[]) => {
    await updateCategory(category, newOptions);
  };

  // Check if an option is in use by any clothing item
  const isOptionInUse = useCallback(
    (category: OptionCategory, value: string): boolean => {
      for (const item of clothing) {
        switch (category) {
          case 'types':
            if (item.type === value) return true;
            break;
          case 'seasons':
            if (item.seasons.includes(value)) return true;
            break;
          case 'occasions':
            if (item.occasions.includes(value)) return true;
            break;
          case 'styles':
            if (item.styles && item.styles.includes(value)) return true;
            break;
        }
      }
      return false;
    },
    [clothing]
  );

  const handleToggleExpand = (category: OptionCategory) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

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
          // 直接从当前状态重新计算，避免闭包问题
          const currentOpts = getOptionsForCategory(category);
          const newOpts = currentOpts.filter((_, i) => i !== index);
          await updateCategoryOptions(category, newOpts);
        },
      },
    ]);
  };

  const handleAddOption = (category: OptionCategory) => {
    setAddModalCategory(category);
    setEditingValue('');
    setEditingIndex(null);
    setNewOptionText('');
    setShowAddModal(true);
  };

  const handleEditOption = (category: OptionCategory, index: number) => {
    const opts = getOptionsForCategory(category);
    setAddModalCategory(category);
    setEditingValue(opts[index]);
    setEditingIndex(index);
    setNewOptionText(opts[index]);
    setShowAddModal(true);
  };

  const handleSaveOption = async () => {
    if (isSaving) return;
    if (!addModalCategory || !newOptionText.trim()) {
      Alert.alert('请输入选项名称');
      return;
    }
    const trimmed = newOptionText.trim();
    const currentOpts = getOptionsForCategory(addModalCategory);

    // Check for duplicate (only for new items, not when editing same item)
    if (editingIndex === null && currentOpts.includes(trimmed)) {
      Alert.alert('选项已存在', '请使用不同的名称');
      return;
    }

    let newOpts: string[];
    const isEditing = editingIndex !== null;
    const oldValue = isEditing ? currentOpts[editingIndex] : null;
    if (isEditing) {
      // Edit existing
      newOpts = [...currentOpts];
      newOpts[editingIndex] = trimmed;
    } else {
      // Add new
      newOpts = [...currentOpts, trimmed];
    }

    setIsSaving(true);
    // 先关闭 modal，确保用户立即看到反馈
    setShowAddModal(false);
    // 重置表单状态
    setNewOptionText('');
    setEditingIndex(null);
    setAddModalCategory(null);
    try {
      await updateCategoryOptions(addModalCategory, newOpts);
      // When renaming a type, migrate all clothing items to the new type
      if (isEditing && addModalCategory === 'types' && oldValue && oldValue !== trimmed) {
        await migrateClothingType(oldValue, trimmed);
      }
    } finally {
      setIsSaving(false);
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
        {!forcedCategory && (
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
          // 单分类模式（forcedCategory）下，强制展开且不显示header
          const isSingleCategoryMode = !!forcedCategory;
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
                    <Text style={styles.sectionCount}>{catOptions.length} 个选项</Text>
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
                    <Text style={styles.sectionCount}>{catOptions.length} 个选项</Text>
                  </View>
                </View>
              )}

              {/* 单分类模式或展开时显示选项列表 */}
              {(isSingleCategoryMode || isExpanded) && (
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
                        onPress={() => handleEditOption(cat.key, idx)}
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
            <Text style={styles.modalTitle}>
              {editingIndex !== null ? '编辑选项' : '添加选项'}
            </Text>
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
