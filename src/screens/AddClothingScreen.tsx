import React, { useState, useLayoutEffect, useCallback, useRef, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Platform,
  BackHandler,
  Modal,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { consumeCropResult, type CropState } from '../utils/cropNavigation';
import { processImage } from '../utils/imageUtils';
import { ClothingItem, COLORS, FIT_OPTIONS, THICKNESS_OPTIONS } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useHeadingFont } from '../hooks/useHeadingFont';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { OverflowScrollView } from '../components/OverflowScrollView';
import { Theme } from '../utils/theme';

type RouteParams = { EditClothing?: { id: number; isDraft?: boolean; prefilledImageUri?: string } };

const COLOR_MAP: Record<string, string> = {
  // 黑灰白
  '黑色': '#2D2A26', '深灰': '#6B6B6B', '浅灰': '#B8B8B8', '灰色': '#8B8B8B', '银灰色': '#A8A8A8',
  '白色': '#F5F5F0', '米白': '#F0EDE4', '米色': '#E8D5B7', '奶油色': '#F5E6C8', '杏色': '#F0D5B0',
  // 红
  '红色': '#C44E4E', '酒红色': '#8B3A3A', '砖红色': '#A0522D', '粉红': '#E8A0B0',
  '玫红色': '#D44A6E', '桃红色': '#F0A0A0', '橘红色': '#E07040',
  // 蓝
  '蓝色': '#5B8DB8', '深蓝': '#3A5A8C', '浅蓝': '#8EB8D8', '藏青色': '#4A5568',
  '天蓝色': '#7EB8D8', '宝蓝色': '#3B6FA0', '湖蓝色': '#5F9EA0', '牛仔蓝': '#5B7FA5', '靛蓝色': '#3D5A80', '水洗蓝': '#8EB0C8',
  // 绿
  '绿色': '#6B8B6B', '军绿色': '#5C6B4E', '墨绿色': '#3D5C3D', '薄荷绿': '#8BC4A8',
  '翠绿色': '#4CAF6E', '草绿色': '#8BAA4E',
  // 黄橙
  '黄色': '#D4B896', '鹅黄色': '#F8E58D', '柠檬黄': '#F6E934', '姜黄色': '#C9A040', '芥末黄': '#BDA046', '土黄色': '#9C7A1F', '橙色': '#D48B4E', '金色': '#C8A040',
  // 紫粉
  '紫色': '#8B7B9B', '薰衣草': '#A08CB8', '粉色': '#D4A0A0', '紫红色': '#9B4A7B',
  // 棕卡
  '棕色': '#8B7355', '咖啡色': '#6B5B4E', '卡其色': '#B8A88A', '驼色': '#C4AA82',
  // 其他
  '青色': '#7AA3A3', '香槟色': '#EDE0C8', '银色': '#C0C0C0', '其他': '#A0A0A0',
};

function getColorHex(colorName: string): string {
  return COLOR_MAP[colorName] || '#9CA3AF';
}

function getColorLightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b; // perceived brightness, higher = lighter
}

const COLOR_FAMILIES: { name: string; colors: string[] }[] = [
  { name: '黑灰白', colors: ['黑色', '深灰', '浅灰', '灰色', '银灰色', '白色', '米白', '米色', '奶油色', '杏色'] },
  { name: '红色系', colors: ['红色', '酒红色', '砖红色', '粉红', '玫红色', '桃红色', '橘红色'] },
  { name: '蓝色系', colors: ['蓝色', '深蓝', '浅蓝', '藏青色', '天蓝色', '宝蓝色', '湖蓝色', '牛仔蓝', '靛蓝色', '水洗蓝'] },
  { name: '绿色系', colors: ['绿色', '军绿色', '墨绿色', '薄荷绿', '翠绿色', '草绿色'] },
  { name: '黄橙系', colors: ['黄色', '鹅黄色', '柠檬黄', '姜黄色', '芥末黄', '土黄色', '橙色', '金色'] },
  { name: '紫粉系', colors: ['紫色', '薰衣草', '粉色', '紫红色'] },
  { name: '棕卡系', colors: ['棕色', '咖啡色', '卡其色', '驼色'] },
  { name: '其他', colors: ['青色', '香槟色', '银色', '其他'] },
];

const LIGHT_COLORS = ['白色', '米白', '奶油色', '浅灰', '米色', '杏色', '香槟色', '银色', '天蓝色', '水洗蓝', '草绿色', '桃红色', '鹅黄色', '柠檬黄'];

