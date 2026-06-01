import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClothingItem, OutfitRecommendation } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { OutfitConfirmModal } from './OutfitConfirmModal';

interface Props {
  recommendation: OutfitRecommendation;
  allClothing: ClothingItem[];
  onRefresh: () => void;
  onWear: (mode: 'append' | 'replace', items?: ClothingItem[]) => void;
  onCalendar: () => void;
  onSaveAsOutfit: (items?: ClothingItem[]) => void;
  onReplaceItem: (index: number, newItem: ClothingItem) => void;
  todayThumbnails: Array<{ uri: string; type: string; id: number }>;
  recTotal: number;
  recIndex: number;
  onSwitchToRecommend: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_PADDING = 20;
const GAP = 8;
const CONTENT_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2 - CARD_PADDING * 2;

const GRID_W = Math.floor(CONTENT_WIDTH * 0.72);
const REPLACE_W = CONTENT_WIDTH - GRID_W - GAP;
const CELL_W = (GRID_W - GAP) / 2;
const CELL_H = CELL_W * 1.1;
const GRID_H = CELL_H * 2 + 5;

const SCENE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  '工作': { icon: 'briefcase-outline', color: '#5B7BA0', bg: '#EDF2F8', label: '工作' },
  '运动': { icon: 'fitness-outline', color: '#8BA888', bg: '#EDF5EC', label: '运动' },
  '约会': { icon: 'heart-outline', color: '#D4A99A', bg: '#FDF0ED', label: '约会' },
  '宅家': { icon: 'home-outline', color: '#C4B098', bg: '#F7F2EC', label: '宅家' },
};

const SLOT_CATEGORIES = ['上装', '包包/配饰', '下装', '鞋'] as const;

function inferCategory(type: string): string {
  if (['T恤', '衬衫', '卫衣', '毛衣', '针织衫', 'Polo衫', 'POLO衫', '背心', '打底衫', '长袖', '短袖', '雪纺衫', '马甲'].includes(type)) return '上装';
  if (['连衣裙', '连体裤', '吊带裙', '背带裙', '长裙', '短裙', '旗袍'].includes(type)) return '连衣裙';
  if (['牛仔裤', '休闲裤', '西裤', '运动裤', '短裤', '工装裤', '阔腿裤', '直筒裤', '九分裤', '裙子', '半身裙', '长裤'].includes(type)) return '下装';
  if (['外套', '夹克', '风衣', '大衣', '羽绒服', '棉服', '西装', '棒球服', '牛仔外套', '皮衣', '针织开衫', '派克大衣'].includes(type)) return '外套';
  if (['运动鞋', '休闲鞋', '皮鞋', '靴子', '凉鞋', '帆布鞋', '高跟鞋', '拖鞋', '板鞋', '乐福鞋', '马丁靴'].includes(type)) return '鞋';
  if (['包包', '背包', '手提包', '斜挎包', '双肩包', '单肩包', '钱包', '腰包'].includes(type)) return '包包';
  if (['帽子', '围巾', '手套', '腰带', '眼镜', '首饰', '手表', '项链', '耳环', '手链', '戒指'].includes(type)) return '配饰';
  return '上装';
}

function slotFilter(cat: string): (item: ClothingItem) => boolean {
  return (item: ClothingItem) => {
    const c = item.parentType || inferCategory(item.type);
    if (cat === '上装') return c === '上装' || c === '连衣裙' || c === '外套';
    if (cat === '包包/配饰') return c === '包包' || c === '配饰';
    if (cat === '下装') return c === '下装';
    if (cat === '鞋') return c === '鞋';
    return false;
  };
}

