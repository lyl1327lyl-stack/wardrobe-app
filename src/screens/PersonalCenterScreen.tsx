import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useTheme } from '../hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeId, themes } from '../utils/theme';
import { Theme } from '../utils/theme';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { exportBackup, pickBackupFile, restoreBackup } from '../utils/backup';

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
      { key: 'tags', label: '标签管理', icon: 'pricetags-outline', action: 'tags' },
      { key: 'sizes', label: '尺码管理', icon: 'resize-outline', action: 'sizes' },
    ],
  },
  {
    title: '我的数据',
    items: [
      { key: 'trash', label: '废衣篓', icon: 'trash-outline', action: 'trash' },
      { key: 'sold', label: '已卖出', icon: 'card-outline', action: 'sold' },
      { key: 'drafts', label: '草稿箱', icon: 'document-text-outline', action: 'drafts' },
      { key: 'wardrobes', label: '衣柜管理', icon: 'file-tray-full-outline', action: 'wardrobes' },
      { key: 'stats', label: '统计详情', icon: 'stats-chart-outline', action: 'stats' },
    ],
  },
  {
    title: '备份与恢复',
    items: [
      { key: 'export', label: '备份导出', icon: 'cloud-download-outline', action: 'export' },
      { key: 'import', label: '数据导入', icon: 'cloud-upload-outline', action: 'import' },
    ],
  },
  {
    title: '危险操作',
    items: [
      { key: 'clearClothes', label: '清空所有衣服', icon: 'flame-outline', action: 'clearClothes', danger: true },
      { key: 'clearOptions', label: '重置分类选项', icon: 'refresh-outline', action: 'clearOptions', danger: true },
    ],
  },
  {
    title: '关于',
    items: [
      { key: 'version', label: '版本', icon: 'information-circle-outline', value: Constants.expoConfig?.version || '1.0.0' },
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
      paddingBottom: 12,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerInner: {
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
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
      borderWidth: 3,
      borderColor: 'transparent',
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
  });

export function PersonalCenterScreen() {
  const navigation = useNavigation();
  const { theme, themeId, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const handleThemeChange = async (newThemeId: ThemeId) => {
    if (newThemeId === themeId) return;
    await setTheme(newThemeId);
  };

  const handleExport = async () => {
    try {
      await exportBackup();
    } catch (e: any) {
      Alert.alert('导出失败', e?.message || '请稍后重试');
    }
  };

  const handleImport = () => {
    Alert.alert(
      '数据导入',
      '导入将覆盖当前所有衣物、搭配、穿着记录与分类选项。确定继续？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '选择文件',
          onPress: async () => {
            try {
              const data = await pickBackupFile();
              if (!data) return;
              await restoreBackup(data);
              Alert.alert('导入成功', '数据已恢复，部分页面可能需重新进入以刷新');
            } catch (e: any) {
              Alert.alert('导入失败', e?.message || '文件无效或损坏');
            }
          },
        },
      ]
    );
  };

  const handleMenuAction = (action?: string) => {
    if (!action) return;
    switch (action) {
      case 'categories':
      case 'tags':
      case 'sizes':
        (navigation as any).navigate('CustomOptions', { category: action });
        break;
      case 'trash':
        (navigation as any).navigate('Trash');
        break;
      case 'sold':
        (navigation as any).navigate('SoldItems');
        break;
      case 'drafts':
        (navigation as any).navigate('Drafts');
        break;
      case 'wardrobes':
        (navigation as any).navigate('WardrobeManagement');
        break;
      case 'stats':
        (navigation as any).navigate('Stats');
        break;
      case 'export':
        handleExport();
        break;
      case 'import':
        handleImport();
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
                  await useCustomOptionsStore.getState().resetToDefaults();
                  Alert.alert('已重置', '分类选项已恢复默认');
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <Text style={styles.headerTitle}>个人中心</Text>
        </View>
      </View>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Theme Selection */}
        <View style={[styles.section, { marginTop: 12 }]}>
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
                    isSelected && { borderColor: theme.colors.primary },
                  ]}
                  onPress={() => handleThemeChange(option.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.themeIconWrap, { backgroundColor: optionTheme.colors.card }]}>
                    <Ionicons name={option.icon} size={24} color={optionTheme.colors.primary} />
                  </View>
                  <Text style={[styles.themeLabel, { color: optionTheme.colors.text }]}>
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
        {MENU_ITEMS.map((section) => (
          <View key={section.title} style={[styles.section, { marginTop: 12 }]}>
            <Text style={section.title === '危险操作' ? [styles.sectionTitle, { color: theme.colors.danger }] : styles.sectionTitle}>
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
                ) : item.action ? (
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.bottom} />
      </ScrollView>
    </View>
  );
}
