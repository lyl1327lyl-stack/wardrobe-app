import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { CanvasBackground } from '../../store/outfitStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  currentBackground: CanvasBackground;
  onSelectBackground: (background: CanvasBackground) => void;
}

const PRESET_BACKGROUNDS: CanvasBackground[] = [
  { type: 'none', value: '' },
  { type: 'color', value: '#FFFFFF' },
  { type: 'color', value: '#F5F5F5' },
  { type: 'color', value: '#FFF8E1' },
  { type: 'color', value: '#E8F5E9' },
  { type: 'color', value: '#E3F2FD' },
  { type: 'color', value: '#FCE4EC' },
  { type: 'color', value: '#F3E5F5' },
  { type: 'color', value: '#ECEFF1' },
  { type: 'color', value: '#263238' },
];

export function BackgroundPicker({
  visible,
  onClose,
  currentBackground,
  onSelectBackground,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleSelect = (bg: CanvasBackground) => {
    onSelectBackground(bg);
    onClose();
  };

  const isSelected = (bg: CanvasBackground) => {
    return bg.type === currentBackground.type && bg.value === currentBackground.value;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>选择背景</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {PRESET_BACKGROUNDS.map((bg, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorItem,
                  { backgroundColor: bg.type === 'none' ? theme.colors.card : bg.value },
                  isSelected(bg) && styles.colorItemSelected,
                ]}
                onPress={() => handleSelect(bg)}
              >
                {bg.type === 'none' && (
                  <Ionicons name="ban-outline" size={24} color={theme.colors.textTertiary} />
                )}
                {isSelected(bg) && (
                  <View style={styles.checkMark}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.hint}>点击选择画板背景颜色</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      width: SCREEN_WIDTH - 48,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    colorItem: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    colorItemSelected: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    checkMark: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hint: {
      marginTop: 16,
      fontSize: 12,
      color: theme.colors.textTertiary,
      textAlign: 'center',
    },
  });