const PICKER_COLS = 4;
const PICKER_ITEM_SIZE = (SCREEN_WIDTH - 80 - (PICKER_COLS - 1) * 8) / PICKER_COLS;

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: CARD_PADDING,
      marginHorizontal: CARD_MARGIN,
      marginTop: 16,
      overflow: 'visible' as const,
      ...theme.shadows.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    titleIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    titleGroup: { gap: 2 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.3,
    },
    sceneBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      gap: 2,
    },
    sceneBadgeText: { fontSize: 10, fontWeight: '600' },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    scoreText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    reasonText: {
      fontSize: 11,
      color: theme.colors.textTertiary,
    },
    headerRight: {
      flexDirection: 'row',
      gap: 8,
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerBtnActive: {
      backgroundColor: theme.colors.primary + '20',
    },
    refreshBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingHorizontal: 4,
      paddingVertical: 1,
      minWidth: 18,
      alignItems: 'center',
    },
    refreshBadgeText: {
      fontSize: 8,
      fontWeight: '700',
      color: theme.colors.white,
    },
    stampWrap: {
      position: 'absolute',
      top: 4,
      right: 60,
      zIndex: 10,
    },
    stampOuter: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 2,
      borderColor: '#C4545A',
      borderRadius: 5,
      backgroundColor: 'rgba(255, 246, 246, 0.88)',
      transform: [{ rotate: '-10deg' }],
    },
    stampInner: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: '#C4545A',
      borderRadius: 3,
      opacity: 0.5,
    },
    stampText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#C4545A',
      letterSpacing: 2,
    },
    body: {
      flexDirection: 'row',
      gap: GAP,
      height: GRID_H,
    },
    grid: {
      width: GRID_W,
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 5,
      rowGap: 5,
    },
    cell: {
      width: CELL_W,
      height: CELL_H,
      borderRadius: 12,
      overflow: 'hidden',
    },
    cellImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    cellEmpty: {
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      backgroundColor: theme.colors.background,
    },
    cellEmptyLabel: {
      fontSize: 10,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    cellRemove: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    replaceCol: {
      width: REPLACE_W,
      justifyContent: 'center',
      gap: 6,
    },
    replaceTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginBottom: 2,
    },
    replaceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
    },
    replaceItemThumb: {
      width: 32,
      height: 32,
      borderRadius: 8,
      resizeMode: 'contain',
    },
    replaceArrow: {
      padding: 2,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
    },
    previewActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    previewLeftActions: {
      flexDirection: 'row',
      gap: 8,
    },
    previewTextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
    },
    previewTextBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    previewGridFull: {
      width: CONTENT_WIDTH,
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 5,
      rowGap: 5,
    },
    wearButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: theme.colors.primary,
      paddingVertical: 13,
      borderRadius: 14,
      ...theme.shadows.md,
    },
    wearButtonDisabled: { opacity: 0.5 },
    wearButtonText: {
      color: theme.colors.white,
      fontSize: 14,
      fontWeight: '700',
    },
    iconBtn: {
      width: 46,
      height: 46,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
    },
    iconBtnPrimary: {
      borderColor: theme.colors.primary + '40',
      backgroundColor: theme.colors.primary + '08',
    },
    // ── Picker Sheet ──
    pickerOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    pickerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    pickerSheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 50,
      maxHeight: '60%',
    },
    pickerHandle: {
      width: 36,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
    },
    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    pickerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    pickerClose: {
      padding: 4,
    },
    pickerGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 20,
    },
    pickerItem: {
      width: PICKER_ITEM_SIZE,
      height: PICKER_ITEM_SIZE,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    pickerItemSelected: {
      borderColor: theme.colors.primary,
    },
    pickerItemImg: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    pickerEmpty: {
      width: PICKER_ITEM_SIZE,
      height: PICKER_ITEM_SIZE,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
  });

