import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { SurveyPreferences } from '../store/preferenceStore';

const STYLE_OPTIONS = ['休闲', '简约', '运动', '通勤', '优雅', '街头', '韩系', '日系', '复古'];

const COLOR_FAMILIES = [
  '黑灰白系', '红色系', '蓝色系', '绿色系', '棕卡系', '彩色系',
];

const COMFORT_OPTIONS = [
  { label: '舒适优先', value: 'comfort' as const },
  { label: '均衡', value: 'balanced' as const },
  { label: '外观优先', value: 'appearance' as const },
];

const SCENE_OPTIONS = ['工作', '运动', '约会', '宅家'];

interface PreferenceSurveySheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (prefs: SurveyPreferences) => void;
  initialPrefs?: SurveyPreferences;
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
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 50,
      maxHeight: '85%',
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    closeBtn: {
      padding: 4,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 10,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    chipTextActive: {
      color: theme.colors.white,
    },
    saveBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    saveBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.white,
    },
    skipLink: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    skipText: {
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
  });

export function PreferenceSurveySheet({
  visible,
  onClose,
  onSave,
  initialPrefs,
}: PreferenceSurveySheetProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [styles_sel, setStyles] = useState<string[]>(initialPrefs?.preferredStyles ?? []);
  const [colors_sel, setColors] = useState<string[]>(initialPrefs?.preferredColors ?? []);
  const [comfort, setComfort] = useState<'comfort' | 'balanced' | 'appearance'>(
    initialPrefs?.comfortVsAppearance ?? 'balanced',
  );
  const [scenes, setScenes] = useState<string[]>(initialPrefs?.preferredScenes ?? []);
  const [repeatInterval, setRepeatInterval] = useState<number | null>(initialPrefs?.repeatInterval ?? null);
  const [explorationLevel, setExplorationLevel] = useState<'explore' | 'balanced' | 'conservative'>(
    initialPrefs?.explorationLevel ?? 'balanced',
  );
  const [colorBoldness, setColorBoldness] = useState<'safe' | 'moderate' | 'bold'>(
    initialPrefs?.colorBoldness ?? 'moderate',
  );
  const [layeringPreference, setLayeringPreference] = useState<'often' | 'sometimes' | 'rarely'>(
    initialPrefs?.layeringPreference ?? 'sometimes',
  );
  const [accessoryUsage, setAccessoryUsage] = useState<'often' | 'sometimes' | 'rarely'>(
    initialPrefs?.accessoryUsage ?? 'sometimes',
  );

  const toggleMulti = (arr: string[], v: string, setter: (a: string[]) => void) => {
    setter(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };

  const handleSave = () => {
    onSave({
      preferredStyles: styles_sel,
      preferredColors: colors_sel,
      comfortVsAppearance: comfort,
      preferredScenes: scenes,
      repeatInterval,
      explorationLevel,
      colorBoldness,
      layeringPreference,
      accessoryUsage,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>个性化推荐设置</Text>
              <Text style={styles.subtitle}>告诉我你的偏好，获得更精准的搭配推荐</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Q1: 风格 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>偏爱哪些风格？</Text>
              <View style={styles.chipGrid}>
                {STYLE_OPTIONS.map(s => {
                  const active = styles_sel.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleMulti(styles_sel, s, setStyles)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Q2: 色系 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>偏好哪些色系？</Text>
              <View style={styles.chipGrid}>
                {COLOR_FAMILIES.map(c => {
                  const active = colors_sel.includes(c);
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleMulti(colors_sel, c, setColors)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Q3: 舒适 vs 外观 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>更看重舒适还是外观？</Text>
              <View style={styles.chipGrid}>
                {COMFORT_OPTIONS.map(o => {
                  const active = comfort === o.value;
                  return (
                    <TouchableOpacity
                      key={o.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setComfort(o.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Q4: 场景 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>常去的场景？</Text>
              <View style={styles.chipGrid}>
                {SCENE_OPTIONS.map(s => {
                  const active = scenes.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleMulti(scenes, s, setScenes)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>保存</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipLink} onPress={onClose}>
              <Text style={styles.skipText}>跳过，使用默认推荐</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
