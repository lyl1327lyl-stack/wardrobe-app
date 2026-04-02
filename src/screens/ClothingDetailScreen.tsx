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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ClothingItem } from '../types';
import { deleteImage } from '../utils/imageUtils';

type RouteParams = { ClothingDetail: { id: number } };

export function ClothingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ClothingDetail'>>();
  const { getClothingById, deleteClothing, wearClothing } = useWardrobeStore();
  const [item, setItem] = useState<ClothingItem | null>(null);

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
    setItem(prev => prev ? { ...prev, wearCount: prev.wearCount + 1, lastWornAt: new Date().toISOString() } : null);
    Alert.alert('已记录穿着');
  };

  const handleDelete = () => {
    Alert.alert('确认删除', '删除后无法恢复', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteImage(item.imageUri, item.thumbnailUri);
          await deleteClothing(item.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未记录';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: item.imageUri }} style={styles.image} />

      <View style={styles.info}>
        <View style={styles.header}>
          <Text style={styles.type}>{item.type}</Text>
          <View style={[styles.colorBadge, { backgroundColor: getColorCode(item.color) }]} />
          <Text style={styles.color}>{item.color}</Text>
        </View>

        {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.wearCount}</Text>
            <Text style={styles.statLabel}>穿着次数</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDate(item.lastWornAt)}</Text>
            <Text style={styles.statLabel}>最近穿着</Text>
          </View>
          {item.price > 0 && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>¥{item.price}</Text>
              <Text style={styles.statLabel}>价格</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>季节</Text>
          <View style={styles.tags}>
            {item.seasons.length > 0
              ? item.seasons.map(s => <Text key={s} style={styles.tag}>{s}</Text>)
              : <Text style={styles.noData}>未设置</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>场合</Text>
          <View style={styles.tags}>
            {item.occasions.length > 0
              ? item.occasions.map(o => <Text key={o} style={styles.tag}>{o}</Text>)
              : <Text style={styles.noData}>未设置</Text>}
          </View>
        </View>

        {item.purchaseDate ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>购买时间</Text>
            <Text style={styles.purchaseDate}>{item.purchaseDate}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.wearButton} onPress={handleWear}>
          <Text style={styles.wearButtonText}>记录穿着</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>删除</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function getColorCode(colorName: string): string {
  const colorMap: Record<string, string> = {
    '黑色': '#000', '白色': '#fff', '灰色': '#888',
    '红色': '#e53935', '蓝色': '#1e88e5', '绿色': '#43a047',
    '黄色': '#fdd835', '紫色': '#8e24aa', '粉色': '#ec407a',
    '棕色': '#795548', '米色': '#d7ccc8',
  };
  return colorMap[colorName] || '#ccc';
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
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
  },
  info: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  type: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  colorBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  color: {
    fontSize: 16,
    color: '#666',
  },
  brand: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
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
  purchaseDate: {
    fontSize: 15,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  wearButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
  },
  wearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    borderRadius: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
