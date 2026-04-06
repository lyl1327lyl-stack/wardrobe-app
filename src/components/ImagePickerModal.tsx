import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickImage, takePhoto } from '../utils/imageUtils';
import { theme } from '../utils/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (uri: string) => void;
}

type Step = 'select' | 'preview';

export function ImagePickerModal({ visible, onClose, onImageSelected }: Props) {
  const [step, setStep] = useState<Step>('select');
  const [selectedUri, setSelectedUri] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setStep('select');
      setSelectedUri(null);
    }
  }, [visible]);

  const handlePick = async () => {
    const uri = await pickImage();
    if (uri) {
      setSelectedUri(uri);
      setStep('preview');
    }
  };

  const handleTake = async () => {
    const uri = await takePhoto();
    if (uri) {
      setSelectedUri(uri);
      setStep('preview');
    }
  };

  const handleConfirm = () => {
    if (selectedUri) {
      onImageSelected(selectedUri);
      onClose();
    }
  };

  const handleRetake = () => {
    setSelectedUri(null);
    setStep('select');
  };

  const handleClose = () => {
    setStep('select');
    setSelectedUri(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      {step === 'select' ? (
        <TouchableOpacity style={styles.overlay} onPress={handleClose} activeOpacity={1}>
          <View style={styles.content}>
            <Text style={styles.title}>添加衣服照片</Text>
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.button} onPress={handlePick} activeOpacity={0.8}>
                <Ionicons name="images" size={20} color={theme.colors.white} />
                <Text style={styles.buttonText}>从相册选择</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buttonOutline} onPress={handleTake} activeOpacity={0.8}>
                <Ionicons name="camera" size={20} color={theme.colors.primary} />
                <Text style={styles.buttonOutlineText}>拍照</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={previewStyles.overlay}>
          <View style={previewStyles.header}>
            <TouchableOpacity onPress={handleRetake} style={previewStyles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.white} />
            </TouchableOpacity>
            <Text style={previewStyles.headerTitle}>预览照片</Text>
            <TouchableOpacity onPress={handleConfirm} style={previewStyles.headerBtn}>
              <Ionicons name="checkmark-circle" size={28} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
          <View style={previewStyles.imageContainer}>
            <Image source={{ uri: selectedUri! }} style={previewStyles.image} resizeMode="contain" />
          </View>
          <View style={previewStyles.footer}>
            <TouchableOpacity style={previewStyles.retakeBtn} onPress={handleRetake} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={18} color={theme.colors.white} />
              <Text style={previewStyles.retakeBtnText}>重新选择</Text>
            </TouchableOpacity>
            <TouchableOpacity style={previewStyles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Ionicons name="cloud-upload" size={18} color={theme.colors.white} />
              <Text style={previewStyles.confirmBtnText}>确认上传</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    padding: 28,
    width: '82%',
    maxWidth: 320,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: theme.colors.text,
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  buttons: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  buttonOutlineText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
});

const previewStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerBtn: {
    width: 48,
    height: 48,
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
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  retakeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
  },
  confirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.accent,
    ...theme.shadows.md,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
  },
});
