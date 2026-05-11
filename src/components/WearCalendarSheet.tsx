import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  FlatList,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClothingItem, Outfit } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import * as wearRecordsDb from '../db/wearRecords';

interface WearCalendarSheetProps {
  visible: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  onDeleteRecord?: (recordId: number) => void;
  onAddRecord?: () => void;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '72%',
      overflow: 'hidden',
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
    },
    dateText: {
      fontSize: 14,
      color: theme.colors.textTertiary,
    },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    emptyText: {
      fontSize: 15,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      paddingVertical: 40,
    },
    itemCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    itemImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      backgroundColor: theme.colors.borderLight,
    },
    itemImageDeletedOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingVertical: 3,
      alignItems: 'center',
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    },
    itemImageDeletedText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.white,
    },
    itemInfo: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'center',
    },
    itemType: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    itemMeta: {
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    deleteBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // 添加衣服的样式
    addClothingSection: {
      flex: 1,
      marginTop: 8,
    },
    addClothingScroll: {
      flex: 1,
    },
    addClothingFooter: {
      paddingTop: 10,
      paddingBottom: 20,
    },
    addClothingTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    clothingPickerItem: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      alignItems: 'center',
    },
    clothingPickerImage: {
      width: 50,
      height: 50,
      borderRadius: 8,
      backgroundColor: theme.colors.borderLight,
    },
    clothingPickerInfo: {
      flex: 1,
      marginLeft: 10,
    },
    clothingPickerType: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    clothingPickerMeta: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    clothingPickerCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    clothingPickerCheckActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    confirmAddBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    confirmAddBtnDisabled: {
      backgroundColor: theme.colors.border,
    },
    confirmAddBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.white,
    },
    closePickerBtn: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    closePickerBtnText: {
      fontSize: 15,
      color: theme.colors.textTertiary,
    },
    // 网格样式
    clothingGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    clothingGridItem: {
      width: '31%',
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderLight,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    clothingGridItemSelected: {
      borderColor: theme.colors.primary,
    },
    clothingGridItemRecorded: {
      opacity: 0.6,
    },
    clothingGridImage: {
      width: '100%',
      height: '100%',
    },
    clothingGridCheck: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    clothingGridCheckRecorded: {
      backgroundColor: theme.colors.success,
    },
    clothingGridOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    clothingGridText: {
      fontSize: 11,
      color: theme.colors.white,
      fontWeight: '500',
    },
    clothingGridCount: {
      fontSize: 10,
      color: theme.colors.white,
      opacity: 0.8,
    },
    // Mode tabs
    modeTabs: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      padding: 3,
      marginBottom: 14,
    },
    modeTab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    modeTabActive: {
      backgroundColor: theme.colors.card,
      ...theme.shadows.sm,
    },
    modeTabText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.textTertiary,
    },
    modeTabTextActive: {
      color: theme.colors.text,
      fontWeight: '600',
    },
    // Filter chips
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 6,
    },
    filterLabel: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      fontWeight: '500',
      marginRight: 2,
    },
    filterChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterChipText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    filterChipTextActive: {
      color: theme.colors.white,
      fontWeight: '500',
    },
  });

