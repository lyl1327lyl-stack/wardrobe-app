import React from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { ThemeId, themes } from '../utils/theme';
import { OPTIONS_STORAGE_KEY } from '../utils/customOptions';
import { useWardrobeStore } from '../store/wardrobeStore';

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

export function PersonalCenterScreen() {
  const navigation = useNavigation();
  const { theme, themeId, setTheme } = useTheme();

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Theme Selection */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>主题切换</Text>
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
            style={[styles.section, { backgroundColor: theme.colors.card, marginTop: sectionIndex === 0 ? 12 : 12 }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
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
});
