import React, { useState } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { processImage } from '../utils/imageUtils';
import { ClothingType, Season, Occasion, CLOTHING_TYPES, SEASONS, OCCASIONS, COLORS } from '../types';
import { theme } from '../utils/theme';

type RouteParams = { EditClothing?: { id: number } };

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
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(
    existingItem?.purchaseDate ? new Date(existingItem.purchaseDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [price, setPrice] = useState(existingItem?.price ? String(existingItem.price) : '');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSeason = (s: Season) => {
    setSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleOccasion = (o: Occasion) => {
    setOccasions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
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

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('请先添加衣服照片');
      return;
    }
    if (!color) {
      Alert.alert('请选择颜色');
      return;
    }

    setIsSubmitting(true);
    try {
      let processedUri = imageUri;
      let thumbnailUri = existingItem?.thumbnailUri || imageUri;

      if (!existingItem || imageUri !== existingItem.imageUri) {
        const result = await processImage(imageUri);
        processedUri = result.imageUri;
        thumbnailUri = result.thumbnailUri;
      }

      const clothingData = {
        imageUri: processedUri,
        thumbnailUri,
        type,
        color,
        brand,
        size,
        seasons,
        occasions,
        purchaseDate: purchaseDate ? formatDate(purchaseDate) : '',
        price: parseFloat(price) || 0,
        wearCount: existingItem?.wearCount || 0,
        lastWornAt: existingItem?.lastWornAt || null,
        createdAt: existingItem?.createdAt || new Date().toISOString(),
        remarks: existingItem?.remarks || '',
        styles: existingItem?.styles || [],
        deletedAt: existingItem?.deletedAt || null,
        discardReason: existingItem?.discardReason || null,
        soldAt: existingItem?.soldAt || null,
        soldPrice: existingItem?.soldPrice || null,
        soldPlatform: existingItem?.soldPlatform || null,
      };

      if (isEditing && existingItem) {
        await updateClothing({ ...existingItem, ...clothingData });
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

        {/* Type Section */}
        <View style={styles.section}>
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>类型<Text style={styles.required}> *</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {CLOTHING_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeChip, type === t && styles.chipActive]}
                      onPress={() => setType(t)}
                    >
                      <Text style={[styles.typeChipText, type === t && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Color - Single Row Swatches */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>颜色<Text style={styles.required}> *</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                <View style={styles.colorRow}>
                  {COLORS.filter(c => c !== '其他').map(c => (
                    <TouchableOpacity
                      key={c}
                      style={styles.colorItem}
                      onPress={() => setColor(c)}
                    >
                      <View
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: getColorHex(c) },
                          color === c && styles.colorSwatchActive,
                          c === '白色' && styles.colorSwatchWhite,
                        ]}
                      />
                      <Text style={[styles.colorName, color === c && styles.colorNameActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Details Card */}
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>品牌 & 尺码</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputField}>
                  <TextInput
                    style={styles.textInput}
                    value={brand}
                    onChangeText={setBrand}
                    placeholder="品牌（选填）"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
                <View style={styles.inputField}>
                  <TextInput
                    style={styles.textInput}
                    value={size}
                    onChangeText={setSize}
                    placeholder="尺码（选填）"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>购买日期</Text>
              <TouchableOpacity style={styles.dateWrapper} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                <Text style={[styles.dateText, !displayDate && styles.datePlaceholder]}>
                  {displayDate || '选择日期'}
                </Text>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={purchaseDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.dateConfirmBtn} onPress={handleDateConfirm}>
                    <Text style={styles.dateConfirmText}>确认</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>价格</Text>
              <View style={styles.priceWrapper}>
                <Text style={styles.pricePrefix}>¥</Text>
                <TextInput
                  style={styles.priceInput}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Season Card */}
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>季节</Text>
              <View style={styles.chipRow}>
                {SEASONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.selectorChip, seasons.includes(s) && styles.chipActive]}
                    onPress={() => toggleSeason(s)}
                  >
                    <Text style={[styles.selectorChipText, seasons.includes(s) && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Occasion Card */}
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>场合</Text>
              <View style={styles.chipRow}>
                {OCCASIONS.map(o => (
                  <TouchableOpacity
                    key={o}
                    style={[styles.selectorChip, occasions.includes(o) && styles.chipActive]}
                    onPress={() => toggleOccasion(o)}
                  >
                    <Text style={[styles.selectorChipText, occasions.includes(o) && styles.chipTextActive]}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {isSubmitting ? '保存中...' : isEditing ? '保存修改' : '保存'}
          </Text>
        </TouchableOpacity>

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
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
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
  selectorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  selectorChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  submitBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  bottomPad: {
    height: 40,
  },
});
