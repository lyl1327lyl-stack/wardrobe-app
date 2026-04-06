import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ClothingType, Season, CLOTHING_TYPES, SEASONS } from '../types';
import { theme } from '../utils/theme';

interface Props {
  selectedType: ClothingType | '全部';
  selectedSeason: Season | '全部';
  onTypeChange: (type: ClothingType | '全部') => void;
  onSeasonChange: (season: Season | '全部') => void;
}

export function FilterBar({ selectedType, selectedSeason, onTypeChange, onSeasonChange }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        <View style={styles.filterGroup}>
          <Text style={styles.label}>类型</Text>
          {(['全部', ...CLOTHING_TYPES] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, selectedType === type && styles.chipActive]}
              onPress={() => onTypeChange(type)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        <View style={styles.filterGroup}>
          <Text style={styles.label}>季节</Text>
          {(['全部', ...SEASONS] as const).map(season => (
            <TouchableOpacity
              key={season}
              style={[styles.chip, selectedSeason === season && styles.chipActive]}
              onPress={() => onSeasonChange(season)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selectedSeason === season && styles.chipTextActive]}>
                {season}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  row: {
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginRight: 4,
    fontWeight: '500',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.borderLight,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.white,
    fontWeight: '500',
  },
});
