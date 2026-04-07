import React, { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ClothingItem, Outfit } from '../types';
import { theme } from '../utils/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  clothingItem: ClothingItem;
}

export function OutfitPickerModal({ visible, onClose, clothingItem }: Props) {
  const { outfits, clothing, addOutfit, updateOutfit } = useWardrobeStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newOutfitName, setNewOutfitName] = useState('');
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<number[]>([]);
  const [originallySelectedIds, setOriginallySelectedIds] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 当 modal 打开时，初始化已选中的搭配（已经在该搭配中的）
  useEffect(() => {
    if (visible) {
      const alreadyInOutfits = outfits
        .filter(outfit => outfit.itemIds.includes(clothingItem.id))
        .map(outfit => outfit.id);
      setSelectedOutfitIds(alreadyInOutfits);
      setOriginallySelectedIds(alreadyInOutfits);
      setHasChanges(false);
      setShowCreate(false);
    }
  }, [visible]);

  const getOutfitItems = (outfit: Outfit) => {
    return outfit.itemIds
      .map(id => clothing.find(c => c.id === id))
      .filter(Boolean);
  };

  const isItemInOutfit = (outfit: Outfit) => outfit.itemIds.includes(clothingItem.id);

  const toggleOutfit = (outfit: Outfit) => {
    // 勾选状态仅由 selectedOutfitIds 决定
    setSelectedOutfitIds(prev =>
      prev.includes(outfit.id) ? prev.filter(id => id !== outfit.id) : [...prev, outfit.id]
    );
    setHasChanges(true);
  };

  const handleConfirm = async () => {
    // 需要移除的搭配（之前有，现在取消勾选）
    const toRemove = originallySelectedIds.filter(id => !selectedOutfitIds.includes(id));
    // 需要添加的搭配（之前没有，现在勾选）
    const toAdd = selectedOutfitIds.filter(id => !originallySelectedIds.includes(id));

    if (toRemove.length === 0 && toAdd.length === 0) {
      onClose();
      return;
    }

    for (const outfitId of toRemove) {
      const outfit = outfits.find(o => o.id === outfitId);
      if (outfit) {
        const newItemIds = outfit.itemIds.filter(id => id !== clothingItem.id);
        const newPositions = { ...outfit.itemPositions };
        delete newPositions[clothingItem.id];
        await updateOutfit({ ...outfit, itemIds: newItemIds, itemPositions: newPositions });
      }
    }

    for (const outfitId of toAdd) {
      const outfit = outfits.find(o => o.id === outfitId);
      if (outfit) {
        const canvasW = Dimensions.get('window').width;
        const canvasH = canvasW * 1.2;
        const itemSize = 120;
        const defaultPos = {
          x: canvasW / 2 - itemSize / 2,
          y: canvasH / 2 - itemSize / 2,
          scale: 1,
        };
        await updateOutfit({
          ...outfit,
          itemIds: [...outfit.itemIds, clothingItem.id],
          itemPositions: { ...(outfit.itemPositions || {}), [clothingItem.id]: defaultPos },
        });
      }
    }

    const msgs = [];
    if (toAdd.length > 0) msgs.push(`添加到 ${toAdd.length} 个搭配`);
    if (toRemove.length > 0) msgs.push(`从 ${toRemove.length} 个搭配移除`);
    Alert.alert('已更新', msgs.join('，'));
    setSelectedOutfitIds([]);
    onClose();
  };

  const handleCreateOutfit = async () => {
    if (!newOutfitName.trim()) {
      Alert.alert('请输入搭配名称');
      return;
    }
    try {
      // 默认位置：画板中央
      const canvasW = Dimensions.get('window').width;
      const canvasH = canvasW * 1.2;
      const itemSize = 120;
      const defaultPos = {
        x: canvasW / 2 - itemSize / 2,
        y: canvasH / 2 - itemSize / 2,
        scale: 1,
      };
      await addOutfit({
        name: newOutfitName.trim(),
        itemIds: [clothingItem.id],
        itemPositions: { [clothingItem.id]: defaultPos },
        createdAt: new Date().toISOString(),
      });
      setNewOutfitName('');
      setShowCreate(false);
      onClose();
      Alert.alert('搭配创建成功', `已创建 "${newOutfitName.trim()}" 并添加了这件衣服`);
    } catch {
      Alert.alert('创建失败，请重试');
    }
  };

  const renderOutfit = ({ item }: { item: Outfit }) => {
    const items = getOutfitItems(item);
    const isSelected = selectedOutfitIds.includes(item.id);
    const isInOutfit = isItemInOutfit(item);
    return (
      <TouchableOpacity
        style={[styles.outfitItem, isSelected && styles.outfitItemActive]}
        onPress={() => toggleOutfit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.outfitPreview}>
          {items.slice(0, 4).map((c, idx) => (
            <Image key={c!.id} source={{ uri: c!.thumbnailUri }} style={styles.outfitThumb} />
          ))}
          {items.length === 0 && (
            <View style={styles.emptyOutfitPreview}>
              <Ionicons name="image-outline" size={18} color={theme.colors.border} />
            </View>
          )}
        </View>
        <View style={styles.outfitInfo}>
          <Text style={styles.outfitName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.outfitCount}>
            {items.length} 件 {isInOutfit && '· 已添加'}
          </Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
          {isSelected && <Ionicons name="checkmark" size={14} color={theme.colors.white} weight="bold" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={styles.overlay} behavior="padding" keyboardVerticalOffset={0}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>加入搭配</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!showCreate ? (
            <>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreate(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.createButtonText}>创建新搭配</Text>
              </TouchableOpacity>

              <FlatList
                data={outfits}
                keyExtractor={item => item.id.toString()}
                renderItem={renderOutfit}
                style={styles.list}
                extraData={selectedOutfitIds}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Ionicons name="grid-outline" size={40} color={theme.colors.border} />
                    <Text style={styles.emptyText}>还没有搭配</Text>
                    <Text style={styles.emptySubtext}>点击上方创建第一个搭配</Text>
                  </View>
                }
              />

              {outfits.length > 0 && (
                <TouchableOpacity
                  style={[styles.confirmButton, !hasChanges && styles.confirmButtonDisabled]}
                  onPress={handleConfirm}
                  activeOpacity={0.8}
                  disabled={!hasChanges}
                >
                  <Text style={styles.confirmButtonText}>应用更改</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.createForm}>
              <Text style={styles.createTitle}>新建搭配</Text>
              <TextInput
                style={styles.input}
                value={newOutfitName}
                onChangeText={setNewOutfitName}
                placeholder="输入搭配名称，如：上班穿搭"
                placeholderTextColor={theme.colors.textTertiary}
                autoFocus
              />
              <View style={styles.selectedPreview}>
                <Image source={{ uri: clothingItem.thumbnailUri }} style={styles.selectedThumb} />
                <View>
                  <Text style={styles.selectedName}>{clothingItem.type} - {clothingItem.color}</Text>
                  <Text style={styles.selectedInfo}>将作为搭配的第一件衣服</Text>
                </View>
              </View>
              <View style={styles.createActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { setShowCreate(false); setNewOutfitName(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleCreateOutfit} activeOpacity={0.8}>
                  <Text style={styles.saveButtonText}>创建并添加</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  createButtonText: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  outfitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  outfitItemActive: {
    backgroundColor: `${theme.colors.primary}10`,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  outfitPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    width: 52,
  },
  outfitThumb: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: theme.colors.borderLight,
  },
  emptyOutfitPreview: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: theme.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitInfo: {
    flex: 1,
    marginLeft: 12,
  },
  outfitName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  outfitCount: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    ...theme.shadows.sm,
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  confirmButton: {
    margin: 16,
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  confirmButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  confirmButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  createForm: {
    padding: 20,
  },
  createTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    marginBottom: 16,
  },
  selectedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 20,
  },
  selectedThumb: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.borderLight,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  selectedInfo: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  createActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  saveButtonText: {
    fontSize: 15,
    color: theme.colors.white,
    fontWeight: '600',
  },
});
