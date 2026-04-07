import React, { useState, useLayoutEffect, useCallback, useRef } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { processImage } from '../utils/imageUtils';
import { ClothingType, Season, Occasion, Style, ClothingItem, CLOTHING_TYPES, SEASONS, OCCASIONS, COLORS, STYLES } from '../types';
import { theme } from '../utils/theme';

type RouteParams = { EditClothing?: { id: number } };

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXL以上', '均码'];

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

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function hasUnsavedChanges(initial: any, current: any): boolean {
  return JSON.stringify(initial) !== JSON.stringify(current);
}

export function AddClothingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'EditClothing'>>();
  const { addClothing, updateClothing, getClothingById } = useWardrobeStore();

  const isEditing = !!(route.params?.id);
  const existingItem = isEditing ? getClothingById(route.params.id) : null;

  const [imageUri, setImageUri] = useState(existingItem?.imageUri || '');
  const [type, setType] = useState<ClothingType>(existingItem?.type || '上衣');
  const [color, setColor] = useState(existingItem?.color || '');
  const [brand, setBrand] = useState(existingItem?.brand || '');
  const [size, setSize] = useState(existingItem?.size || '');
  const [seasons, setSeasons] = useState<Season[]>(existingItem?.seasons || []);
  const [occasions, setOccasions] = useState<Occasion[]>(existingItem?.occasions || []);
  const [clothingStyles, setClothingStyles] = useState<Style[]>(existingItem?.styles || []);
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(
    existingItem?.purchaseDate ? new Date(existingItem.purchaseDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [price, setPrice] = useState(existingItem?.price ? String(existingItem.price) : '');
  const [wearCount] = useState(existingItem?.wearCount ?? 0);
  const [remarks, setRemarks] = useState(existingItem?.remarks || '');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始状态快照，用于检测未保存更改
  const initialState = useRef({
    imageUri: existingItem?.imageUri || '',
    type: existingItem?.type || '上衣',
    color: existingItem?.color || '',
    brand: existingItem?.brand || '',
    size: existingItem?.size || '',
    seasons: existingItem?.seasons || [],
    occasions: existingItem?.occasions || [],
    clothingStyles: existingItem?.styles || [],
    purchaseDate: existingItem?.purchaseDate || '',
    price: existingItem?.price || '',
    remarks: existingItem?.remarks || '',
  });

  const currentState = {
    imageUri, type, color, brand, size, seasons, occasions,
    clothingStyles, purchaseDate: purchaseDate ? formatDate(purchaseDate) : '', price, remarks,
  };

  const hasChanges = hasUnsavedChanges(initialState.current, currentState);

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
    if (hasChanges) {
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
    } else {
      navigation.goBack();
    }
  }, [hasChanges, navigation]);

  // BackHandler 处理 Android 物理返回键
  useLayoutEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => backHandler.remove();
  }, [handleBack]);

  const toggleSeason = (s: Season) => {
    setSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleOccasion = (o: Occasion) => {
    setOccasions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  };

  const toggleStyle = (s: Style) => {
    setClothingStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
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
      if (!color) { Alert.alert('请选择颜色'); return; }
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
        type,
        color: asDraft && !color ? '' : color,
        brand,
        size,
        seasons: asDraft && seasons.length === 0 ? (['春'] as Season[]) : seasons,
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? '编辑衣服' : '添加衣服'}</Text>
        <View style={styles.headerRight} />
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
                <Ionicons name="add" size={24} color="#fff" />
              </View>
              <Text style={styles.addPhotoText}>添加照片</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.section}>
          {/* Card 1: 基本信息 */}
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>类型<Text style={styles.required}> *</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {CLOTHING_TYPES.map(t => (
                    <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
                      <Text style={[styles.chipLabel, type === t && styles.chipLabelActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>颜色<Text style={styles.required}> *</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                <View style={styles.colorRow}>
                  {COLORS.filter(c => c !== '其他').map(c => (
                    <TouchableOpacity key={c} style={styles.colorItem} onPress={() => setColor(c)}>
                      <View style={[styles.colorSwatch, { backgroundColor: getColorHex(c) }, color === c && styles.colorSwatchActive, c === '白色' && styles.colorSwatchWhite]} />
                      <Text style={[styles.colorName, color === c && styles.colorNameActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>季节<Text style={styles.required}> *</Text></Text>
              <View style={styles.chipRow}>
                {SEASONS.map(s => (
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
              <Text style={styles.formLabel}>尺码</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {SIZES.map(s => (
                    <TouchableOpacity key={s} style={[styles.chip, size === s && styles.chipActive]} onPress={() => setSize(s)}>
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
                <View style={styles.wearCountBox}>
                  <Text style={styles.wearCountText}>{wearCount}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Card 3: 场合 & 风格 */}
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>场合</Text>
              <View style={styles.chipRow}>
                {OCCASIONS.map(o => (
                  <TouchableOpacity key={o} style={[styles.chip, occasions.includes(o) && styles.chipActive]} onPress={() => toggleOccasion(o)}>
                    <Text style={[styles.chipLabel, occasions.includes(o) && styles.chipLabelActive]}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>风格</Text>
              <View style={styles.chipRow}>
                {STYLES.map(s => (
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

        {/* Bottom Buttons */}
        <View style={styles.bottomBar}>
          {!isEditing && (
            <TouchableOpacity style={styles.draftBtn} onPress={() => doSave(true)} activeOpacity={0.7} disabled={isSubmitting}>
              <Text style={styles.draftBtnText}>存草稿</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled, !isEditing && styles.saveBtnFull]} onPress={() => doSave(false)} activeOpacity={0.8} disabled={isSubmitting}>
            <Text style={styles.saveBtnText}>{isSubmitting ? '保存中...' : '保存'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      <ImagePickerModal
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={setImageUri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
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
    width: 40,
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
    shadowColor: '#8B7B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
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
    color: '#C47D5A',
  },
  chipScroll: {
    marginHorizontal: -18,
    paddingHorizontal: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    color: '#fff',
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
    color: '#fff',
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
  wearCountBox: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wearCountText: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '600',
  },
  remarksInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    backgroundColor: theme.colors.card,
    shadowColor: '#8B7B6B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  draftBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  draftBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnFull: {
    flex: 1,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  bottomPad: {
    height: 20,
  },
});
