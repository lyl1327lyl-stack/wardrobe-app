import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClothingItem } from '../types';
import { theme } from '../utils/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  clothingItem: ClothingItem;
  onSave: (reason: string) => void;
}

const REASON_OPTIONS = ['尺寸不合身', '颜色不喜欢', '质量问题', '不再喜欢', '旧了/磨损', '其他'];

export function EditDiscardReasonSheet({ visible, onClose, clothingItem, onSave }: Props) {
  const [selectedReason, setSelectedReason] = useState(clothingItem.discardReason || '');
  const [customReason, setCustomReason] = useState('');

  const handleSave = () => {
    const reason = selectedReason === '其他' ? customReason.trim() : selectedReason;
    if (reason) {
      onSave(reason);
    }
  };

  const handleClose = () => {
    setSelectedReason(clothingItem.discardReason || '');
    setCustomReason('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>编辑废弃原因</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            {REASON_OPTIONS.map(reason => (
              <TouchableOpacity
                key={reason}
                style={[styles.chip, selectedReason === reason && styles.chipSelected]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text style={[styles.chipText, selectedReason === reason && styles.chipTextSelected]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedReason === '其他' && (
            <TextInput
              style={styles.input}
              value={customReason}
              onChangeText={setCustomReason}
              placeholder="请输入原因"
              placeholderTextColor={theme.colors.textTertiary}
            />
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !selectedReason && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!selectedReason || (selectedReason === '其他' && !customReason.trim())}
            >
              <Text style={styles.saveBtnText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: '#F5E6DE',
    borderColor: '#C47D5A',
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#C47D5A',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
  saveBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});
