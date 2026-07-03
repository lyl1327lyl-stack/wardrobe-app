import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../utils/theme';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { useCustomOptionsStore } from '../../store/customOptionsStore';
import { Outfit } from '../../types';

type RootStackParamList = {
  EditOutfit: { outfitId: number };
  OutfitEditor: {
    outfitId?: number;
    mode?: 'create' | 'edit';
    canvasOnly?: boolean;
    groupId?: number;
  };
};

export function EditOutfitScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditOutfit'>>();
  const { outfitId } = route.params;

  const outfits = useWardrobeStore(s => s.outfits);
  const groups = useWardrobeStore(s => s.groups);
  const updateOutfit = useWardrobeStore(s => s.updateOutfit);
  const addGroup = useWardrobeStore(s => s.addGroup);
  const customSeasons = useCustomOptionsStore(s => s.seasons);
  const customTags = useCustomOptionsStore(s => s.tags);

  const outfit = useMemo(() => outfits.find(o => o.id === outfitId), [outfits, outfitId]);

  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState<number>(0);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);

  // 初始化 draft
  useEffect(() => {
    if (outfit) {
      setName(outfit.name || '');
      setGroupId(outfit.groupId || 0);
      setSeasons([...(outfit.seasons || [])]);
      setTags([...(outfit.tags || [])]);
      setNotes(outfit.notes || '');
    }
  }, [outfit?.id]);

  const styles = useMemo(() => makeStyles(theme), [theme]);

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
  const handleCreateGroup = async () => {
    const gname = newGroupInput.trim();
    if (!gname) { setShowNewGroupInput(false); return; }
    const id = await addGroup(gname, '');
    setGroupId(id);
    setNewGroupInput('');
    setShowNewGroupInput(false);
  };

  const handleEditCanvas = () => {
    navigation.navigate('OutfitEditor', { outfitId, mode: 'edit', canvasOnly: true });
  };

  const handleSave = async () => {
    if (!outfit) return;
    setIsSubmitting(true);
    try {
      await updateOutfit({
        ...outfit,
        name: name.trim() || outfit.name,
        groupId,
        seasons: [...seasons],
        tags: [...tags],
        notes: notes.trim(),
      } as Outfit);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('保存失败', e?.message || '请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableTags = customTags.filter(t => !tags.includes(t));
  const bg = outfit?.canvasBackground;
  const previewBg = bg?.type === 'color' ? bg.value : theme.colors.card;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>编辑搭配</Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary }, isSubmitting && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{isSubmitting ? '保存中…' : '保存'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* 画板预览 */}
        <TouchableOpacity style={[styles.canvasPreview, { backgroundColor: previewBg }]} onPress={handleEditCanvas} activeOpacity={0.85}>
          {outfit?.thumbnailUri ? (
            <Image source={{ uri: outfit.thumbnailUri }} style={styles.canvasImage} resizeMode="contain" />
          ) : (
            <View style={styles.canvasPlaceholder}>
              <Ionicons name="images-outline" size={40} color={theme.colors.textTertiary} />
              <Text style={[styles.canvasPlaceholderText, { color: theme.colors.textTertiary }]}>点击编辑画板</Text>
            </View>
          )}
          <View style={[styles.canvasEditBadge, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="create-outline" size={12} color="#fff" />
            <Text style={styles.canvasEditBadgeText}>编辑画板</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          {/* 卡片 1：名称 + 分组 */}
          <View style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>名称</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="搭配名称"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={30}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>分组</Text>
              <View style={styles.chipRow}>
                {groups.map(g => {
                  const active = g.id === groupId;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.chip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }, active && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
                      onPress={() => setGroupId(g.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: theme.colors.textSecondary }, active && { color: theme.colors.primary, fontWeight: '600' }]}>{g.name}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={[styles.addChip, { borderColor: theme.colors.border }]} onPress={() => setShowNewGroupInput(true)}>
                  <Ionicons name="add" size={14} color={theme.colors.textTertiary} />
                  <Text style={[styles.addChipText, { color: theme.colors.textTertiary }]}>新建分组</Text>
                </TouchableOpacity>
              </View>
              {showNewGroupInput && (
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.inlineInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={newGroupInput}
                    onChangeText={setNewGroupInput}
                    placeholder="输入分组名"
                    placeholderTextColor={theme.colors.textTertiary}
                    autoFocus
                    maxLength={20}
                    onSubmitEditing={handleCreateGroup}
                  />
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]} onPress={handleCreateGroup}>
                    <Text style={[styles.chipText, { color: theme.colors.primary, fontWeight: '600' }]}>创建</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* 卡片 2：季节 + 标签 */}
          <View style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>季节</Text>
              <View style={styles.chipRow}>
                {customSeasons.map(s => {
                  const active = seasons.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }, active && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
                      onPress={() => toggleSeason(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: theme.colors.textSecondary }, active && { color: theme.colors.primary, fontWeight: '600' }]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>标签</Text>
              <View style={styles.chipRow}>
                {tags.map(t => (
                  <TouchableOpacity
                    key={`sel-${t}`}
                    style={[styles.chip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
                    onPress={() => toggleTag(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: theme.colors.primary, fontWeight: '600' }]}>{t}</Text>
                    <Ionicons name="close" size={12} color={theme.colors.primary} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
                {availableTags.map(t => (
                  <TouchableOpacity
                    key={`opt-${t}`}
                    style={[styles.chip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                    onPress={() => toggleTag(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.addChip, { borderColor: theme.colors.border }]} onPress={() => setShowTagInput(true)}>
                  <Ionicons name="add" size={14} color={theme.colors.textTertiary} />
                  <Text style={[styles.addChipText, { color: theme.colors.textTertiary }]}>新标签</Text>
                </TouchableOpacity>
              </View>
              {showTagInput && (
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.inlineInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="输入标签名"
                    placeholderTextColor={theme.colors.textTertiary}
                    autoFocus
                    maxLength={20}
                    onSubmitEditing={addCustomTag}
                  />
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]} onPress={addCustomTag}>
                    <Text style={[styles.chipText, { color: theme.colors.primary, fontWeight: '600' }]}>添加</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* 卡片 3：备注 */}
          <View style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>备注</Text>
              <TextInput
                style={[styles.remarksInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="添加备注（可选）"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={200}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: theme.colors.background,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    saveBtn: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
    },
    canvasPreview: {
      marginHorizontal: 16,
      marginTop: 12,
      aspectRatio: 1,
      borderRadius: 16,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    canvasImage: {
      width: '100%',
      height: '100%',
    },
    canvasPlaceholder: {
      alignItems: 'center',
      gap: 8,
    },
    canvasPlaceholderText: {
      fontSize: 13,
    },
    canvasEditBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    canvasEditBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
    },
    section: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    formCard: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      ...theme.shadows.sm,
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    remarksInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      minHeight: 80,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chipText: {
      fontSize: 13,
    },
    addChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
    },
    addChipText: {
      fontSize: 13,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    inlineInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
    },
  });
