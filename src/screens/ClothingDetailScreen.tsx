import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { deleteImage } from '../utils/imageUtils';
import { ClothingItem, Outfit } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { DiscardReasonSheet } from '../components/DiscardReasonSheet';
import { SellItemSheet } from '../components/SellItemSheet';
import { EditDiscardReasonSheet } from '../components/EditDiscardReasonSheet';
import { WearCalendarSheet } from '../components/WearCalendarSheet';
import { OutfitWarningModal } from '../components/OutfitWarningModal';
import * as wearRecordsDb from '../db/wearRecords';

type DetailSource = 'wardrobe' | 'trash' | 'sold' | 'draft';
type RouteParams = { ClothingDetail: { id: number; source?: DetailSource } };

function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    '黑色': '#2D2A26', '白色': '#F5F5F0', '灰色': '#9CA3AF',
    '红色': '#C47D5A', '蓝色': '#6B8FA3', '绿色': '#8B9B7A',
    '黄色': '#D4B896', '紫色': '#8B7B9B', '粉色': '#C9A0A0',
    '棕色': '#8B7355', '米色': '#D4C4B0', '橙色': '#C9A06A',
    '青色': '#7AA3A3', '咖啡色': '#6B5B4E', '酒红色': '#8B5A5A',
    '藏青色': '#4A5568', '卡其色': '#B8A88A', '军绿色': '#6B7B5A',
  };
  return colorMap[colorName] || '#9CA3AF';
}

function calcCostPerWear(price: number, wearCount: number): string {
  if (price <= 0 || wearCount <= 0) return '--';
  return `¥${Math.round(price / wearCount)}`;
}

function getDaysAgo(dateStr: string | null): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 7) return `${diff}天前`;
    if (diff < 30) return `${Math.floor(diff / 7)}周前`;
    return `${Math.floor(diff / 30)}月前`;
  } catch {
    return dateStr;
  }
}

// Create styles dynamically based on theme
const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    empty: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textTertiary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 52,
      paddingBottom: 12,
      backgroundColor: theme.colors.background,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
      letterSpacing: 0.3,
    },
    editBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    editBtnPlaceholder: {
      width: 40,
      height: 40,
    },
    scrollView: {
      flex: 1,
    },
    imageSection: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    imageWrapper: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderLight,
      ...theme.shadows.md,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    colorDot: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 4,
      borderColor: theme.colors.white,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    discardCard: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.danger,
      ...theme.shadows.sm,
    },
    soldCard: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.success,
      ...theme.shadows.sm,
    },
    discardCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    discardCardTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    discardIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: theme.colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    discardCardTitleText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      letterSpacing: 1,
    },
    editReasonBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
    },
    editReasonBtnText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      fontWeight: '500',
    },
    discardInfoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    discardInfoItem: {
      minWidth: '40%',
    },
    discardInfoLabel: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginBottom: 4,
      fontWeight: '500',
    },
    discardInfoValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '600',
    },
    infoSection: {
      paddingHorizontal: 20,
      paddingTop: 18,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      backgroundColor: theme.colors.borderLight,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
    },
    tagPrice: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    tagPriceText: {
      fontSize: 14,
      color: theme.colors.white,
      fontWeight: '700',
    },
    tagSeason: {
      backgroundColor: theme.colors.accent,
    },
    tagText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    tagTextSeason: {
      color: theme.colors.white,
    },
    card: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 18,
      ...theme.shadows.sm,
    },
    cardDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 16,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statDivider: {
      width: 1,
      height: 36,
      backgroundColor: theme.colors.border,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    statHighlight: {
      color: theme.colors.accent,
    },
    statLabel: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginTop: 4,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailItem: {
      flex: 1,
      alignItems: 'center',
    },
    detailDivider: {
      width: 1,
      height: 36,
      backgroundColor: theme.colors.border,
    },
    detailLabel: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    remarksCard: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.accent,
    },
    remarksHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    remarksDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.accent,
      marginRight: 8,
    },
    remarksTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textTertiary,
      letterSpacing: 1,
    },
    remarksText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 22,
    },
    // 相关搭配
    relatedSection: {
      marginHorizontal: 20,
      marginTop: 16,
    },
    relatedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    relatedTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    relatedTitleText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    relatedCount: {
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    relatedScroll: {
      gap: 12,
    },
    relatedCard: {
      width: 148,
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    relatedImageWrap: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: theme.colors.borderLight,
    },
    relatedImage: {
      width: '100%',
      height: '100%',
    },
    relatedCardBody: {
      padding: 10,
    },
    relatedCardName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    relatedCardGroup: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    relatedCardCount: {
      fontSize: 11,
      color: theme.colors.primary,
      marginTop: 2,
      fontWeight: '500',
    },
    relatedEmptyCard: {
      width: 148,
      height: 148,
      backgroundColor: theme.colors.borderLight,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    relatedEmptyText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    bottomPadding: {
      height: 100,
    },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 36,
      backgroundColor: theme.colors.card,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
      gap: 8,
    },
    primaryAction: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 14,
      gap: 8,
    },
    primaryActionText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.white,
    },
    secondaryAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.borderLight,
      paddingVertical: 14,
      borderRadius: 14,
      gap: 6,
    },
    secondaryActionText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    iconAction: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: theme.colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    restoreAction: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.success,
      paddingVertical: 14,
      borderRadius: 14,
      gap: 8,
    },
    restoreActionText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.white,
    },
    deleteAction: {
      flex: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.danger,
      paddingVertical: 14,
      borderRadius: 14,
      gap: 8,
    },
    deleteActionText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.white,
    },
  });

