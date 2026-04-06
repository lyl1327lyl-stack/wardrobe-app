import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ClothingItem } from '../types';
import { deleteImage } from '../utils/imageUtils';
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
      <View style={styles.notFound}>
        <Text>衣服不存在</Text>
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
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>衣物详情</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('EditClothing', { id: item.id })}
        >
          <Ionicons name="create-outline" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 1:1 图片 + 颜色圆点 */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: item.imageUri }} style={styles.image} />
          <View style={[styles.colorDot, { backgroundColor: getColorHex(item.color) }]} />
        </View>

        {/* 详情卡片 - 第一行: 价格/尺码/购买日期 */}
        <View style={styles.card}>
          <View style={styles.row3}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>价格</Text>
              <Text style={styles.statValue}>{item.price > 0 ? `¥${item.price}` : '--'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>尺码</Text>
              <Text style={styles.statValue}>{item.size || '--'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>购买日期</Text>
              <Text style={styles.statValue}>{item.purchaseDate || '--'}</Text>
            </View>
          </View>
          {/* 第二行: 穿着次数/单次花费/上次穿着 */}
          <View style={[styles.row3, styles.row3Second]}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>穿着次数</Text>
              <Text style={styles.statValue}>{item.wearCount}次</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>单次花费</Text>
              <Text style={styles.statValue}>{costPerWear}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>上次穿着</Text>
              <Text style={styles.statValue}>{formatDate(item.lastWornAt)}</Text>
            </View>
          </View>
        </View>

        {/* 季节 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>季节</Text>
          <View style={styles.tags}>
            {item.seasons.length > 0
              ? item.seasons.map(s => <Text key={s} style={styles.tag}>{s}</Text>)
              : <Text style={styles.noData}>未设置</Text>}
          </View>
        </View>

        {/* 场合 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>场合</Text>
          <View style={styles.tags}>
            {item.occasions.length > 0
              ? item.occasions.map(o => <Text key={o} style={styles.tag}>{o}</Text>)
              : <Text style={styles.noData}>未设置</Text>}
          </View>
        </View>

        {/* 备注卡片 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>备注</Text>
          <Text style={styles.remarks}>{item.remarks || '暂无备注'}</Text>
        </View>

        {/* 搭配按钮 */}
        <TouchableOpacity style={styles.outfitBtn} onPress={() => setShowOutfitPicker(true)}>
          <Ionicons name="shirt-outline" size={20} color="#007AFF" />
          <Text style={styles.outfitBtnText}>加入搭配</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* 底栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleWear}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#007AFF" />
          <Text style={[styles.actionBtnText, { color: '#007AFF' }]}>记录穿着</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleTrash}>
          <Ionicons name="trash-outline" size={22} color="#FF3B30" />
          <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>废衣篓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleSell}>
          <Ionicons name="card-outline" size={22} color="#34C759" />
          <Text style={[styles.actionBtnText, { color: '#34C759' }]}>卖出</Text>
        </TouchableOpacity>
      </View>

      {/* 搭配选择弹窗 */}
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
    backgroundColor: '#fff',
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  colorDot: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row3: {
    flexDirection: 'row',
  },
  row3Second: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  cardTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    fontSize: 14,
    color: '#666',
  },
  noData: {
    color: '#ccc',
    fontSize: 14,
  },
  remarks: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  outfitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  outfitBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  bottomPadding: {
    height: 100,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
