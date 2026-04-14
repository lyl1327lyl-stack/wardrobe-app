import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { processImage } from '../utils/imageUtils';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
interface Props {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (uri: string, removeBg: boolean) => void;
}

type Step = 'source' | 'edit';

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },

    // ===== 步骤1: 选择图片来源 =====
    sourceSheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
    },
    handleBar: {
      width: 36,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 20,
    },
    sourceTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 24,
    },
    sourceButtons: {
      paddingHorizontal: 24,
      gap: 12,
    },
    sourceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      ...theme.shadows.md,
    },
    sourceBtnSecondary: {
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    sourceBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.white,
    },
    sourceBtnTextSecondary: {
      color: theme.colors.text,
    },
    cancelBtn: {
      marginTop: 16,
      marginHorizontal: 24,
      paddingVertical: 14,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
    },

    // ===== 步骤2: 编辑页面 =====
    editOverlay: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    editHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 8,
      height: 56,
      backgroundColor: theme.colors.background,
    },
    editHeaderBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editHeaderTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
    },
    editContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editPreviewBg: {
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    editPreviewImage: {
      width: '100%',
      height: '100%',
    },
    editFooter: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      paddingTop: 16,
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    bottomActionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    actionBtnPrimary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    actionBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    actionBtnTextPrimary: {
      color: theme.colors.white,
    },
    actionBtnDisabled: {
      opacity: 0.45,
    },
    processingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
    },
    processingContent: {
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 32,
      paddingVertical: 24,
      borderRadius: 16,
    },
    processingText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    processingSubtext: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
  });

export function ImagePickerModal({ visible, onClose, onImageSelected }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [step, setStep] = useState<Step>('source');
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep('source');
      setSelectedUri(null);
      setProcessedUri(null);
      setIsRemovingBg(false);
    }
  }, [visible]);

  // 选择图片 - 不裁剪，直接选完进入编辑页面
  const handlePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // 不裁剪，直接进入编辑页面
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedUri(result.assets[0].uri);
        setProcessedUri(null);
        setStep('edit');
      }
    } catch (e) {
      console.error('[ImagePicker] Pick failed:', e);
    }
  };

  // 拍照 - 不裁剪，直接拍完进入编辑页面
  const handleTake = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相机权限', '请在设置中开启相机权限');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // 不裁剪，直接进入编辑页面
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedUri(result.assets[0].uri);
        setProcessedUri(null);
        setStep('edit');
      }
    } catch (e) {
      console.error('[ImagePicker] Take photo failed:', e);
    }
  };

  // 抠图
  const handleRemoveBg = async () => {
    const sourceUri = processedUri || selectedUri;
    if (!sourceUri) return;

    setIsRemovingBg(true);
    try {
      const result = await processImage(sourceUri, true);
      if (result.thumbnailUri) {
        setProcessedUri(result.thumbnailUri);
      }
    } catch (e) {
      console.error('[ImagePicker] Remove bg failed:', e);
      Alert.alert('抠图失败', '请稍后重试');
    } finally {
      setIsRemovingBg(false);
    }
  };

  // 确认选择
  const handleConfirm = () => {
    const uriToUse = processedUri || selectedUri;
    if (uriToUse) {
      onImageSelected(uriToUse, !!processedUri);
      onClose();
    }
  };

  // 返回选择图片来源 - 清空状态，重新选择
  const handleBack = () => {
    setStep('source');
    setSelectedUri(null);
    setProcessedUri(null);
  };

  if (!visible) return null;

  // ===== 步骤1: 选择图片来源 =====
  if (step === 'source') {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.sourceSheet}>
              <View style={styles.handleBar} />
              <Text style={styles.sourceTitle}>添加衣服照片</Text>
              <View style={styles.sourceButtons}>
                <TouchableOpacity style={styles.sourceBtn} onPress={handlePick} activeOpacity={0.85}>
                  <Ionicons name="images" size={22} color={theme.colors.white} />
                  <Text style={styles.sourceBtnText}>从相册选择</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sourceBtn, styles.sourceBtnSecondary]}
                  onPress={handleTake}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={22} color={theme.colors.text} />
                  <Text style={[styles.sourceBtnText, styles.sourceBtnTextSecondary]}>拍照</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  // ===== 步骤2: 编辑页面 =====
  const isProcessed = !!processedUri;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleBack}>
      <View style={styles.editOverlay}>
        {/* 顶部导航栏 */}
        <View style={styles.editHeader}>
          <TouchableOpacity style={styles.editHeaderBtn} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.editHeaderTitle}>编辑照片</Text>
          <View style={styles.editHeaderBtn} />
        </View>

        {/* 图片预览区 */}
        <View style={styles.editContent}>
          <View style={styles.editPreviewBg}>
            <Image
              source={{ uri: (processedUri || selectedUri)! }}
              style={styles.editPreviewImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* 底部操作栏 */}
        <View style={styles.editFooter}>
          <View style={styles.bottomActionBar}>
            {/* 裁剪按钮 */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDisabled]}
              activeOpacity={0.7}
            >
              <Ionicons name="crop" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.actionBtnText, { color: theme.colors.textSecondary }]}>裁剪</Text>
            </TouchableOpacity>

            {/* AI抠图按钮 */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                isProcessed && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
                isRemovingBg && styles.actionBtnDisabled,
              ]}
              onPress={handleRemoveBg}
              disabled={isRemovingBg}
              activeOpacity={0.7}
            >
              {isRemovingBg ? (
                <>
                  <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                  <Text style={styles.actionBtnText}>抠图中...</Text>
                </>
              ) : (
                <>
                  <Ionicons name={isProcessed ? 'refresh' : 'sparkles'} size={20} color={isProcessed ? theme.colors.white : theme.colors.text} />
                  <Text style={[styles.actionBtnText, isProcessed && { color: theme.colors.white }]}>
                    {isProcessed ? '重新抠图' : 'AI抠图'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* 确认上传按钮 */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={handleConfirm}
              disabled={isRemovingBg}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload" size={20} color={theme.colors.white} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
                {isProcessed ? '已抠图' : '确认上传'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 处理中遮罩 */}
        {isRemovingBg && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingContent}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.processingText}>正在抠图...</Text>
              <Text style={styles.processingSubtext}>请稍候</Text>
            </View>
          </View>
        )}

      </View>
    </Modal>
  );
}
