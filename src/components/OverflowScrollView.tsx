import React, { useState, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface OverflowScrollViewProps {
  children: React.ReactNode;
  style?: any;
  contentContainerStyle?: any;
  fadeBackgroundColor?: string;
}

/**
 * 横向滚动容器，内容超出时在右侧显示渐变遮罩 + 圆形箭头徽章。
 */
export function OverflowScrollView({ children, style, contentContainerStyle, fadeBackgroundColor }: OverflowScrollViewProps) {
  const { theme } = useTheme();
  const [overflows, setOverflows] = useState(false);
  const containerWidth = useRef(0);
  const bgColor = fadeBackgroundColor || theme.colors.card;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    containerWidth.current = e.nativeEvent.layout.width;
  }, []);

  const handleContentSizeChange = useCallback((w: number) => {
    setOverflows(w > containerWidth.current + 2);
  }, []);

  // 多段渐变条，从透明逐步过渡到背景色
  const gradientSteps = [
    { w: 6, o: 0 },
    { w: 6, o: 0.15 },
    { w: 6, o: 0.3 },
    { w: 6, o: 0.5 },
    { w: 6, o: 0.7 },
    { w: 6, o: 0.85 },
    { w: 6, o: 0.95 },
  ];

  return (
    <View style={[styles.wrapper, style]} onLayout={handleLayout}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
      {overflows && (
        <View style={styles.fadeOverlay} pointerEvents="none">
          {/* 多段渐变条 */}
          {gradientSteps.map((step, i) => (
            <View
              key={i}
              style={[
                styles.fadeStep,
                { width: step.w, backgroundColor: bgColor, opacity: step.o },
              ]}
            />
          ))}
          {/* 圆形箭头徽章 */}
          <View style={[styles.badge, { backgroundColor: theme.colors.background }]}>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  fadeOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fadeStep: {
    height: '100%',
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -6,
    shadowColor: '#000',
    shadowOffset: { width: -1, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
