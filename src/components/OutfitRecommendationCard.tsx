import React, { useState, useMemo } from 'react';
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
import { ClothingItem, OutfitRecommendation } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { OutfitConfirmModal } from './OutfitConfirmModal';

interface Props {
  recommendation: OutfitRecommendation;
  allClothing: ClothingItem[];
  onRefresh: () => void;
  onWear: (mode: 'append' | 'replace') => void;
  onCalendar: () => void;
  onSaveAsOutfit: () => void;
  onReplaceItem: (index: number, newItem: ClothingItem) => void;
  todayThumbnails: Array<{ uri: string; type: string; id: number }>;
  recTotal: number;
  recIndex: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_PADDING = 20;
const GAP = 8;
const CONTENT_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2 - CARD_PADDING * 2;

// 左 72% 网格 + 右 28% 替换栏
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
    // ── Header ──
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
    headerRefresh: {
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
    // ── 印章 ──
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
    // ── 主体：左网格 + 右替换栏 ──
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
    // ── 右侧替换栏 ──
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
    // ── 底部操作区 ──
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
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { items, scene, reason, score } = recommendation;
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const hasTodayRecord = todayThumbnails.length > 0;
  const todayIdSet = useMemo(() => new Set(todayThumbnails.map(t => t.id)), [todayThumbnails]);
  const isDuplicate = hasTodayRecord && items.length > 0 && items.every(i => todayIdSet.has(i.id));

  const handlePressWear = () => {
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
      await onWear(mode);
    } finally {
      setIsLoading(false);
    }
  };

  // 4 个单品时按品类固定位置，不足 4 个时按左列优先顺序填充
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

  return (
    <View style={styles.container}>
      {hasTodayRecord && (
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
        <TouchableOpacity style={styles.headerRefresh} onPress={onRefresh} activeOpacity={0.7}>
          <Ionicons name="refresh" size={18} color={theme.colors.textSecondary} />
          <View style={styles.refreshBadge}>
            <Text style={styles.refreshBadgeText}>{recIndex + 1}/{recTotal}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── 左网格 + 右替换栏 ── */}
      <View style={styles.body}>
        <View style={styles.grid}>
          {gridItems.map((item, i) => (
            <View key={item?.id ?? `empty-${i}`} style={styles.cell}>
              {item && (
                <Image
                  source={{ uri: item.thumbnailUri || item.imageUri }}
                  style={styles.cellImage}
                />
              )}
            </View>
          ))}
        </View>

        <View style={styles.replaceCol}>
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
                <Image
                  source={{ uri: item.thumbnailUri || item.imageUri }}
                  style={styles.replaceItemThumb}
                />
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
          <Ionicons name="checkmark-outline" size={16} color={theme.colors.white} />
          <Text style={styles.wearButtonText}>{isLoading ? '记录中...' : '就穿这套'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={onSaveAsOutfit} activeOpacity={0.7}>
          <Ionicons name="bookmark-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.iconBtn, styles.iconBtnPrimary]} onPress={onCalendar} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <OutfitConfirmModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleWear}
        todayThumbnails={todayThumbnails}
        recItems={items}
      />
    </View>
  );
}
