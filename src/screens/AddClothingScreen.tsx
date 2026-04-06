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
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useWardrobeStore } from '../store/wardrobeStore';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { processImage } from '../utils/imageUtils';
import { ClothingType, Season, Occasion, CLOTHING_TYPES, SEASONS, OCCASIONS, COLORS } from '../types';

export function AddClothingScreen() {
  const navigation = useNavigation();
  const { addClothing } = useWardrobeStore();

  const [imageUri, setImageUri] = useState<string>('');
  const [type, setType] = useState<ClothingType>('上衣');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [price, setPrice] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSeason = (s: Season) => {
    setSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleOccasion = (o: Occasion) => {
    setOccasions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
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
      const { imageUri: processedUri, thumbnailUri } = await processImage(imageUri);

      await addClothing({
        imageUri: processedUri,
        thumbnailUri,
        type,
        color,
        brand,
        size,
        seasons,
        occasions,
        purchaseDate,
        price: parseFloat(price) || 0,
        wearCount: 0,
        lastWornAt: null,
        createdAt: new Date().toISOString(),
        remarks: '',
        styles: [],
      });

      navigation.goBack();
    } catch (error) {
      console.error('Failed to add clothing:', error);
      Alert.alert('添加失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.imageArea} onPress={() => setShowImagePicker(true)}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>+</Text>
            <Text style={styles.imagePlaceholderSubtext}>添加照片</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本信息</Text>

        <Text style={styles.label}>类型</Text>
        <View style={styles.chipGroup}>
          {CLOTHING_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, type === t && styles.chipActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>颜色</Text>
        <View style={styles.chipGroup}>
          {COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, color === c && styles.chipActive]}
              onPress={() => setColor(c)}
            >
              <Text style={[styles.chipText, color === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>品牌</Text>
            <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="可选" />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>尺码</Text>
            <TextInput style={styles.input} value={size} onChangeText={setSize} placeholder="可选" />
          </View>
        </View>

        <Text style={styles.label}>购买日期</Text>
        <TextInput
          style={styles.input}
          value={purchaseDate}
          onChangeText={setPurchaseDate}
          placeholder="如: 2024-01"
        />

        <Text style={styles.label}>价格 (元)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="0"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>季节</Text>
        <View style={styles.chipGroup}>
          {SEASONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, seasons.includes(s) && styles.chipActive]}
              onPress={() => toggleSeason(s)}
            >
              <Text style={[styles.chipText, seasons.includes(s) && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>场合</Text>
        <View style={styles.chipGroup}>
          {OCCASIONS.map(o => (
            <TouchableOpacity
              key={o}
              style={[styles.chip, occasions.includes(o) && styles.chipActive]}
              onPress={() => toggleOccasion(o)}
            >
              <Text style={[styles.chipText, occasions.includes(o) && styles.chipTextActive]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? '保存中...' : '保存'}
        </Text>
      </TouchableOpacity>

      <View style={styles.bottom} />

      <ImagePickerModal
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={setImageUri}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageArea: {
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
    color: '#ccc',
  },
  imagePlaceholderSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  chipActive: {
    backgroundColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  submitButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottom: {
    height: 40,
  },
});
