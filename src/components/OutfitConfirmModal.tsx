import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClothingItem } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = SCREEN_WIDTH - 48;
const THUMB_SIZE = 64;
const THUMB_GAP = 8;

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (mode: 'append' | 'replace') => void;
  /** 今日已记录的穿着单品 */
  todayThumbnails: Array<{ uri: string; type: string }>;
  /** 当前推荐的穿搭单品 */
  recItems: ClothingItem[];
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: MODAL_WIDTH,
    maxHeight: SCREEN_WIDTH * 1.3,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3D3226',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#9B8E82',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C4B8AB',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  thumbScroll: {
    marginBottom: 12,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: THUMB_GAP,
  },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    backgroundColor: '#F5EDE3',
    overflow: 'hidden',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  thumbPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniType: {
    fontSize: 9,
    color: '#C4B8AB',
    textAlign: 'center',
    marginTop: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8DED2',
    marginVertical: 10,
    marginBottom: 14,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  vsLine: {
    width: 20,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D4A99A',
  },
  vsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D4A99A',
    letterSpacing: 2,
  },
  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnOutline: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8DED2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B8E82',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#B8956A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8956A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDanger: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#D4A99A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDangerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

function ThumbnailItem({ uri, type }: { uri?: string; type: string }) {
  return (
    <View style={{ alignItems: 'center', width: THUMB_SIZE }}>
      <View style={styles.thumbWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="shirt-outline" size={22} color="#C4B8AB" />
          </View>
        )}
      </View>
      <Text style={styles.miniType} numberOfLines={1}>{type}</Text>
    </View>
  );
}

export function OutfitConfirmModal({ visible, onClose, onConfirm, todayThumbnails, recItems }: Props) {
  const hasTodayRecord = todayThumbnails.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1}>
          {/* icon */}
          <View style={[styles.iconCircle, { backgroundColor: hasTodayRecord ? '#FDF0ED' : '#E8F0E3' }]}>
            <Ionicons
              name={hasTodayRecord ? 'swap-horizontal-outline' : 'checkmark-outline'}
              size={24}
              color={hasTodayRecord ? '#C4545A' : '#8BA888'}
            />
          </View>

          <Text style={styles.title}>
            {hasTodayRecord ? '今日已有记录' : '确认记录穿搭'}
          </Text>
          <Text style={styles.subtitle}>
            {hasTodayRecord
              ? '今天已记录过一套穿搭，请选择如何处理当前推荐'
              : '记录今天穿这套搭配吗？'}
          </Text>

          {hasTodayRecord ? (
            <>
              {/* 已记录 */}
              <Text style={styles.sectionLabel}>已记录</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll} contentContainerStyle={styles.thumbRow}>
                {todayThumbnails.map((item, i) => (
                  <ThumbnailItem key={i} uri={item.uri} type={item.type} />
                ))}
              </ScrollView>

              {/* VS */}
              <View style={styles.vsRow}>
                <View style={styles.vsLine} />
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.vsLine} />
              </View>

              {/* 当前推荐 */}
              <Text style={styles.sectionLabel}>当前推荐</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll} contentContainerStyle={styles.thumbRow}>
                {recItems.slice(0, 6).map(item => (
                  <ThumbnailItem key={item.id} uri={item.thumbnailUri || item.imageUri} type={item.type} />
                ))}
              </ScrollView>
            </>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll} contentContainerStyle={styles.thumbRow}>
              {recItems.slice(0, 6).map(item => (
                <ThumbnailItem key={item.id} uri={item.thumbnailUri || item.imageUri} type={item.type} />
              ))}
            </ScrollView>
          )}

          {/* Buttons */}
          {hasTodayRecord ? (
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnOutline} onPress={() => onConfirm('append')} activeOpacity={0.7}>
                <Text style={styles.btnOutlineText}>追加记录</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDanger} onPress={() => onConfirm('replace')} activeOpacity={0.7}>
                <Text style={styles.btnDangerText}>替换记录</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnOutline} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.btnOutlineText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => onConfirm('append')} activeOpacity={0.7}>
                <Text style={styles.btnPrimaryText}>确认记录</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
