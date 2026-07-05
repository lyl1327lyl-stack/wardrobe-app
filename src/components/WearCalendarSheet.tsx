import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ClothingItem } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { useWardrobeStore } from '../store/wardrobeStore';
import * as wearRecordsDb from '../db/wearRecords';

interface WearCalendarSheetProps {
  visible: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
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
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      height: '72%',
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    handle: {
      width: 38,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleBlock: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
    },
    countChip: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      backgroundColor: theme.colors.borderLight,
    },
    countChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    dateText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 16,
      overflow: 'hidden',
    },
    editBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.white,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 14,
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 30,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.primary + '12',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    emptyText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    emptySub: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 4,
      marginBottom: 20,
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 16,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    ctaBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.white,
    },
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    itemImageWrap: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    itemImage: {
      width: 62,
      height: 62,
      borderRadius: 12,
      backgroundColor: theme.colors.borderLight,
    },
    itemImageDeletedOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingVertical: 3,
      alignItems: 'center',
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    itemImageDeletedText: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.colors.white,
    },
    itemInfo: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'center',
    },
    itemType: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 5,
    },
    itemMeta: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    deletedBadge: {
      marginLeft: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      backgroundColor: theme.colors.danger + '20',
    },
    deletedBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.colors.danger,
    },
  });

export function WearCalendarSheet({
  visible,
  onClose,
  date,
  onAddRecord,
}: WearCalendarSheetProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const clothing = useWardrobeStore(s => s.clothing);
  const trashClothing = useWardrobeStore(s => s.trashClothing);
  const soldClothing = useWardrobeStore(s => s.soldClothing);

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
          tags: [],
          fit: '',
          thickness: '',
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

  useEffect(() => {
    if (visible && date) {
      loadRecords();
    }
  }, [visible, date]);

  const renderItem = ({ item }: { item: ClothingItem }) => {
    const imageUri = item.thumbnailUri || item.imageUri;
    const isActive = activeIds.has(item.id);
    const isTrash = trashIds.has(item.id);
    const isSold = soldIds.has(item.id);
    const isDeleted = !isActive;
    const deleteLabel = isTrash ? '已删除' : isSold ? '已售出' : '已删除';
    const deleteHint = isTrash ? '该单品在废衣篓中' : isSold ? '该单品已售出' : '该单品已被彻底删除';
    const meta = [item.brand, item.color].filter(Boolean).join(' · ') || '无品牌';
    return (
      <View style={[styles.itemCard, isDeleted && { opacity: 0.7 }]}>
        <View style={styles.itemImageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.itemImage} resizeMode="cover" />
          ) : isDeleted ? (
            <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name={isSold ? 'card-outline' : 'trash-outline'} size={22} color={theme.colors.textTertiary} />
            </View>
          ) : (
            <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center' }]}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.itemType, isDeleted && { color: theme.colors.textTertiary }]} numberOfLines={1}>{item.type}</Text>
            {isDeleted && (
              <View style={styles.deletedBadge}>
                <Text style={styles.deletedBadgeText}>{deleteLabel}</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemMeta} numberOfLines={1}>
            {isDeleted ? deleteHint : meta}
          </Text>
        </View>
      </View>
    );
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日 ${weekDays[d.getDay()]}`;
    }
    return dateStr;
  };

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
              <View style={styles.headerIcon}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.headerTitleBlock}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>穿着记录</Text>
                  {records.length > 0 && (
                    <View style={styles.countChip}>
                      <Text style={styles.countChipText}>{records.length} 件</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.dateText}>{formatDate(date)}</Text>
              </View>
            </View>
            {records.length > 0 && (
              <TouchableOpacity onPress={() => onAddRecord?.()} activeOpacity={0.85}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.editBtn}
                >
                  <Ionicons name="pencil" size={15} color={theme.colors.white} />
                  <Text style={styles.editBtnText}>编辑</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.content}>
            {records.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="shirt-outline" size={32} color={theme.colors.primary} />
                </View>
                <Text style={styles.emptyText}>该日期暂无穿着记录</Text>
                <Text style={styles.emptySub}>记录这天穿了什么吧</Text>
                <TouchableOpacity onPress={() => onAddRecord?.()} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ctaBtn}
                  >
                    <Ionicons name="add" size={18} color={theme.colors.white} />
                    <Text style={styles.ctaBtnText}>添加衣服</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
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
