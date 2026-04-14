import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { ClothingItem } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  item: ClothingItem;
  onPress: () => void;
}

// Check if thumbnail is PNG (transparent background after background removal)
function hasTransparentBackground(item: ClothingItem): boolean {
  return !!(item.thumbnailUri && item.thumbnailUri.endsWith('.png'));
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
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
    // Transparent image background - use theme background
    transparentBg: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: theme.colors.background,
    },
    image: {
      width: '100%',
      aspectRatio: 1,
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

export function ClothingCard({ item, onPress }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const isTransparent = hasTransparentBackground(item);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageWrapper}>
        {isTransparent ? (
          // Use theme background color so transparent areas blend in
          <View style={styles.transparentBg}>
            <Image source={{ uri: item.thumbnailUri }} style={styles.image} resizeMode="contain" />
          </View>
        ) : (
          <Image source={{ uri: item.thumbnailUri }} style={styles.image} />
        )}
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