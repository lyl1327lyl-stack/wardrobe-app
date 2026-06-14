import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { OutfitGroup } from '../types';

export interface OutfitAttributes {
  name: string;
  groupId: number;
  seasons: string[];
  tags: string[];
  notes: string;
}

interface Props {
  visible: boolean;
  initial: OutfitAttributes;
  groups: OutfitGroup[];
  onClose: () => void;
  onConfirm: (attrs: OutfitAttributes) => void;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      overflow: 'hidden',
    },
    handle: {
      width: 36, height: 4, backgroundColor: theme.colors.border,
      borderRadius: 2, alignSelf: 'center', marginTop: 12,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    closeBtn: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: theme.colors.background,
      justifyContent: 'center', alignItems: 'center',
    },
    body: { paddingHorizontal: 20, paddingVertical: 16 },
    field: { marginBottom: 18 },
    fieldLabel: {
      fontSize: 12, fontWeight: '600',
      color: theme.colors.textSecondary, marginBottom: 8,
    },
    nameInput: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, color: theme.colors.text,
    },
    notesInput: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, color: theme.colors.text,
      minHeight: 70, textAlignVertical: 'top',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
      backgroundColor: theme.colors.background, borderWidth: 1, borderColor: 'transparent',
    },
    chipActive: {
      backgroundColor: theme.colors.primary + '15',
      borderColor: theme.colors.primary,
    },
    chipText: { fontSize: 13, color: theme.colors.textSecondary },
    chipTextActive: { color: theme.colors.primary, fontWeight: '600' },
    chipRemove: { marginLeft: 4 },
    addTagChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
      borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border,
    },
    addTagText: { fontSize: 13, color: theme.colors.textTertiary },
    tagInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    tagInput: {
      flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: theme.colors.text,
    },
    footer: {
      flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14,
      borderTopWidth: 1, borderTopColor: theme.colors.borderLight,
    },
    saveBtn: {
      flex: 1, backgroundColor: theme.colors.primary,
      paddingVertical: 13, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  });

export function OutfitAttributesSheet({ visible, initial, groups, onClose, onConfirm }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const customSeasons = useCustomOptionsStore(s => s.seasons);
  const customTags = useCustomOptionsStore(s => s.tags);

  const [name, setName] = useState(initial.name);
  const [groupId, setGroupId] = useState(initial.groupId);
  const [seasons, setSeasons] = useState<string[]>(initial.seasons);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [notes, setNotes] = useState(initial.notes);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const wasVisibleRef = useRef(false);

  // 只在 sheet 打开瞬间（false→true）重置一次，避免编辑中途被预填值变化覆盖
  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setName(initial.name);
      setGroupId(initial.groupId);
      setSeasons(initial.seasons);
      setTags(initial.tags);
      setNotes(initial.notes);
      setTagInput('');
      setShowTagInput(false);
    }
    wasVisibleRef.current = visible;
  }, [visible, initial]);

  const toggleSeason = (s: string) => {
    setSeasons(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  };
  const toggleTag = (t: string) => {
    setTags(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));
  };
  const addCustomTag = () => {
    const t = tagInput.trim();
    if (!t) { setShowTagInput(false); return; }
    if (!tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
    setShowTagInput(false);
  };
  const handleSave = () => {
    onConfirm({ name: name.trim(), groupId, seasons, tags, notes: notes.trim() });
  };

  const availableTags = customTags.filter(t => !tags.includes(t));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>完善搭配信息</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* 名称 */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>名称</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="给这套搭配起个名字"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={30}
              />
            </View>

            {/* 分组 */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>分组</Text>
              <View style={styles.chipRow}>
                {groups.map(g => {
                  const active = g.id === groupId;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setGroupId(g.id)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 季节 */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>季节</Text>
              <View style={styles.chipRow}>
                {customSeasons.map(s => {
                  const active = seasons.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleSeason(s)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 标签 */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>标签</Text>
              <View style={styles.chipRow}>
                {tags.map(t => (
                  <TouchableOpacity
                    key={`sel-${t}`}
                    style={[styles.chip, styles.chipActive]}
                    onPress={() => toggleTag(t)}
                  >
                    <Text style={styles.chipTextActive}>{t}</Text>
                    <Ionicons name="close" size={12} color={theme.colors.primary} style={styles.chipRemove} />
                  </TouchableOpacity>
                ))}
                {availableTags.map(t => (
                  <TouchableOpacity
                    key={`opt-${t}`}
                    style={styles.chip}
                    onPress={() => toggleTag(t)}
                  >
                    <Text style={styles.chipText}>{t}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.addTagChip} onPress={() => setShowTagInput(true)}>
                  <Ionicons name="add" size={14} color={theme.colors.textTertiary} />
                  <Text style={styles.addTagText}>新标签</Text>
                </TouchableOpacity>
              </View>
              {showTagInput && (
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={styles.tagInput}
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="输入标签名"
                    placeholderTextColor={theme.colors.textTertiary}
                    autoFocus
                    onSubmitEditing={addCustomTag}
                  />
                  <TouchableOpacity style={[styles.chip, styles.chipActive]} onPress={addCustomTag}>
                    <Text style={styles.chipTextActive}>添加</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 备注 */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>备注</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="添加备注（可选）"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                maxLength={200}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>保存搭配</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
