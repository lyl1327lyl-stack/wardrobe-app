import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  creditsRemaining: number | null;
}

const REQUIREMENTS = [
  { icon: 'body-outline' as const, text: '主体清晰，与背景有明显对比' },
  { icon: 'grid-outline' as const, text: '避免复杂或杂乱的背景' },
  { icon: 'color-palette-outline' as const, text: '建议使用纯色背景拍摄效果更佳' },
];

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    toggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.primary + '12',
    },
    toggleText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    panel: {
      marginHorizontal: 16,
      marginTop: 8,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    creditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    creditLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    creditCount: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    creditCountLow: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.warning,
    },
    creditCountZero: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.danger,
    },
    reqList: {
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    reqItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    reqIcon: {
      width: 18,
      textAlign: 'center',
    },
    reqText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
  });

export function ImageRequirements({ creditsRemaining }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [expanded, setExpanded] = React.useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  let creditColor = styles.creditCount;
  if (creditsRemaining !== null) {
    if (creditsRemaining <= 0) creditColor = styles.creditCountZero;
    else if (creditsRemaining <= 10) creditColor = styles.creditCountLow;
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <TouchableOpacity style={styles.toggleBtn} onPress={toggle} activeOpacity={0.7}>
        <Ionicons
          name={expanded ? 'chevron-up' : 'information-circle-outline'}
          size={14}
          color={theme.colors.primary}
        />
        <Text style={styles.toggleText}>
          {expanded ? '收起提示' : '最佳抠图效果提示'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.panel}>
          {/* Credits */}
          <View style={styles.creditRow}>
            <Text style={styles.creditLabel}>免费抠图剩余次数</Text>
            <Text style={[styles.creditCount, creditColor]}>
              {creditsRemaining !== null ? `${creditsRemaining} 次` : '获取中...'}
            </Text>
          </View>

          {/* Requirements */}
          <View style={styles.reqList}>
            {REQUIREMENTS.map((req, i) => (
              <View key={i} style={styles.reqItem}>
                <View style={styles.reqIcon}>
                  <Ionicons name={req.icon} size={14} color={theme.colors.textTertiary} />
                </View>
                <Text style={styles.reqText}>{req.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
