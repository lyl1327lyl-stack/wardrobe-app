import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Outfit } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = 72;

export interface OutfitWarningModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  outfits: Outfit[];
  confirmLabel: string;
  destructive?: boolean;
  description?: string;
  loading?: boolean;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dialog: {
      width: Math.min(SCREEN_WIDTH - 48, 360),
      maxHeight: '75%',
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      overflow: 'hidden',
    },
    header: {
      alignItems: 'center',
      paddingTop: 24,
      paddingHorizontal: 20,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.warning + '18',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 10,
      paddingHorizontal: 20,
    },
    outfitSection: {
      marginTop: 16,
      paddingHorizontal: 20,
    },
    outfitSectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textTertiary,
      marginBottom: 10,
      textAlign: 'center',
    },
    outfitList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
      paddingBottom: 4,
    },
    outfitItem: {
      width: THUMB_SIZE,
      alignItems: 'center',
    },
    outfitThumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 10,
      backgroundColor: theme.colors.borderLight,
    },
    outfitThumbPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    outfitName: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      lineHeight: 14,
      width: THUMB_SIZE,
    },
    description: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      lineHeight: 18,
      marginTop: 12,
      paddingHorizontal: 20,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginTop: 20,
      marginHorizontal: 20,
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    confirmBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtnWarning: {
      backgroundColor: theme.colors.warning,
    },
    confirmBtnDestructive: {
      backgroundColor: '#DC2626',
    },
    confirmBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    moreBadge: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 10,
      backgroundColor: theme.colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    moreBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
  });

export function OutfitWarningModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  outfits,
  confirmLabel,
  destructive = true,
  description,
  loading = false,
}: OutfitWarningModalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const maxShow = 6;
  const displayOutfits = outfits.slice(0, maxShow);
  const remaining = outfits.length - maxShow;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="warning" size={26} color={theme.colors.warning} />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          <Text style={styles.message}>{message}</Text>

          {outfits.length > 0 && (
            <View style={styles.outfitSection}>
              <Text style={styles.outfitSectionLabel}>
                受影响的搭配
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.outfitList}
              >
                {displayOutfits.map((o) => (
                  <View key={o.id} style={styles.outfitItem}>
                    {o.thumbnailUri ? (
                      <Image
                        source={{ uri: o.thumbnailUri }}
                        style={styles.outfitThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.outfitThumb, styles.outfitThumbPlaceholder]}>
                        <Ionicons
                          name="shirt-outline"
                          size={24}
                          color={theme.colors.border}
                        />
                      </View>
                    )}
                    <Text style={styles.outfitName} numberOfLines={1}>
                      {o.name || '未命名搭配'}
                    </Text>
                  </View>
                ))}
                {remaining > 0 && (
                  <View style={styles.outfitItem}>
                    <View style={styles.moreBadge}>
                      <Text style={styles.moreBadgeText}>+{remaining}</Text>
                    </View>
                    <Text style={styles.outfitName}>更多搭配</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {description && <Text style={styles.description}>{description}</Text>}

          <View style={styles.divider} />

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                destructive ? styles.confirmBtnDestructive : styles.confirmBtnWarning,
                loading && { opacity: 0.6 },
              ]}
              onPress={onConfirm}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.confirmBtnText}>
                {loading ? '处理中...' : confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
