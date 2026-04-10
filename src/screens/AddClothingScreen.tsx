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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { processImage } from '../utils/imageUtils';
import { ClothingItem, COLORS } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useCustomOptionsStore } from '../store/customOptionsStore';
import { Theme } from '../utils/theme';

type RouteParams = { EditClothing?: { id: number } };

// 父分类图标映射 - 更匹配的图标
const PARENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  '上装': 'shirt-outline',
  '下装': 'layers-outline',
  '外套': 'snow-outline',
  '鞋': 'footsteps-outline',
  '配饰': 'sparkles-outline',
  '包包': 'bag-outline',
};

const COLOR_MAP: Record<string, string> = {
  '黑色': '#2D2A26', '白色': '#F5F5F0', '灰色': '#9CA3AF',
  '红色': '#C47D5A', '蓝色': '#6B8FA3', '绿色': '#8B9B7A',
  '黄色': '#D4B896', '紫色': '#8B7B9B', '粉色': '#C9A0A0',
  '棕色': '#8B7355', '米色': '#D4C4B0', '橙色': '#C9A06A',
  '青色': '#7AA3A3', '咖啡色': '#6B5B4E', '酒红色': '#8B5A5A',
  '藏青色': '#4A5568', '卡其色': '#B8A88A', '军绿色': '#6B7B5A',
  '其他': '#9CA3AF',
};

