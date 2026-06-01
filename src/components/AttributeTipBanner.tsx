import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { AttributeTip } from '../services/attributeTips';

interface AttributeTipIconProps {
  tips: AttributeTip[];
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    iconBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    badge: {
      position: 'absolute',
      top: -3,
      right: -3,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#D4A99A',
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: {
      fontSize: 8,
      fontWeight: '700',
      color: '#fff',
    },
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    popup: {
      width: '80%',
      backgroundColor: theme.colors.card,
      borderRadius: 18,
      padding: 20,
      ...theme.shadows.lg,
    },
    popupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    popupIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    popupTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 10,
    },
    tipDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 5,
    },
    tipDotHigh: {
      backgroundColor: '#D4A99A',
    },
    tipDotMedium: {
      backgroundColor: theme.colors.textTertiary,
    },
    tipMessage: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.text,
    },
    tipDetail: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    closeBtn: {
      marginTop: 8,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
    },
    closeBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
  });

export function AttributeTipIcon({ tips }: AttributeTipIconProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [showPopup, setShowPopup] = useState(false);

  if (tips.length === 0) return null;

  return (
    <>
      <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPopup(true)} activeOpacity={0.7}>
        <Ionicons name="bulb-outline" size={14} color={theme.colors.primary} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{tips.length}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={showPopup} transparent animationType="fade" onRequestClose={() => setShowPopup(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowPopup(false)} />
          <View style={styles.popup}>
            <View style={styles.popupHeader}>
              <View style={styles.popupIcon}>
                <Ionicons name="bulb-outline" size={14} color={theme.colors.primary} />
              </View>
              <Text style={styles.popupTitle}>完善信息，提升推荐质量</Text>
            </View>
            {tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={[styles.tipDot, tip.severity === 'high' ? styles.tipDotHigh : styles.tipDotMedium]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tipMessage}>{tip.message}</Text>
                  <Text style={styles.tipDetail}>{tip.detail}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPopup(false)}>
              <Text style={styles.closeBtnText}>知道了</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
