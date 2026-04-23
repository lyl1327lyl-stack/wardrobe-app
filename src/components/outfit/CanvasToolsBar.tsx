import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOOLBAR_PADDING = 24;
const TOOL_SIZE = 40;
const NUM_TOOLS = 5;
const TOTAL_TOOLS_WIDTH = TOOL_SIZE * NUM_TOOLS;
const TOTAL_GAPS = NUM_TOOLS - 1;
const AVAILABLE_WIDTH = SCREEN_WIDTH - TOOLBAR_PADDING * 2;
const EQUAL_GAP = (AVAILABLE_WIDTH - TOTAL_TOOLS_WIDTH) / TOTAL_GAPS;

interface Props {
  onUndo: () => void;
  onRedo: () => void;
  onToggleGrid: () => void;
  onClear: () => void;
  onChangeBackground: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showGrid: boolean;
}

export function CanvasToolsBar({
  onUndo,
  onRedo,
  onToggleGrid,
  onClear,
  onChangeBackground,
  canUndo,
  canRedo,
  showGrid,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const tools = [
    { icon: 'arrow-undo-outline', label: '撤销', onPress: onUndo, disabled: !canUndo },
    { icon: 'arrow-redo-outline', label: '重做', onPress: onRedo, disabled: !canRedo },
    { icon: 'grid-outline', label: '网格', onPress: onToggleGrid, active: showGrid },
    { icon: 'trash-outline', label: '清空', onPress: onClear, danger: true },
    { icon: 'image-outline', label: '背景', onPress: onChangeBackground },
  ];

  // Render: [gap] [tool] [gap] [tool] [gap] [tool] [gap] [tool] [gap] [tool]
  return (
    <View style={styles.container}>
      {/* Leading gap */}
      <View style={{ width: EQUAL_GAP }} />
      {tools.map((tool, index) => (
        <React.Fragment key={index}>
          <TouchableOpacity
            style={[
              styles.tool,
              tool.active && styles.toolActive,
              tool.disabled && styles.toolDisabled,
            ]}
            onPress={tool.onPress}
            disabled={tool.disabled}
          >
            <View
              style={[
                styles.iconWrapper,
                tool.active && styles.iconWrapperActive,
                tool.danger && styles.iconWrapperDanger,
              ]}
            >
              <Ionicons
                name={tool.icon as any}
                size={20}
                color={
                  tool.disabled
                    ? theme.colors.textTertiary
                    : tool.active
                    ? '#fff'
                    : tool.danger
                    ? theme.colors.danger
                    : theme.colors.textSecondary
                }
              />
            </View>
            <Text
              style={[
                styles.label,
                tool.disabled && styles.labelDisabled,
              ]}
            >
              {tool.label}
            </Text>
          </TouchableOpacity>
          {/* Gap after each tool except the last */}
          {index < tools.length - 1 && <View style={{ width: EQUAL_GAP }} />}
        </React.Fragment>
      ))}
      {/* Trailing gap */}
      <View style={{ width: EQUAL_GAP }} />
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: TOOLBAR_PADDING,
      paddingVertical: 12,
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    tool: {
      alignItems: 'center',
      gap: 4,
    },
    toolActive: {},
    toolDisabled: {
      opacity: 0.5,
    },
    iconWrapper: {
      width: TOOL_SIZE,
      height: TOOL_SIZE,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapperActive: {
      backgroundColor: theme.colors.primary,
    },
    iconWrapperDanger: {},
    label: {
      fontSize: 10,
      color: theme.colors.textTertiary,
    },
    labelDisabled: {
      color: theme.colors.textTertiary,
    },
  });