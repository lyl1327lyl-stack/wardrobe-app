import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

const DISCARD_REASONS = [
  { label: '不再喜欢', icon: 'heart-dislike-outline' },
  { label: '尺码不合适', icon: 'resize-outline' },
  { label: '质量有问题', icon: 'warning-outline' },
  { label: '起球/变形', icon: 'shirt-outline' },
  { label: '重复购买', icon: 'copy-outline' },
  { label: '过时/旧款', icon: 'time-outline' },
  { label: '其他', icon: 'ellipsis-horizontal' },
];

interface BatchDiscardReasonSheetProps {
  visible: boolean;
  onClose: () => void;
  itemCount: number;
  onConfirm: (reason: string) => void;
}

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
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 50,
    },
    handle: {
      width: 36,
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
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    reasonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    reasonChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    reasonChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    reasonChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    reasonChipTextActive: {
      color: theme.colors.white,
    },
    customInputSection: {
      marginBottom: 20,
    },
    customInputLabel: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginBottom: 8,
      fontWeight: '500',
    },
    customInput: {
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.colors.text,
    },
    confirmBtn: {
      backgroundColor: theme.colors.warning,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    confirmBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.white,
    },
    cancelBtn: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    cancelBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
  });

export function BatchDiscardReasonSheet({
  visible,
  onClose,
  itemCount,
  onConfirm,
}: BatchDiscardReasonSheetProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [visible]);

  useEffect(() => {
    if (showCustomInput) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [showCustomInput]);

  const handleConfirm = () => {
    let reason = '';
    if (selectedReason) {
      if (selectedReason === '其他' && customReason.trim()) {
        reason = customReason.trim();
      } else if (selectedReason !== '其他') {
        reason = selectedReason;
      }
    }
    onConfirm(reason);
    resetState();
    onClose();
  };

  const resetState = () => {
    setSelectedReason(null);
    setCustomReason('');
    setShowCustomInput(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const isConfirmDisabled = selectedReason === '其他' && !customReason.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>批量丢弃原因</Text>
              <Text style={styles.subtitle}>为 {itemCount} 件衣服选择丢弃原因</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 预设原因 */}
            <View style={styles.reasonGrid}>
              {DISCARD_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason.label}
                  style={[
                    styles.reasonChip,
                    selectedReason === reason.label && styles.reasonChipActive,
                  ]}
                  onPress={() => {
                    setSelectedReason(reason.label);
                    if (reason.label === '其他') {
                      setShowCustomInput(true);
                    } else {
                      setShowCustomInput(false);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={reason.icon as any}
                    size={16}
                    color={selectedReason === reason.label ? theme.colors.white : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.reasonChipText,
                      selectedReason === reason.label && styles.reasonChipTextActive,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 自定义原因输入 */}
            {showCustomInput && (
              <View style={styles.customInputSection}>
                <Text style={styles.customInputLabel}>输入原因</Text>
                <TextInput
                  style={styles.customInput}
                  value={customReason}
                  onChangeText={setCustomReason}
                  placeholder="请输入丢弃原因..."
                  placeholderTextColor={theme.colors.textTertiary}
                  maxLength={50}
                  autoFocus
                />
              </View>
            )}

            {/* 确认按钮 */}
            <TouchableOpacity
              style={[styles.confirmBtn, isConfirmDisabled && { opacity: 0.5 }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
              disabled={isConfirmDisabled}
            >
              <Text style={styles.confirmBtnText}>移入废衣篓</Text>
            </TouchableOpacity>

            {/* 取消按钮 */}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>取消</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}