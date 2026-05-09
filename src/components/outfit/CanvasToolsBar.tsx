import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  onAdd: () => void;
  selectedGroupName?: string;
  onSelectGroup: () => void;
}

export function CanvasToolsBar({
  onAdd,
  selectedGroupName,
  onSelectGroup,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.groupPill, { backgroundColor: theme.colors.background }]}
          onPress={onSelectGroup}
          activeOpacity={0.7}
        >
          <Ionicons
            name="folder-outline"
            size={16}
            color={selectedGroupName ? theme.colors.primary : theme.colors.textTertiary}
          />
          <Text
            style={[styles.groupText, { color: selectedGroupName ? theme.colors.text : theme.colors.textTertiary }]}
            numberOfLines={1}
          >
            {selectedGroupName || '选择分组'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={12}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={onAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: theme.colors.borderLight,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      ...theme.shadows.md,
    },
    groupPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flex: 1,
      marginRight: 12,
    },
    groupText: {
      fontSize: 14,
      fontWeight: '500',
      flexShrink: 1,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
