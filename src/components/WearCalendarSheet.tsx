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
      paddingBottom: 50,
      maxHeight: '70%',
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
      marginTop: 8,
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
    },
    clothingGridItemSelected: {
      borderWidth: 3,
      borderColor: theme.colors.primary,
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
  const { clothing } = useWardrobeStore();
  const [records, setRecords] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [selectedAddIds, setSelectedAddIds] = useState<number[]>([]);

  useEffect(() => {
    if (visible && date) {
      loadRecords();
    }
  }, [visible, date]);

  useEffect(() => {
    if (!showAddPicker) {
      setSelectedAddIds([]);
    }
  }, [showAddPicker]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const wearRecords = await wearRecordsDb.getWearRecordsByDate(date);
      const clothingItems = wearRecords
        .map(r => clothing.find(c => c.id === r.clothingId))
        .filter((c): c is ClothingItem => c !== undefined);
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
                onDeleteRecord(record.id);
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

  // 获取可选的衣服（排除已记录的）
  const availableClothing = useMemo(() => {
    const recordedIds = records.map(r => r.id);
    return clothing.filter(c => !recordedIds.includes(c.id));
  }, [clothing, records]);

  const toggleAddSelect = (id: number) => {
    setSelectedAddIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirmAdd = async () => {
    if (selectedAddIds.length === 0) return;
    try {
      for (const id of selectedAddIds) {
        await wearRecordsDb.addWearRecord(id, date);
      }
      setSelectedAddIds([]);
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
    return (
      <View style={styles.itemCard}>
        <Image
          source={{ uri: imageUri }}
          style={styles.itemImage}
          resizeMode="cover"
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemType}>{item.type}</Text>
          <Text style={styles.itemMeta}>
            {item.brand || item.color || '无品牌'}
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

  const renderAddPicker = () => (
    <View style={styles.addClothingSection}>
      <Text style={styles.addClothingTitle}>添加衣服</Text>
      {availableClothing.length === 0 ? (
        <Text style={styles.emptyText}>没有可添加的衣服</Text>
      ) : (
        <ScrollView style={{ height: 320 }} showsVerticalScrollIndicator={false}>
          <View style={styles.clothingGrid}>
            {availableClothing.map(item => {
              const isSelected = selectedAddIds.includes(item.id);
              const imageUri = item.thumbnailUri || item.imageUri;
              return (
                <TouchableOpacity
                key={item.id}
                style={[
                  styles.clothingGridItem,
                  isSelected && styles.clothingGridItemSelected
                ]}
                onPress={() => toggleAddSelect(item.id)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={styles.clothingGridImage}
                  resizeMode="cover"
                />
                {isSelected && (
                  <View style={styles.clothingGridCheck}>
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
        </ScrollView>
      )}
      <TouchableOpacity
        style={[
          styles.confirmAddBtn,
          selectedAddIds.length === 0 && styles.confirmAddBtnDisabled
        ]}
        onPress={handleConfirmAdd}
        disabled={selectedAddIds.length === 0}
        activeOpacity={0.8}
      >
        <Text style={styles.confirmAddBtnText}>
          添加 {selectedAddIds.length > 0 ? `${selectedAddIds.length} 件` : ''}
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