function getColorHex(colorName: string): string {
  return COLOR_MAP[colorName] || '#9CA3AF';
}

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
    occasions: JSON.stringify(initial.occasions) !== JSON.stringify(current.occasions),
    clothingStyles: JSON.stringify(initial.clothingStyles) !== JSON.stringify(current.clothingStyles),
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
      position: 'relative',
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
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
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
      backgroundColor: theme.colors.borderLight,
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
    editBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.9)',
      opacity: 0.95,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    editBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primaryDark,
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
      width: 24,
      height: 24,
      borderRadius: 12,
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
    colorScroll: {
      marginHorizontal: -18,
      paddingHorizontal: 18,
    },
    colorRow: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: 18,
    },
    colorItem: {
      alignItems: 'center',
      gap: 5,
    },
    colorSwatch: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    colorSwatchWhite: {
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    colorSwatchActive: {
      borderWidth: 2.5,
      borderColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    colorName: {
      fontSize: 10,
      color: theme.colors.textTertiary,
      fontWeight: '500',
    },
    colorNameActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    inputRow: {
      flexDirection: 'row',
      gap: 10,
    },
    inputField: {
      flex: 1,
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
      flexWrap: 'wrap',
      gap: 10,
      paddingRight: 18,
    },
    parentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      gap: 6,
    },
    parentChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    parentChipIcon: {
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
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
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 12,
      marginTop: 10,
    },
    childCardTitle: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    childGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
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
  const { addClothing, updateClothing, getClothingById, loadData } = useWardrobeStore();
  const wardrobeIsLoading = useWardrobeStore(state => state.isLoading);
  const { theme } = useTheme();
  const getParents = useCustomOptionsStore(state => state.getParents);
  const getChildrenOf = useCustomOptionsStore(state => state.getChildrenOf);
  const customSeasons = useCustomOptionsStore(state => state.seasons);
  const customOccasions = useCustomOptionsStore(state => state.occasions);
  const customStyles = useCustomOptionsStore(state => state.styles);
  const customSizes = useCustomOptionsStore(state => state.sizes);
  const load = useCustomOptionsStore(state => state.load);
  const customIsLoading = useCustomOptionsStore(state => state.isLoading);
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
  console.log('[EDIT] route.params:', route.params, 'isDataReady:', isDataReady);
  const existingItem = isDataReady && isEditing ? getClothingById(route.params.id) : null;
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

  const [imageUri, setImageUri] = useState(existingItem?.imageUri || '');
  const [selectedParent, setSelectedParent] = useState<string>(getInitialParent(existingItem));
  const [selectedChild, setSelectedChild] = useState<string>(getInitialChild(existingItem));
  const [color, setColor] = useState(existingItem?.color || '');
  const [brand, setBrand] = useState(existingItem?.brand || '');
  const [size, setSize] = useState(existingItem?.size || '');
  const [seasons, setSeasons] = useState<string[]>(existingItem?.seasons || []);
  const [occasions, setOccasions] = useState<string[]>(existingItem?.occasions || []);
  const [clothingStyles, setClothingStyles] = useState<string[]>(existingItem?.styles || []);
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(
    existingItem?.purchaseDate ? new Date(existingItem.purchaseDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [price, setPrice] = useState(existingItem?.price != null ? String(existingItem.price) : '');
  const [wearCount, setWearCount] = useState(existingItem?.wearCount ?? 0);
  const [remarks, setRemarks] = useState(existingItem?.remarks || '');
  const [showImagePicker, setShowImagePicker] = useState(false);

  // 当 existingItem 加载完成时，同步更新所有状态（包括分类）
  useEffect(() => {
    if (existingItem) {
      setImageUri(existingItem.imageUri || '');
      setColor(existingItem.color || '');
      setBrand(existingItem.brand || '');
      setSize(existingItem.size || '');
      setSeasons(existingItem.seasons || []);
      setOccasions(existingItem.occasions || []);
      setClothingStyles(existingItem.styles || []);
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
    }
  }, [existingItem]);

  // 添加模式下自动打开图片选择器
  useEffect(() => {
    if (!isEditing) {
      setTimeout(() => setShowImagePicker(true), 100);
    }
  }, [isEditing]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始状态快照，用于检测未保存更改
  const initialState = useRef({
    imageUri: '',
    type: '',
    color: '',
    brand: '',
    size: '',
    seasons: [] as string[],
    occasions: [] as string[],
    clothingStyles: [] as string[],
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
        type: existingItem.type || '',
        color: existingItem.color || '',
        brand: existingItem.brand || '',
        size: existingItem.size || '',
        seasons: existingItem.seasons || [],
        occasions: existingItem.occasions || [],
        clothingStyles: existingItem.styles || [],
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

  const currentState = {
    imageUri, type: selectedChild || selectedParent || '', color, brand, size, seasons, occasions,
    clothingStyles, purchaseDate: purchaseDate ? formatDate(purchaseDate) : '', price, remarks,
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

  const toggleOccasion = (o: string) => {
    setOccasions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  };

  const toggleStyle = (s: string) => {
    setClothingStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  // 跳转到分类管理页面
  const openOptionManager = (field: 'categories' | 'seasons' | 'occasions' | 'styles' | 'sizes') => {
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

    setIsSubmitting(true);
    try {
      let processedUri = imageUri;
      let thumbnailUri = existingItem?.thumbnailUri || imageUri;

      if (!asDraft && imageUri && (!existingItem || imageUri !== existingItem.imageUri)) {
        const result = await processImage(imageUri);
        processedUri = result.imageUri;
        thumbnailUri = result.thumbnailUri;
      }

      const clothingData = {
        imageUri: processedUri,
        thumbnailUri,
        type: selectedChild || selectedParent || '',
        parentType: selectedChild ? selectedParent : (selectedParent || ''),
        color: asDraft && !color ? '' : color,
        brand,
        size,
        seasons: asDraft && seasons.length === 0 ? (['春'] as string[]) : seasons,
        occasions,
        purchaseDate: purchaseDate ? formatDate(purchaseDate) : '',
        price: parseFloat(price) || 0,
        wearCount,
        lastWornAt: existingItem?.lastWornAt || null,
        createdAt: existingItem?.createdAt || new Date().toISOString(),
        remarks: asDraft ? `[草稿]${remarks}` : remarks,
        styles: clothingStyles,
        deletedAt: asDraft ? 'draft' : existingItem?.deletedAt,
        discardReason: existingItem?.discardReason || null,
        soldAt: existingItem?.soldAt || null,
        soldPrice: existingItem?.soldPrice || null,
        soldPlatform: existingItem?.soldPlatform || null,
      };
      console.log('[SAVE] selectedParent:', selectedParent, 'selectedChild:', selectedChild, '-> type:', clothingData.type, 'parentType:', clothingData.parentType);

      if (isEditing && existingItem) {
        await updateClothing({ ...existingItem, ...clothingData } as ClothingItem);
      } else {
        await addClothing(clothingData as any);
      }

      navigation.goBack();
    } catch (error) {
      console.error('Failed to save clothing:', error);
      Alert.alert('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayDate = purchaseDate ? formatDate(purchaseDate) : '';

  return (
    <View style={styles.container}>
      {/* 自定义 Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? '编辑衣服' : '添加衣服'}</Text>
        <View style={styles.headerRight}>
          {!isEditing && (
            <TouchableOpacity style={styles.headerDraftBtn} onPress={() => doSave(true)} activeOpacity={0.7} disabled={isSubmitting}>
              <Text style={styles.headerDraftBtnText}>存草稿</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerSaveBtn} onPress={() => doSave(false)} activeOpacity={0.8} disabled={isSubmitting}>
            <Text style={styles.headerSaveBtnText}>{isSubmitting ? '保存中...' : '保存'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} scrollIndicatorInsets={{ right: 1 }}>
        {/* Image Area */}
        <TouchableOpacity style={styles.imageArea} onPress={() => setShowImagePicker(true)} activeOpacity={0.9}>
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <View style={styles.imageOverlay}>
                <View style={styles.editBadge}>
                  <Ionicons name="camera-outline" size={12} color={theme.colors.primaryDark} />
                  <Text style={styles.editBadgeText}>更换照片</Text>
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
                        <View style={styles.parentChipIcon}>
                          <Ionicons
                            name={PARENT_ICONS[parent] || 'ellipse'}
                            size={16}
                            color={isActive ? theme.colors.white : theme.colors.textTertiary}
                          />
                        </View>
                        <Text style={[styles.parentChipLabel, isActive && styles.parentChipLabelActive]}>{parent}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {/* 子分类卡片（仅当选择了父分类后显示） */}
                {selectedParent && (
                  <View style={styles.childCard}>
                    <Text style={styles.childCardTitle}>选择{selectedParent}类型</Text>
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
                  </View>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>颜色</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                <View style={styles.colorRow}>
                  {COLORS.filter(c => c !== '其他').map(c => (
                    <TouchableOpacity key={c} style={styles.colorItem} onPress={() => setColor(color === c ? '' : c)}>
                      <View style={[styles.colorSwatch, { backgroundColor: getColorHex(c) }, color === c && styles.colorSwatchActive, c === '白色' && styles.colorSwatchWhite]} />
                      <Text style={[styles.colorName, color === c && styles.colorNameActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.labelText}>季节<Text style={styles.required}> *</Text></Text>
                <TouchableOpacity style={styles.addOptionBtn} onPress={() => openOptionManager('seasons')} activeOpacity={0.7}>
                  <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.chipRow}>
                {(customSeasons || []).map(s => (
                  <TouchableOpacity key={s} style={[styles.chip, seasons.includes(s) && styles.chipActive]} onPress={() => toggleSeason(s)}>
                    <Text style={[styles.chipLabel, seasons.includes(s) && styles.chipLabelActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Card 2: 详情 */}
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>品牌</Text>
              <TextInput style={styles.textInput} value={brand} onChangeText={setBrand} placeholder="品牌（选填）" placeholderTextColor={theme.colors.textTertiary} />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.labelText}>尺码</Text>
                <TouchableOpacity style={styles.addOptionBtn} onPress={() => openOptionManager('sizes')} activeOpacity={0.7}>
                  <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {(customSizes || []).map(s => (
                    <TouchableOpacity key={s} style={[styles.chip, size === s && styles.chipActive]} onPress={() => setSize(size === s ? '' : s)}>
                      <Text style={[styles.chipLabel, size === s && styles.chipLabelActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>购买日期</Text>
              <TouchableOpacity style={styles.dateWrapper} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                <Text style={[styles.dateText, !displayDate && styles.datePlaceholder]}>{displayDate || '选择日期'}</Text>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
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

            <View style={styles.inputRow}>
              <View style={[styles.inputField, { flex: 2 }]}>
                <Text style={styles.formLabel}>价格</Text>
                <View style={styles.priceWrapper}>
                  <Text style={styles.pricePrefix}>¥</Text>
                  <TextInput style={styles.priceInput} value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={theme.colors.textTertiary} keyboardType="numeric" />
                </View>
              </View>
              <View style={[styles.inputField, { flex: 1 }]}>
                <Text style={styles.formLabel}>穿着次数</Text>
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

          {/* Card 3: 场合 & 风格 */}
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.labelText}>场合</Text>
                <TouchableOpacity style={styles.addOptionBtn} onPress={() => openOptionManager('occasions')} activeOpacity={0.7}>
                  <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.chipRow}>
                {(customOccasions || []).map(o => (
                  <TouchableOpacity key={o} style={[styles.chip, occasions.includes(o) && styles.chipActive]} onPress={() => toggleOccasion(o)}>
                    <Text style={[styles.chipLabel, occasions.includes(o) && styles.chipLabelActive]}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.labelText}>风格</Text>
                <TouchableOpacity style={styles.addOptionBtn} onPress={() => openOptionManager('styles')} activeOpacity={0.7}>
                  <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.chipRow}>
                {(customStyles || []).map(s => (
                  <TouchableOpacity key={s} style={[styles.chip, clothingStyles.includes(s) && styles.chipActive]} onPress={() => toggleStyle(s)}>
                    <Text style={[styles.chipLabel, clothingStyles.includes(s) && styles.chipLabelActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Card 4: 备注 */}
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
        onImageSelected={setImageUri}
      />
    </View>
  );
}