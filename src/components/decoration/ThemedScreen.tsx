import React, { ReactNode } from 'react';
import { View, Animated, ViewStyle, StyleProp } from 'react-native';
import { PaperBackground } from './PaperBackground';
import { useTheme } from '../../hooks/useTheme';
import { useMountEntrance } from './useEntrance';

interface ThemedScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ThemedScreen({ children, style }: ThemedScreenProps) {
  const { theme } = useTheme();
  const deco = theme.decoration;
  const t = useMountEntrance({ from: 0, to: 1, kind: 'timing', timing: { duration: 380 } });

  return (
    <View style={[{ flex: 1 }, style]}>
      <PaperBackground />
      {deco ? (
        <Animated.View
          style={{
            flex: 1,
            opacity: t,
            transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          {children}
        </Animated.View>
      ) : (
        children
      )}
    </View>
  );
}
