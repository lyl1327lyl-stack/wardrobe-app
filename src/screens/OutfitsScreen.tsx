import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { Outfit } from '../types';

export function OutfitsScreen() {
  const { outfits, clothing, deleteOutfit } = useWardrobeStore();
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);

  const getOutfitItems = (outfit: Outfit) => {
    return outfit.itemIds
      .map(id => clothing.find(c => c.id === id))
      .filter(Boolean);
  };

  const handleDelete = (outfit: Outfit) => {
    Alert.alert('确认删除', '确定要删除这个搭配吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => deleteOutfit(outfit.id),
      },
    ]);
  };

  const renderOutfit = ({ item }: { item: Outfit }) => {
    const items = getOutfitItems(item);
    return (
      <TouchableOpacity
        style={styles.outfitCard}
        onPress={() => setSelectedOutfit(selectedOutfit?.id === item.id ? null : item)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.outfitPreview}>
          {items.slice(0, 4).map((c, idx) => (
            <Image key={c!.id} source={{ uri: c!.thumbnailUri }} style={styles.outfitThumb} />
          ))}
          {items.length === 0 && <Text style={styles.emptyText}>暂无衣服</Text>}
        </View>
        <Text style={styles.outfitName}>{item.name}</Text>
        <Text style={styles.outfitCount}>{items.length} 件</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={outfits}
        keyExtractor={item => item.id.toString()}
        renderItem={renderOutfit}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>还没有搭配</Text>
            <Text style={styles.emptySubtext}>在衣服详情页可以创建搭配</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 8,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  outfitCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  outfitPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  outfitThumb: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  outfitName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  outfitCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#ccc',
  },
});
