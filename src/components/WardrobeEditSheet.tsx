import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Wardrobe } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  visible: boolean;
  wardrobe?: Wardrobe | null;
  onClose: () => void;
  onSave: (name: string) => void;
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
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingBottom: 34,
      ...theme.shadows.lg,
    },
    handle: {
      width: 38,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.background,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.colors.text,
    },
    charCount: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginLeft: 8,
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 15,
      borderRadius: 14,
      marginTop: 24,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    saveBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
  });

export default function WardrobeEditSheet({ visible, wardrobe, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [name, setName] = useState('');

  const isEditing = !!wardrobe;

  useEffect(() => {
    if (visible) {
      setName(wardrobe ? wardrobe.name : '');
    }
  }, [wardrobe, visible]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('请输入衣橱名称');
      return;
    }
    onSave(trimmed);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* 头部 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEditing ? '编辑衣橱' : '新建衣橱'}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>衣橱名称</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="file-tray-full-outline"
                size={18}
                color={theme.colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="例如：夏季衣橱、工作装…"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={20}
                autoFocus
              />
              <Text style={styles.charCount}>{name.length}/20</Text>
            </View>

            <TouchableOpacity onPress={handleSave} activeOpacity={0.85}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveBtn}
              >
                <Ionicons name={isEditing ? 'checkmark' : 'add'} size={18} color="#fff" />
                <Text style={styles.saveBtnText}>{isEditing ? '保存修改' : '创建衣橱'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