function formatDate(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function hasUnsavedChanges(initial: any, current: any): boolean {
  const changes = {
    imageUri: initial.imageUri !== current.imageUri,
    type: initial.type !== current.type,
    color: initial.color !== current.color,
    brand: initial.brand !== current.brand,
    size: initial.size !== current.size,
    seasons: JSON.stringify(initial.seasons) !== JSON.stringify(current.seasons),
    tags: JSON.stringify(initial.tags) !== JSON.stringify(current.tags),
    fit: initial.fit !== current.fit,
    thickness: initial.thickness !== current.thickness,
    purchaseDate: initial.purchaseDate !== current.purchaseDate,
    price: initial.price !== current.price,
    remarks: initial.remarks !== current.remarks,
  };
  const hasAnyChange = Object.values(changes).some(v => v);
  if (hasAnyChange) {
    console.log('[hasUnsavedChanges] DETAIL:', JSON.stringify(changes));
  }
  return hasAnyChange;
}

// Create styles dynamically based on theme
const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 0,
      paddingBottom: 12,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'left',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerDraftBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    headerDraftBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    headerSaveBtn: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
    },
    headerSaveBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.white,
    },
    scrollView: {
      flex: 1,
    },
    imageArea: {
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: '#ffffff', // 白色背景，让透明PNG正确显示
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    imageOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.06)',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      padding: 12,
    },
    // 衣橱选择居中对话框
    dialogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dialogBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    dialogCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      width: '75%',
      maxWidth: 300,
    },
    dialogTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    dialogSubtitle: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginBottom: 16,
    },
    dialogOptions: {
      gap: 8,
      marginBottom: 16,
    },
    dialogOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dialogOptionText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    dialogOptionSelected: {
      backgroundColor: `${theme.colors.primary}15`,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    dialogOptionTextSelected: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    dialogConfirmText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.white,
    },
    dialogConfirmTextDisabled: {
      color: theme.colors.textTertiary,
    },
    dialogButtonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    dialogConfirmBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    dialogConfirmBtnDisabled: {
      backgroundColor: theme.colors.borderLight,
    },
    dialogCancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.borderLight,
      alignItems: 'center',
    },
    dialogCancelText: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    // 图片操作按钮（裁剪/抠图/更换照片）
    imageActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    imageActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.9)',
      opacity: 0.95,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    imageActionBtnPrimary: {
      backgroundColor: theme.colors.primary,
    },
    imageActionBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primaryDark,
    },
    imageActionBtnTextWhite: {
      color: '#fff',
    },
    addPhotoBtn: {
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(255,255,255,0.85)',
      opacity: 0.92,
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 32,
    },
    addPhotoIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addPhotoText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primaryDark,
    },
    section: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    formCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 18,
      marginBottom: 10,
      ...theme.shadows.sm,
    },
    formGroup: {
      marginBottom: 18,
    },
    formLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textTertiary,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    required: {
      color: theme.colors.danger,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    labelText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textTertiary,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    addOptionBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chipScroll: {
      marginHorizontal: -18,
      paddingHorizontal: 18,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingRight: 18,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    chipLabelActive: {
      color: theme.colors.white,
      fontWeight: '600',
    },
    colorScrollRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    colorScrollFlex: {
      flex: 1,
    },
    colorExpandedGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    colorItem: {
      alignItems: 'center',
    },
    colorSwatch: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorSwatchWhite: {
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    colorSwatchActive: {
      borderWidth: 2.5,
      borderColor: theme.colors.primary,
    },
    colorExpandBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorExpandBtnText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      fontWeight: '600',
    },
    textInput: {
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      fontFamily: 'System',
    },
    brandDropdown: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 4,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    brandSuggestion: {
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    brandSuggestionText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    brandSizeRow: {
      flexDirection: 'row',
      gap: 10,
    },
    halfField: {
      flex: 1,
    },
    pickerBtn: {
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pickerBtnText: {
      fontSize: 15,
      color: theme.colors.text,
      flex: 1,
    },
    pickerBtnPlaceholder: {
      color: theme.colors.textTertiary,
    },
    threeColRow: {
      flexDirection: 'row',
      gap: 8,
    },
    colField: {
      flex: 1,
    },
    dateWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
    },
    dateText: {
      fontSize: 15,
      color: theme.colors.text,
    },
    datePlaceholder: {
      color: theme.colors.textTertiary,
    },
    datePickerContainer: {
      marginBottom: 8,
    },
    dateConfirmBtn: {
      alignSelf: 'flex-end',
      paddingVertical: 6,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm,
      marginTop: 4,
    },
    dateConfirmText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.white,
    },
    priceWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.background,
    },
    pricePrefix: {
      fontSize: 15,
      color: theme.colors.textTertiary,
      fontWeight: '500',
      marginRight: 4,
    },
    priceInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.text,
      fontFamily: 'System',
    },
    wearCountInput: {
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
      fontSize: 15,
      color: theme.colors.text,
      fontFamily: 'System',
      textAlign: 'center',
    },
    remarksInput: {
      minHeight: 80,
      paddingTop: 12,
    },
    // ===== 类型选择器样式 =====
    typeSelectorContainer: {
      marginTop: 4,
    },
    typeBreadcrumb: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
      gap: 6,
    },
    typeBreadcrumbText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    typeBreadcrumbActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    typeBreadcrumbArrow: {
      color: theme.colors.textTertiary,
      fontSize: 12,
    },
    parentChipRow: {
      flexDirection: 'row',
      gap: 10,
      paddingRight: 18,
    },
    parentChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    parentChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    parentChipLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    parentChipLabelActive: {
      color: theme.colors.white,
      fontWeight: '600',
    },
    childCard: {
      marginTop: 10,
    },
    childGrid: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: 18,
      marginLeft: 4,
      paddingLeft: 12,
      borderLeftWidth: 2.5,
      borderLeftColor: `${theme.colors.primary}40`,
      borderRadius: 2,
    },
    childChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: theme.colors.borderLight,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    childChipActive: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: theme.colors.primary,
    },
    childChipLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    childChipLabelActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });

