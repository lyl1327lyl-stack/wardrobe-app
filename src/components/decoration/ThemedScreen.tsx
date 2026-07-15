import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { PaperBackground } from './PaperBackground';

interface ThemedScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ThemedScreen({ children, style }: ThemedScreenProps) {
  return (
    <View style={[{ flex: 1 }, style]}>
      <PaperBackground />
      {children}
    </View>
  );
}
