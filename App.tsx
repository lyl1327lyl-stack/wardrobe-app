import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WardrobeScreen } from './src/screens/WardrobeScreen';
import { AddClothingScreen } from './src/screens/AddClothingScreen';
import { ClothingDetailScreen } from './src/screens/ClothingDetailScreen';
import { CategoryDetailScreen } from './src/screens/CategoryDetailScreen';
import { OutfitsScreen } from './src/screens/OutfitsScreen';
import { OutfitDetailScreen } from './src/screens/OutfitDetailScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { StatsDetailScreen } from './src/screens/StatsDetailScreen';
import { TrashScreen } from './src/screens/TrashScreen';
import { SoldItemsScreen } from './src/screens/SoldItemsScreen';
import { SoldItemEditScreen } from './src/screens/SoldItemEditScreen';
import { PersonalCenterScreen } from './src/screens/PersonalCenterScreen';
import { CustomOptionsScreen } from './src/screens/CustomOptionsScreen';
import { ThemeProvider } from './src/context/ThemeContext';
import { useTheme } from './src/hooks/useTheme';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const WardrobeStackNav = createNativeStackNavigator();

function TabIcon({ name, focused, theme }: { name: string; focused: boolean; theme: any }) {
  const icons: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
    '衣橱': { focused: 'shirt', unfocused: 'shirt-outline' },
    '搭配': { focused: 'grid', unfocused: 'grid-outline' },
    '统计': { focused: 'stats-chart', unfocused: 'stats-chart-outline' },
    '个人中心': { focused: 'person', unfocused: 'person-outline' },
  };
  const iconName = focused ? icons[name].focused : icons[name].unfocused;
  return (
    <Ionicons
      name={iconName}
      size={22}
      color={focused ? theme.colors.primary : theme.colors.textTertiary}
    />
  );
}

// 衣橱 Stack
function WardrobeStackScreen() {
  const { theme } = useTheme();
  return (
    <WardrobeStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.card },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <WardrobeStackNav.Screen
        name="WardrobeMain"
        component={WardrobeScreen}
        options={{ headerShown: false }}
      />
      <WardrobeStackNav.Screen
        name="AddClothing"
        component={AddClothingScreen}
        options={{ title: '添加衣服', headerShown: false }}
      />
      <WardrobeStackNav.Screen
        name="EditClothing"
        component={AddClothingScreen}
        options={{ title: '编辑衣服', headerShown: false }}
      />
      <WardrobeStackNav.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={{ headerShown: false }}
      />
    </WardrobeStackNav.Navigator>
  );
}

// Tab 导航器
function MainTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} theme={theme} />,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="衣橱" component={WardrobeStackScreen} />
      <Tab.Screen name="搭配" component={OutfitsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="统计" component={StatsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="个人中心" component={PersonalCenterScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

// Convert our theme to React Navigation theme format
function getNavTheme(appTheme: any): Theme {
  return {
    dark: appTheme.id === 'winter',
    colors: {
      primary: appTheme.colors.primary,
      background: appTheme.colors.background,
      card: appTheme.colors.card,
      text: appTheme.colors.text,
      border: appTheme.colors.border,
      notification: appTheme.colors.accent,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  };
}

// Loading screen
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F6F1' }}>
      <Text style={{ fontSize: 16, color: '#6B6B6B' }}>加载中...</Text>
    </View>
  );
}

// Main navigator that uses theme
function AppNavigator() {
  const { theme, isLoading } = useTheme();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const navTheme = getNavTheme(theme);

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen
          name="OutfitDetail"
          component={OutfitDetailScreen}
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <RootStack.Screen
          name="ClothingDetail"
          component={ClothingDetailScreen}
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <RootStack.Screen
          name="EditClothing"
          component={AddClothingScreen}
          options={{
            title: '编辑衣服',
            headerShown: false,
            presentation: 'card',
          }}
        />
        <RootStack.Screen
          name="Trash"
          component={TrashScreen}
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <RootStack.Screen
          name="SoldItems"
          component={SoldItemsScreen}
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <RootStack.Screen
          name="SoldItemEdit"
          component={SoldItemEditScreen}
          options={{
            title: '编辑卖出信息',
            headerShown: true,
            presentation: 'card',
          }}
        />
        <RootStack.Screen
          name="PersonalCenter"
          component={PersonalCenterScreen}
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <RootStack.Screen
          name="CustomOptions"
          component={CustomOptionsScreen}
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <RootStack.Screen
          name="StatsDetail"
          component={StatsDetailScreen}
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
      </RootStack.Navigator>
      <StatusBar style={theme.id === 'winter' ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
