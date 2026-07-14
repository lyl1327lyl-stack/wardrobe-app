import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Wardrobe } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  visible: boolean;
  wardrobe: Wardrobe | null;
  onClose: () => void;
  onConfirm: (action: 'move' | 'trash' | 'delete') => void;
}

const OPTIONS: { key: 'move' | 'trash' | 'delete'; icon: string; title: string; desc: string; danger?: boolean }[] = [
  { key: 'move', icon: 'swap-horizontal-outline', title: '移到默认衣橱', desc: '衣物将合并到默认衣橱' },
  { key: 'trash', icon: 'trash-outline', title: '移到废衣篓', desc: '衣物可从废衣篓恢复' },
  { key: 'delete', icon: 'close-circle-outline', title: '彻底删除', desc: '衣物将无法恢复', danger: true },
];

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingBottom: 34,
      ...theme.shadows.lg,
    },
    handle: {
      width: 38,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
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
    warnBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.warning + '15',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    warnText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 19,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
      marginBottom: 10,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    optionDangerSelected: {
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.danger + '10',
    },
    optionIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    checkMark: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    optionInfo: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    optionDesc: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    btnRow: {
      flexDirection: 'row',
      marginTop: 22,
      gap: 12,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    confirmBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    confirmText: {
      fontSize: 15,
      color: '#fff',
      fontWeight: '700',
    },
  });

export default function DeleteWardrobeSheet({ visible, wardrobe, onClose, onConfirm }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selected, setSelected] = useState<'move' | 'trash' | 'delete'>('move');

  useEffect(() => {
    if (visible) setSelected('move');
  }, [visible]);

  if (!wardrobe) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* 头部 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>删除「{wardrobe.name}」</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* 警告横幅 */}
            <View style={styles.warnBanner}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} />
              <Text style={styles.warnText}>该衣橱下有衣物，请选择处理方式</Text>
            </View>

            {/* 选项 */}
            {OPTIONS.map(opt => {
              const isActive = selected === opt.key;
              const isDanger = opt.danger;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.option,
                    isActive && !isDanger && styles.optionSelected,
                    isActive && isDanger && styles.optionDangerSelected,
                  ]}
                  onPress={() => setSelected(opt.key)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: isDanger ? theme.colors.danger + '15' : theme.colors.primary + '12' },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={isDanger ? theme.colors.danger : theme.colors.primary}
                    />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionTitle, isDanger && { color: theme.colors.danger }]}>
                      {opt.title}
                    </Text>
                    <Text style={styles.optionDesc}>{opt.desc}</Text>
                  </View>
                  {isActive && (
                    <View style={[styles.checkMark, isDanger && { backgroundColor: theme.colors.danger }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* 按钮 */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => onConfirm(selected)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    selected === 'delete'
                      ? [theme.colors.danger, '#D32F2F']
                      : [theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
                />
                <Text style={styles.confirmText}>
                  {selected === 'move' ? '移动并删除' : selected === 'trash' ? '移入废衣篓' : '彻底删除'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