export function WearCalendarSheet({
  visible,
  onClose,
  date,
  onDeleteRecord,
  onAddRecord,
}: WearCalendarSheetProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const clothing = useWardrobeStore(s => s.clothing);
  const trashClothing = useWardrobeStore(s => s.trashClothing);
  const soldClothing = useWardrobeStore(s => s.soldClothing);
  const outfits = useWardrobeStore(s => s.outfits);
  const { addWearRecords } = useWardrobeStore();
  const customSeasons = useCustomOptionsStore(s => s.seasons);
  const customStyles = useCustomOptionsStore(s => s.styles);

  // 合并所有衣物来源，用于查找穿着记录关联的衣物
  const allClothingMap = useMemo(() => {
    const map = new Map<number, ClothingItem>();
    for (const c of clothing) map.set(c.id, c);
    for (const c of trashClothing) map.set(c.id, c);
    for (const c of soldClothing) map.set(c.id, c);
    return map;
  }, [clothing, trashClothing, soldClothing]);

  const activeIds = useMemo(() => new Set(clothing.map(c => c.id)), [clothing]);
  const trashIds = useMemo(() => new Set(trashClothing.map(c => c.id)), [trashClothing]);
  const soldIds = useMemo(() => new Set(soldClothing.map(c => c.id)), [soldClothing]);

  const [records, setRecords] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'items' | 'outfits'>('items');
  const [selectedAddIds, setSelectedAddIds] = useState<number[]>([]);
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<number[]>([]);
  const [filterSeason, setFilterSeason] = useState<string>('全部');
  const [filterStyle, setFilterStyle] = useState<string>('全部');

  useEffect(() => {
    if (visible && date) {
      setShowAddPicker(false);
      loadRecords();
    }
  }, [visible, date]);

  useEffect(() => {
    if (!showAddPicker) {
      setSelectedAddIds([]);
      setSelectedOutfitIds([]);
      setPickerMode('items');
      setFilterSeason('全部');
      setFilterStyle('全部');
    }
  }, [showAddPicker]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const wearRecords = await wearRecordsDb.getWearRecordsByDate(date);
      const clothingItems = wearRecords
        .map(r => allClothingMap.get(r.clothingId) || {
          id: r.clothingId,
          imageUri: r.clothingThumbnailUri || '',
          thumbnailUri: r.clothingThumbnailUri || '',
          originalImageUri: '',
          type: r.clothingType || '已删除',
          parentType: '',
          color: '',
          brand: '',
          size: '',
          remarks: '',
          seasons: [],
          occasions: [],
          styles: [],
          purchaseDate: '',
          price: 0,
          wearCount: 0,
          lastWornAt: null,
          createdAt: '',
          wardrobeId: 0,
        } as ClothingItem);
      setRecords(clothingItems);
    } catch (error) {
      console.error('Failed to load wear records:', error);
    }
    setLoading(false);
  };

  const handleDelete = (clothingId: number) => {
    Alert.alert(
      '取消穿着记录',
      '确定要取消这件衣物在该日期的穿着记录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            try {
              const wearRecords = await wearRecordsDb.getWearRecordsByDate(date);
              const record = wearRecords.find(r => r.clothingId === clothingId);
              if (record && onDeleteRecord) {
                await onDeleteRecord(record.id);
              }
              loadRecords();
            } catch (error) {
              console.error('Failed to delete wear record:', error);
            }
          },
        },
      ]
    );
  };

  // 已记录的单品 ID 集合
  const recordedIds = useMemo(() => new Set(records.map(r => r.id)), [records]);

  // 已记录的搭配 ID 集合：搭配中所有衣物都已记录则为已记录
  const recordedOutfitIds = useMemo(() => {
    return new Set(
      outfits
        .filter(o => o.itemIds.length > 0 && o.itemIds.every(cid => recordedIds.has(cid)))
        .map(o => o.id)
    );
  }, [outfits, recordedIds]);

  const filteredClothing = useMemo(() => {
    return clothing.filter(item => {
      if (filterSeason !== '全部' && !item.seasons?.includes(filterSeason)) return false;
      if (filterStyle !== '全部' && !item.styles?.includes(filterStyle)) return false;
      return true;
    });
  }, [clothing, filterSeason, filterStyle]);

  const filteredOutfits = useMemo(() => {
    return outfits.filter(outfit => {
      if (filterSeason !== '全部' && !outfit.seasons?.includes(filterSeason)) return false;
      if (filterStyle !== '全部' && !outfit.styles?.includes(filterStyle)) return false;
      return true;
    });
  }, [outfits, filterSeason, filterStyle]);

  const toggleAddSelect = (id: number) => {
    setSelectedAddIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirmAdd = async () => {
    let clothingIds: number[];

    if (pickerMode === 'outfits') {
      if (selectedOutfitIds.length === 0) return;
      // 从选中的搭配中收集所有衣物ID，去重
      const idSet = new Set<number>();
      for (const oid of selectedOutfitIds) {
        const outfit = outfits.find(o => o.id === oid);
        if (outfit) {
          for (const cid of outfit.itemIds) {
            idSet.add(cid);
          }
        }
      }
      clothingIds = [...idSet];
    } else {
      if (selectedAddIds.length === 0) return;
      clothingIds = selectedAddIds;
    }

    try {
      await addWearRecords(clothingIds, date);
      setSelectedAddIds([]);
      setSelectedOutfitIds([]);
      setShowAddPicker(false);
      loadRecords();
      onAddRecord?.();
    } catch (error) {
      console.error('Failed to add wear records:', error);
      Alert.alert('添加失败');
    }
  };

  const renderItem = ({ item }: { item: ClothingItem }) => {
    const imageUri = item.thumbnailUri || item.imageUri;
    const isActive = activeIds.has(item.id);
    const isTrash = trashIds.has(item.id);
    const isSold = soldIds.has(item.id);
    const isDeleted = !isActive;
    const deleteLabel = isTrash ? '已删除' : isSold ? '已售出' : '已删除';
    const deleteHint = isTrash ? '该单品在废衣篓中' : isSold ? '该单品已售出' : '该单品已被彻底删除';
    return (
      <View style={[styles.itemCard, isDeleted && { opacity: 0.75 }]}>
        <View style={{ overflow: 'hidden', borderRadius: 8 }}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          ) : isDeleted ? (
            <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.borderLight }]}>
              <Ionicons name={isTrash ? 'trash-outline' : isSold ? 'card-outline' : 'trash-outline'} size={22} color={theme.colors.textTertiary} />
              <Text style={{ fontSize: 9, color: theme.colors.textTertiary, marginTop: 2 }}>{deleteLabel}</Text>
            </View>
          ) : (
            <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.borderLight }]}>
              <Ionicons name="shirt-outline" size={24} color={theme.colors.border} />
            </View>
          )}
          {isDeleted && imageUri ? (
            <View style={styles.itemImageDeletedOverlay}>
              <Text style={styles.itemImageDeletedText}>{deleteLabel}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.itemInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.itemType, isDeleted && { color: theme.colors.textTertiary }]}>{item.type}</Text>
            {isDeleted && (
              <View style={{ backgroundColor: theme.colors.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: theme.colors.white }}>{deleteLabel}</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemMeta}>
            {isDeleted ? deleteHint : (item.brand || item.color || '无品牌')}
          </Text>
        </View>
        {!isDeleted && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="remove-circle-outline" size={22} color={theme.colors.warning} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    }
    return dateStr;
  };

  const hasSelection = pickerMode === 'outfits' ? selectedOutfitIds.length > 0 : selectedAddIds.length > 0;
  const selectionCount = pickerMode === 'outfits' ? selectedOutfitIds.length : selectedAddIds.length;

  const renderAddPicker = () => (
    <View style={styles.addClothingSection}>
      {/* Filter chips */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>季节</Text>
        {['全部', ...customSeasons].map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, filterSeason === s && styles.filterChipActive]}
            onPress={() => setFilterSeason(s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, filterSeason === s && styles.filterChipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>风格</Text>
        {['全部', ...customStyles].map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, filterStyle === s && styles.filterChipActive]}
            onPress={() => setFilterStyle(s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, filterStyle === s && styles.filterChipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.addClothingScroll} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, pickerMode === 'items' && styles.modeTabActive]}
            onPress={() => setPickerMode('items')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeTabText, pickerMode === 'items' && styles.modeTabTextActive]}>单品</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, pickerMode === 'outfits' && styles.modeTabActive]}
            onPress={() => setPickerMode('outfits')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeTabText, pickerMode === 'outfits' && styles.modeTabTextActive]}>搭配</Text>
          </TouchableOpacity>
        </View>

        {pickerMode === 'items' ? (
          filteredClothing.length === 0 ? (
            <Text style={styles.emptyText}>没有可添加的衣服</Text>
          ) : (
            <View style={styles.clothingGrid}>
              {filteredClothing.map(item => {
                const isRecorded = recordedIds.has(item.id);
                const isSelected = selectedAddIds.includes(item.id);
                const imageUri = item.thumbnailUri || item.imageUri;
                return (
                  <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.clothingGridItem,
                    isSelected && styles.clothingGridItemSelected,
                    isRecorded && styles.clothingGridItemRecorded,
                  ]}
                  onPress={() => {
                    if (isRecorded) return;
                    toggleAddSelect(item.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.clothingGridImage}
                    resizeMode="cover"
                  />
                  {(isSelected || isRecorded) && (
                    <View style={[
                      styles.clothingGridCheck,
                      isRecorded && !isSelected && styles.clothingGridCheckRecorded,
                    ]}>
                      <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                    </View>
                  )}
                  <View style={styles.clothingGridOverlay}>
                    <Text style={styles.clothingGridText} numberOfLines={1}>
                      {item.type}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
              })}
            </View>
          )
        ) : (
          filteredOutfits.length === 0 ? (
            <Text style={styles.emptyText}>还没有搭配，请先创建搭配</Text>
          ) : (
            <View style={styles.clothingGrid}>
              {filteredOutfits.map(outfit => {
                const isRecorded = recordedOutfitIds.has(outfit.id);
                const isSelected = selectedOutfitIds.includes(outfit.id);
                return (
                  <TouchableOpacity
                    key={outfit.id}
                    style={[
                      styles.clothingGridItem,
                      isSelected && styles.clothingGridItemSelected,
                      isRecorded && styles.clothingGridItemRecorded,
                    ]}
                    onPress={() => {
                      if (isRecorded) return;
                      setSelectedOutfitIds(prev =>
                        prev.includes(outfit.id) ? prev.filter(id => id !== outfit.id) : [...prev, outfit.id]
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    {outfit.thumbnailUri ? (
                      <Image
                        source={{ uri: outfit.thumbnailUri }}
                        style={styles.clothingGridImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.clothingGridImage, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="shirt-outline" size={24} color={theme.colors.textTertiary} />
                      </View>
                    )}
                    {(isSelected || isRecorded) && (
                      <View style={[
                        styles.clothingGridCheck,
                        isRecorded && !isSelected && styles.clothingGridCheckRecorded,
                      ]}>
                        <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                      </View>
                    )}
                    <View style={styles.clothingGridOverlay}>
                      <Text style={styles.clothingGridText} numberOfLines={1}>
                        {outfit.name}
                      </Text>
                      <Text style={styles.clothingGridCount}>{outfit.itemIds?.length || 0}件</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        )}
      </ScrollView>

      <View style={styles.addClothingFooter}>
        <TouchableOpacity
          style={[
            styles.confirmAddBtn,
            !hasSelection && styles.confirmAddBtnDisabled
          ]}
          onPress={handleConfirmAdd}
          disabled={!hasSelection}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmAddBtnText}>
            添加 {selectionCount > 0 ? `${selectionCount} ${pickerMode === 'outfits' ? '套搭配' : '件'}` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closePickerBtn}
          onPress={() => setShowAddPicker(false)}
          activeOpacity={0.7}
        >
          <Text style={styles.closePickerBtnText}>取消</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>穿着记录</Text>
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </View>
            {!showAddPicker && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setShowAddPicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color={theme.colors.white} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={{ marginLeft: 12 }}>
              <Ionicons name="close" size={22} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {showAddPicker ? (
              renderAddPicker()
            ) : records.length === 0 ? (
              <>
                <Text style={styles.emptyText}>该日期暂无穿着记录</Text>
                <TouchableOpacity
                  style={[styles.confirmAddBtn, { marginTop: 16 }]}
                  onPress={() => setShowAddPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmAddBtnText}>添加衣服</Text>
                </TouchableOpacity>
              </>
            ) : (
              <FlatList
                data={records}
                renderItem={renderItem}
                keyExtractor={item => String(item.id)}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
