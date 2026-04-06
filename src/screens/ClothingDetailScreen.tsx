import React, { useEffect, useState } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ClothingItem } from '../types';
import { OutfitPickerModal } from '../components/OutfitPickerModal';

type RouteParams = { ClothingDetail: { id: number } };

// 颜色名转 hex
function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    '黑色': '#1a1a1a', '白色': '#f5f5f5', '灰色': '#9ca3af',
    '红色': '#e53e3e', '蓝色': '#3182ce', '绿色': '#38a169',
    '黄色': '#ecc94b', '紫色': '#805ad5', '粉色': '#ed64a6',
    '棕色': '#795548', '米色': '#d7ccc8', '橙色': '#dd6b20',
    '青色': '#00acc1', '咖啡色': '#6d4c41', '酒红色': '#880e4f',
    '藏青色': '#1a237e', '卡其色': '#c8b88a', '军绿色': '#556b2f',
  };
  return colorMap[colorName] || '#a0aec0';
}

// 格式化日期
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '从未';
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  } catch {
    return dateStr;
  }
}

// 计算单次穿着花费
function calcCostPerWear(price: number, wearCount: number): string {
  if (price <= 0 || wearCount <= 0) return '--';
  return `¥${Math.round(price / wearCount)}`;
}

export function ClothingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ClothingDetail'>>();
  const { getClothingById, wearClothing, moveToTrash, sellClothing } = useWardrobeStore();
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [showOutfitPicker, setShowOutfitPicker] = useState(false);

  useEffect(() => {
    const found = getClothingById(route.params.id);
    setItem(found || null);
  }, [route.params.id]);

  if (!item) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyText}>衣服不存在</Text>
      </View>
    );
  }

  const handleWear = async () => {
    await wearClothing(item.id);
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setItem(prev => prev ? { ...prev, wearCount: prev.wearCount + 1, lastWornAt: dateStr } : null);
    Alert.alert('已记录穿着');
  };

  const handleTrash = () => {
    Alert.alert('移入废衣篓', '确定要将这件衣服移入废衣篓吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          await moveToTrash(item.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleSell = () => {
    Alert.alert('卖出衣服', '确定要将这件衣服标记为已卖出吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          await sellClothing(item.id, item.price || 0, '其他');
          navigation.goBack();
        },
      },
    ]);
  };

  const costPerWear = calcCostPerWear(item.price || 0, item.wearCount);

  return (
    <View style={styles.container}>
      {/* 顶栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>衣物档案</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('EditClothing', { id: item.id })}
        >
          <Ionicons name="create-outline" size={22} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 1:1 图片 */}
        <View style={styles.imageSection}>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item.imageUri }} style={styles.image} />
            {/* 颜色圆点 */}
            <View style={styles.colorBadge}>
              <View style={[styles.colorDot, { backgroundColor: getColorHex(item.color) }]} />
              <Text style={styles.colorText}>{item.color}</Text>
            </View>
          </View>
        </View>

        {/* 标题区 */}
        <View style={styles.titleSection}>
          <Text style={styles.clothingType}>{item.type}</Text>
          {item.brand ? (
            <Text style={styles.brand}>{item.brand}</Text>
          ) : null}
        </View>

        {/* 核心数据 3x2 网格 */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>
              <Ionicons name="wallet-outline" size={18} color="#8B7355" />
            </Text>
            <Text style={styles.statValue}>{item.price > 0 ? `¥${item.price}` : '--'}</Text>
            <Text style={styles.statLabel}>价格</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>
              <Ionicons name="resize-outline" size={18} color="#8B7355" />
            </Text>
            <Text style={styles.statValue}>{item.size || '--'}</Text>
            <Text style={styles.statLabel}>尺码</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>
              <Ionicons name="calendar-outline" size={18} color="#8B7355" />
            </Text>
            <Text style={styles.statValue}>{item.purchaseDate || '--'}</Text>
            <Text style={styles.statLabel}>购买日期</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>
              <Ionicons name="repeat-outline" size={18} color="#8B7355" />
            </Text>
            <Text style={styles.statValue}>{item.wearCount}</Text>
            <Text style={styles.statLabel}>穿着次数</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>
              <Ionicons name="pulse-outline" size={18} color="#8B7355" />
            </Text>
            <Text style={styles.statValue}>{costPerWear}</Text>
            <Text style={styles.statLabel}>单次花费</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>
              <Ionicons name="time-outline" size={18} color="#8B7355" />
            </Text>
            <Text style={styles.statValue}>{formatDate(item.lastWornAt)}</Text>
            <Text style={styles.statLabel}>上次穿着</Text>
          </View>
        </View>

        {/* 属性区块 */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionLabel}>
              <Ionicons name="flower-outline" size={16} color="#8B7355" />
              <Text style={styles.sectionTitle}>季节</Text>
            </View>
            <View style={styles.tagList}>
              {item.seasons.length > 0
                ? item.seasons.map(s => (
                  <View key={s} style={styles.tag}>
                    <Text style={styles.tagText}>{s}</Text>
                  </View>
                ))
                : <Text style={styles.noData}>未设置</Text>}
            </View>
          </View>

          <View style={[styles.sectionRow, styles.sectionRowBorder]}>
            <View style={styles.sectionLabel}>
              <Ionicons name="calendar-outline" size={16} color="#8B7355" />
              <Text style={styles.sectionTitle}>场合</Text>
            </View>
            <View style={styles.tagList}>
              {item.occasions.length > 0
                ? item.occasions.map(o => (
                  <View key={o} style={styles.tag}>
                    <Text style={styles.tagText}>{o}</Text>
                  </View>
                ))
                : <Text style={styles.noData}>未设置</Text>}
            </View>
          </View>
        </View>

        {/* 备注 */}
        <View style={styles.remarksCard}>
          <View style={styles.remarksHeader}>
            <Ionicons name="document-text-outline" size={16} color="#8B7355" />
            <Text style={styles.remarksTitle}>备注</Text>
          </View>
          <Text style={styles.remarksText}>
            {item.remarks || '暂无备注'}
          </Text>
        </View>

        {/* 搭配按钮 */}
        <TouchableOpacity
          style={styles.outfitBtn}
          onPress={() => setShowOutfitPicker(true)}
          activeOpacity={0.8}
        >
          <View style={styles.outfitBtnIcon}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
          <Text style={styles.outfitBtnText}>加入搭配</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* 底栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleWear} activeOpacity={0.7}>
          <Ionicons name="checkmark-done-outline" size={20} color="#1a1a1a" />
          <Text style={styles.actionText}>记录穿着</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.trashBtn]} onPress={handleTrash} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={20} color="#d93025" />
          <Text style={[styles.actionText, { color: '#d93025' }]}>废衣篓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.sellBtn]} onPress={handleSell} activeOpacity={0.7}>
          <Ionicons name="card-outline" size={20} color="#1a1a1a" />
          <Text style={styles.actionText}>卖出</Text>
        </TouchableOpacity>
      </View>

      <OutfitPickerModal
        visible={showOutfitPicker}
        onClose={() => setShowOutfitPicker(false)}
        clothingItem={item}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#FAFAF8',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F3EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: -0.3,
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
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#f0ebe4',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  colorBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  colorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  titleSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  clothingType: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.8,
  },
  brand: {
    fontSize: 15,
    color: '#8e8e93',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#8e8e93',
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  sectionRowBorder: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f5f3ef',
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 70,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  tagList: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F5F3EF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  tagText: {
    fontSize: 13,
    color: '#5c5c5c',
    fontWeight: '500',
  },
  noData: {
    fontSize: 13,
    color: '#c7c7c7',
    fontStyle: 'italic',
  },
  remarksCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  remarksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  remarksText: {
    fontSize: 14,
    color: '#5c5c5c',
    lineHeight: 22,
  },
  outfitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: '#8B7355',
    borderRadius: 16,
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  outfitBtnIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
  },
  bottomPadding: {
    height: 110,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0ebe4',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F5F3EF',
  },
  trashBtn: {
    backgroundColor: '#FEF2F2',
  },
  sellBtn: {
    backgroundColor: '#F5F3EF',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
