import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ClothingItem, Outfit, OutfitRecommendation } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { OutfitConfirmModal } from './OutfitConfirmModal';
import { AttributeTipIcon } from './AttributeTipBanner';
import { AttributeTip } from '../services/attributeTips';

interface Props {
  recommendation: OutfitRecommendation;
  allClothing: ClothingItem[];
  outfits: Outfit[];
  onRefresh: () => void;
  onWear: (mode: 'append' | 'replace', items?: ClothingItem[]) => void;
  onSaveAsOutfit: (items?: ClothingItem[]) => void;
  onReplaceItem: (index: number, newItem: ClothingItem) => void;
  todayWornIds: number[];
  recTotal: number;
  recIndex: number;
  attributeTips?: AttributeTip[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_PAD = 14;
const GAP = 8;

const CONTENT_W = SCREEN_WIDTH - CARD_MARGIN * 2 - CARD_PAD * 2;
const GRID_W = Math.floor(CONTENT_W * 0.72);
const REPLACE_W = CONTENT_W - GRID_W - GAP;
const CELL_W = (GRID_W - GAP) / 2;
const CELL_H = CELL_W * 1.1;

const SCENE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  '工作': { icon: 'briefcase-outline', color: '#5B7BA0', bg: '#EDF2F8', label: '工作' },
  '运动': { icon: 'fitness-outline', color: '#8BA888', bg: '#EDF5EC', label: '运动' },
  '约会': { icon: 'heart-outline', color: '#D4A99A', bg: '#FDF0ED', label: '约会' },
  '宅家': { icon: 'home-outline', color: '#C4B098', bg: '#F7F2EC', label: '宅家' },
};


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

const recDims = {
  bodyH: CELL_H * 2 + 5,
  gridW: GRID_W,
  replaceW: REPLACE_W,
  cellW: CELL_W,
  cellH: CELL_H,
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: CARD_MARGIN,
      marginTop: 16,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 18,
      padding: CARD_PAD,
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
    body: {
      flexDirection: 'row',
      gap: GAP,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 5,
      rowGap: 5,
    },
    cell: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    cellImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    replaceCol: {
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
    wearButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 13,
      borderRadius: 14,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    wearButtonBg: {
      ...StyleSheet.absoluteFillObject,
    },
    wearButtonDisabled: { opacity: 0.5 },
    wearButtonText: {
      color: theme.colors.white,
      fontSize: 14,
      fontWeight: '700',
    },
    saveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    saveButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    saveButtonTextExists: {
      color: theme.colors.textTertiary,
    },
  });

export function OutfitRecommendationCard({
  recommendation,
  allClothing,
  outfits,
  onRefresh,
  onWear,
  onSaveAsOutfit,
  onReplaceItem,
  todayWornIds,
  recTotal,
  recIndex,
  attributeTips,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { items, scene, reason, score } = recommendation;
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [recExpanded, setRecExpanded] = useState(false);

  const hasTodayRecord = todayWornIds.length > 0;
  // Collapse the recommendation card when today is recorded
  const showFullRec = !hasTodayRecord || recExpanded;

  useEffect(() => {
    setRecExpanded(false);
  }, [hasTodayRecord]);

  const todayIdSet = useMemo(() => new Set(todayWornIds), [todayWornIds]);
  const isDuplicate = hasTodayRecord && items.length > 0 && items.every(i => todayIdSet.has(i.id));

  const isFavorited = useMemo(() => {
    if (items.length === 0) return false;
    const ids = [...items.map(i => i.id)].sort((a, b) => a - b);
    return outfits.some(o => {
      const oIds = [...o.itemIds].sort((a, b) => a - b);
      return oIds.length === ids.length && oIds.every((v, i) => v === ids[i]);
    });
  }, [items, outfits]);

  const handlePressWear = () => {
    if (items.length < 2) {
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
      await onWear(mode, undefined);
    } finally {
      setIsLoading(false);
    }
  };

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

  const sceneCfg = SCENE_CONFIG[scene] || SCENE_CONFIG['工作'];

  // Build todayThumbnails for the modal (from allClothing matching todayWornIds)
  const todayThumbnailsForModal = useMemo(() => {
    return todayWornIds
      .map(id => allClothing.find(c => c.id === id))
      .filter(Boolean)
      .map(c => ({ uri: c!.thumbnailUri, type: c!.type, id: c!.id }));
  }, [todayWornIds, allClothing]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {showFullRec ? (
          <>
            {/* ── Header ── */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.titleIcon}>
                  <Ionicons name="sparkles" size={15} color={theme.colors.primary} />
                </View>
                <View style={styles.titleGroup}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>今日推荐</Text>
                    <View style={[styles.sceneBadge, { backgroundColor: sceneCfg.bg }]}>
                      <Ionicons name={sceneCfg.icon as any} size={9} color={sceneCfg.color} />
                      <Text style={[styles.sceneBadgeText, { color: sceneCfg.color }]}>{sceneCfg.label}</Text>
                    </View>
                  </View>
                  <View style={styles.subtitleRow}>
                    <Text style={styles.scoreText}>{score}分</Text>
                    <Text style={styles.reasonText} numberOfLines={1}>{reason}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.headerRight}>
                {attributeTips && attributeTips.length > 0 && (
                  <AttributeTipIcon tips={attributeTips} />
                )}
                <TouchableOpacity style={styles.headerBtn} onPress={onRefresh} activeOpacity={0.7}>
                  <Ionicons name="refresh" size={18} color={theme.colors.textSecondary} />
                  <View style={styles.refreshBadge}>
                    <Text style={styles.refreshBadgeText}>{recIndex + 1}/{recTotal}</Text>
                  </View>
                </TouchableOpacity>
                {hasTodayRecord && (
                  <TouchableOpacity style={styles.headerBtn} onPress={() => setRecExpanded(false)} activeOpacity={0.7}>
                    <Ionicons name="chevron-up" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Body ── */}
            <View style={[styles.body, { height: recDims.bodyH }]}>
              <View style={[styles.grid, { width: recDims.gridW }]}>
                {gridItems.map((item, i) => (
                  <View key={item?.id ?? `empty-${i}`} style={[styles.cell, { width: recDims.cellW, height: recDims.cellH }]}>
                    {item && (
                      <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.cellImage} />
                    )}
                  </View>
                ))}
              </View>

              <View style={[styles.replaceCol, { width: recDims.replaceW }]}>
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
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.wearButtonBg}
                />
                <Ionicons name="checkmark-outline" size={16} color={theme.colors.white} />
                <Text style={styles.wearButtonText}>{isLoading ? '记录中...' : hasTodayRecord ? '换成这套' : '就穿这套'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={() => onSaveAsOutfit()} activeOpacity={0.7}>
                <Ionicons
                  name={isFavorited ? 'checkmark-circle-outline' : 'add-circle-outline'}
                  size={16}
                  color={isFavorited ? theme.colors.textTertiary : theme.colors.primary}
                />
                <Text style={[styles.saveButtonText, isFavorited && styles.saveButtonTextExists]}>
                  {isFavorited ? '已存在搭配中' : '添加到搭配'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* ── Collapsed: tappable header-only card ── */
          <TouchableOpacity
            onPress={() => setRecExpanded(true)}
            activeOpacity={0.85}
            style={styles.header}
          >
            <View style={styles.headerLeft}>
              <View style={styles.titleIcon}>
                <Ionicons name="sparkles" size={15} color={theme.colors.primary} />
              </View>
              <View style={styles.titleGroup}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>今日推荐</Text>
                  <View style={[styles.sceneBadge, { backgroundColor: sceneCfg.bg }]}>
                    <Ionicons name={sceneCfg.icon as any} size={9} color={sceneCfg.color} />
                    <Text style={[styles.sceneBadgeText, { color: sceneCfg.color }]}>{sceneCfg.label}</Text>
                  </View>
                </View>
                <View style={styles.subtitleRow}>
                  <Text style={styles.scoreText}>{score}分</Text>
                  <Text style={styles.reasonText} numberOfLines={1}>{reason}</Text>
                </View>
              </View>
            </View>
            <View style={styles.headerRight}>
              {attributeTips && attributeTips.length > 0 && (
                <AttributeTipIcon tips={attributeTips} />
              )}
              <View style={styles.headerBtn}>
                <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <OutfitConfirmModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleWear}
        todayThumbnails={todayThumbnailsForModal}
        recItems={items}
      />
    </View>
  );
}
