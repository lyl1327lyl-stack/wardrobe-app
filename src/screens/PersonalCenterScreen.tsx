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
import { useTheme } from '../hooks/useTheme';
import { ThemeId } from '../utils/theme';

const THEME_OPTIONS: { id: ThemeId; label: string; icon: keyof typeof Ionicons.glyphMap; bgColor: string; textColor: string }[] = [
  { id: 'light', label: '浅色', icon: 'sunny-outline', bgColor: '#F9F6F1', textColor: '#1A1D23' },
  { id: 'dark', label: '深色', icon: 'moon-outline', bgColor: '#2A2520', textColor: '#F9F6F1' },
  { id: 'wood', label: '原木', icon: 'leaf-outline', bgColor: '#A67B5B', textColor: '#FFFFFF' },
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
      { key: 'types', label: '类型管理', icon: 'shirt-outline', action: 'types' },
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
      { key: 'clear', label: '清空数据', icon: 'trash-outline', action: 'clear', danger: true },
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
      case 'types':
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
      case 'clear':
        Alert.alert(
          '清空数据',
          '确定要清空所有数据吗？此操作不可恢复。',
          [
            { text: '取消', style: 'cancel' },
            { text: '确定', style: 'destructive', onPress: () => {} },
          ]
        );
        break;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>个人中心</Text>
        <View style={styles.placeholder} />
      </View>

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
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.themeOption,
                    { backgroundColor: option.bgColor },
                    isSelected && { borderColor: theme.colors.primary, borderWidth: 3 },
                  ]}
                  onPress={() => handleThemeChange(option.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={option.icon}
                    size={28}
                    color={option.textColor}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: option.textColor },
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
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
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
    color: '#1A1D23',
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    position: 'relative',
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
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
    color: '#1A1D23',
  },
  menuValue: {
    fontSize: 14,
    color: '#9B9B9B',
  },
  bottom: {
    height: 40,
  },
});