export function ClothingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ClothingDetail'>>();
  const { getClothingByIdIncludingAll, moveToTrash, sellClothing, restoreFromTrash, restoreFromSold, permanentDelete, updateClothing, publishDraft, addWearRecord, deleteWearRecord, getOutfitWarningForDeletion } = useWardrobeStore();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // 直接从 store 订阅，不要用本地 state
  const allClothing = useWardrobeStore(s => s.clothing);
  const allTrashClothing = useWardrobeStore(s => s.trashClothing);
  const allSoldClothing = useWardrobeStore(s => s.soldClothing);
  const outfits = useWardrobeStore(s => s.outfits);
  const groups = useWardrobeStore(s => s.groups);

  const item = useMemo(() => {
    return allClothing.find(c => c.id === route.params.id) ||
      allTrashClothing.find(c => c.id === route.params.id) ||
      allSoldClothing.find(c => c.id === route.params.id) || null;
  }, [allClothing, allTrashClothing, allSoldClothing, route.params.id]);

  // 相关搭配
  const relatedOutfits = useMemo(() => {
    if (!item) return [];
    return outfits
      .filter(o => o.itemIds.includes(item.id))
      .map(o => ({
        ...o,
        groupName: groups.find(g => g.id === o.groupId)?.name || '未分组',
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [item, outfits, groups]);

  const [showDiscardSheet, setShowDiscardSheet] = useState(false);
  const [showSellSheet, setShowSellSheet] = useState(false);
  const [showEditReason, setShowEditReason] = useState(false);
  const [showWearCalendar, setShowWearCalendar] = useState(false);
  const [outfitWarning, setOutfitWarning] = useState<{
    title: string;
    message: string;
    outfits: Outfit[];
    confirmLabel: string;
    description?: string;
    onConfirm: () => void;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [wearDates, setWearDates] = useState<string[]>([]);
  const [dynamicLastWorn, setDynamicLastWorn] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // 根据路由或物品状态判断来源
  const source: DetailSource = route.params.source ||
    (allTrashClothing.find(c => c.id === route.params.id) ? 'trash' :
     allSoldClothing.find(c => c.id === route.params.id) ? 'sold' : 'wardrobe');

  const isTrash = source === 'trash';
  const isSold = source === 'sold';
  const isDraft = source === 'draft';

  // 加载穿着日期
  const loadWearDates = useCallback(async () => {
    if (item && !isTrash && !isSold && !isDraft) {
      try {
        const dates = await wearRecordsDb.getWearDatesByMonth(
          item.id,
          currentMonth.year,
          currentMonth.month
        );
        setWearDates(dates);
      } catch (error) {
        console.error('Failed to load wear dates:', error);
      }
    }
  }, [item, currentMonth, isTrash, isSold, isDraft]);

  const loadLastWornDate = useCallback(async () => {
    if (item && !isTrash && !isSold && !isDraft) {
      try {
        const lastDate = await wearRecordsDb.getLastWornDateFromRecords(item.id);
        setDynamicLastWorn(lastDate);
      } catch (error) {
        console.error('Failed to load last worn date:', error);
      }
    }
  }, [item, isTrash, isSold, isDraft]);

  useEffect(() => {
    loadWearDates();
    loadLastWornDate();
  }, [loadWearDates, loadLastWornDate]);

  // 每次屏幕进入焦点时重新加载穿着统计
  useFocusEffect(
    useCallback(() => {
      loadLastWornDate();
    }, [loadLastWornDate])
  );

  // 月份切换
  const prevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  // 点击日期（已有记录）
  const handleDatePress = (date: string) => {
    setSelectedDate(date);
    setShowWearCalendar(true);
  };

  // 添加过往穿着日期
  const handleAddWearDate = (date: string) => {
    if (!item) return;
    Alert.alert(
      '确认记录',
      `确认记录 ${date} 的穿着吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: () => {
            (async () => {
              try {
                await addWearRecord(item.id, date);
                await loadWearDates();
              } catch (e) {
                console.error('记录穿着失败:', e);
              }
            })();
          },
        },
      ]
    );
  };

  // 删除穿着记录后刷新
  const handleDeleteRecord = async (recordId: number) => {
    if (!item) return;
    try {
      // 使用 store 的 deleteWearRecord（它会正确更新数据库和内存状态）
      await deleteWearRecord(recordId);
      await loadWearDates();
    } catch (e) {
      console.error('删除穿着记录失败:', e);
    }
  };

  // 获取日历样式
  const getCalendarStyles = useMemo(() => StyleSheet.create({
    calendarCard: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      ...theme.shadows.sm,
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    calendarTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 16,
      marginBottom: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 11,
      color: theme.colors.textTertiary,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    monthNavBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    monthText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      minWidth: 80,
      textAlign: 'center',
    },
    weekDaysRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    weekDay: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
    },
    weekDayText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      fontWeight: '500',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    dayTextOther: {
      color: theme.colors.textTertiary,
    },
    dayFilled: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // 已穿着（过去）的样式
    dayFilledPast: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // 计划穿着（未来）的样式
    dayFilledPlanned: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayFilledText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.white,
    },
    dayTextToday: {
      fontWeight: '700',
      color: theme.colors.primary,
    },
  }), [theme]);

  if (!item) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyText}>衣服不存在</Text>
      </View>
    );
  }

  const handleWear = async () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 检查今天是否已记录
    if (wearDates.includes(dateStr)) {
      Alert.alert('提示', '今天已记录过穿着，无需重复记录');
      return;
    }

    Alert.alert(
      '确认记录',
      '确认记录今天的穿着吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: () => {
            (async () => {
              try {
                await addWearRecord(item.id, dateStr);
                await loadWearDates();
                Alert.alert('已记录穿着');
              } catch (e) {
                console.error('记录穿着失败:', e);
              }
            })();
          },
        },
      ]
    );
  };

  const handleTrash = () => {
    setShowDiscardSheet(true);
  };

  const handleSell = () => {
    setShowSellSheet(true);
  };

  const handleDiscardConfirm = async (reason: string) => {
    const doMove = async () => {
      await moveToTrash(item.id, reason);
      setShowDiscardSheet(false);
      navigation.goBack();
    };
    const { count, outfits } = getOutfitWarningForDeletion([item.id]);
    if (count > 0) {
      setOutfitWarning({
        title: '移进废衣篓',
        message: `移进废衣篓后，该单品将从衣柜中移除。\n\n该单品存在于以下 ${count} 个搭配中：`,
        outfits,
        confirmLabel: '确认移除',
        description: '这些搭配的画板中仍会保留图片，但单品将显示为已移除状态。你可以随时从废衣篓恢复。',
        onConfirm: doMove,
      });
    } else {
      doMove();
    }
  };

  const handleSellConfirm = async (soldPrice: number, soldPlatform: string) => {
    const doSell = async () => {
      await sellClothing(item.id, soldPrice, soldPlatform);
      setShowSellSheet(false);
      navigation.goBack();
    };
    const { count, outfits } = getOutfitWarningForDeletion([item.id]);
    if (count > 0) {
      setOutfitWarning({
        title: '标记为已卖出',
        message: `卖出后，该单品将从衣柜中移除。\n\n该单品存在于以下 ${count} 个搭配中：`,
        outfits,
        confirmLabel: '确认卖出',
        description: '这些搭配的画板中仍会保留图片，但单品将显示为已移除状态。你可以随时从已卖出列表恢复。',
        onConfirm: doSell,
      });
    } else {
      doSell();
    }
  };

  const handleDiscardPermanentDelete = () => {
    const doDelete = () => {
      deleteImage(item.imageUri, item.thumbnailUri, item.id)
        .then(() => permanentDelete(item.id))
        .then(() => {
          setShowDiscardSheet(false);
          setShowSellSheet(false);
          navigation.goBack();
        })
        .catch(e => {
          console.error('删除失败:', e);
          Alert.alert('删除失败，请重试');
        });
    };

    const { count, outfits } = getOutfitWarningForDeletion([item.id]);
    if (count > 0) {
      setOutfitWarning({
        title: '确认彻底删除',
        message: `此操作不可恢复。\n\n该单品存在于以下 ${count} 个搭配中：`,
        outfits,
        confirmLabel: '彻底删除',
        description: '删除后这些搭配的画板中仍会保留图片，你可以进入搭配编辑器手动清除已删除的单品。',
        onConfirm: doDelete,
      });
    } else {
      Alert.alert(
        '确认彻底删除',
        '确定要永久删除这件衣服吗？此操作不可恢复。',
        [
          { text: '取消', style: 'cancel' },
          { text: '彻底删除', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      '确认恢复',
      '确定要将这件衣服恢复到衣柜吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '恢复',
          onPress: () => {
            (async () => {
              try {
                if (isTrash) {
                  await restoreFromTrash(item.id);
                } else if (isSold) {
                  await restoreFromSold(item.id);
                }
              } catch (e) {
                console.error('恢复失败:', e);
              }
              navigation.goBack();
            })();
          },
        },
      ]
    );
  };

  const handleEditReason = async (reason: string) => {
    if (item) {
      await updateClothing({ ...item, discardReason: reason });
    }
    setShowEditReason(false);
  };

  const handlePublish = async () => {
    Alert.alert(
      '确认发布',
      '确定要将这件衣服发布到衣柜吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '发布',
          onPress: async () => {
            try {
              await publishDraft(item.id);
              Alert.alert('已发布到衣柜');
              navigation.goBack();
            } catch (e) {
              console.error('发布失败:', e);
              Alert.alert('发布失败，请重试');
            }
          },
        },
      ]
    );
  };

  const costPerWear = calcCostPerWear(item.price || 0, item.wearCount || 0);

  return (
    <View style={styles.container}>
      {/* 顶栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{item.parentType && item.parentType !== item.type ? `${item.parentType} > ${item.type}` : item.type}</Text>
        {!isTrash && !isSold ? (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditClothing', { id: item.id })}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.editBtnPlaceholder} />
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 图片区域 */}
        <View style={styles.imageSection}>
          <View style={[
            styles.imageWrapper,
            item.imageUri?.endsWith('.png') && { backgroundColor: theme.colors.background }
          ]}>
            <Image
              source={{ uri: item.imageUri || item.originalImageUri || item.thumbnailUri }}
              style={[
                styles.image,
                item.imageUri?.endsWith('.png') && { resizeMode: 'contain' }
              ]}
            />
            {item.color && <View style={[styles.colorDot, { backgroundColor: getColorHex(item.color) }]} />}
          </View>
        </View>

        {/* 废弃/卖出详情卡片 */}
        {isTrash && (
          <View style={styles.discardCard}>
            <View style={styles.discardCardHeader}>
              <View style={styles.discardCardTitle}>
                <View style={styles.discardIcon}>
                  <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
                </View>
                <Text style={styles.discardCardTitleText}>废弃详情</Text>
              </View>
              <TouchableOpacity style={styles.editReasonBtn} onPress={() => setShowEditReason(true)}>
                <Ionicons name="create-outline" size={12} color={theme.colors.textTertiary} />
                <Text style={styles.editReasonBtnText}>编辑原因</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.discardInfoGrid}>
              <View style={styles.discardInfoItem}>
                <Text style={styles.discardInfoLabel}>废弃原因</Text>
                <Text style={styles.discardInfoValue}>{item.discardReason || '未知'}</Text>
              </View>
              <View style={styles.discardInfoItem}>
                <Text style={styles.discardInfoLabel}>废弃日期</Text>
                <Text style={styles.discardInfoValue}>{item.deletedAt || '--'}</Text>
              </View>
            </View>
          </View>
        )}

        {isSold && (
          <View style={styles.soldCard}>
            <View style={styles.discardCardHeader}>
              <View style={styles.discardCardTitle}>
                <View style={[styles.discardIcon, { backgroundColor: theme.colors.success + '20' }]}>
                  <Ionicons name="cash-outline" size={14} color={theme.colors.success} />
                </View>
                <Text style={[styles.discardCardTitleText, { color: theme.colors.success }]}>卖出详情</Text>
              </View>
            </View>
            <View style={styles.discardInfoGrid}>
              <View style={styles.discardInfoItem}>
                <Text style={styles.discardInfoLabel}>卖出渠道</Text>
                <Text style={styles.discardInfoValue}>{item.soldPlatform || '--'}</Text>
              </View>
              <View style={styles.discardInfoItem}>
                <Text style={styles.discardInfoLabel}>卖出日期</Text>
                <Text style={styles.discardInfoValue}>{item.soldAt || '--'}</Text>
              </View>
              {item.soldPrice != null && item.soldPrice > 0 && (
                <View style={styles.discardInfoItem}>
                  <Text style={styles.discardInfoLabel}>卖出价格</Text>
                  <Text style={[styles.discardInfoValue, { color: theme.colors.success, fontWeight: '700' }]}>¥{item.soldPrice}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 基本信息 */}
        <View style={styles.infoSection}>
          {/* 标签行 */}
          <View style={styles.tagsRow}>
            {item.price > 0 && (
              <View style={[styles.tag, styles.tagPrice]}>
                <Text style={styles.tagPriceText}>¥{item.price}</Text>
              </View>
            )}
            {item.seasons.map((s, i) => (
              <View key={`season-${s}`} style={[styles.tag, i === 0 && styles.tagSeason]}>
                <Text style={[styles.tagText, i === 0 && styles.tagTextSeason]}>{s}</Text>
              </View>
            ))}
            {item.tags.map(t => (
              <View key={`tag-${t}`} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
            {item.fit ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>版型: {item.fit}</Text>
              </View>
            ) : null}
            {item.thickness ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>厚薄: {item.thickness}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 合并卡片 */}
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item?.wearCount || 0}</Text>
              <Text style={styles.statLabel}>穿着次数</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statHighlight]}>{getDaysAgo(dynamicLastWorn)}</Text>
              <Text style={styles.statLabel}>上次穿着</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{costPerWear}</Text>
              <Text style={styles.statLabel}>单次成本</Text>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>品牌</Text>
              <Text style={styles.detailValue}>{item.brand || '--'}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>尺码</Text>
              <Text style={styles.detailValue}>{item.size || '--'}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>购买日期</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{item.purchaseDate || '--'}</Text>
            </View>
          </View>
        </View>

        {/* 备注卡片 */}
        <View style={styles.remarksCard}>
          <View style={styles.remarksHeader}>
            <View style={styles.remarksDot} />
            <Text style={styles.remarksTitle}>备注</Text>
          </View>
          <Text style={styles.remarksText}>{item.remarks || '暂无备注'}</Text>
        </View>

        {/* 穿着日历卡片 */}
        {!isTrash && !isSold && !isDraft && (
          <View style={getCalendarStyles.calendarCard}>
            <View style={getCalendarStyles.calendarHeader}>
              <Text style={getCalendarStyles.calendarTitle}>穿着日历</Text>
              <View style={getCalendarStyles.monthNav}>
                <TouchableOpacity style={getCalendarStyles.monthNavBtn} onPress={prevMonth}>
                  <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={getCalendarStyles.monthText}>
                  {currentMonth.year}年{currentMonth.month}月
                </Text>
                <TouchableOpacity style={getCalendarStyles.monthNavBtn} onPress={nextMonth}>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={getCalendarStyles.legend}>
              <View style={getCalendarStyles.legendItem}>
                <View style={[getCalendarStyles.legendDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={getCalendarStyles.legendText}>已穿着</Text>
              </View>
              <View style={getCalendarStyles.legendItem}>
                <View style={[getCalendarStyles.legendDot, { backgroundColor: theme.colors.accent }]} />
                <Text style={getCalendarStyles.legendText}>计划</Text>
              </View>
            </View>
            <View style={getCalendarStyles.weekDaysRow}>
              {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <View key={day} style={getCalendarStyles.weekDay}>
                  <Text style={getCalendarStyles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>
            <View style={getCalendarStyles.daysGrid}>
              {(() => {
                const firstDay = new Date(currentMonth.year, currentMonth.month - 1, 1).getDay();
                const daysInMonth = new Date(currentMonth.year, currentMonth.month, 0).getDate();
                const today = new Date();
                const cells = [];
                for (let i = 0; i < firstDay; i++) {
                  cells.push(<View key={`empty-${i}`} style={getCalendarStyles.dayCell} />);
                }
                for (let d = 1; d <= daysInMonth; d++) {
                  const dateStr = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const isToday = today.getFullYear() === currentMonth.year &&
                    today.getMonth() + 1 === currentMonth.month &&
                    today.getDate() === d;
                  const hasRecord = wearDates.includes(dateStr);
                  // 判断是否未来日期
                  const isFuture = new Date(dateStr) > new Date(today.toISOString().split('T')[0]);
                  cells.push(
                    <TouchableOpacity
                      key={d}
                      style={getCalendarStyles.dayCell}
                      onPress={() => hasRecord ? handleDatePress(dateStr) : (!isFuture && handleAddWearDate(dateStr))}
                      disabled={isFuture}
                      activeOpacity={0.7}
                    >
                      {hasRecord ? (
                        <View style={isFuture ? getCalendarStyles.dayFilledPlanned : getCalendarStyles.dayFilled}>
                          <Text style={getCalendarStyles.dayFilledText}>{d}</Text>
                        </View>
                      ) : (
                        <Text style={[
                          getCalendarStyles.dayText,
                          isToday && getCalendarStyles.dayTextToday,
                          isFuture && getCalendarStyles.dayTextOther,
                        ]}>
                          {d}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                }
                return cells;
              })()}
            </View>
          </View>
        )}

        {/* 相关搭配 */}
        {!isTrash && !isSold && !isDraft && (
          <View style={styles.relatedSection}>
            <View style={styles.relatedHeader}>
              <View style={styles.relatedTitle}>
                <Ionicons name="shirt-outline" size={18} color={theme.colors.accent} />
                <Text style={styles.relatedTitleText}>相关搭配</Text>
                <Text style={styles.relatedCount}>{relatedOutfits.length}</Text>
              </View>
              {relatedOutfits.length > 3 && (
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
              )}
            </View>
            {relatedOutfits.length === 0 ? (
              <View style={styles.relatedEmptyCard}>
                <Ionicons name="grid-outline" size={28} color={theme.colors.border} />
                <Text style={styles.relatedEmptyText}>暂无相关搭配</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedScroll}
              >
                {relatedOutfits.map(outfit => (
                  <TouchableOpacity
                    key={outfit.id}
                    style={styles.relatedCard}
                    onPress={() => navigation.navigate('OutfitDetail', { id: outfit.id })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.relatedImageWrap}>
                      {outfit.thumbnailUri ? (
                        <Image
                          source={{ uri: outfit.thumbnailUri }}
                          style={styles.relatedImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.relatedImageWrap, { justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="shirt-outline" size={32} color={theme.colors.border} />
                        </View>
                      )}
                    </View>
                    <View style={styles.relatedCardBody}>
                      <Text style={styles.relatedCardName} numberOfLines={1}>
                        {outfit.name || '未命名搭配'}
                      </Text>
                      <Text style={styles.relatedCardGroup} numberOfLines={1}>
                        {outfit.groupName}
                      </Text>
                      <Text style={styles.relatedCardCount}>
                        {outfit.itemIds.length} 件衣物
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* 底栏 */}
      <View style={styles.bottomBar}>
        {isDraft ? (
          <>
            <TouchableOpacity style={styles.primaryAction} onPress={handlePublish} activeOpacity={0.8}>
              <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.white} />
              <Text style={styles.primaryActionText}>发布到衣柜</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconAction} onPress={() => {
              navigation.navigate('EditClothing', { id: item.id });
            }} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </>
        ) : isTrash || isSold ? (
          <>
            <TouchableOpacity style={styles.restoreAction} onPress={handleRestore} activeOpacity={0.8}>
              <Ionicons name="refresh" size={20} color={theme.colors.white} />
              <Text style={styles.restoreActionText}>恢复</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteAction} onPress={() => {
              const { count, outfits } = getOutfitWarningForDeletion([item.id]);
              const doDelete = () => {
                deleteImage(item.imageUri, item.thumbnailUri, item.id)
                  .then(() => permanentDelete(item.id))
                  .then(() => navigation.goBack())
                  .catch(e => {
                    console.error('删除失败:', e);
                    Alert.alert('删除失败，请重试');
                  });
              };
              if (count > 0) {
                setOutfitWarning({
                  title: '确认彻底删除',
                  message: `此操作不可恢复。\n\n该单品存在于以下 ${count} 个搭配中：`,
                  outfits,
                  confirmLabel: '彻底删除',
                  description: '删除后这些搭配的画板中仍会保留图片，你可以进入搭配编辑器手动清除已删除的单品。',
                  onConfirm: doDelete,
                });
              } else {
                Alert.alert(
                  '确认彻底删除',
                  '确定要永久删除这件衣服吗？此操作不可恢复。',
                  [
                    { text: '取消', style: 'cancel' },
                    { text: '彻底删除', style: 'destructive', onPress: doDelete },
                  ]
                );
              }
            }} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.white} />
              <Text style={styles.deleteActionText}>彻底删除</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryAction} onPress={handleWear} activeOpacity={0.8}>
              <Ionicons name="checkmark-done" size={20} color={theme.colors.white} />
              <Text style={styles.primaryActionText}>记录穿着</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconAction} onPress={handleTrash} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconAction} onPress={handleSell} activeOpacity={0.7}>
              <Ionicons name="card-outline" size={20} color={theme.colors.success} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <DiscardReasonSheet
        visible={showDiscardSheet}
        onClose={() => setShowDiscardSheet(false)}
        clothingItem={item}
        onMoveToTrash={handleDiscardConfirm}
        onPermanentDelete={handleDiscardPermanentDelete}
      />

      <SellItemSheet
        visible={showSellSheet}
        onClose={() => setShowSellSheet(false)}
        clothingItem={item}
        onSell={handleSellConfirm}
      />

      <EditDiscardReasonSheet
        visible={showEditReason}
        onClose={() => setShowEditReason(false)}
        clothingItem={item}
        onSave={handleEditReason}
      />

      <WearCalendarSheet
        visible={showWearCalendar}
        onClose={() => setShowWearCalendar(false)}
        date={selectedDate}
        onDeleteRecord={handleDeleteRecord}
        onAddRecord={loadWearDates}
      />

      {outfitWarning && (
        <OutfitWarningModal
          visible={true}
          onClose={() => setOutfitWarning(null)}
          onConfirm={() => {
            outfitWarning.onConfirm();
            setOutfitWarning(null);
          }}
          title={outfitWarning.title}
          message={outfitWarning.message}
          outfits={outfitWarning.outfits}
          confirmLabel={outfitWarning.confirmLabel}
          description={outfitWarning.description}
        />
      )}
    </View>
  );
}