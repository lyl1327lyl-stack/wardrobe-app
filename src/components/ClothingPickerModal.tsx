import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { ClothingItem, Season, CategoryFilter } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: number[]) => void;
  alreadyAddedIds: number[];
}

const SEASONS: ('全部' | Season)[] = ['全部', '春', '夏', '秋', '冬'];
const SEASON_EMOJI: Record<Season, string> = { '春': '🌸', '夏': '☀️', '秋': '🍂', '冬': '❄️' };

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: 640,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.borderLight,
      borderRadius: 10,
      marginHorizontal: 16,
      marginVertical: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      padding: 0,
    },
    tabSection: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    tabLabel: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginBottom: 6,
    },
    tabRow: {
      flexDirection: 'row',
      gap: 6,
      paddingBottom: 8,
    },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.borderLight,
      borderRadius: 14,
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.white,
    },
    gridContent: {
      paddingTop: 8,
      paddingBottom: 8,
    },
    gridRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
    },
    clothingCard: {
      flex: 1,
      aspectRatio: 0.75,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderLight,
      marginBottom: 8,
    },
    clothingCardActive: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    clothingImage: {
      width: '100%',
      height: '100%',
    },
    checkmark: {
      position: 'absolute',
      top: 3,
      right: 3,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    empty: {
      alignItems: 'center',
      paddingTop: 40,
    },
    emptyText: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginTop: 8,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    footerCount: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    footerCountNum: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    confirmBtn: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 10,
    },
    confirmBtnDisabled: {
      backgroundColor: theme.colors.borderLight,
    },
    confirmBtnText: {
      color: theme.colors.white,
      fontSize: 14,
      fontWeight: '600',
    },
  });

export function ClothingPickerModal({ visible, onClose, onConfirm, alreadyAddedIds }: Props) {
  const { clothing } = useWardrobeStore();
  const categories = useCustomOptionsStore(state => state.categories);
  const getParents = useCustomOptionsStore(state => state.getParents);
  const getChildrenOf = useCustomOptionsStore(state => state.getChildrenOf);
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>({});
  const [selectedSeason, setSelectedSeason] = useState<'全部' | Season>('全部');

  React.useEffect(() => {
    if (visible) {
      setSelectedIds([]);
      setSearchKeyword('');
      setSelectedCategory({});
      setSelectedSeason('全部');
    }
  }, [visible]);

  const filteredClothing = clothing.filter(item => {
    // Filter by category (两级联动)
    if (selectedCategory.child) {
      if (item.type !== selectedCategory.child) return false;
    } else if (selectedCategory.parent) {
      const children = getChildrenOf(selectedCategory.parent);
      if (!children.includes(item.type)) return false;
    }
    if (selectedSeason !== '全部' && !item.seasons.includes(selectedSeason as Season)) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      const match =
        item.brand.toLowerCase().includes(kw) ||
        item.color.toLowerCase().includes(kw) ||
        item.remarks.toLowerCase().includes(kw) ||
        item.occasions.some(o => o.toLowerCase().includes(kw));
      if (!match) return false;
    }
    if (alreadyAddedIds.includes(item.id)) return false;
    return true;
  });

  const toggleItem = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) return;
    onConfirm(selectedIds);
  };

  const renderClothingItem = ({ item }: { item: ClothingItem }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.clothingCard, isSelected && styles.clothingCardActive]}
        onPress={() => toggleItem(item.id)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.thumbnailUri }} style={styles.clothingImage} />
        {isSelected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={10} color={theme.colors.white} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>选择衣物</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={theme.colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              placeholder="搜索品牌/场合/风格/颜色/备注"
              placeholderTextColor={theme.colors.textTertiary}
            />
            {searchKeyword.length > 0 && (
              <TouchableOpacity onPress={() => setSearchKeyword('')}>
                <Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Type Tabs - 两级联动 */}
          <View style={styles.tabSection}>
            <Text style={styles.tabLabel}>类型</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {/* 全部 */}
              <TouchableOpacity
                key="全部"
                style={[styles.tab, !selectedCategory.parent && !selectedCategory.child && styles.tabActive]}
                onPress={() => setSelectedCategory({})}
              >
                <Text style={[styles.tabText, !selectedCategory.parent && !selectedCategory.child && styles.tabTextActive]}>
                  全部
                </Text>
              </TouchableOpacity>
              {/* 父分类 */}
              {getParents().map(parent => {
                const isActive = selectedCategory.parent === parent && !selectedCategory.child;
                return (
                  <TouchableOpacity
                    key={parent}
                    style={[styles.tab, isActive && styles.tabActive]}
                    onPress={() => setSelectedCategory({ parent })}
                  >
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                      {parent}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {/* 子分类（当选择了父分类后显示） */}
            {selectedCategory.parent && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabRow, { marginTop: 6 }]}>
                {getChildrenOf(selectedCategory.parent).map(child => {
                  const isActive = selectedCategory.child === child;
                  return (
                    <TouchableOpacity
                      key={child}
                      style={[styles.tab, isActive && styles.tabActive]}
                      onPress={() => setSelectedCategory({ parent: selectedCategory.parent, child })}
                    >
                      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                        {child}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Season Tabs */}
          <View style={styles.tabSection}>
            <Text style={styles.tabLabel}>季节</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {SEASONS.map(season => (
                <TouchableOpacity
                  key={season}
                  style={[styles.tab, selectedSeason === season && styles.tabActive]}
                  onPress={() => setSelectedSeason(season)}
                >
                  <Text style={[styles.tabText, selectedSeason === season && styles.tabTextActive]}>
                    {season === '全部' ? season : `${SEASON_EMOJI[season as Season]} ${season}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Grid */}
          <FlatList
            data={filteredClothing}
            keyExtractor={item => item.id.toString()}
            renderItem={renderClothingItem}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="shirt-outline" size={40} color={theme.colors.border} />
                <Text style={styles.emptyText}>没有符合条件的衣服</Text>
              </View>
            }
          />

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerCount}>
              已选 <Text style={styles.footerCountNum}>{selectedIds.length}</Text> 件
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, selectedIds.length === 0 && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={selectedIds.length === 0}
            >
              <Text style={styles.confirmBtnText}>确认添加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}