export function AddClothingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'EditClothing'>>();
  const { addClothing, updateClothing, loadData, currentWardrobeId, saveDraft, publishDraft, wardrobes, getColorStats } = useWardrobeStore();
  const wardrobeIsLoading = useWardrobeStore(state => state.isLoading);
  const clothing = useWardrobeStore(state => state.clothing);
  const draftClothing = useWardrobeStore(state => state.draftClothing);
  const { theme } = useTheme();
  const headingFont = useHeadingFont();
  const getParents = useCustomOptionsStore(state => state.getParents);
  const getChildrenOf = useCustomOptionsStore(state => state.getChildrenOf);
  // 订阅 categories 数据本身（非函数引用），才能在 CustomOptionsScreen 添加类型后触发重渲染
  useCustomOptionsStore(state => state.categories);
  const customSeasons = useCustomOptionsStore(state => state.seasons);
  const customTags = useCustomOptionsStore(state => state.tags);
  const customSizes = useCustomOptionsStore(state => state.sizes);
  const load = useCustomOptionsStore(state => state.load);
  const customIsLoading = useCustomOptionsStore(state => state.isLoading);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // 颜色排序：常用色在前（按频率），其余按色系排列、同色系由浅到深
  const sortedColors = useMemo(() => {
    const stats = getColorStats();
    const usedAll = COLORS.filter(c => stats[c]).sort((a, b) => (stats[b] || 0) - (stats[a] || 0));
    // 常用只取前7个，其余回到各自色系按由深到浅排列
    const top7 = usedAll.slice(0, 7);
    const top7Set = new Set(top7);
    const remaining: string[] = [];
    for (const family of COLOR_FAMILIES) {
      const familyColors = family.colors.filter(c => !top7Set.has(c));
      familyColors.sort((a, b) => {
        const la = getColorLightness(COLOR_MAP[a] || '#888');
        const lb = getColorLightness(COLOR_MAP[b] || '#888');
        return la - lb; // 由深到浅：深色在前
      });
      remaining.push(...familyColors);
    }
    return [...top7, ...remaining];
  }, [clothing, getColorStats]);

  // 根据屏幕宽度自适应收起模式显示几个色块（保证 + 展开按钮不溢出）
  const { width: windowWidth } = useWindowDimensions();
  const collapsedCount = useMemo(() => {
    const formPad = 36;  // formCard padding
    const btnWidth = 44; // 展开按钮
    const gap = 6;       // 色块间距
    const swatch = 36;   // 色块尺寸
    const margin = 4;    // 安全边距
    const available = windowWidth - formPad - btnWidth - margin;
    return Math.max(3, Math.floor((available + gap) / (swatch + gap)));
  }, [windowWidth]);

  const insets = useSafeAreaInsets();

  // 数据是否已加载完成
  const isDataReady = !customIsLoading && !wardrobeIsLoading;

  useEffect(() => {
    load();
    loadData();
  }, []);

  // 从 CustomOptions 返回时重置 skipUnsavedCheck
  useFocusEffect(
    useCallback(() => {
      skipUnsavedCheck.current = false;
    }, [])
  );

  const isEditing = !!(route.params?.id);
  const isEditingDraft = route.params?.isDraft === true;
  console.log('[EDIT] route.params:', route.params, 'isDataReady:', isDataReady, 'isEditingDraft:', isEditingDraft);

  // 直接从 store 订阅 existingItem，不再通过函数获取
  const existingItem = useMemo(() => {
    const id = route.params?.id;
    if (!isEditing || !id) return null;
    return clothing.find(c => c.id === id) || draftClothing.find(c => c.id === id) || null;
  }, [isEditing, route.params?.id, clothing, draftClothing]);

  console.log('[EDIT] existingItem:', existingItem?.type, 'parentType:', existingItem?.parentType);

  const getInitialParent = (item: any): string => {
    if (!item) return '';
    if (item.parentType) {
      if (item.parentType === item.type) return item.type;
      const childrenOfParent = getChildrenOf(item.parentType);
      if (childrenOfParent.includes(item.type)) return item.parentType;
      return item.type;
    }
    if (!getChildrenOf(item.type).length) return item.type;
    return '';
  };

  const getInitialChild = (item: any): string => {
    if (!item) return '';
    if (item.parentType && item.parentType !== item.type) {
      const childrenOfParent = getChildrenOf(item.parentType);
      if (childrenOfParent.includes(item.type)) return item.type;
    }
    return '';
  };

  const [imageUri, setImageUri] = useState(isEditingDraft ? (route.params?.prefilledImageUri || '') : (existingItem?.imageUri || ''));
  const [originalImageUri, setOriginalImageUri] = useState(existingItem?.originalImageUri || '');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [selectedParent, setSelectedParent] = useState<string>(getInitialParent(existingItem));
  const [selectedChild, setSelectedChild] = useState<string>(getInitialChild(existingItem));
  const [color, setColor] = useState(existingItem?.color || '');
  const [colors, setColors] = useState<string[]>(
    existingItem?.color ? existingItem.color.split(',').map(c => c.trim()).filter(Boolean) : []
  );
  const [colorExpanded, setColorExpanded] = useState(false);
  const [brand, setBrand] = useState(existingItem?.brand || '');
  const [size, setSize] = useState(existingItem?.size || '');

  // 品牌历史记录
  const brandList = useMemo(() => {
    const brands = new Set<string>();
    clothing.forEach(item => {
      if (item.brand) brands.add(item.brand.trim());
    });
    return Array.from(brands).sort((a, b) => a.localeCompare(b, 'zh'));
  }, [clothing]);

  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [sizeDropdownCoords, setSizeDropdownCoords] = useState<{ x: number; y: number; w: number } | null>(null);
  const sizeBtnRef = useRef<View>(null);
  const brandSuggestions = useMemo(() => {
    if (!brand.trim()) return brandList.slice(0, 8);
    const q = brand.toLowerCase();
    return brandList.filter(b => b.toLowerCase().includes(q)).slice(0, 8);
  }, [brand, brandList]);
  const [seasons, setSeasons] = useState<string[]>(existingItem?.seasons || []);
  const [tags, setTags] = useState<string[]>(existingItem?.tags || []);
  const [fit, setFit] = useState<string>(existingItem?.fit || '');
  const [thickness, setThickness] = useState<string>(existingItem?.thickness || '');
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(
    existingItem?.purchaseDate ? new Date(existingItem.purchaseDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [price, setPrice] = useState(existingItem?.price != null ? String(existingItem.price) : '');
  const [wearCount, setWearCount] = useState(existingItem?.wearCount ?? 0);
  const [remarks, setRemarks] = useState(existingItem?.remarks || '');
  const [showImagePicker, setShowImagePicker] = useState(false);
  // 'edit': 进入编辑页面（裁剪/抠图）；'replace': 直接选择新照片替换
  const [imagePickerMode, setImagePickerMode] = useState<'edit' | 'replace'>('edit');
  const [showWardrobeDialog, setShowWardrobeDialog] = useState(false);
  const [pendingWardrobeId, setPendingWardrobeId] = useState<number | null>(null);
  // 从裁剪页面返回时消费裁剪结果
  // Track whether this screen is expecting a crop result
  const expectingCropRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const result = consumeCropResult();
      if (result) {
        setImageUri(result.uri);
        setRemoveBackground(result.removeBg);
        if (result.bgRemovedOriginalUri) {
          setOriginalImageUri(result.bgRemovedOriginalUri);
        }
        if (result.cropState) {
          cropStateRef.current = result.cropState;
        } else {
          cropStateRef.current = null;
        }
        expectingCropRef.current = false;
      } else if (!isEditing && expectingCropRef.current) {
        // 添加模式下从裁剪页返回且没有结果（用户没保存）→ 重新弹出选择器
        expectingCropRef.current = false;
        setTimeout(() => setShowImagePicker(true), 100);
      }
    }, [isEditing])
  );

  // 当 existingItem.id 变化时，从 DB 恢复 cropState
  useEffect(() => {
    if (existingItem?.cropState && !cropStateRef.current) {
      cropStateRef.current = existingItem.cropState;
    }
  }, [existingItem?.id]);

  // 当 existingItem 加载完成时，同步更新所有状态
  useEffect(() => {
    if (existingItem) {
      setColor(existingItem.color || '');
      setColors(existingItem.color ? existingItem.color.split(',').map(c => c.trim()).filter(Boolean) : []);
      setBrand(existingItem.brand || '');
      setSize(existingItem.size || '');
      setSeasons(existingItem.seasons || []);
      setTags(existingItem.tags || []);
      setFit(existingItem.fit || '');
      setThickness(existingItem.thickness || '');
      setPurchaseDate(existingItem.purchaseDate ? new Date(existingItem.purchaseDate) : null);
      setPrice(existingItem.price != null ? String(existingItem.price) : '');
      setWearCount(existingItem.wearCount ?? 0);
      setRemarks(existingItem.remarks || '');
      // 同步分类状态
      const newParent = getInitialParent(existingItem);
      const newChild = getInitialChild(existingItem);
      console.log('[EDIT useEffect] existingItem.type:', existingItem.type, 'existingItem.parentType:', existingItem.parentType);
      console.log('[EDIT useEffect] setParent:', newParent, 'setChild:', newChild);
      setSelectedParent(newParent);
      setSelectedChild(newChild);
      // 如果 existingItem 的图片已经是 PNG 格式，设置 removeBackground
      const existingIsProcessed = existingItem.imageUri?.endsWith('.png');
      setRemoveBackground(!!existingIsProcessed);
    }
  }, [existingItem]);

  // 只在 existingItem.id 变化时同步一次图片 URI（初始化用）
  useEffect(() => {
    if (existingItem?.imageUri) {
      setImageUri(existingItem.imageUri);
    }
  }, [existingItem?.id]);

  // 添加模式下自动打开图片选择器
  useEffect(() => {
    if (!isEditing) {
      setTimeout(() => setShowImagePicker(true), 100);
    }
  }, [isEditing]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false); // 同步防护：阻止 performSave 并发执行

  // 初始状态快照，用于检测未保存更改
  const initialState = useRef({
    imageUri: '',
    originalImageUri: '',
    type: '',
    color: '',
    brand: '',
    size: '',
    seasons: [] as string[],
    tags: [] as string[],
    fit: '',
    thickness: '',
    purchaseDate: '',
    price: '',
    remarks: '',
  });
  const [isInitialStateReady, setIsInitialStateReady] = useState(false);

  // 当数据加载完成且 existingItem 可用时，初始化 initialState
  useEffect(() => {
    if (isDataReady && existingItem) {
      initialState.current = {
        imageUri: existingItem.imageUri || '',
        originalImageUri: existingItem.originalImageUri || existingItem.imageUri || '',
        type: existingItem.type || '',
        color: existingItem.color || '',
        brand: existingItem.brand || '',
        size: existingItem.size || '',
        seasons: existingItem.seasons || [],
        tags: existingItem.tags || [],
        fit: existingItem.fit || '',
        thickness: existingItem.thickness || '',
        purchaseDate: existingItem.purchaseDate || '',
        price: existingItem.price != null ? String(existingItem.price) : '',
        remarks: existingItem.remarks || '',
      };
      setIsInitialStateReady(true);
      console.log('[initialState effect] setIsInitialStateReady true, initialState.type:', existingItem.type);
    }
  }, [isDataReady, existingItem]);

  // 跟踪是否正在导航到选项管理页面（跳过未保存检查）
  const skipUnsavedCheck = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const brandGroupY = useRef(0);
  const card2Y = useRef(0);
  const cropStateRef = useRef<CropState | null>(existingItem?.cropState ?? null);

  const currentState = {
    imageUri, originalImageUri, type: selectedChild || selectedParent || '', color: colors.join(','), brand, size, seasons, tags, fit, thickness,
    purchaseDate: purchaseDate ? formatDate(purchaseDate) : '', price, remarks,
  };

  const hasChanges = isInitialStateReady && hasUnsavedChanges(initialState.current, currentState);
  console.log('[hasChanges] isInitialStateReady:', isInitialStateReady, 'current.type:', currentState.type, 'initial.type:', initialState.current.type, 'hasChanges:', hasChanges);

  // 隐藏父级 TabBar
  useLayoutEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({ tabBarVisible: false });
    }
    return () => {
      if (parent) {
        parent.setOptions({ tabBarVisible: true });
      }
    };
  }, [navigation]);

  // 返回按钮 - 检测未保存更改
  const handleBack = useCallback(() => {
    console.log('[handleBack] called, skipUnsavedCheck:', skipUnsavedCheck.current, 'hasChanges:', hasChanges);
    // 如果是导航到选项管理页面后返回，跳过未保存检查
    if (skipUnsavedCheck.current) {
      skipUnsavedCheck.current = false;
      navigation.goBack();
      return;
    }

    if (hasChanges) {
      if (isEditing) {
        Alert.alert(
          '有未保存的更改',
          '您想要保存更改还是放弃更改？',
          [
            { text: '放弃更改', style: 'destructive', onPress: () => navigation.goBack() },
            { text: '保存', onPress: () => doSave(false) },
          ],
          { cancelable: true }
        );
      } else {
        Alert.alert(
          '有未保存的更改',
          '您想要保存更改、存为草稿还是放弃更改？',
          [
            { text: '放弃更改', style: 'destructive', onPress: () => navigation.goBack() },
            { text: '存草稿', onPress: () => doSave(true) },
            { text: '保存', onPress: () => doSave(false) },
          ],
          { cancelable: true }
        );
      }
    } else {
      navigation.goBack();
    }
  }, [hasChanges, isEditing, navigation]);

  // BackHandler 处理 Android 物理返回键
  useLayoutEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => backHandler.remove();
  }, [handleBack]);

  const toggleSeason = (s: string) => {
    setSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleTag = (t: string) => {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const selectFit = (f: string) => {
    setFit(prev => prev === f ? '' : f);
  };

  const selectThickness = (t: string) => {
    setThickness(prev => prev === t ? '' : t);
  };

  const toggleColor = (c: string) => {
    setColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  // 跳转到分类管理页面
  const openOptionManager = (field: 'categories' | 'seasons' | 'tags' | 'sizes') => {
    skipUnsavedCheck.current = true;
    navigation.navigate('CustomOptions', { category: field });
  };


  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setPurchaseDate(selectedDate);
    }
  };

  const handleDateConfirm = () => {
    setShowDatePicker(false);
  };

  const doSave = async (asDraft: boolean) => {
    if (!asDraft) {
      if (!imageUri) { Alert.alert('请先添加衣服照片'); return; }
      if (seasons.length === 0) { Alert.alert('请至少选择一个季节'); return; }
    }

    // 如果是编辑草稿并点击"创建"：只有一个衣橱时直接用，否则弹窗选择
    if (isEditingDraft && !asDraft) {
      if (wardrobes.length <= 1) {
        await performSave(false, wardrobes[0]?.id ?? currentWardrobeId ?? 1);
      } else {
        setShowWardrobeDialog(true);
      }
      return;
    }

    await performSave(asDraft, currentWardrobeId ?? 1);
  };

  // 安全返回：能返回就 goBack；栈异常（goBack 会退出 app 回桌面）则兜底重置到主页，并弹出栈状态用于诊断
  const safeBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const st = navigation.getState();
    const routes = (st?.routes || []).map((r: any) => r.name);
    Alert.alert('已保存（诊断信息）', `当前栈: ${JSON.stringify(routes)}\ncanGoBack=false，已自动返回主页。请截图反馈此内容。`);
    let nav: any = navigation;
    while (nav) {
      const names = (nav.getState()?.routes || []).map((r: any) => r.name);
      if (names.includes('Main')) {
        nav.reset({ index: 0, routes: [{ name: 'Main' }] });
        return;
      }
      nav = nav.getParent();
    }
    navigation.goBack();
  }, [navigation]);

  const performSave = async (asDraft: boolean, wardrobeId: number) => {
    // 用 ref 做同步防护：杜绝并发执行（Android 上两次 goBack 会崩溃）
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      let processedUri = '';
      let thumbnailUri = '';

      // 获取当前的 imageUri（优先用 state，其次用 existingItem）
      const currentImageUri = imageUri || existingItem?.imageUri || '';
      // 获取原始图片路径（优先用 state，其次用 existingItem）
      const currentOriginalUri = originalImageUri || existingItem?.originalImageUri || currentImageUri;

      // 只要 imageUri 发生变化，就必须重新处理
      const imageChanged = currentImageUri && (!existingItem || currentImageUri !== existingItem.imageUri);
      if (!asDraft && imageChanged) {
        // Image already processed in ImageCrop (bg removal done there) — just resize & thumbnail
        const result = await processImage(currentImageUri, false, currentOriginalUri);
        processedUri = result.imageUri || existingItem?.imageUri || currentImageUri;
        thumbnailUri = result.thumbnailUri || existingItem?.thumbnailUri || processedUri;
      } else if (imageChanged) {
        // 草稿模式下图片有变更，直接使用新图片（不需要处理）
        processedUri = currentImageUri;
        thumbnailUri = currentImageUri;
      } else if (existingItem?.imageUri) {
        processedUri = existingItem.imageUri;
        thumbnailUri = existingItem.thumbnailUri || existingItem.imageUri;
      } else if (currentImageUri) {
        processedUri = currentImageUri;
        thumbnailUri = currentImageUri;
      }

      // 确保 imageUri 有效
      if (!processedUri || !thumbnailUri) {
        Alert.alert('图片保存失败', '请重试');
        return;
      }

      const clothingData = {
        imageUri: processedUri,
        thumbnailUri,
        originalImageUri: currentOriginalUri,
        type: selectedChild || selectedParent || '',
        parentType: selectedChild ? selectedParent : (selectedParent || ''),
        color: asDraft && colors.length === 0 ? '' : colors.join(','),
        brand,
        size,
        seasons: seasons,
        tags: tags,
        fit,
        thickness,
        purchaseDate: purchaseDate ? formatDate(purchaseDate) : '',
        price: parseFloat(price) || 0,
        wearCount,
        lastWornAt: existingItem?.lastWornAt || null,
        createdAt: existingItem?.createdAt || new Date().toISOString(),
        remarks: remarks,
        deletedAt: asDraft ? 'draft' : existingItem?.deletedAt,
        discardReason: existingItem?.discardReason || null,
        soldAt: existingItem?.soldAt || null,
        soldPrice: existingItem?.soldPrice || null,
        soldPlatform: existingItem?.soldPlatform || null,
        wardrobeId,
        cropState: cropStateRef.current ?? (imageChanged ? null : existingItem?.cropState ?? null),
      };
      console.log('[SAVE] selectedParent:', selectedParent, 'selectedChild:', selectedChild, '-> type:', clothingData.type, 'parentType:', clothingData.parentType, 'wardrobeId:', wardrobeId);

      if (isEditingDraft && !asDraft) {
        // 编辑草稿并点击"创建"：先更新草稿，再发布
        await updateClothing({ ...existingItem, ...clothingData } as ClothingItem);
        await publishDraft(existingItem!.id);
        navigation.popToTop();
        navigation.navigate('Main');
      } else if (isEditing && existingItem) {
        await updateClothing({ ...existingItem, ...clothingData } as ClothingItem);
        safeBack();
      } else if (asDraft) {
        await saveDraft({ ...clothingData, id: existingItem?.id } as any);
        safeBack();
      } else {
        await addClothing(clothingData as any);
        safeBack();
      }
    } catch (error) {
      console.error('Failed to save clothing:', error);
      Alert.alert('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const displayDate = purchaseDate ? formatDate(purchaseDate) : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* 自定义 Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, headingFont]}>{isEditing ? (isEditingDraft ? '编辑草稿' : '编辑衣服') : '添加衣服'}</Text>
        <View style={styles.headerRight}>
          {isEditingDraft && (
            <TouchableOpacity style={styles.headerDraftBtn} onPress={() => doSave(true)} activeOpacity={0.7} disabled={isSubmitting}>
              <Text style={styles.headerDraftBtnText}>存草稿</Text>
            </TouchableOpacity>
          )}
          {!isEditing && (
            <TouchableOpacity style={styles.headerDraftBtn} onPress={() => doSave(true)} activeOpacity={0.7} disabled={isSubmitting}>
              <Text style={styles.headerDraftBtnText}>存草稿</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerSaveBtn} onPress={() => doSave(false)} activeOpacity={0.8} disabled={isSubmitting}>
            <Text style={styles.headerSaveBtnText}>{isSubmitting ? '保存中...' : (isEditingDraft ? '创建' : '保存')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false} scrollIndicatorInsets={{ right: 1 }} keyboardShouldPersistTaps="handled">
        {/* Image Area */}
        <TouchableOpacity
          style={styles.imageArea}
          onPress={() => {
            if (imageUri) {
              expectingCropRef.current = true;
              navigation.navigate('ImageCrop', { imageUri: originalImageUri || imageUri, isBgRemoved: removeBackground, cropState: cropStateRef.current || undefined });
            } else {
              setImagePickerMode('edit');
              setShowImagePicker(true);
            }
          }}
          activeOpacity={0.9}
        >
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <View style={styles.imageOverlay}>
                {/* 编辑按钮 */}
                <View style={styles.imageActionRow}>
                  <TouchableOpacity
                    style={[styles.imageActionBtn, removeBackground && styles.imageActionBtnPrimary]}
                    onPress={() => {
                      expectingCropRef.current = true;
                      navigation.navigate('ImageCrop', { imageUri: originalImageUri || imageUri, isBgRemoved: removeBackground, cropState: cropStateRef.current || undefined });
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={12} color={removeBackground ? '#fff' : theme.colors.text} />
                    <Text style={[styles.imageActionBtnText, removeBackground && styles.imageActionBtnTextWhite]}>
                      编辑
                    </Text>
                  </TouchableOpacity>
                  {/* 更换照片按钮 */}
                  <TouchableOpacity
                    style={styles.imageActionBtn}
                    onPress={() => {
                      setRemoveBackground(false);
                      setImagePickerMode('replace');
                      setShowImagePicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-outline" size={12} color={theme.colors.text} />
                    <Text style={styles.imageActionBtnText}>更换</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.addPhotoBtn}>
              <View style={styles.addPhotoIcon}>
                <Ionicons name="add" size={24} color={theme.colors.white} />
              </View>
              <Text style={styles.addPhotoText}>添加照片</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.section}>
          {/* Card 1: 基本信息 */}
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.labelText}>季节<Text style={styles.required}> *</Text></Text>
              </View>
              <View style={styles.chipRow}>
                {(customSeasons || []).map(s => (
                  <TouchableOpacity key={s} style={[styles.chip, seasons.includes(s) && styles.chipActive]} onPress={() => toggleSeason(s)}>
                    <Text style={[styles.chipLabel, seasons.includes(s) && styles.chipLabelActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

                        <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.labelText}>类型<Text style={styles.required}> *</Text></Text>
                <TouchableOpacity style={styles.addOptionBtn} onPress={() => openOptionManager('categories')} activeOpacity={0.7}>
                  <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {/* 两级分类选择器 */}
              <View style={styles.typeSelectorContainer}>
                {/* 路径指示器 */}
                {(selectedParent || selectedChild) && (
                  <View style={styles.typeBreadcrumb}>
                    {selectedParent ? (
                      <>
                        <Text style={styles.typeBreadcrumbText}>{selectedParent}</Text>
                        {selectedChild && (
                          <>
                            <Ionicons name="chevron-forward" size={12} style={styles.typeBreadcrumbArrow} />
                            <Text style={[styles.typeBreadcrumbText, styles.typeBreadcrumbActive]}>{selectedChild}</Text>
                          </>
                        )}
                      </>
                    ) : null}
                  </View>
                )}
                {/* 父分类选择 */}
                <OverflowScrollView style={styles.chipScroll}>
                  <View style={styles.parentChipRow}>
                    {getParents().map(parent => {
                      const isActive = selectedParent === parent;
                      return (
                        <TouchableOpacity
                          key={parent}
                          style={[styles.parentChip, isActive && styles.parentChipActive]}
                          onPress={() => {
                            setSelectedParent(parent);
                            setSelectedChild('');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.parentChipLabel, isActive && styles.parentChipLabelActive]}>{parent}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </OverflowScrollView>
                {/* 子分类（仅当选择了父分类后显示） */}
                {selectedParent && getChildrenOf(selectedParent).length > 0 && (
                  <OverflowScrollView style={[styles.chipScroll, { marginTop: 8 }]}>
                    <View style={styles.childGrid}>
                      {getChildrenOf(selectedParent).map(child => {
                        const isActive = selectedChild === child;
                        return (
                          <TouchableOpacity
                            key={child}
                            style={[styles.childChip, isActive && styles.childChipActive]}
                            onPress={() => setSelectedChild(child)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.childChipLabel, isActive && styles.childChipLabelActive]}>{child}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </OverflowScrollView>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>颜色</Text>
              {colorExpanded ? (
                <View style={styles.colorExpandedGrid}>
                  {sortedColors.map(c => {
                    const isSelected = colors.includes(c);
                    const isLight = LIGHT_COLORS.includes(c);
                    return (
                      <TouchableOpacity key={c} style={styles.colorItem} onPress={() => toggleColor(c)} activeOpacity={0.7}>
                        <View style={[styles.colorSwatch, { backgroundColor: getColorHex(c) }, isLight && styles.colorSwatchWhite, isSelected && styles.colorSwatchActive]}>
                          {isSelected && (
                            <Ionicons name="checkmark" size={18} color={isLight ? 'rgba(0,0,0,0.45)' : '#fff'} style={{ position: 'absolute' }} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.colorItem} onPress={() => setColorExpanded(false)} activeOpacity={0.7}>
                    <View style={styles.colorExpandBtn}>
                      <Ionicons name="chevron-up" size={16} color={theme.colors.textTertiary} />
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.colorScrollRow}>
                  <View style={[styles.colorScrollFlex, { flexDirection: 'row', gap: 6 }]}>
                    {sortedColors.slice(0, collapsedCount).map(c => {
                      const isSelected = colors.includes(c);
                      const isLight = LIGHT_COLORS.includes(c);
                      return (
                        <TouchableOpacity key={c} style={styles.colorItem} onPress={() => toggleColor(c)} activeOpacity={0.7}>
                          <View style={[styles.colorSwatch, { backgroundColor: getColorHex(c) }, isLight && styles.colorSwatchWhite, isSelected && styles.colorSwatchActive]}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={18} color={isLight ? 'rgba(0,0,0,0.45)' : '#fff'} style={{ position: 'absolute' }} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity onPress={() => setColorExpanded(true)} activeOpacity={0.7}>
                    <View style={[styles.colorExpandBtn, { borderRadius: 14, paddingHorizontal: 8, width: 44 }]}>
                      <Text style={styles.colorExpandBtnText}>展开</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </View>

          {/* Card 2: 详情 */}
          <View
            style={styles.formCard}
            onLayout={(e) => { card2Y.current = e.nativeEvent.layout.y; }}
          >
            <View style={styles.formGroup}>
              <View
                style={styles.brandSizeRow}
                onLayout={(e) => { brandGroupY.current = e.nativeEvent.layout.y; }}
              >
                <View style={styles.halfField}>
                  <Text style={styles.formLabel}>品牌（选填）</Text>
                  <TextInput
                    style={styles.textInput}
                    value={brand}
                    onChangeText={setBrand}
                    placeholder=""
                    placeholderTextColor={theme.colors.textTertiary}
                    onFocus={() => {
                      setShowBrandDropdown(true);
                      setTimeout(() => {
                        const targetY = card2Y.current + brandGroupY.current + 18;
                        scrollViewRef.current?.scrollTo({ y: Math.max(0, targetY - 40), animated: true });
                      }, 200);
                    }}
                    onBlur={() => setTimeout(() => setShowBrandDropdown(false), 150)}
                  />
                  {showBrandDropdown && brandSuggestions.length > 0 && (
                    <View style={styles.brandDropdown}>
                      {brandSuggestions.map(b => (
                        <TouchableOpacity
                          key={b}
                          style={styles.brandSuggestion}
                          onPress={() => { setBrand(b); setShowBrandDropdown(false); }}
                          activeOpacity={0.6}
                        >
                          <Text style={styles.brandSuggestionText}>{b}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.formLabel}>尺码</Text>
                  <View ref={sizeBtnRef} collapsable={false}>
                    <TouchableOpacity
                      style={styles.pickerBtn}
                      onPress={() => {
                        if (showSizePicker) {
                          setShowSizePicker(false);
                          setSizeDropdownCoords(null);
                          return;
                        }
                        sizeBtnRef.current?.measureInWindow((x, y, w, h) => {
                          setSizeDropdownCoords({ x, y: y + h, w });
                          setShowSizePicker(true);
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerBtnText, !size && styles.pickerBtnPlaceholder]}>
                        {size}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={theme.colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.formLabel}>{isEditing ? '穿着次数' : '穿着次数（初始）'}</Text>
                  <TextInput
                    style={styles.wearCountInput}
                    value={wearCount === 0 ? '' : String(wearCount)}
                    onChangeText={v => setWearCount(parseInt(v) || 0)}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.threeColRow}>
                <View style={styles.colField}>
                  <Text style={styles.formLabel}>购买日期</Text>
                  <TouchableOpacity style={styles.dateWrapper} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                    <Text style={[styles.dateText, !displayDate && styles.datePlaceholder]} numberOfLines={1}>
                      {displayDate || '选择'}
                    </Text>
                    <Ionicons name="calendar-outline" size={14} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.colField}>
                  <Text style={styles.formLabel}>价格</Text>
                  <View style={styles.priceWrapper}>
                    <Text style={styles.pricePrefix}>¥</Text>
                    <TextInput style={styles.priceInput} value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={theme.colors.textTertiary} keyboardType="numeric" />
                  </View>
                </View>
              </View>
            </View>

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker value={purchaseDate || new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} maximumDate={new Date()} />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.dateConfirmBtn} onPress={handleDateConfirm}>
                    <Text style={styles.dateConfirmText}>确认</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Card 3: 风格属性 */}
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.labelText}>标签</Text>
                <TouchableOpacity style={styles.addOptionBtn} onPress={() => openOptionManager('tags')} activeOpacity={0.7}>
                  <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <OverflowScrollView style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {(customTags || []).map(t => (
                    <TouchableOpacity key={t} style={[styles.chip, tags.includes(t) && styles.chipActive]} onPress={() => toggleTag(t)}>
                      <Text style={[styles.chipLabel, tags.includes(t) && styles.chipLabelActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </OverflowScrollView>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.labelText}>版型</Text>
              </View>
              <View style={styles.chipRow}>
                {FIT_OPTIONS.map(f => (
                  <TouchableOpacity key={f} style={[styles.chip, fit === f && styles.chipActive]} onPress={() => selectFit(f)}>
                    <Text style={[styles.chipLabel, fit === f && styles.chipLabelActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.labelText}>厚薄</Text>
              </View>
              <View style={styles.chipRow}>
                {THICKNESS_OPTIONS.map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, thickness === t && styles.chipActive]} onPress={() => selectThickness(t)}>
                    <Text style={[styles.chipLabel, thickness === t && styles.chipLabelActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Card 6: 备注 */}
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>备注</Text>
              <TextInput
                style={[styles.textInput, styles.remarksInput]}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="添加备注（选填）"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <ImagePickerModal
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={(uri, _shouldRemoveBg, originalUri) => {
          // Navigate directly to crop screen
          const imgUri = originalUri || uri;
          setOriginalImageUri(imgUri);
          cropStateRef.current = null;
          setShowImagePicker(false);
          expectingCropRef.current = true;
          navigation.navigate('ImageCrop', { imageUri: imgUri, isBgRemoved: false });
        }}
        initialImageUri={imagePickerMode === 'edit' ? (imageUri || undefined) : undefined}
        originalImageUri={imagePickerMode === 'edit' ? (originalImageUri || imageUri || undefined) : undefined}
        skipEdit={true}
      />

      {/* 衣橱选择居中对话框 */}
      <Modal visible={showWardrobeDialog} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.dialogOverlay}>
          <TouchableOpacity style={styles.dialogBackdrop} activeOpacity={1} onPress={() => { setShowWardrobeDialog(false); setIsSubmitting(false); setPendingWardrobeId(null); }} />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>选择衣橱</Text>
            <Text style={styles.dialogSubtitle}>将衣服添加到哪个衣橱？</Text>
            <View style={styles.dialogOptions}>
              {wardrobes.map((wardrobe: any) => {
                const isSelected = pendingWardrobeId === wardrobe.id;
                return (
                  <TouchableOpacity
                    key={wardrobe.id}
                    style={[styles.dialogOption, isSelected && styles.dialogOptionSelected]}
                    onPress={() => setPendingWardrobeId(wardrobe.id)}
                  >
                    <Text style={[styles.dialogOptionText, isSelected && styles.dialogOptionTextSelected]}>
                      {wardrobe.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.dialogButtonRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => { setShowWardrobeDialog(false); setPendingWardrobeId(null); }}
              >
                <Text style={styles.dialogCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirmBtn, !pendingWardrobeId && styles.dialogConfirmBtnDisabled]}
                onPress={() => {
                  if (pendingWardrobeId) {
                    setShowWardrobeDialog(false);
                    performSave(false, pendingWardrobeId);
                    setPendingWardrobeId(null);
                  }
                }}
                disabled={!pendingWardrobeId}
              >
                <Text style={[styles.dialogConfirmText, !pendingWardrobeId && styles.dialogConfirmTextDisabled]}>确认创建</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 尺码下拉浮层 */}
      <Modal visible={showSizePicker} transparent animationType="none" statusBarTranslucent>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => { setShowSizePicker(false); setSizeDropdownCoords(null); }}
        />
        {sizeDropdownCoords && (
          <View style={[styles.brandDropdown, { position: 'absolute', top: sizeDropdownCoords.y, left: sizeDropdownCoords.x, width: sizeDropdownCoords.w }]}>
            {(customSizes || []).map(s => (
              <TouchableOpacity
                key={s}
                style={styles.brandSuggestion}
                onPress={() => { setSize(size === s ? '' : s); setShowSizePicker(false); setSizeDropdownCoords(null); }}
                activeOpacity={0.6}
              >
                <Text style={[styles.brandSuggestionText, size === s && { color: theme.colors.primary, fontWeight: '600' }]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.brandSuggestion}
              onPress={() => { setShowSizePicker(false); setSizeDropdownCoords(null); openOptionManager('sizes'); }}
              activeOpacity={0.6}
            >
              <Text style={[styles.brandSuggestionText, { color: theme.colors.textTertiary }]}>管理尺码</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>

    </KeyboardAvoidingView>
  );
}