import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { ClothingItem, Season, CategoryFilter, Outfit } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { MonthCalendar, getDaysInMonth } from '../components/MonthCalendar';
import * as wearRecordsDb from '../db/wearRecords';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 6;
const GRID_COLS = 4;
const CELL_W = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
const CELL_H = CELL_W * 1.25;

const SEASONS: ('全部' | Season)[] = ['全部', '春', '夏', '秋', '冬'];
const SEASON_EMOJI: Record<Season, string> = { '春': '🌸', '夏': '☀️', '秋': '🍂', '冬': '❄️' };

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
      backgroundColor: theme.colors.background,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: theme.colors.card,
      ...theme.shadows.sm,
    },
    headerTitle: {
      fontSize: 17, fontWeight: '600', color: theme.colors.text,
    },
    headerSide: {
      flex: 1,
      alignItems: 'flex-start',
    },
    headerSideRight: {
      alignItems: 'flex-end',
    },
    dateBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: theme.colors.primary + '15',
      borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5,
    },
    dateBtnText: {
      fontSize: 12, fontWeight: '500', color: theme.colors.primary,
    },

    modeRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: theme.colors.borderLight,
      borderRadius: 12,
      padding: 3,
    },
    modeTab: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeTabActive: {
      backgroundColor: theme.colors.card,
      ...theme.shadows.sm,
    },
    modeTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textTertiary,
    },
    modeTabTextActive: {
      color: theme.colors.text,
    },

    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.borderLight,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      padding: 0,
    },

    tabSection: {
      paddingHorizontal: 16,
      marginBottom: 4,
    },
    tabRow: {
      flexDirection: 'row',
      gap: 6,
      paddingBottom: 6,
    },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 5,
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

    gridHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 8,
      marginTop: 4,
    },
    gridCount: {
      fontSize: 11,
      color: theme.colors.textTertiary,
    },
    gridSelected: {
      fontSize: 11,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    gridRow: {
      flexDirection: 'row',
      gap: GRID_GAP,
      paddingHorizontal: GRID_PADDING,
    },
    itemCard: {
      width: CELL_W,
      height: CELL_H,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderLight,
      marginBottom: GRID_GAP,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    itemCardActive: {
      borderColor: theme.colors.primary,
    },
    itemImage: {
      width: '100%',
      height: '100%',
    },
    checkmark: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    outfitRow: {
      gap: 8,
      paddingHorizontal: 16,
    },
    outfitCard: {
      width: (SCREEN_WIDTH - 32 - 8) / 2,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    outfitCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '08',
    },
    outfitThumbs: {
      flexDirection: 'row',
      gap: 3,
      marginBottom: 8,
    },
    outfitThumb: {
      width: ((SCREEN_WIDTH - 32 - 8) / 2 - 20 - 9) / 4,
      aspectRatio: 0.75,
      borderRadius: 4,
      backgroundColor: theme.colors.borderLight,
    },
    outfitName: {
      fontSize: 12, fontWeight: '600', color: theme.colors.text, marginBottom: 2,
    },
    outfitMeta: {
      fontSize: 10, color: theme.colors.textTertiary,
    },
    emptyList: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyText: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginTop: 8,
    },

    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 12,
    },
    footerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 50,
    },
    selectedThumbsContent: {
      alignItems: 'center',
      gap: 6,
    },
    selectedThumbWrap: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    selectedThumb: {
      width: 46,
      height: 46,
      borderRadius: 9,
    },
    selectedThumbRemove: {
      position: 'absolute',
      top: 3,
      right: 3,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.danger,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerCountBadge: {
      minWidth: 26,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary + '18',
    },
    footerCountText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    footerEmpty: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    footerPlaceholder: {
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    footerBtnRow: {
      flexDirection: 'row',
      gap: 10,
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    clearBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    confirmBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 14,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderLight,
      ...theme.shadows.sm,
    },
    confirmBtnBg: {
      ...StyleSheet.absoluteFillObject,
    },
    confirmBtnText: {
      color: theme.colors.white,
      fontSize: 15,
      fontWeight: '700',
    },
    confirmBtnTextDisabled: {
      color: theme.colors.textTertiary,
    },

    dateModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    dateModalCard: {
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
    },
    dateModalClose: {
      alignSelf: 'flex-end',
      padding: 4,
    },
  });

