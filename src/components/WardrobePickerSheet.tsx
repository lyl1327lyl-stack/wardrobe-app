import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Wardrobe } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useWardrobeStore } from '../store/wardrobeStore';

interface Props {
  visible: boolean;
  currentWardrobeId: number;
  onClose: () => void;
  onSelect: (wardrobeId: number) => void;
}

export function WardrobePickerSheet({
  visible,
  currentWardrobeId,
  onClose,
  onSelect,
}: Props) {
  const wardrobes = useWardrobeStore(state => state.wardrobes);
  const { theme } = useTheme();

  const handleSelect = (wardrobeId: number) => {
    onSelect(wardrobeId);
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '60%',
      paddingBottom: 34,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      marginBottom: 10,
    },
    optionSelected: {
      backgroundColor: `${theme.colors.primary}15`,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    optionIconText: {
      fontSize: 20,
    },
    optionText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
    optionTextSelected: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    checkmark: {
      marginLeft: 8,
    },
    currentBadge: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      backgroundColor: theme.colors.borderLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      overflow: 'hidden',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>选择衣橱</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {wardrobes.map((wardrobe: Wardrobe) => {
              const isCurrent = wardrobe.id === currentWardrobeId;
              return (
                <TouchableOpacity
                  key={wardrobe.id}
                  style={[styles.option, isCurrent && styles.optionSelected]}
                  onPress={() => handleSelect(wardrobe.id)}
                >
                  <View style={styles.optionIcon}>
                    <Text style={styles.optionIconText}>{wardrobe.icon || '👔'}</Text>
                  </View>
                  <Text style={[styles.optionText, isCurrent && styles.optionTextSelected]}>
                    {wardrobe.name}
                  </Text>
                  {isCurrent && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                    </View>
                  )}
                  {!isCurrent && (
                    <Text style={styles.currentBadge}>可选</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}