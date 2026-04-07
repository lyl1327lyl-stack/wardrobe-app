import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OutfitRecommendation, Scene } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  recommendation: OutfitRecommendation;
  onRefresh: () => void;
  onWear: () => void;
}

const SCENE_CONFIG: Record<Scene, { icon: string; label: string; color: string }> = {
  '工作': { icon: 'briefcase', label: '工作', color: '#6B7FD7' },
  '运动': { icon: 'fitness', label: '运动', color: '#00B894' },
  '约会': { icon: 'heart', label: '约会', color: '#E17055' },
  '宅家': { icon: 'home', label: '宅家', color: '#FDCB6E' },
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      padding: 20,
      marginHorizontal: 16,
      marginTop: 16,
      ...theme.shadows.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerLeft: {},
    headerRight: {},
    sceneBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.borderRadius.full,
    },
    sceneText: {
      fontSize: 12,
      fontWeight: '600',
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.3,
    },
    reason: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    itemsScroll: {
      marginTop: 16,
      marginHorizontal: -20,
    },
    itemsContainer: {
      paddingHorizontal: 20,
      gap: 12,
    },
    itemCard: {
      width: 100,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderLight,
      ...theme.shadows.sm,
    },
    itemImage: {
      width: '100%',
      height: 120,
      resizeMode: 'cover',
    },
    itemOverlay: {
      padding: 8,
      backgroundColor: 'rgba(255,255,255,0.95)',
    },
    itemType: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
    },
    itemColor: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    wearButton: {
      flex: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.md,
    },
    wearButtonDisabled: {
      opacity: 0.6,
    },
    wearButtonText: {
      color: theme.colors.white,
      fontSize: 15,
      fontWeight: '600',
    },
    refreshButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: theme.colors.background,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    refreshText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
    },
    scoreLabel: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    scoreBar: {
      flex: 1,
      height: 4,
      backgroundColor: theme.colors.borderLight,
      borderRadius: 2,
      overflow: 'hidden',
    },
    scoreFill: {
      height: '100%',
      backgroundColor: theme.colors.accent,
      borderRadius: 2,
    },
    scoreValue: {
      fontSize: 12,
      color: theme.colors.accent,
      fontWeight: '600',
      width: 36,
      textAlign: 'right',
    },
  });

export function OutfitRecommendationCard({ recommendation, onRefresh, onWear }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { items, reason, scene } = recommendation;
  const [isLoading, setIsLoading] = useState(false);

  const sceneConfig = SCENE_CONFIG[scene];

  const handleWearAll = async () => {
    setIsLoading(true);
    try {
      await onWear();
    } catch (error) {
      Alert.alert('记录失败', '请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.sceneBadge, { backgroundColor: `${sceneConfig.color}20` }]}>
            <Ionicons name={sceneConfig.icon as any} size={14} color={sceneConfig.color} />
            <Text style={[styles.sceneText, { color: sceneConfig.color }]}>{sceneConfig.label}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.title}>今日穿搭推荐</Text>
      <Text style={styles.reason}>{reason}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.itemsContainer}
        style={styles.itemsScroll}
      >
        {items.map(item => (
          <View key={item.id} style={styles.itemCard}>
            <Image source={{ uri: item.thumbnailUri || item.imageUri }} style={styles.itemImage} />
            <View style={styles.itemOverlay}>
              <Text style={styles.itemType} numberOfLines={1}>{item.type}</Text>
              <Text style={styles.itemColor} numberOfLines={1}>{item.color}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.wearButton, isLoading && styles.wearButtonDisabled]}
          onPress={handleWearAll}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-done" size={20} color={theme.colors.white} />
          <Text style={styles.wearButtonText}>
            {isLoading ? '记录中...' : '就穿这套'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.7}>
          <Ionicons name="refresh" size={20} color={theme.colors.primary} />
          <Text style={styles.refreshText}>换一套</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>搭配匹配度</Text>
        <View style={styles.scoreBar}>
          <View style={[styles.scoreFill, { width: `${recommendation.score}%` }]} />
        </View>
        <Text style={styles.scoreValue}>{recommendation.score}%</Text>
      </View>
    </View>
  );
}