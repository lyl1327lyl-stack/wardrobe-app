import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image } from 'react-native';
import { pickImage, takePhoto } from '../utils/imageUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (uri: string) => void;
}

export function ImagePickerModal({ visible, onClose, onImageSelected }: Props) {
  const handlePick = async () => {
    const uri = await pickImage();
    if (uri) {
      onImageSelected(uri);
      onClose();
    }
  };

  const handleTake = async () => {
    const uri = await takePhoto();
    if (uri) {
      onImageSelected(uri);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.content}>
          <Text style={styles.title}>添加衣服照片</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={handlePick}>
              <Text style={styles.buttonText}>从相册选择</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleTake}>
              <Text style={styles.buttonText}>拍照</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttons: {
    gap: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
  },
  cancelText: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
  },
});
