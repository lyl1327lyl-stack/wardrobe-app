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
import { ClothingItem, SOLD_PLATFORMS } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface SellItemSheetProps {
  visible: boolean;
  onClose: () => void;
  clothingItem: ClothingItem;
  onSell: (soldPrice: number, soldPlatform: string) => void;
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
      maxHeight: '80%',
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
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    inputSection: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginBottom: 10,
      fontWeight: '500',
    },
    priceInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    pricePrefix: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginRight: 4,
    },
    priceInput: {
      flex: 1,
      fontSize: 18,
      color: theme.colors.text,
      paddingVertical: 14,
    },
    platformGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    platformChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    platformChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    platformChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    platformChipTextActive: {
      color: theme.colors.white,
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
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    confirmBtnDisabled: {
      backgroundColor: theme.colors.border,
    },
    confirmBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.white,
    },
  });

export function SellItemSheet({
  visible,
  onClose,
  clothingItem,
  onSell,
}: SellItemSheetProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [soldPrice, setSoldPrice] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPlatform, setCustomPlatform] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (showCustomInput) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [showCustomInput]);

  const handleConfirm = () => {
    const price = parseFloat(soldPrice);
    if (isNaN(price) || price <= 0) {
      return;
    }
    let platform = selectedPlatform || '';
    if (platform === '其他' && customPlatform.trim()) {
      platform = customPlatform.trim();
    }
    onSell(price, platform);
    resetState();
    onClose();
  };

  const resetState = () => {
    setSoldPrice('');
    setSelectedPlatform(null);
    setCustomPlatform('');
    setShowCustomInput(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const isValid = () => {
    const price = parseFloat(soldPrice);
    if (isNaN(price) || price <= 0) return false;
    if (!selectedPlatform) return false;
    if (selectedPlatform === '其他' && !customPlatform.trim()) return false;
    return true;
  };

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
            <Text style={styles.title}>确认卖出</Text>
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
            {/* 价格输入 */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>卖出价格</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.pricePrefix}>¥</Text>
                <TextInput
                  style={styles.priceInput}
                  value={soldPrice}
                  onChangeText={setSoldPrice}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* 平台选择 */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>销售平台</Text>
              <View style={styles.platformGrid}>
                {SOLD_PLATFORMS.map(platform => (
                  <TouchableOpacity
                    key={platform}
                    style={[
                      styles.platformChip,
                      selectedPlatform === platform && styles.platformChipActive,
                    ]}
                    onPress={() => {
                      setSelectedPlatform(platform);
                      setShowCustomInput(platform === '其他');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.platformChipText,
                        selectedPlatform === platform && styles.platformChipTextActive,
                      ]}
                    >
                      {platform}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 自定义平台输入 */}
            {showCustomInput && (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>平台名称</Text>
                <TextInput
                  style={styles.customInput}
                  value={customPlatform}
                  onChangeText={setCustomPlatform}
                  placeholder="请输入平台名称..."
                  placeholderTextColor={theme.colors.textTertiary}
                  maxLength={20}
                />
              </View>
            )}

            {/* 确认按钮 */}
            <TouchableOpacity
              style={[styles.confirmBtn, !isValid() && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.8}
              disabled={!isValid()}
            >
              <Text style={styles.confirmBtnText}>确认卖出</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}