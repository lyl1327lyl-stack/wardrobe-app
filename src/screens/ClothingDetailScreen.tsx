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
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { deleteImage } from '../utils/imageUtils';
import { ClothingItem } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { OutfitPickerModal } from '../components/OutfitPickerModal';
import { DiscardReasonSheet } from '../components/DiscardReasonSheet';
import { SellItemSheet } from '../components/SellItemSheet';
import { EditDiscardReasonSheet } from '../components/EditDiscardReasonSheet';

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

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  } catch {
    return false;
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
  const { getClothingByIdIncludingAll, wearClothing, moveToTrash, sellClothing, restoreFromTrash, restoreFromSold, permanentDelete, updateClothing, trashClothing, soldClothing, publishDraft } = useWardrobeStore();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [item, setItem] = useState<ClothingItem | null>(null);
  const [showOutfitPicker, setShowOutfitPicker] = useState(false);
  const [showDiscardSheet, setShowDiscardSheet] = useState(false);
  const [showSellSheet, setShowSellSheet] = useState(false);
  const [showEditReason, setShowEditReason] = useState(false);

  // 使用 useFocusEffect 在屏幕获得焦点时刷新数据
  useFocusEffect(
    useCallback(() => {
      const found = getClothingByIdIncludingAll(route.params.id);
      setItem(found || null);
    }, [route.params.id, getClothingByIdIncludingAll])
  );

  // 根据路由或物品状态判断来源
  const source: DetailSource = route.params.source ||
    (trashClothing.find(c => c.id === route.params.id) ? 'trash' :
     soldClothing.find(c => c.id === route.params.id) ? 'sold' : 'wardrobe');

  const isTrash = source === 'trash';
  const isSold = source === 'sold';
  const isDraft = source === 'draft';

  if (!item) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyText}>衣服不存在</Text>
      </View>
    );
  }

  const handleWear = async () => {
    // 检查今天是否已记录
    if (isToday(item.lastWornAt)) {
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
                await wearClothing(item.id);
                const now = new Date();
                const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                setItem(prev => prev ? { ...prev, wearCount: prev.wearCount + 1, lastWornAt: dateStr } : null);
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
    await moveToTrash(item.id, reason);
    setShowDiscardSheet(false);
    navigation.goBack();
  };

  const handleSellConfirm = async (soldPrice: number, soldPlatform: string) => {
    await sellClothing(item.id, soldPrice, soldPlatform);
    setShowSellSheet(false);
    navigation.goBack();
  };

  const handleDiscardPermanentDelete = () => {
    deleteImage(item.imageUri, item.thumbnailUri)
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
      setItem(prev => prev ? { ...prev, discardReason: reason } : null);
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

  const costPerWear = calcCostPerWear(item.price || 0, item.wearCount);

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
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item.imageUri }} style={styles.image} />
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
            {item.occasions.map(o => (
              <View key={`occ-${o}`} style={styles.tag}>
                <Text style={styles.tagText}>{o}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 合并卡片 */}
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.wearCount}</Text>
              <Text style={styles.statLabel}>穿着次数</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statHighlight]}>{getDaysAgo(item.lastWornAt)}</Text>
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
              Alert.alert(
                '确认彻底删除',
                '此操作不可恢复，确定要彻底删除这件衣服吗？',
                [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '彻底删除',
                    style: 'destructive',
                    onPress: () => {
                      deleteImage(item.imageUri, item.thumbnailUri)
                        .then(() => permanentDelete(item.id))
                        .then(() => navigation.goBack())
                        .catch(e => {
                          console.error('删除失败:', e);
                          Alert.alert('删除失败，请重试');
                        });
                    },
                  },
                ]
              );
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

            <TouchableOpacity style={styles.secondaryAction} onPress={() => setShowOutfitPicker(true)} activeOpacity={0.7}>
              <Ionicons name="shirt-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.secondaryActionText}>搭配</Text>
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

      <OutfitPickerModal
        visible={showOutfitPicker}
        onClose={() => setShowOutfitPicker(false)}
        clothingItem={item}
      />

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
    </View>
  );
}