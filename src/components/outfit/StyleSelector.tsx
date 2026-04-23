import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { STYLES } from '../../types';

interface Props {
  selectedStyle: string;
  onStyleChange: (style: string) => void;
}

export function StyleSelector({ selectedStyle, onStyleChange }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>选择风格</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionsContainer}
      >
        {STYLES.map(style => (
          <TouchableOpacity
            key={style}
            style={[styles.option, selectedStyle === style && styles.optionSelected]}
            onPress={() => onStyleChange(style)}
          >
            <Text style={[styles.optionText, selectedStyle === style && styles.optionTextSelected]}>
              {style}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    label: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginBottom: 10,
    },
    optionsContainer: {
      flexDirection: 'row',
      gap: 8,
      paddingBottom: 4,
    },
    option: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    optionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    optionText: {
      fontSize: 13,
      color: theme.colors.text,
    },
    optionTextSelected: {
      color: '#fff',
      fontWeight: '500',
    },
  });
