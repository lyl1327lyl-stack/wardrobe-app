import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ClothingItem, SOLD_PLATFORMS } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

type RouteParams = { SoldItemEdit: { clothing: ClothingItem } };

const formatDateLong = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 20,
    },
    section: {
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.card,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dateText: {
      fontSize: 15,
      color: theme.colors.text,
    },
    priceInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
      marginBottom: 12,
    },
    pricePrefix: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
    },
    priceInputField: {
      flex: 1,
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      padding: 0,
    },
    priceQuickButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    priceQuickBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    priceQuickBtnActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    priceQuickBtnText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    priceQuickBtnTextActive: {
      color: theme.colors.white,
    },
    platformGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    platformChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    platformChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    platformChipText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    platformChipTextActive: {
      color: theme.colors.white,
    },
    customInputSection: {
      marginTop: 12,
    },
    customInput: {
      backgroundColor: theme.colors.card,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.colors.text,
    },
    footer: {
      padding: 20,
      paddingBottom: 36,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    submitBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.white,
    },
  });

export function SoldItemEditScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'SoldItemEdit'>>();
  const { updateClothing } = useWardrobeStore();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const clothing = route.params.clothing;

  const [soldAt, setSoldAt] = useState<Date>(
    clothing.soldAt ? new Date(clothing.soldAt) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [soldPrice, setSoldPrice] = useState(clothing.soldPrice?.toString() || '');
  const [selectedPlatform, setSelectedPlatform] = useState<string>(clothing.soldPlatform || '');
  const [customPlatform, setCustomPlatform] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(
    clothing.soldPlatform && !SOLD_PLATFORMS.includes(clothing.soldPlatform as any)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const price = parseFloat(soldPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('请输入有效的卖出价格');
      return;
    }

    let platform = selectedPlatform;
    if (platform === '其他' && customPlatform.trim()) {
      platform = customPlatform.trim();
    }
    if (!platform) {
      Alert.alert('请选择销售平台');
      return;
    }

    setIsSubmitting(true);
    try {
      // 使用本地日期避免时区偏移问题
      const soldAtStr = `${soldAt.getFullYear()}-${String(soldAt.getMonth() + 1).padStart(2, '0')}-${String(soldAt.getDate()).padStart(2, '0')}`;
      await updateClothing({
        ...clothing,
        soldAt: soldAtStr,
        soldPrice: price,
        soldPlatform: platform,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 卖出日期 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>卖出日期</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.dateText}>
              {formatDateLong(soldAt)}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={soldAt}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setSoldAt(date);
              }}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* 卖出价格 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>卖出价格</Text>
          <View style={styles.priceInput}>
            <Text style={styles.pricePrefix}>¥</Text>
            <TextInput
              style={styles.priceInputField}
              value={soldPrice}
              onChangeText={setSoldPrice}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          <View style={styles.priceQuickButtons}>
            {[50, 100, 150, 200, 300].map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.priceQuickBtn, soldPrice === p.toString() && styles.priceQuickBtnActive]}
                onPress={() => setSoldPrice(p.toString())}
                activeOpacity={0.7}
              >
                <Text style={[styles.priceQuickBtnText, soldPrice === p.toString() && styles.priceQuickBtnTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 销售平台 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>销售平台</Text>
          <View style={styles.platformGrid}>
            {SOLD_PLATFORMS.map(platform => (
              <TouchableOpacity
                key={platform}
                style={[
                  styles.platformChip,
                  selectedPlatform === platform && styles.platformChipActive,
                ]}
                onPress={() => {
                  setSelectedPlatform(platform);
                  setShowCustomInput(platform === '其他');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.platformChipText,
                    selectedPlatform === platform && styles.platformChipTextActive,
                  ]}
                >
                  {platform}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {showCustomInput && (
            <View style={styles.customInputSection}>
              <TextInput
                style={styles.customInput}
                value={customPlatform}
                onChangeText={setCustomPlatform}
                placeholder="输入平台名称"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={20}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* 底部按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>{isSubmitting ? '保存中...' : '保存'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
