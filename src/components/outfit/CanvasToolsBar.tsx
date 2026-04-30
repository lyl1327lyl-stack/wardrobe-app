import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  onAdd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  hasSelection: boolean;
}

export function CanvasToolsBar({
  onAdd,
  onMoveUp,
  onMoveDown,
  hasSelection,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.toolsSection}>
          <TouchableOpacity
            style={[styles.toolButton, styles.addButton]}
            onPress={onAdd}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolButton, !hasSelection && styles.toolButtonDisabled]}
            onPress={onMoveUp}
            disabled={!hasSelection}
          >
            <Ionicons
              name="arrow-up"
              size={18}
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
              size={18}
              color={hasSelection ? theme.colors.text : theme.colors.textTertiary}
            />
          </TouchableOpacity>

        </View>
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
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      ...theme.shadows.md,
    },
    toolsSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    toolButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
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
  });
