import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { processImage } from '../utils/imageUtils';
import { registerCropCallback } from '../screens/ImageCropScreen';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { getRemoveBgCredits } from '../utils/backgroundRemoval';
interface Props {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (uri: string, removeBg: boolean, originalUri?: string) => void;
  // 可选：传入已有图片 URI，直接进入编辑模式（用于编辑已有衣服的照片）
  initialImageUri?: string;
  // 可选：原始图片 URI（裁剪/抠图前），用于重新编辑时保留原图
  originalImageUri?: string;
  // 可选：跳过编辑步骤，选择完图片后直接返回（用于"更换照片"场景）
  skipEdit?: boolean;
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
      flex: 1,
      backgroundColor: '#ffffff', // 白色背景，让透明PNG正确显示
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
    creditsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingBottom: 12,
    },
    creditsText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    creditsExhausted: {
      color: theme.colors.danger,
      fontWeight: '600',
    },
  });

export function ImagePickerModal({ visible, onClose, onImageSelected, initialImageUri, originalImageUri: initialOriginalUri, skipEdit }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<any>();

  const [step, setStep] = useState<Step>('source');
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [originalUri, setOriginalUri] = useState<string | null>(null);  // 原始图片路径（裁剪/抠图前）
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  // 用户是否明确点击了"AI抠图"（独立于裁剪状态）
  const [userRequestedRemoveBg, setUserRequestedRemoveBg] = useState(false);
  // 导航到裁剪页面时临时隐藏编辑页
  const [isCropNavigating, setIsCropNavigating] = useState(false);
  // Remove.bg 剩余免费额度
  const [creditsInfo, setCreditsInfo] = useState<{ remaining: number } | null>(null);

  useEffect(() => {
    if (!visible) {
      setStep('source');
      setSelectedUri(null);
      setProcessedUri(null);
      setOriginalUri(null);
      setIsRemovingBg(false);
      setUserRequestedRemoveBg(false);
      setIsCropNavigating(false);
      setCreditsInfo(null);
    } else if (initialImageUri) {
      // 编辑已有图片模式：直接进入编辑页面
      setStep('edit');
      setSelectedUri(initialImageUri);
      setProcessedUri(null);
      setOriginalUri(initialOriginalUri || initialImageUri);  // 编辑时使用传入的原图
      setUserRequestedRemoveBg(false);
      // 获取免费额度
      getRemoveBgCredits().then(setCreditsInfo).catch(() => setCreditsInfo(null));
    } else {
      // 新选图模式：进入编辑页时获取免费额度
      getRemoveBgCredits().then(setCreditsInfo).catch(() => setCreditsInfo(null));
    }
  }, [visible, initialImageUri, initialOriginalUri]);

  // 选择图片 - 跳过编辑模式则直接返回结果，否则进入编辑页面
  const handlePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (skipEdit) {
          // 跳过编辑：直接返回
          onImageSelected(uri, false, uri);
          onClose();
        } else {
          setSelectedUri(uri);
          setProcessedUri(null);
          setOriginalUri(uri);  // 新选择的图片作为原始图片
          setStep('edit');
        }
      }
    } catch (e) {
      console.error('[ImagePicker] Pick failed:', e);
    }
  };

  // 拍照 - 跳过编辑模式则直接返回结果，否则进入编辑页面
  const handleTake = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相机权限', '请在设置中开启相机权限');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (skipEdit) {
          onImageSelected(uri, false, uri);
          onClose();
        } else {
          setSelectedUri(uri);
          setProcessedUri(null);
          setOriginalUri(uri);  // 新拍照的图片作为原始图片
          setStep('edit');
        }
      }
    } catch (e) {
      console.error('[ImagePicker] Take photo failed:', e);
    }
  };

  // 抠图
  const handleRemoveBg = async () => {
    const sourceUri = processedUri || selectedUri;
    if (!sourceUri) return;
    if (creditsInfo && creditsInfo.remaining <= 0) return;

    setIsRemovingBg(true);
    try {
      const result = await processImage(sourceUri, true);
      if (result.imageUri) {
        setProcessedUri(result.imageUri);
        setUserRequestedRemoveBg(true); // 用户明确要求抠图
        // 扣减免费额度
        setCreditsInfo(prev => prev ? { ...prev, remaining: Math.max(0, prev.remaining - 1) } : null);
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
      // 用独立的 userRequestedRemoveBg 判断是否抠图，不用 processedUri（裁剪也会设置它）
      // originalUri 为原始图片路径（裁剪/抠图前），用于支持二次裁剪
      onImageSelected(uriToUse, userRequestedRemoveBg, originalUri || uriToUse);
      onClose();
    }
  };

  // 返回选择图片来源 - 清空状态，重新选择
  // 如果是编辑已有图片模式（initialImageUri），返回即关闭 Modal
  const handleBack = () => {
    if (initialImageUri) {
      // 编辑已有图片时，返回关闭 Modal
      onClose();
    } else {
      setStep('source');
      setSelectedUri(null);
      setProcessedUri(null);
      setUserRequestedRemoveBg(false);
    }
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
    <Modal visible={visible && !isCropNavigating} transparent animationType="fade" onRequestClose={handleBack}>
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
          {/* 免费额度提示 */}
          {creditsInfo !== null && (
            <View style={styles.creditsRow}>
              <Ionicons name="information-circle-outline" size={13} color={creditsInfo.remaining <= 0 ? theme.colors.danger : theme.colors.textSecondary} />
              <Text style={[styles.creditsText, creditsInfo.remaining <= 0 && styles.creditsExhausted]}>
                {creditsInfo.remaining <= 0
                  ? '免费抠图额度已用完'
                  : `免费抠图剩余 ${creditsInfo.remaining} 次`}
              </Text>
            </View>
          )}
          <View style={styles.bottomActionBar}>
            {/* 裁剪按钮 */}
            <TouchableOpacity
              style={[styles.actionBtn, isRemovingBg && styles.actionBtnDisabled]}
              activeOpacity={0.7}
              disabled={isRemovingBg}
              onPress={() => {
                // 优先使用 originalUri（原始图片），确保裁剪的是原图而非已裁剪过的图
                const uriToCrop = originalUri || processedUri || selectedUri;
                if (!uriToCrop) return;
                // 注册回调：裁剪完成后将结果写入 processedUri 并恢复本 Modal
                registerCropCallback((croppedUri: string) => {
                  setProcessedUri(croppedUri);
                  setIsCropNavigating(false);
                });
                // 隐藏本 Modal，push 到裁剪页面
                setIsCropNavigating(true);
                navigation.navigate('ImageCrop', { imageUri: uriToCrop });
              }}
            >
              <Ionicons name="crop" size={20} color={theme.colors.text} />
              <Text style={styles.actionBtnText}>裁剪</Text>
            </TouchableOpacity>

            {/* AI抠图按钮 — 只有用户明确点击过"AI抠图"才显示"重新抠图" */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                userRequestedRemoveBg && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
                (isRemovingBg || (creditsInfo !== null && creditsInfo.remaining <= 0)) && styles.actionBtnDisabled,
              ]}
              onPress={handleRemoveBg}
              disabled={isRemovingBg || (creditsInfo !== null && creditsInfo.remaining <= 0)}
              activeOpacity={0.7}
            >
              {isRemovingBg ? (
                <>
                  <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                  <Text style={styles.actionBtnText}>抠图中...</Text>
                </>
              ) : (
                <>
                  <Ionicons name={userRequestedRemoveBg ? 'refresh' : 'sparkles'} size={20} color={userRequestedRemoveBg ? theme.colors.white : theme.colors.text} />
                  <Text style={[styles.actionBtnText, userRequestedRemoveBg && { color: theme.colors.white }]}>
                    {creditsInfo !== null && creditsInfo.remaining <= 0 ? '额度用完' : (userRequestedRemoveBg ? '重新抠图' : 'AI抠图')}
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
                确认上传
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