export function OutfitRecommendationCard({
  recommendation,
  allClothing,
  onRefresh,
  onWear,
  onCalendar,
  onSaveAsOutfit,
  onReplaceItem,
  todayThumbnails,
  recTotal,
  recIndex,
  onSwitchToRecommend,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { items, scene, reason, score } = recommendation;
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [diyMode, setDiyMode] = useState(false);
  const [recMode, setRecMode] = useState(false);
  const [diySlots, setDiySlots] = useState<(ClothingItem | null)[]>([null, null, null, null]);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  const hasTodayRecord = todayThumbnails.length > 0;
  const previewMode = hasTodayRecord && !diyMode && !recMode;

  const activeItems = diyMode ? diySlots.filter(Boolean) as ClothingItem[] : items;
  const todayIdSet = useMemo(() => new Set(todayThumbnails.map(t => t.id)), [todayThumbnails]);
  const isDuplicate = hasTodayRecord && activeItems.length > 0 && activeItems.every(i => todayIdSet.has(i.id));

  const handlePressWear = () => {
    if (activeItems.length < 2) {
      Alert.alert('提示', '请至少选择 2 件单品');
      return;
    }
    if (isDuplicate) {
      Alert.alert('已记录', '这套搭配和今天已记录的一致，无需重复记录');
      return;
    }
    setShowModal(true);
  };

  const handleWear = async (mode: 'append' | 'replace') => {
    setShowModal(false);
    setIsLoading(true);
    try {
      const wearItems = diyMode ? diySlots.filter(Boolean) as ClothingItem[] : undefined;
      await onWear(mode, wearItems);
    } finally {
      setIsLoading(false);
    }
  };

  // 推荐模式的网格
  const gridItems = useMemo(() => {
    const slots: (ClothingItem | null)[] = [null, null, null, null];
    const filtered = items.slice(0, 4);
    if (filtered.length === 4) {
      const extras: ClothingItem[] = [];
      for (const item of filtered) {
        const cat = item.parentType || inferCategory(item.type);
        if ((cat === '上装' || cat === '连衣裙') && !slots[0]) slots[0] = item;
        else if ((cat === '包包' || cat === '配饰') && !slots[1]) slots[1] = item;
        else if (cat === '下装' && !slots[2]) slots[2] = item;
        else if (cat === '鞋' && !slots[3]) slots[3] = item;
        else extras.push(item);
      }
      let ei = 0;
      for (let i = 0; i < 4 && ei < extras.length; i++) {
        if (!slots[i]) slots[i] = extras[ei++];
      }
    } else {
      const order = [0, 2, 1, 3];
      for (let i = 0; i < filtered.length; i++) {
        slots[order[i]] = filtered[i];
      }
    }
    return slots;
  }, [items]);

  const alternatives = useMemo(() => {
    return gridItems.map(item => {
      if (!item) return [];
      const cat = item.parentType || inferCategory(item.type);
      return allClothing.filter(c =>
        c.id !== item.id && (c.parentType || inferCategory(c.type)) === cat,
      );
    });
  }, [gridItems, allClothing]);

  const handleReplace = (slotIndex: number) => {
    const item = gridItems[slotIndex];
    if (!item) return;
    const alts = alternatives[slotIndex];
    if (!alts || alts.length === 0) {
      Alert.alert('没有更多', `没有其他同类型的${item.type}可替换`);
      return;
    }
    const pick = alts[Math.floor(Math.random() * alts.length)];
    const originalIdx = items.indexOf(item);
    onReplaceItem(originalIdx >= 0 ? originalIdx : slotIndex, pick);
  };

  const enterDiy = () => {
    setDiySlots([null, null, null, null]);
    setDiyMode(true);
  };

  const exitDiy = () => {
    setDiyMode(false);
    setDiySlots([null, null, null, null]);
  };

  const openPicker = (slot: number) => setPickerSlot(slot);
  const closePicker = () => setPickerSlot(null);

  const pickItem = (item: ClothingItem) => {
    if (pickerSlot === null) return;
    setDiySlots(prev => {
      const next = [...prev];
      // 如果这个 item 已经在别的 slot 中，先清掉
      const existingIdx = next.findIndex(s => s?.id === item.id);
      if (existingIdx !== -1 && existingIdx !== pickerSlot) next[existingIdx] = null;
      next[pickerSlot] = item;
      return next;
    });
    closePicker();
  };

  const removeDiySlot = (slot: number) => {
    setDiySlots(prev => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
  };

  // Picker 数据
  const pickerItems = useMemo(() => {
    if (pickerSlot === null) return [];
    return allClothing.filter(slotFilter(SLOT_CATEGORIES[pickerSlot]));
  }, [pickerSlot, allClothing]);

  const displayGrid = diyMode ? diySlots : gridItems;
  const sceneCfg = SCENE_CONFIG[scene] || SCENE_CONFIG['工作'];

  // Preview mode: show today's worn items in full-width grid
  const previewItems = useMemo(() => {
    return todayThumbnails.map(t => allClothing.find(c => c.id === t.id)).filter(Boolean) as ClothingItem[];
  }, [todayThumbnails, allClothing]);

  const enterRecommend = () => {
    setRecMode(true);
    onSwitchToRecommend();
  };

  return (
    <View style={styles.container}>
      {/* ── Preview Mode ── */}
      {previewMode ? (
        <>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.titleIcon}>
                <Ionicons name="checkmark-circle" size={15} color={theme.colors.primary} />
              </View>
              <View style={styles.titleGroup}>
                <Text style={styles.title}>今日穿搭</Text>
                <Text style={styles.reasonText}>已记录 {todayThumbnails.length} 件</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnPrimary]} onPress={onCalendar} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.previewGridFull}>
            {previewItems.slice(0, 4).map((item, i) => (
              <View key={item.id} style={styles.cell}>
                <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.cellImage} />
              </View>
            ))}
          </View>

          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.previewTextBtn} onPress={enterRecommend} activeOpacity={0.7}>
              <Ionicons name="refresh" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.previewTextBtnText}>换一套</Text>
            </TouchableOpacity>
            <View style={styles.previewLeftActions}>
              <TouchableOpacity style={styles.previewTextBtn} onPress={enterDiy} activeOpacity={0.7}>
                <Ionicons name="color-wand-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.previewTextBtnText}>自己搭</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => onSaveAsOutfit()} activeOpacity={0.7}>
                <Ionicons name="bookmark-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        <>
          {!diyMode && hasTodayRecord && (
            <View style={styles.stampWrap} pointerEvents="none">
              <View style={styles.stampOuter}>
                <View style={styles.stampInner}>
                  <Text style={styles.stampText}>今日已记录</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.titleIcon}>
                <Ionicons
                  name={diyMode ? 'color-wand-outline' : 'sparkles'}
                  size={15}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.titleGroup}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{diyMode ? '自己搭配' : '今日推荐'}</Text>
                  {!diyMode && (
                    <View style={[styles.sceneBadge, { backgroundColor: sceneCfg.bg }]}>
                      <Ionicons name={sceneCfg.icon as any} size={9} color={sceneCfg.color} />
                      <Text style={[styles.sceneBadgeText, { color: sceneCfg.color }]}>{sceneCfg.label}</Text>
                    </View>
                  )}
                </View>
                {!diyMode && (
                  <View style={styles.subtitleRow}>
                    <Text style={styles.scoreText}>{score}分</Text>
                    <Text style={styles.reasonText} numberOfLines={1}>{reason}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.headerRight}>
              {diyMode ? (
                <TouchableOpacity style={[styles.headerBtn, styles.headerBtnActive]} onPress={exitDiy} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              ) : (
                <>
                  {hasTodayRecord && (
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setRecMode(false)} activeOpacity={0.7}>
                      <Ionicons name="arrow-back" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.headerBtn} onPress={enterDiy} activeOpacity={0.7}>
                    <Ionicons name="color-wand-outline" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.headerBtn} onPress={onRefresh} activeOpacity={0.7}>
                    <Ionicons name="refresh" size={18} color={theme.colors.textSecondary} />
                    <View style={styles.refreshBadge}>
                      <Text style={styles.refreshBadgeText}>{recIndex + 1}/{recTotal}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* ── 左网格 + 右替换栏 ── */}
          <View style={styles.body}>
            <View style={styles.grid}>
              {displayGrid.map((item, i) => {
                if (diyMode) {
                  if (item) {
                    return (
                      <View key={item.id} style={[styles.cell, { backgroundColor: theme.colors.background }]}>
                        <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.cellImage} />
                        <TouchableOpacity style={styles.cellRemove} onPress={() => removeDiySlot(i)}>
                          <Ionicons name="close" size={11} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={`diy-${i}`}
                      style={[styles.cell, styles.cellEmpty]}
                      onPress={() => openPicker(i)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={20} color={theme.colors.textTertiary} />
                      <Text style={styles.cellEmptyLabel}>{SLOT_CATEGORIES[i]}</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <View key={item?.id ?? `empty-${i}`} style={styles.cell}>
                    {item && (
                      <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.cellImage} />
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.replaceCol}>
              {diyMode ? (
                <>
                  <Text style={styles.replaceTitle}>已选 {diySlots.filter(Boolean).length} 件</Text>
                  {SLOT_CATEGORIES.map((cat, i) => {
                    const item = diySlots[i];
                    return (
                      <TouchableOpacity
                        key={i}
                        style={styles.replaceItem}
                        onPress={() => openPicker(i)}
                        activeOpacity={0.7}
                      >
                        {item ? (
                          <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.replaceItemThumb} />
                        ) : (
                          <View style={[styles.replaceItemThumb, { backgroundColor: theme.colors.background, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="add" size={14} color={theme.colors.textTertiary} />
                          </View>
                        )}
                        <View style={styles.replaceArrow}>
                          <Ionicons name={item ? 'swap-horizontal' : 'add-circle-outline'} size={12} color={theme.colors.textTertiary} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <>
                  <Text style={styles.replaceTitle}>换一件</Text>
                  {gridItems.map((item, i) => {
                    if (!item) return null;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.replaceItem}
                        onPress={() => handleReplace(i)}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.replaceItemThumb} />
                        <View style={styles.replaceArrow}>
                          <Ionicons name="refresh" size={12} color={theme.colors.textTertiary} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>
          </View>

          {/* ── 操作按钮 ── */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.wearButton, isLoading && styles.wearButtonDisabled]}
              onPress={handlePressWear}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-outline" size={16} color={theme.colors.white} />
              <Text style={styles.wearButtonText}>{isLoading ? '记录中...' : '就穿这套'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => onSaveAsOutfit(diyMode ? diySlots.filter(Boolean) as ClothingItem[] : undefined)} activeOpacity={0.7}>
              <Ionicons name="bookmark-outline" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnPrimary]} onPress={onCalendar} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      <OutfitConfirmModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleWear}
        todayThumbnails={todayThumbnails}
        recItems={diyMode ? diySlots.filter(Boolean) as ClothingItem[] : items}
      />

      {/* ── 单品选择器 ── */}
      <Modal visible={pickerSlot !== null} animationType="slide" transparent onRequestClose={closePicker}>
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={closePicker} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>选择{pickerSlot !== null ? SLOT_CATEGORIES[pickerSlot] : ''}</Text>
              <TouchableOpacity style={styles.pickerClose} onPress={closePicker}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
              <View style={styles.pickerGrid}>
                {/* 清空选项 */}
                {diySlots[pickerSlot!] && (
                  <TouchableOpacity
                    style={styles.pickerEmpty}
                    onPress={() => { removeDiySlot(pickerSlot!); closePicker(); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove-circle-outline" size={20} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                )}
                {pickerItems.map(item => {
                  const selected = diySlots.some(s => s?.id === item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                      onPress={() => pickItem(item)}
                      activeOpacity={0.7}
                    >
                      <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.pickerItemImg} />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
