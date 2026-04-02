import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ClothingCard } from '../components/ClothingCard';
import { FilterBar } from '../components/FilterBar';
import { ClothingItem } from '../types';

export function WardrobeScreen() {
  const navigation = useNavigation<any>();
  const {
    isLoading,
    filterType,
    filterSeason,
    setFilterType,
    setFilterSeason,
    getFilteredClothing,
    loadData,
  } = useWardrobeStore();

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setRefreshKey(k => k + 1);
  }, [filterType, filterSeason]);

  const items = getFilteredClothing();

  const handlePress = (item: ClothingItem) => {
    navigation.navigate('ClothingDetail', { id: item.id });
  };

  return (
    <View style={styles.container}>
      <FilterBar
        selectedType={filterType}
        selectedSeason={filterSeason}
        onTypeChange={setFilterType}
        onSeasonChange={setFilterSeason}
      />
      <FlatList
        key={refreshKey}
        data={items}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <ClothingCard item={item} onPress={() => handlePress(item)} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>还没有添加衣服</Text>
            <Text style={styles.emptySubtext}>点击下方 + 按钮添加第一件衣服</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddClothing')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 30,
  },
});
