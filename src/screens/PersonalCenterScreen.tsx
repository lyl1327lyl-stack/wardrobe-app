import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { ThemeId, themes } from '../utils/theme';
import { Theme } from '../utils/theme';
import { OPTIONS_STORAGE_KEY } from '../utils/customOptions';
import { useWardrobeStore } from '../store/wardrobeStore';
import { getRemoveBgApiKey, setRemoveBgApiKey, isBackgroundRemovalConfigured } from '../utils/backgroundRemoval';

const THEME_OPTIONS: { id: ThemeId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'wood', label: '暖阳原木', icon: 'leaf-outline' },
  { id: 'spring', label: '春日樱花', icon: 'flower-outline' },
  { id: 'summer', label: '夏日海洋', icon: 'water-outline' },
  { id: 'winter', label: '冬日初雪', icon: 'snow-outline' },
];

interface MenuItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  action?: string;
  value?: string;
  danger?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU_ITEMS: MenuSection[] = [
  {
    title: '管理分类选项',
    items: [
      { key: 'categories', label: '类型管理', icon: 'shirt-outline', action: 'categories' },
      { key: 'seasons', label: '季节管理', icon: 'flower-outline', action: 'seasons' },
      { key: 'occasions', label: '场合管理', icon: 'calendar-outline', action: 'occasions' },
      { key: 'styles', label: '风格管理', icon: 'brush-outline', action: 'styles' },
    ],
  },
  {
    title: '抠图设置',
    items: [
      { key: 'removeBgApi', label: 'Remove.bg API Key', icon: 'key-outline', action: 'removeBgApi' },
    ],
  },
  {
    title: '数据管理',
    items: [
      { key: 'export', label: '备份导出', icon: 'download-outline', action: 'export' },
      { key: 'import', label: '数据导入', icon: 'cloud-upload-outline', action: 'import' },
      { key: 'clearClothes', label: '清空所有衣服', icon: 'trash-outline', action: 'clearClothes', danger: true },
      { key: 'clearOptions', label: '重置分类选项', icon: 'refresh-outline', action: 'clearOptions' },
    ],
  },
  {
    title: '关于',
    items: [
      { key: 'version', label: '版本', icon: 'information-circle-outline', value: '1.0.0' },
    ],
  },
];

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 16,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 12,
    },
    section: {
      marginHorizontal: 16,
      borderRadius: 16,
      padding: 16,
      backgroundColor: theme.colors.card,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 14,
    },
    themeGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 8,
      borderRadius: 12,
      position: 'relative',
    },
    themeIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    themeLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    checkBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 12,
    },
    menuIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLabel: {
      flex: 1,
      fontSize: 15,
    },
    menuValue: {
      fontSize: 14,
    },
    bottom: {
      height: 40,
    },
    // API Key Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modal: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      padding: 24,
      width: '100%',
      maxWidth: 340,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginBottom: 16,
      textAlign: 'center',
      lineHeight: 18,
    },
    modalInput: {
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
    modalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancel: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    modalConfirm: {
      flex: 2,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    modalConfirmText: {
      fontSize: 15,
      color: theme.colors.white,
      fontWeight: '600',
    },
    modalDanger: {
      backgroundColor: theme.colors.danger,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });

export function PersonalCenterScreen() {
  const navigation = useNavigation();
  const { theme, themeId, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // API Key Modal state
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'configured' | 'not_configured'>('checking');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  const checkApiKeyStatus = async () => {
    const configured = await isBackgroundRemovalConfigured();
    setApiKeyStatus(configured ? 'configured' : 'not_configured');
  };

  const handleShowApiModal = () => {
    setApiKeyInput('');
    setShowApiModal(true);
  };

  const handleSaveApiKey = async () => {
    if (isSaving) return;
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      Alert.alert('请输入 API Key');
      return;
    }
    setIsSaving(true);
    try {
      await setRemoveBgApiKey(trimmed);
      setShowApiModal(false);
      setApiKeyStatus('configured');
      Alert.alert('保存成功', 'API Key 已保存。添加衣服时可以使用抠图功能了。');
    } catch (e) {
      Alert.alert('保存失败', '无法保存 API Key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearApiKey = async () => {
    Alert.alert(
      '清除 API Key',
      '确定要清除已保存的 API Key 吗？清除后将无法使用抠图功能。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清除',
          style: 'destructive',
          onPress: async () => {
            await setRemoveBgApiKey('');
            setShowApiModal(false);
            setApiKeyStatus('not_configured');
          },
        },
      ]
    );
  };

  const handleThemeChange = async (newThemeId: ThemeId) => {
    if (newThemeId === themeId) return;
    await setTheme(newThemeId);
  };

  const handleMenuAction = (action?: string) => {
    if (!action) return;

    switch (action) {
      case 'categories':
      case 'seasons':
      case 'occasions':
      case 'styles':
        (navigation as any).navigate('CustomOptions', { category: action });
        break;
      case 'removeBgApi':
        handleShowApiModal();
        break;
      case 'export':
        Alert.alert('备份导出', '功能开发中');
        break;
      case 'import':
        Alert.alert('数据导入', '功能开发中');
        break;
      case 'clearOptions':
        Alert.alert(
          '重置分类',
          '确定要重置分类选项到默认值吗？',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '确定',
              style: 'destructive',
              onPress: async () => {
                try {
                  await AsyncStorage.removeItem(OPTIONS_STORAGE_KEY);
                  Alert.alert('已重置', '请重新加载应用');
                } catch (e) {
                  Alert.alert('错误', '重置失败');
                }
              },
            },
          ]
        );
        break;
      case 'clearClothes':
        Alert.alert(
          '清空衣服',
          '确定要清空所有衣服数据吗？此操作不可恢复！',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '清空',
              style: 'destructive',
              onPress: async () => {
                try {
                  const clearAllClothing = useWardrobeStore.getState().clearAllClothing;
                  await clearAllClothing();
                  Alert.alert('已清空', '所有衣服数据已删除');
                } catch (e) {
                  Alert.alert('错误', '清空失败');
                }
              },
            },
          ]
        );
        break;
    }
  };

  return (
    <View style={styles.container}>
      {/* 统一顶栏 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>个人中心</Text>
      </View>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Theme Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>主题切换</Text>
          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map((option) => {
              const isSelected = themeId === option.id;
              const optionTheme = themes[option.id];
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.themeOption,
                    { backgroundColor: optionTheme.colors.background },
                    isSelected && { borderColor: theme.colors.primary, borderWidth: 3 },
                  ]}
                  onPress={() => handleThemeChange(option.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.themeIconWrap, { backgroundColor: optionTheme.colors.card }]}>
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={optionTheme.colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: optionTheme.colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Menu Sections */}
        {MENU_ITEMS.map((section, sectionIndex) => (
          <View
            key={section.title}
            style={[styles.section, { marginTop: 12 }]}
          >
            <Text style={styles.sectionTitle}>
              {section.title}
            </Text>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  itemIndex < section.items.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  },
                ]}
                onPress={() => item.action && handleMenuAction(item.action)}
                disabled={!item.action}
                activeOpacity={item.action ? 0.7 : 1}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: theme.colors.background }]}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.danger ? theme.colors.danger : theme.colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.menuLabel,
                    { color: item.danger ? theme.colors.danger : theme.colors.text },
                  ]}
                >
                  {item.label}
                </Text>
                {item.value ? (
                  <Text style={[styles.menuValue, { color: theme.colors.textTertiary }]}>
                    {item.value}
                  </Text>
                ) : item.key === 'removeBgApi' ? (
                  <View style={styles.statusBadge}>
                    <Text
                      style={[
                        styles.statusText,
                        { color: apiKeyStatus === 'configured' ? '#22C55E' : '#EF4444' },
                      ]}
                    >
                      {apiKeyStatus === 'checking' ? '检测中...' : apiKeyStatus === 'configured' ? '已配置' : '未配置'}
                    </Text>
                  </View>
                ) : item.action ? (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.textTertiary}
                  />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.bottom} />
      </ScrollView>

      {/* API Key Modal */}
      <Modal visible={showApiModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Remove.bg API Key</Text>
            <Text style={styles.modalSubtitle}>
              请输入您的 Remove.bg API Key{'\n'}
              用于自动去除衣服背景{'\n'}
              前往 remove.bg 注册获取免费 API Key
            </Text>
            <TextInput
              style={styles.modalInput}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="输入 API Key"
              placeholderTextColor={theme.colors.textTertiary}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowApiModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              {apiKeyStatus === 'configured' && (
                <TouchableOpacity
                  style={[styles.modalConfirm, styles.modalDanger]}
                  onPress={handleClearApiKey}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalConfirmText}>清除</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalConfirm, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveApiKey}
                activeOpacity={0.8}
                disabled={isSaving}
              >
                <Text style={styles.modalConfirmText}>{isSaving ? '保存中...' : '保存'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}