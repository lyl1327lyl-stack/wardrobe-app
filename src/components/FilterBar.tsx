import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Season, CategoryFilter } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { SEASONS } from '../types';

interface Props {
  selectedCategory: CategoryFilter;
  selectedSeason: Season | '全部';
  onCategoryChange: (filter: CategoryFilter) => void;
  onSeasonChange: (season: Season | '全部') => void;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingVertical: 10,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    row: {
      paddingHorizontal: 14,
      marginBottom: 4,
    },
    filterGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    label: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginRight: 4,
      fontWeight: '500',
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.borderLight,
      marginRight: 6,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
    },
    chipText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    chipTextActive: {
      color: theme.colors.white,
      fontWeight: '500',
    },
    childChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.background,
      marginRight: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    childChipActive: {
      backgroundColor: theme.colors.primaryLight || theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    childChipText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    childChipTextActive: {
      color: theme.colors.white,
      fontWeight: '500',
    },
  });

export function FilterBar({ selectedCategory, selectedSeason, onCategoryChange, onSeasonChange }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const parents = useCustomOptionsStore(state => state.getParents());
  const getChildrenOf = useCustomOptionsStore(state => state.getChildrenOf);

  const isAllSelected = !selectedCategory.parent && !selectedCategory.child;
  const selectedParent = selectedCategory.parent;
  const selectedChild = selectedCategory.child;

  const handleParentPress = (parent: string) => {
    if (selectedParent === parent && !selectedChild) {
      // 点击已选中的父分类，取消选择
      onCategoryChange({});
    } else {
      // 选择父分类，不选子分类
      onCategoryChange({ parent });
    }
  };

  const handleChildPress = (parent: string, child: string) => {
    if (selectedChild === child && selectedParent === parent) {
      // 点击已选中的子分类，取消选择子分类但保留父分类
      onCategoryChange({ parent });
    } else {
      onCategoryChange({ parent, child });
    }
  };

  return (
    <View style={styles.container}>
      {/* 类型筛选 - 两级 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        <View style={styles.filterGroup}>
          <Text style={styles.label}>类型</Text>
          {/* 全部 */}
          <TouchableOpacity
            style={[styles.chip, isAllSelected && styles.chipActive]}
            onPress={() => onCategoryChange({})}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isAllSelected && styles.chipTextActive]}>
              全部
            </Text>
          </TouchableOpacity>
          {/* 父分类 */}
          {parents.map(parent => {
            const isParentSelected = selectedParent === parent && !selectedChild;
            const children = getChildrenOf(parent);
            return (
              <React.Fragment key={parent}>
                <TouchableOpacity
                  style={[styles.chip, isParentSelected && styles.chipActive]}
                  onPress={() => handleParentPress(parent)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isParentSelected && styles.chipTextActive]}>
                    {parent}
                  </Text>
                </TouchableOpacity>
                {/* 子分类（仅当父分类被选中时显示） */}
                {selectedParent === parent && children.map(child => (
                  <TouchableOpacity
                    key={child}
                    style={[styles.childChip, selectedChild === child && styles.childChipActive]}
                    onPress={() => handleChildPress(parent, child)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.childChipText, selectedChild === child && styles.childChipTextActive]}>
                      {child}
                    </Text>
                  </TouchableOpacity>
                ))}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
      {/* 季节筛选 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        <View style={styles.filterGroup}>
          <Text style={styles.label}>季节</Text>
          {(['全部', ...SEASONS] as const).map(season => (
            <TouchableOpacity
              key={season}
              style={[styles.chip, selectedSeason === season && styles.chipActive]}
              onPress={() => onSeasonChange(season)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selectedSeason === season && styles.chipTextActive]}>
                {season}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
