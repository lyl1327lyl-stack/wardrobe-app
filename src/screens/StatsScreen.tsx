import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { CLOTHING_TYPES, SEASONS } from '../types';

export function StatsScreen() {
  const { clothing } = useWardrobeStore();

  const total = clothing.length;
  const byType: Record<string, number> = {};
  const bySeason: Record<string, number> = {};

  clothing.forEach(item => {
    byType[item.type] = (byType[item.type] || 0) + 1;
    item.seasons.forEach(s => {
      bySeason[s] = (bySeason[s] || 0) + 1;
    });
  });

  const totalValue = clothing.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalWear = clothing.reduce((sum, item) => sum + item.wearCount, 0);
  const mostWorn = [...clothing].sort((a, b) => b.wearCount - a.wearCount)[0];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>统计概览</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>衣服总数</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalValue}</Text>
          <Text style={styles.statLabel}>总价值 (元)</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalWear}</Text>
          <Text style={styles.statLabel}>总穿着次数</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{total > 0 ? Math.round(totalWear / total * 10) / 10 : 0}</Text>
          <Text style={styles.statLabel}>平均穿着次数</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>按类型分布</Text>
        <View style={styles.barGroup}>
          {CLOTHING_TYPES.map(type => {
            const count = byType[type] || 0;
            const percent = total > 0 ? (count / total * 100) : 0;
            return (
              <View key={type} style={styles.barRow}>
                <Text style={styles.barLabel}>{type}</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${percent}%` }]} />
                </View>
                <Text style={styles.barValue}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>按季节分布</Text>
        <View style={styles.barGroup}>
          {SEASONS.map(season => {
            const count = bySeason[season] || 0;
            const percent = total > 0 ? (count / total * 100) : 0;
            return (
              <View key={season} style={styles.barRow}>
                <Text style={styles.barLabel}>{season}</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${percent}%` }]} />
                </View>
                <Text style={styles.barValue}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {mostWorn && mostWorn.wearCount > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最常穿着</Text>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightName}>{mostWorn.type} - {mostWorn.color}</Text>
            <Text style={styles.highlightValue}>穿过 {mostWorn.wearCount} 次</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  barGroup: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barLabel: {
    width: 40,
    fontSize: 14,
    color: '#666',
  },
  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  barValue: {
    width: 30,
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  highlightCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  highlightName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  highlightValue: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
});
