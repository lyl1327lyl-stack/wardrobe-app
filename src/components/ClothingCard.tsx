import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { ClothingItem } from '../types';
import { theme } from '../utils/theme';

interface Props {
  item: ClothingItem;
  onPress: () => void;
}

export function ClothingCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.thumbnailUri }} style={styles.image} />
        {item.wearCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.wearCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.type} numberOfLines={1}>{item.type}</Text>
        <Text style={styles.color} numberOfLines={1}>{item.color}</Text>
        {item.brand ? <Text style={styles.brand} numberOfLines={1}>{item.brand}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: 14,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.borderLight,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  info: {
    padding: 10,
  },
  type: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  color: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  brand: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
});
