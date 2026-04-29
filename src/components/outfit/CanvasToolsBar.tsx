import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onAdd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onBackground: () => void;
  hasSelection: boolean;
}

export function CanvasToolsBar({
  onAdd,
  onMoveUp,
  onMoveDown,
  onBackground,
  hasSelection,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toolButton, styles.addButton]}
        onPress={onAdd}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={[styles.toolButton, !hasSelection && styles.toolButtonDisabled]}
        onPress={onMoveUp}
        disabled={!hasSelection}
      >
        <Ionicons
          name="arrow-up"
          size={20}
          color={hasSelection ? theme.colors.text : theme.colors.textTertiary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toolButton, !hasSelection && styles.toolButtonDisabled]}
        onPress={onMoveDown}
        disabled={!hasSelection}
      >
        <Ionicons
          name="arrow-down"
          size={20}
          color={hasSelection ? theme.colors.text : theme.colors.textTertiary}
        />
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.toolButton}
        onPress={onBackground}
      >
        <Ionicons
          name="image-outline"
          size={20}
          color={theme.colors.text}
        />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: 12,
    },
    toolButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolButtonDisabled: {
      opacity: 0.4,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
    },
    divider: {
      width: 1,
      height: 24,
      backgroundColor: theme.colors.border,
    },
  });
