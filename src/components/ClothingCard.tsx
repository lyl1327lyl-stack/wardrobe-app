import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { ClothingItem } from '../types';

interface Props {
  item: ClothingItem;
  onPress: () => void;
}

export function ClothingCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image source={{ uri: item.thumbnailUri }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.type}>{item.type}</Text>
        <Text style={styles.color}>{item.color}</Text>
        {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '47%',
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
  },
  info: {
    padding: 8,
  },
  type: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  color: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  brand: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
});
