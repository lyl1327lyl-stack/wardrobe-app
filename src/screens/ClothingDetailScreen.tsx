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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '从未';
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  } catch {
    return dateStr;
  }
}

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
        <Text style={styles.headerTitle}>{item.type}</Text>
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
            <View style={styles.colorBadge}>
              <View style={[styles.colorDot, { backgroundColor: getColorHex(item.color) }]} />
              <Text style={styles.colorText}>{item.color}</Text>
            </View>
          </View>
        </View>

        {/* 衣物档案卡片 */}
        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>衣物档案</Text>

          {/* 3列2行数据 */}
          <View style={styles.statsGrid}>
            <View style={styles.statRow}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>价格</Text>
                <Text style={styles.statDivider}>|</Text>
                <Text style={styles.statValue}>{item.price > 0 ? `¥${item.price}` : '--'}</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>尺码</Text>
                <Text style={styles.statDivider}>|</Text>
                <Text style={styles.statValue}>{item.size || '--'}</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>购买日期</Text>
                <Text style={styles.statDivider}>|</Text>
                <Text style={styles.statValue}>{item.purchaseDate || '--'}</Text>
              </View>
            </View>
            <View style={styles.statSeparator}>
              <Text style={styles.separatorLine}>—— —— ——</Text>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>穿着次数</Text>
                <Text style={styles.statDivider}>|</Text>
                <Text style={styles.statValue}>{item.wearCount}次</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>单次花费</Text>
                <Text style={styles.statDivider}>|</Text>
                <Text style={styles.statValue}>{costPerWear}</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>上次穿着</Text>
                <Text style={styles.statDivider}>|</Text>
                <Text style={styles.statValue}>{formatDate(item.lastWornAt)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.profileDivider} />

          {/* 品牌 */}
          {item.brand ? (
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>品牌</Text>
              <Text style={styles.profileValue}>{item.brand}</Text>
            </View>
          ) : null}

          {/* 季节 */}
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>季节</Text>
            <View style={styles.tagList}>
              {item.seasons.length > 0
                ? item.seasons.map(s => (
                  <View key={s} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>
                ))
                : <Text style={styles.noData}>未设置</Text>}
            </View>
          </View>

          {/* 场合 */}
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>场合</Text>
            <View style={styles.tagList}>
              {item.occasions.length > 0
                ? item.occasions.map(o => (
                  <View key={o} style={styles.tag}><Text style={styles.tagText}>{o}</Text></View>
                ))
                : <Text style={styles.noData}>未设置</Text>}
            </View>
          </View>
        </View>

        {/* 备注 */}
        <View style={styles.remarksCard}>
          <Text style={styles.remarksTitle}>备注</Text>
          <Text style={styles.remarksText}>{item.remarks || '暂无备注'}</Text>
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
    fontSize: 18,
    fontWeight: '700',
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
  profileCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(139,115,85,0.12)',
  },
  profileTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: 1,
  },
  statsGrid: {
    gap: 4,
  },
  statRow: {
    flexDirection: 'row',
  },
  statSeparator: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  separatorLine: {
    fontSize: 10,
    color: '#d4cfc7',
    letterSpacing: 2,
  },
  statCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
  },
  statDivider: {
    fontSize: 10,
    color: '#d4cfc7',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#f0ebe4',
    marginVertical: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileLabel: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '500',
    width: 52,
  },
  profileValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  tagList: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#F5F3EF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#5c5c5c',
    fontWeight: '500',
  },
  noData: {
    fontSize: 12,
    color: '#c7c7c7',
    fontStyle: 'italic',
  },
  remarksCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  remarksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
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
    marginTop: 16,
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
