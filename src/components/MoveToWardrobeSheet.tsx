import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Wardrobe } from '../types';

interface Props {
  visible: boolean;
  currentWardrobeId: number;
  onClose: () => void;
  onSelect: (wardrobeId: number) => void;
}

export default function MoveToWardrobeSheet({
  visible,
  currentWardrobeId,
  onClose,
  onSelect,
}: Props) {
  // 获取 store 中的 wardrobes
  const { wardrobes } = require('../store/wardrobeStore').useWardrobeStore();

  const handleSelect = (wardrobeId: number) => {
    if (wardrobeId !== currentWardrobeId) {
      onSelect(wardrobeId);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>移动到衣橱</Text>

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {wardrobes.map((wardrobe: Wardrobe) => {
              const isCurrent = wardrobe.id === currentWardrobeId;
              return (
                <TouchableOpacity
                  key={wardrobe.id}
                  style={[styles.option, isCurrent && styles.optionCurrent]}
                  onPress={() => handleSelect(wardrobe.id)}
                  disabled={isCurrent}
                >
                  <Text style={styles.optionIcon}>{wardrobe.icon}</Text>
                  <Text style={[styles.optionText, isCurrent && styles.optionTextCurrent]}>
                    {wardrobe.name}
                  </Text>
                  {isCurrent && (
                    <Text style={styles.currentBadge}>当前</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 16,
    color: '#333',
  },
  content: {
    paddingHorizontal: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
  },
  optionCurrent: {
    backgroundColor: '#f0f0f0',
    opacity: 0.6,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  optionTextCurrent: {
    color: '#999',
  },
  currentBadge: {
    fontSize: 12,
    color: '#999',
  },
});
