import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Wardrobe } from '../types';

const WARDROBE_ICONS = ['👗', '👚', '👘', '👙', '🧥', '👔', '👖', '🎒', '💼', '👜', '👝', '👛', '🛍️', '🏠', '🗄️', '👒', '🧣', '👑'];

interface Props {
  visible: boolean;
  wardrobe?: Wardrobe | null;
  onClose: () => void;
  onSave: (name: string, icon: string) => void;
}

export default function WardrobeEditSheet({ visible, wardrobe, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('👗');

  useEffect(() => {
    if (wardrobe) {
      setName(wardrobe.name);
      setIcon(wardrobe.icon);
    } else {
      setName('');
      setIcon('👗');
    }
  }, [wardrobe, visible]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('请输入衣橱名称');
      return;
    }
    onSave(trimmedName, icon);
    onClose();
  };

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
          <Text style={styles.title}>
            {wardrobe ? '编辑衣橱' : '添加衣橱'}
          </Text>

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>衣橱名称</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="输入衣橱名称"
              placeholderTextColor="#999"
              maxLength={20}
            />

            <Text style={styles.label}>选择图标</Text>
            <View style={styles.iconGrid}>
              {WARDROBE_ICONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.iconButton,
                    icon === emoji && styles.iconButtonSelected,
                  ]}
                  onPress={() => setIcon(emoji)}
                >
                  <Text style={styles.iconText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.preview}>
              <Text style={styles.previewText}>{icon} {name || '衣橱名称'}</Text>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
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
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e8f4ff',
  },
  iconText: {
    fontSize: 24,
  },
  preview: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  previewText: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
