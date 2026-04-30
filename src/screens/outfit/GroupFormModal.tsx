import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../hooks/useTheme';
import { useWardrobeStore } from '../../store/wardrobeStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  editGroup?: { id: number; name: string; description: string } | null;
}

export function GroupFormModal({ visible, onClose, editGroup }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const addGroup = useWardrobeStore(state => state.addGroup);
  const updateGroup = useWardrobeStore(state => state.updateGroup);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = !!editGroup;

  useEffect(() => {
    if (editGroup) {
      setName(editGroup.name);
      setDescription(editGroup.description);
    } else {
      setName('');
      setDescription('');
    }
  }, [editGroup, visible]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (isEdit) {
        await updateGroup(editGroup!.id, trimmed, description.trim());
      } else {
        await addGroup(trimmed, description.trim());
      }
      onClose();
    } catch (e) {
      console.error('Failed to save group:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.handle} />
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {isEdit ? '编辑分组' : '新建分组'}
              </Text>

              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>名称</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }]}
                value={name}
                onChangeText={setName}
                placeholder="输入分组名称"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={20}
                autoFocus
              />

              <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>
                描述（选填）
              </Text>
              <TextInput
                style={[styles.input, styles.descInput, {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder="简单描述这个分组..."
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={50}
                multiline
              />

              <TouchableOpacity
                style={[styles.saveBtn, {
                  backgroundColor: name.trim() ? theme.colors.primary : theme.colors.borderLight,
                }]}
                onPress={handleSave}
                disabled={!name.trim() || saving}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>{saving ? '保存中...' : '确认'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  descInput: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  saveBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
