import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  visible: boolean;
  imageUri: string | null;
  onConfirm: () => void;
  onRetake: () => void;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'space-between',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 50,
      paddingBottom: 16,
    },
    headerButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.white,
    },
    imageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 12,
    },
    retakeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      flex: 1,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.md,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    retakeText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.white,
    },
    confirmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      flex: 1.4,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.accent,
    },
    confirmText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.white,
    },
  });

export function ImagePreviewModal({ visible, imageUri, onConfirm, onRetake }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRetake}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onRetake} style={styles.headerButton}>
            <Ionicons name="close" size={26} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>预览照片</Text>
          <TouchableOpacity onPress={onConfirm} style={styles.headerButton}>
            <Ionicons name="checkmark-circle" size={28} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.retakeButton} onPress={onRetake} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={20} color={theme.colors.white} />
            <Text style={styles.retakeText}>重新拍摄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} activeOpacity={0.85}>
            <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.white} />
            <Text style={styles.confirmText}>确认上传</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}