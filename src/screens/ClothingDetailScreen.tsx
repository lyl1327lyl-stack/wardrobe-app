import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as MediaLibrary from 'expo-media-library';
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
    '黑色': '#2D2A26', '深灰': '#6B6B6B', '浅灰': '#B8B8B8', '灰色': '#8B8B8B', '银灰色': '#A8A8A8',
    '白色': '#F5F5F0', '米白': '#F0EDE4', '米色': '#E8D5B7', '奶油色': '#F5E6C8', '杏色': '#F0D5B0',
    '红色': '#C44E4E', '酒红色': '#8B3A3A', '砖红色': '#A0522D', '粉红': '#E8A0B0',
    '玫红色': '#D44A6E', '桃红色': '#F0A0A0', '橘红色': '#E07040',
    '蓝色': '#5B8DB8', '深蓝': '#3A5A8C', '浅蓝': '#8EB8D8', '藏青色': '#4A5568',
    '天蓝色': '#7EB8D8', '宝蓝色': '#3B6FA0', '湖蓝色': '#5F9EA0', '牛仔蓝': '#5B7FA5', '靛蓝色': '#3D5A80', '水洗蓝': '#8EB0C8',
    '绿色': '#6B8B6B', '军绿色': '#5C6B4E', '墨绿色': '#3D5C3D', '薄荷绿': '#8BC4A8',
    '翠绿色': '#4CAF6E', '草绿色': '#8BAA4E',
    '黄色': '#D4B896', '姜黄色': '#C9A040', '橙色': '#D48B4E', '金色': '#C8A040',
    '紫色': '#8B7B9B', '薰衣草': '#A08CB8', '粉色': '#D4A0A0', '紫红色': '#9B4A7B',
    '棕色': '#8B7355', '咖啡色': '#6B5B4E', '卡其色': '#B8A88A', '驼色': '#C4AA82',
    '青色': '#7AA3A3', '香槟色': '#EDE0C8', '银色': '#C0C0C0', '其他': '#A0A0A0',
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
    colorDotWrap: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    colorDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 3,
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
    // 穿着记录列表（N4）
    wearHistoryCard: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 18,
      ...theme.shadows.sm,
    },
    wearHistoryHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    },
    wearHistoryDot: {
      width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary,
    },
    wearHistoryTitle: {
      fontSize: 14, fontWeight: '600', color: theme.colors.text,
    },
    wearHistoryItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    wearHistoryDate: {
      fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6,
    },
    wearHistoryContext: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    wearHistoryContextLabel: {
      fontSize: 11, color: theme.colors.textTertiary, marginRight: 2,
    },
    wearHistoryThumbRow: {
      flexDirection: 'row', gap: 4, flex: 1,
    },
    wearHistoryThumb: {
      width: 32, height: 32, borderRadius: 6, backgroundColor: theme.colors.borderLight,
    },
    wearHistoryEmpty: {
      fontSize: 12, color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: 8,
    },
    wearHistoryExpand: {
      marginTop: 10, alignItems: 'center', paddingVertical: 4,
    },
    wearHistoryExpandText: {
      fontSize: 12, color: theme.colors.primary, fontWeight: '600',
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
      height: 40,
    },
    // 管理按钮（页面底部，需滑动才能看到）
    mgmtSection: {
      marginHorizontal: 20,
      marginTop: 16,
    },
    mgmtBtnRow: {
      flexDirection: 'row',
      gap: 12,
    },
    mgmtBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      gap: 6,
    },
    mgmtBtnTrash: {
      backgroundColor: theme.colors.danger + '15',
    },
    mgmtBtnSell: {
      backgroundColor: theme.colors.success + '15',
    },
    mgmtBtnRestore: {
      backgroundColor: theme.colors.success + '15',
    },
    mgmtBtnPublish: {
      backgroundColor: theme.colors.primary + '15',
    },
    mgmtBtnDelete: {
      backgroundColor: theme.colors.borderLight,
    },
    mgmtBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    mgmtBtnTextDanger: {
      color: theme.colors.danger,
    },
    mgmtBtnTextSuccess: {
      color: theme.colors.success,
    },
    mgmtBtnTextPrimary: {
      color: theme.colors.primary,
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
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
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

  const handleSaveImage = useCallback(async () => {
    if (!item?.imageUri || savingImage) return;
    setSavingImage(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要权限', '请在设置中允许访问相册以保存图片');
        return;
      }
      await MediaLibrary.createAssetAsync(item.imageUri);
      Alert.alert('已保存', '图片已保存到相册');
    } catch (e) {
      Alert.alert('保存失败', '无法保存图片到相册');
    } finally {
      setSavingImage(false);
    }
  }, [item?.imageUri, savingImage]);

  // 根据路由或物品状态判断来源
  const source: DetailSource = route.params.source ||
    (allTrashClothing.find(c => c.id === route.params.id) ? 'trash' :
     allSoldClothing.find(c => c.id === route.params.id) ? 'sold' : 'wardrobe');

  const isTrash = source === 'trash';
  const isSold = source === 'sold';
  const isDraft = source === 'draft';

  // 穿着记录列表（N4）
  const [wearHistory, setWearHistory] = useState<{ date: string; records: any[] }[]>([]);
  const [wearHistoryExpanded, setWearHistoryExpanded] = useState(false);

  const loadWearHistory = useCallback(async () => {
    if (!item || isTrash || isSold || isDraft) return;
    try {
      const records = await wearRecordsDb.getWearRecordsByClothing(item.id);
      // 按日期分组，取最近 15 条
      const grouped: { date: string; records: any[] }[] = [];
      const seen = new Set<string>();
      for (const r of records) {
        if (seen.has(r.wornDate)) continue;
        seen.add(r.wornDate);
        const dayRecords = await wearRecordsDb.getWearRecordsByDate(r.wornDate);
        grouped.push({ date: r.wornDate, records: dayRecords });
        if (grouped.length >= 15) break;
      }
      setWearHistory(grouped);
    } catch (error) {
      console.error('loadWearHistory failed:', error);
    }
  }, [item, isTrash, isSold, isDraft]);

  useEffect(() => {
    loadWearHistory();
  }, [loadWearHistory]);

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
          <TouchableOpacity
            style={[
              styles.imageWrapper,
              item.imageUri?.endsWith('.png') && { backgroundColor: theme.colors.background }
            ]}
            activeOpacity={0.9}
            onPress={() => setShowImageViewer(true)}
          >
            <Image
              source={{ uri: item.imageUri || item.originalImageUri || item.thumbnailUri }}
              style={[
                styles.image,
                item.imageUri?.endsWith('.png') && { resizeMode: 'contain' }
              ]}
            />
            {item.color && (() => {
              const colorList = item.color.split(',').map(c => c.trim()).filter(Boolean);
              const primary = colorList[0];
              return (
                <View style={styles.colorDotWrap}>
                  {colorList.slice(0, 3).map((c, i) => (
                    <View key={c} style={[styles.colorDot, { backgroundColor: getColorHex(c), marginLeft: i > 0 ? -6 : 0, zIndex: 3 - i }]} />
                  ))}
                </View>
              );
            })()}
          </TouchableOpacity>
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

        {/* 穿着记录列表（N4） */}
        {!isTrash && !isSold && !isDraft && (() => {
          // Build allClothingMap for thumbnail lookup
          const allClothingMap = new Map(allClothing.map(c => [c.id, c] as const));
          return (
          <View style={styles.wearHistoryCard}>
            <View style={styles.wearHistoryHeader}>
              <View style={styles.wearHistoryDot} />
              <Text style={styles.wearHistoryTitle}>穿着记录</Text>
            </View>
            {wearHistory.length === 0 ? (
              <Text style={styles.wearHistoryEmpty}>暂无穿着记录</Text>
            ) : (
              <>
                {(wearHistoryExpanded ? wearHistory : wearHistory.slice(0, 5)).map(({ date, records }) => {
                  const d = new Date(date);
                  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                  const label = `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`;
                  return (
                    <View key={date} style={styles.wearHistoryItem}>
                      <Text style={styles.wearHistoryDate}>{label}</Text>
                      <View style={styles.wearHistoryContext}>
                        <Text style={styles.wearHistoryContextLabel}>当日搭配</Text>
                        <View style={styles.wearHistoryThumbRow}>
                          {records.map((r: any) => {
                            const cloth = allClothingMap.get(r.clothingId);
                            const uri = cloth?.thumbnailUri || cloth?.imageUri || r.clothingThumbnailUri;
                            return uri ? (
                              <Image key={r.id} source={{ uri }} style={styles.wearHistoryThumb} resizeMode="cover" />
                            ) : (
                              <View key={r.id} style={[styles.wearHistoryThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="shirt-outline" size={12} color={theme.colors.textTertiary} />
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  );
                })}
                {wearHistory.length > 5 && !wearHistoryExpanded && (
                  <TouchableOpacity style={styles.wearHistoryExpand} onPress={() => setWearHistoryExpanded(true)} activeOpacity={0.7}>
                    <Text style={styles.wearHistoryExpandText}>展开全部 {wearHistory.length} 条</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          );
        })()}

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

        {/* 管理按钮 */}
        <View style={styles.mgmtSection}>
          {isDraft ? (
            <TouchableOpacity style={[styles.mgmtBtn, styles.mgmtBtnPublish]} onPress={handlePublish} activeOpacity={0.8}>
              <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.mgmtBtnText, styles.mgmtBtnTextPrimary]}>发布到衣柜</Text>
            </TouchableOpacity>
          ) : isTrash || isSold ? (
            <View style={styles.mgmtBtnRow}>
              <TouchableOpacity style={[styles.mgmtBtn, styles.mgmtBtnRestore]} onPress={handleRestore} activeOpacity={0.8}>
                <Ionicons name="refresh" size={18} color={theme.colors.success} />
                <Text style={[styles.mgmtBtnText, styles.mgmtBtnTextSuccess]}>恢复</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mgmtBtn, styles.mgmtBtnDelete]} onPress={() => {
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
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                <Text style={[styles.mgmtBtnText, styles.mgmtBtnTextDanger]}>彻底删除</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mgmtBtnRow}>
              <TouchableOpacity style={[styles.mgmtBtn, styles.mgmtBtnTrash]} onPress={handleTrash} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                <Text style={[styles.mgmtBtnText, styles.mgmtBtnTextDanger]}>移入废衣篓</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mgmtBtn, styles.mgmtBtnSell]} onPress={handleSell} activeOpacity={0.8}>
                <Ionicons name="card-outline" size={18} color={theme.colors.success} />
                <Text style={[styles.mgmtBtnText, styles.mgmtBtnTextSuccess]}>卖出</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

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

      {/* Full-screen image viewer (absolute positioned, not Modal — RNGH gestures don't work inside Modal) */}
      {showImageViewer && (
        <ImageViewerContent
          imageUri={item.imageUri || item.originalImageUri || item.thumbnailUri || ''}
          isPng={item.imageUri?.endsWith('.png') || false}
          onClose={() => setShowImageViewer(false)}
          onSave={handleSaveImage}
          saving={savingImage}
          theme={theme}
        />
      )}
    </View>
  );
}

// ── Full-screen image viewer with pinch zoom + save ──

const { width: SW, height: SH } = Dimensions.get('window');

function ImageViewerContent({ imageUri, isPng, onClose, onSave, saving, theme }: {
  imageUri: string;
  isPng: boolean;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  theme: Theme;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const offset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const startScale = useRef(1);
  const startOffset = useRef({ x: 0, y: 0 });

  const singleTap = Gesture.Tap()
    .onEnd(() => {
      if (scaleRef.current <= 1.05) onClose();
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scaleRef.current > 1.1) {
        scaleRef.current = 1;
        offsetRef.current = { x: 0, y: 0 };
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: false, overshootClamping: true, stiffness: 300, damping: 25 }),
          Animated.spring(offset, { toValue: { x: 0, y: 0 }, useNativeDriver: false, overshootClamping: true, stiffness: 300, damping: 25 }),
        ]).start();
      } else {
        scaleRef.current = 2.5;
        Animated.spring(scale, { toValue: 2.5, useNativeDriver: false, overshootClamping: true, stiffness: 200, damping: 20 }).start();
      }
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.current = scaleRef.current;
    })
    .onUpdate((e) => {
      const s = Math.max(0.5, Math.min(5, startScale.current * e.scale));
      scaleRef.current = s;
      scale.setValue(s);
    })
    .onEnd(() => {
      if (scaleRef.current < 1) {
        scaleRef.current = 1;
        Animated.spring(scale, { toValue: 1, useNativeDriver: false, overshootClamping: true, stiffness: 300, damping: 25 }).start();
      }
    });

  const pan = Gesture.Pan()
    .onStart(() => { startOffset.current = { ...offsetRef.current }; })
    .onUpdate((e) => {
      if (scaleRef.current <= 1) return;
      const x = startOffset.current.x + e.translationX;
      const y = startOffset.current.y + e.translationY;
      offsetRef.current = { x, y };
      offset.setValue({ x, y });
    })
    .onEnd(() => {
      if (scaleRef.current <= 1) {
        offsetRef.current = { x: 0, y: 0 };
        Animated.spring(offset, { toValue: { x: 0, y: 0 }, useNativeDriver: false, overshootClamping: true, stiffness: 300, damping: 25 }).start();
      }
    });

  // Tap gestures exclusive (doubleTap priority), all simultaneous with pinch/pan
  const taps = Gesture.Exclusive(doubleTap, singleTap);
  const composed = Gesture.Simultaneous(taps, pinch, pan);

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#000', zIndex: 9999,
    }}>
      <StatusBar hidden />
      <GestureDetector gesture={composed}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.Image
            source={{ uri: imageUri }}
            style={{
              width: SW,
              height: SW,
              transform: [
                { translateX: offset.x },
                { translateY: offset.y },
                { scale },
              ],
            }}
            resizeMode={isPng ? 'contain' : 'cover'}
          />
        </View>
      </GestureDetector>

      {/* Top bar */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12,
      }}>
        <TouchableOpacity onPress={onClose} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 14, height: 36, borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="download-outline" size={18} color="#fff" />
          )}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
            {saving ? '保存中' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}