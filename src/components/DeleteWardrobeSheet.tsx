import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Wardrobe } from '../types';

interface Props {
  visible: boolean;
  wardrobe: Wardrobe | null;
  onClose: () => void;
  onConfirm: (action: 'move' | 'trash' | 'delete') => void;
}

export default function DeleteWardrobeSheet({ visible, wardrobe, onClose, onConfirm }: Props) {
  const [selectedAction, setSelectedAction] = useState<'move' | 'trash' | 'delete'>('move');

  useEffect(() => {
    if (visible) {
      setSelectedAction('move');
    }
  }, [visible]);

  const handleConfirm = () => {
    onConfirm(selectedAction);
  };

  if (!wardrobe) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>删除「{wardrobe.name}」</Text>

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>
              该衣橱下有多件衣物，请选择处理方式：
            </Text>

            <TouchableOpacity
              style={[
                styles.option,
                selectedAction === 'move' && styles.optionSelected,
              ]}
              onPress={() => setSelectedAction('move')}
            >
              <View style={styles.radioOuter}>
                {selectedAction === 'move' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>移到默认衣橱</Text>
                <Text style={styles.optionDesc}>衣物将合并到「我的衣橱」</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selectedAction === 'trash' && styles.optionSelected,
              ]}
              onPress={() => setSelectedAction('trash')}
            >
              <View style={styles.radioOuter}>
                {selectedAction === 'trash' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>移到废衣篓</Text>
                <Text style={styles.optionDesc}>衣物可从废衣篓恢复</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selectedAction === 'delete' && styles.optionSelected,
                styles.dangerOption,
              ]}
              onPress={() => setSelectedAction('delete')}
            >
              <View style={styles.radioOuter}>
                {selectedAction === 'delete' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, styles.dangerText]}>彻底删除</Text>
                <Text style={styles.optionDesc}>衣物将无法恢复</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  selectedAction === 'delete' && styles.deleteConfirmButton,
                ]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmText}>删除</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 16,
    color: '#333',
  },
  content: {
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e8f4ff',
  },
  dangerOption: {
    backgroundColor: '#fff5f5',
  },
  dangerOptionSelected: {
    borderColor: '#ff3b30',
    backgroundColor: '#ffe8e8',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  optionDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  dangerText: {
    color: '#ff3b30',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
  },
  deleteConfirmButton: {
    backgroundColor: '#ff3b30',
  },
  confirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