export function RecordWearScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialDate = route.params?.date as string | undefined;
  const initialOutfitId = route.params?.outfitId as number | undefined;
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const clothing = useWardrobeStore(s => s.clothing);
  const outfits = useWardrobeStore(s => s.outfits);
  const replaceDayRecords = useWardrobeStore(s => s.replaceDayRecords);
  const getParents = useCustomOptionsStore(s => s.getParents);
  const getChildrenOf = useCustomOptionsStore(s => s.getChildrenOf);

  const [mode, setMode] = useState<'items' | 'outfit'>(initialOutfitId ? 'outfit' : 'items');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate || todayDateStr());
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>({});
  const [selectedSeason, setSelectedSeason] = useState<'全部' | Season>('全部');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateWearData, setDateWearData] = useState<Record<string, ClothingItem[]>>({});

  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const today = todayDateStr();

  // Load month data for date picker（单次范围查询替代逐天查询，N10）
  const loadMonthData = useCallback(async () => {
    try {
      const daysInMonth = getDaysInMonth(calYear, calMonth);
      const startDate = `${calYear}-${String(calMonth).padStart(2, '0')}-01`;
      const endDate = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const allClothingMap = new Map<number, ClothingItem>();
      for (const c of clothing) allClothingMap.set(c.id, c);

      const allRecords = await wearRecordsDb.getWearRecordsByDateRange(startDate, endDate);
      const newData: Record<string, ClothingItem[]> = {};
      for (const r of allRecords) {
        const live = allClothingMap.get(r.clothingId);
        let item: ClothingItem | undefined;
        if (live) {
          item = live;
        } else if (r.clothingThumbnailUri) {
          // 回退：用记录里的缩略图（已删除衣物）
          item = {
            id: r.clothingId,
            imageUri: r.clothingThumbnailUri,
            thumbnailUri: r.clothingThumbnailUri,
            originalImageUri: '',
            type: r.clothingType || '已删除',
            parentType: '',
            color: '', brand: '', size: '', remarks: '',
            seasons: [], tags: [], fit: '', thickness: '',
            purchaseDate: '', price: 0, wearCount: 0, lastWornAt: null,
            createdAt: '', wardrobeId: 0,
          };
        }
        if (item) {
          if (!newData[r.wornDate]) newData[r.wornDate] = [];
          newData[r.wornDate].push(item);
        }
      }
      setDateWearData(newData);
    } catch (error) {
      console.error('RecordWearScreen loadMonthData failed:', error);
    }
  }, [calYear, calMonth, clothing]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const outfitPresetAppliedRef = useRef(false);
  // 切换日期时，预选当天已有记录（勾选模型）；首次若有 outfitId 预设则 union
  useEffect(() => {
    (async () => {
      const records = await wearRecordsDb.getWearRecordsByDate(selectedDate);
      let ids = records.map(r => r.clothingId);
      if (initialOutfitId && !outfitPresetAppliedRef.current) {
        const outfit = outfits.find(o => o.id === initialOutfitId);
        if (outfit) {
          ids = [...new Set([...ids, ...outfit.itemIds])];
        }
        outfitPresetAppliedRef.current = true;
      }
      setSelectedIds(ids);
    })();
  }, [selectedDate, initialOutfitId, outfits]);

  const outfitMatchMap = useMemo(() => {
    const map: Record<string, { outfitId: number; outfitName: string; outfitThumb: string; extraItemIds: number[] }> = {};
    for (const [dateStr, items] of Object.entries(dateWearData)) {
      const itemIds = new Set(items.map(i => i.id));
      for (const outfit of outfits) {
        if (outfit.itemIds.length === 0) continue;
        if (outfit.itemIds.every(cid => itemIds.has(cid))) {
          const extraItemIds = items.filter(i => !outfit.itemIds.includes(i.id)).map(i => i.id);
          map[dateStr] = {
            outfitId: outfit.id,
            outfitName: outfit.name,
            outfitThumb: outfit.thumbnailUri || '',
            extraItemIds,
          };
          break;
        }
      }
    }
    return map;
  }, [dateWearData, outfits]);

  // Filter clothing
  const filteredClothing = useMemo(() => {
    return clothing.filter(item => {
      if (item.deletedAt) return false;
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
          item.tags.some(t => t.toLowerCase().includes(kw));
        if (!match) return false;
      }
      return true;
    });
  }, [clothing, selectedCategory, selectedSeason, searchKeyword, getChildrenOf]);

  // Filter outfits
  const filteredOutfits = useMemo(() => {
    if (!searchKeyword) return outfits;
    const kw = searchKeyword.toLowerCase();
    return outfits.filter(o => o.name.toLowerCase().includes(kw));
  }, [outfits, searchKeyword]);

  // Selected items for footer thumbnails
  const selectedItems = useMemo(() => {
    return clothing.filter(c => selectedIds.includes(c.id));
  }, [clothing, selectedIds]);

  const toggleItem = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectOutfit = (outfit: Outfit) => {
    // If the same outfit is already selected, deselect it
    const isAlreadySelected = outfit.itemIds.length === selectedIds.length &&
      outfit.itemIds.every(id => selectedIds.includes(id));
    if (isAlreadySelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds([...outfit.itemIds]);
    }
  };

  const handleModeChange = (newMode: 'items' | 'outfit') => {
    if (newMode === mode) return;
    if (newMode === 'outfit' && selectedIds.length > 0) {
      Alert.alert('切换模式', '切换到选搭配模式会清空当前已选的单品，是否继续？', [
        { text: '取消', style: 'cancel' },
        { text: '继续', onPress: () => { setSelectedIds([]); setMode(newMode); } },
      ]);
    } else {
      setMode(newMode);
    }
  };

  const handleConfirm = async () => {
    if (selectedIds.length < 1) {
      Alert.alert('提示', '请至少选择 1 件单品');
      return;
    }
    try {
      // diff 保存：勾选的保留/新增，取消的移除（先 add 后 delete，防数据丢失）
      await replaceDayRecords(selectedIds, selectedDate);
      navigation.goBack();
    } catch (error) {
      console.error('RecordWearScreen handleConfirm failed:', error);
      Alert.alert('记录失败', '保存穿着记录时出错，请重试');
    }
  };

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowDatePicker(false);
  };

  const renderItemCard = (item: ClothingItem) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.itemCard, isSelected && styles.itemCardActive]}
        onPress={() => toggleItem(item.id)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.thumbnailUri }} style={styles.itemImage} />
        {isSelected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={12} color={theme.colors.white} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderOutfitCard = (outfit: Outfit) => {
    const isActive = outfit.itemIds.length === selectedIds.length &&
      outfit.itemIds.every(id => selectedIds.includes(id));
    const outfitItems = outfit.itemIds
      .map(id => clothing.find(c => c.id === id))
      .filter(Boolean)
      .slice(0, 4);
    const catSet = new Set(outfitItems.map(i => i!.parentType || i!.type));
    return (
      <TouchableOpacity
        style={[styles.outfitCard, isActive && styles.outfitCardActive]}
        onPress={() => handleSelectOutfit(outfit)}
        activeOpacity={0.7}
      >
        <View style={styles.outfitThumbs}>
          {outfitItems.map(item => (
            <Image
              key={item!.id}
              source={{ uri: item!.thumbnailUri }}
              style={styles.outfitThumb}
              resizeMode="cover"
            />
          ))}
        </View>
        <Text style={styles.outfitName} numberOfLines={1}>{outfit.name}</Text>
        <Text style={styles.outfitMeta}>{outfit.itemIds.length}件 · {[...catSet].join('+')}</Text>
      </TouchableOpacity>
    );
  };

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === today) return '今天';
    const d = new Date(dateStr);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}/${d.getDate()} ${weekDays[d.getDay()]}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>记录穿搭</Text>
        <View style={[styles.headerSide, styles.headerSideRight]}>
          <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => {
            const d = new Date(selectedDate);
            setCalYear(d.getFullYear());
            setCalMonth(d.getMonth() + 1);
            setShowDatePicker(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.dateBtnText}>{formatDateLabel(selectedDate)}</Text>
          <Ionicons name="chevron-down" size={12} color={theme.colors.primary} />
        </TouchableOpacity>
        </View>
      </View>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'items' && styles.modeTabActive]}
          onPress={() => handleModeChange('items')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeTabText, mode === 'items' && styles.modeTabTextActive]}>👔 选单品</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'outfit' && styles.modeTabActive]}
          onPress={() => handleModeChange('outfit')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeTabText, mode === 'outfit' && styles.modeTabTextActive]}>📦 选搭配</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={theme.colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            placeholder="搜索品牌/颜色/标签..."
            placeholderTextColor={theme.colors.textTertiary}
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity onPress={() => setSearchKeyword('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters (items mode only) */}
      {mode === 'items' && (
        <>
          <View style={styles.tabSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, !selectedCategory.parent && !selectedCategory.child && styles.tabActive]}
                onPress={() => setSelectedCategory({})}
              >
                <Text style={[styles.tabText, !selectedCategory.parent && !selectedCategory.child && styles.tabTextActive]}>
                  全部
                </Text>
              </TouchableOpacity>
              {getParents().map(parent => {
                const isActive = selectedCategory.parent === parent && !selectedCategory.child;
                return (
                  <TouchableOpacity
                    key={parent}
                    style={[styles.tab, isActive && styles.tabActive]}
                    onPress={() => setSelectedCategory({ parent })}
                  >
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{parent}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {selectedCategory.parent && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabRow, { marginTop: 0 }]}>
                {getChildrenOf(selectedCategory.parent).map(child => {
                  const isActive = selectedCategory.child === child;
                  return (
                    <TouchableOpacity
                      key={child}
                      style={[styles.tab, isActive && styles.tabActive]}
                      onPress={() => setSelectedCategory({ parent: selectedCategory.parent, child })}
                    >
                      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{child}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.tabSection}>
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
        </>
      )}

      {/* Content grid */}
      <View style={styles.gridHeader}>
        <Text style={styles.gridCount}>
          {mode === 'items' ? `共 ${filteredClothing.length} 件` : `共 ${filteredOutfits.length} 套搭配`}
        </Text>
        {selectedIds.length > 0 && (
          <Text style={styles.gridSelected}>已选 {selectedIds.length} 件</Text>
        )}
      </View>

      {mode === 'items' ? (
        <FlatList
          key={`items-${mode}`}
          data={filteredClothing}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => renderItemCard(item)}
          numColumns={4}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="shirt-outline" size={40} color={theme.colors.border} />
              <Text style={styles.emptyText}>没有符合条件的单品</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          key={`outfit-${mode}`}
          data={filteredOutfits}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => renderOutfitCard(item)}
          numColumns={2}
          columnWrapperStyle={styles.outfitRow}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="grid-outline" size={40} color={theme.colors.border} />
              <Text style={styles.emptyText}>{searchKeyword ? '没有匹配的搭配' : '暂无搭配，去「搭配」tab 创建吧'}</Text>
            </View>
          }
        />
      )}

      {/* 浮起底栏（两栏：已选 + 按钮） */}
      <View style={styles.footer}>
        {/* 第一栏：已选衣物 */}
        <View style={styles.footerTopRow}>
          {selectedIds.length > 0 ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedThumbsContent}>
                {selectedItems.map(item => (
                  <View key={item.id} style={styles.selectedThumbWrap}>
                    <Image
                      source={{ uri: item.thumbnailUri }}
                      style={styles.selectedThumb}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.selectedThumbRemove}
                      onPress={() => toggleItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove" size={13} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.footerCountBadge}>
                <Text style={styles.footerCountText}>{selectedIds.length}</Text>
              </View>
            </>
          ) : (
            <View style={styles.footerEmpty}>
              <Ionicons name="shirt-outline" size={18} color={theme.colors.textTertiary} />
              <Text style={styles.footerPlaceholder}>请选择今天穿的衣物</Text>
            </View>
          )}
        </View>

        {/* 第二栏：操作按钮 */}
        <View style={styles.footerBtnRow}>
          {selectedIds.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedIds([])} activeOpacity={0.7}>
              <Ionicons name="close" size={15} color={theme.colors.textSecondary} />
              <Text style={styles.clearBtnText}>清空</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            disabled={selectedIds.length === 0}
            activeOpacity={0.85}
          >
            {selectedIds.length > 0 && (
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmBtnBg}
              />
            )}
            <Ionicons
              name="checkmark-circle"
              size={17}
              color={selectedIds.length > 0 ? theme.colors.white : theme.colors.textTertiary}
            />
            <Text style={[styles.confirmBtnText, selectedIds.length === 0 && styles.confirmBtnTextDisabled]}>
              {mode === 'outfit' ? '记录这套搭配' : `记录穿搭 (${selectedIds.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date picker modal */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity
          style={styles.dateModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.dateModalCard}>
            <TouchableOpacity
              style={styles.dateModalClose}
              onPress={() => setShowDatePicker(false)}
            >
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <MonthCalendar
              year={calYear}
              month={calMonth}
              today={today}
              wearData={dateWearData}
              outfitMatchMap={outfitMatchMap}
              legendItems={[
                { label: '已穿着', color: theme.colors.primary + '40' },
                { label: '今天', icon: 'star', iconColor: theme.colors.primary },
              ]}
              onSelectDate={handleDateSelect}
              onPrevMonth={() => {
                if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
                else { setCalMonth(calMonth - 1); }
              }}
              onNextMonth={() => {
                if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
                else { setCalMonth(calMonth + 1); }
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
