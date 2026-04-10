import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { Outfit } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 16,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    headerCount: {
      fontSize: 14,
      color: theme.colors.textTertiary,
    },
    list: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 100,
      flexGrow: 1,
    },
    row: {
      justifyContent: 'space-between',
    },
    outfitCard: {
      width: '48%',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      marginBottom: 16,
      ...theme.shadows.md,
    },
    outfitPreview: {
      aspectRatio: 1,
      backgroundColor: theme.colors.borderLight,
    },
    gridPreview: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    gridThumb: {
      width: '50%',
      height: '50%',
      backgroundColor: theme.colors.borderLight,
    },
    gridThumbEmpty: {
      width: '50%',
      height: '50%',
      backgroundColor: theme.colors.border,
    },
    canvasThumb: {
      width: '100%',
      height: '100%',
      aspectRatio: 1,
      backgroundColor: theme.colors.borderLight,
    },
    emptyPreview: {
      height: 120,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    emptyPreviewText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    outfitInfo: {
      padding: 14,
    },
    outfitName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    outfitCount: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 4,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: 40,
    },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyCreateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.full,
      marginTop: 20,
      ...theme.shadows.sm,
    },
    emptyCreateBtnText: {
      color: theme.colors.white,
      fontSize: 14,
      fontWeight: '600',
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.lg,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modal: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      padding: 24,
      width: '100%',
      maxWidth: 340,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    modalInput: {
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      marginBottom: 8,
    },
    modalHint: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginBottom: 20,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancel: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    modalConfirm: {
      flex: 2,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    modalConfirmText: {
      fontSize: 15,
      color: theme.colors.white,
      fontWeight: '600',
    },
  });

export function OutfitsScreen() {
  const navigation = useNavigation<any>();
  const { outfits, clothing, deleteOutfit, addOutfit } = useWardrobeStore();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [showCreate, setShowCreate] = useState(false);
  const [newOutfitName, setNewOutfitName] = useState('');

  const getOutfitItems = (outfit: Outfit) => {
    return outfit.itemIds
      .map(id => clothing.find(c => c.id === id))
      .filter(Boolean);
  };

  const handleDelete = (outfit: Outfit) => {
    Alert.alert('确认删除', `确定要删除搭配「${outfit.name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => deleteOutfit(outfit.id),
      },
    ]);
  };

  const handleCreateOutfit = async () => {
    if (!newOutfitName.trim()) {
      Alert.alert('请输入搭配名称');
      return;
    }
    try {
      await addOutfit({
        name: newOutfitName.trim(),
        itemIds: [],
        createdAt: new Date().toISOString(),
      });
      setNewOutfitName('');
      setShowCreate(false);
    } catch {
      Alert.alert('创建失败，请重试');
    }
  };

  const renderOutfit = ({ item }: { item: Outfit }) => {
    const items = getOutfitItems(item);
    return (
      <TouchableOpacity
        style={styles.outfitCard}
        onPress={() => navigation.navigate('OutfitDetail', { outfitId: item.id })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.75}
      >
        <View style={styles.outfitPreview}>
          {item.thumbnailUri ? (
            <Image source={{ uri: item.thumbnailUri }} style={styles.canvasThumb} />
          ) : items.length > 0 ? (
            <View style={styles.gridPreview}>
              {items.slice(0, 4).map((c) => (
                <Image key={c!.id} source={{ uri: c!.thumbnailUri }} style={styles.gridThumb} />
              ))}
              {items.length < 4 && Array.from({ length: 4 - items.length }).map((_, idx) => (
                <View key={`empty-${idx}`} style={styles.gridThumbEmpty} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyPreview}>
              <Ionicons name="images-outline" size={32} color={theme.colors.border} />
              <Text style={styles.emptyPreviewText}>暂无衣服</Text>
            </View>
          )}
        </View>
        <View style={styles.outfitInfo}>
          <Text style={styles.outfitName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.outfitCount}>{items.length} 件</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 统一顶栏 */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>我的搭配</Text>
          <Text style={styles.headerCount}>{outfits.length} 个搭配</Text>
        </View>
      </View>
      <FlatList
        data={outfits}
        keyExtractor={item => item.id.toString()}
        renderItem={renderOutfit}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="grid-outline" size={40} color={theme.colors.border} />
            </View>
            <Text style={styles.emptyTitle}>还没有搭配</Text>
            <Text style={styles.emptySubtext}>在衣服详情页可以创建搭配</Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={() => setShowCreate(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={theme.colors.white} />
              <Text style={styles.emptyCreateBtnText}>创建搭配</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={theme.colors.white} />
      </TouchableOpacity>

      <Modal visible={showCreate} animationType="fade" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>创建新搭配</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); setNewOutfitName(''); }} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              value={newOutfitName}
              onChangeText={setNewOutfitName}
              placeholder="搭配名称，如：周末休闲"
              placeholderTextColor={theme.colors.textTertiary}
              autoFocus
            />
            <Text style={styles.modalHint}>创建后，在衣服详情页可以将其加入搭配</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowCreate(false); setNewOutfitName(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCreateOutfit} activeOpacity={0.8}>
                <Text style={styles.modalConfirmText}>创建</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
