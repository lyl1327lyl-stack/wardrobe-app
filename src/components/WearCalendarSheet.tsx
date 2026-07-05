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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClothingItem } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { useWardrobeStore } from '../store/wardrobeStore';
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
    confirmAddBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    confirmAddBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.white,
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
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="remove-circle-outline" size={22} color={theme.colors.warning} />
        </TouchableOpacity>
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
            {records.length > 0 && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => onAddRecord?.()}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={18} color={theme.colors.white} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.content}>
            {records.length === 0 ? (
              <>
                <Text style={styles.emptyText}>该日期暂无穿着记录</Text>
                <TouchableOpacity
                  style={[styles.confirmAddBtn, { marginTop: 16 }]}
                  onPress={() => onAddRecord?.()}
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
