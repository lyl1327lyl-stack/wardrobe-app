import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Wardrobe } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  currentWardrobeId: number;
  onClose: () => void;
  onSelect: (wardrobeId: number) => void;
  onCreateNew?: () => void;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    dialogCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      width: '78%',
      maxWidth: 320,
    },
    dialogTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    dialogSubtitle: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 18,
    },
    optionsScroll: {
      maxHeight: 300,
    },
    optionsInner: {
      gap: 8,
      paddingBottom: 4,
    },
    dialogOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    optionIcon: {
      marginRight: 12,
    },
    dialogOptionText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    emptyHint: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
      marginTop: 4,
    },
    dialogButtonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    dialogConfirmBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    dialogConfirmText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    dialogCancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.borderLight,
      alignItems: 'center',
    },
    dialogCancelText: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
  });

export default function MoveToWardrobeSheet({
  visible,
  currentWardrobeId,
  onClose,
  onSelect,
  onCreateNew,
}: Props) {
  const { theme } = useTheme();
  const { wardrobes } = require('../store/wardrobeStore').useWardrobeStore();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // 可选目标 = 除当前衣橱外的其他衣橱
  const targets = wardrobes.filter((w: Wardrobe) => w.id !== currentWardrobeId);

  const handleSelect = (wardrobeId: number) => {
    onSelect(wardrobeId);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>移动到衣橱</Text>

          {targets.length === 0 ? (
            <>
              <Text style={styles.emptyHint}>
                当前只有一个衣橱，无法移动。{'\n'}请先新建一个衣橱。
              </Text>
              <View style={styles.dialogButtonRow}>
                <TouchableOpacity style={styles.dialogCancelBtn} onPress={onClose}>
                  <Text style={styles.dialogCancelText}>取消</Text>
                </TouchableOpacity>
                {onCreateNew && (
                  <TouchableOpacity
                    style={styles.dialogConfirmBtn}
                    onPress={() => {
                      onClose();
                      onCreateNew();
                    }}
                  >
                    <Text style={styles.dialogConfirmText}>新建衣橱</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.dialogSubtitle}>选择目标衣橱</Text>
              <ScrollView style={styles.optionsScroll} contentContainerStyle={styles.optionsInner} showsVerticalScrollIndicator={false}>
                {targets.map((wardrobe: Wardrobe) => (
                  <TouchableOpacity
                    key={wardrobe.id}
                    style={styles.dialogOption}
                    onPress={() => handleSelect(wardrobe.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={((Ionicons as any).glyphMap?.[wardrobe.icon as any] ? wardrobe.icon : 'shirt-outline') as any} size={20} color={theme.colors.textSecondary} style={styles.optionIcon} />
                    <Text style={styles.dialogOptionText}>{wardrobe.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.dialogButtonRow}>
                <TouchableOpacity style={styles.dialogCancelBtn} onPress={onClose}>
                  <Text style={styles.dialogCancelText}>取消</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
