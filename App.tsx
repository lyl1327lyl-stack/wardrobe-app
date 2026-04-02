import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

import { WardrobeScreen } from './src/screens/WardrobeScreen';
import { AddClothingScreen } from './src/screens/AddClothingScreen';
import { ClothingDetailScreen } from './src/screens/ClothingDetailScreen';
import { OutfitsScreen } from './src/screens/OutfitsScreen';
import { StatsScreen } from './src/screens/StatsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = { '衣柜': '👔', '搭配': '✨', '统计': '📊' };
  return (
    <View style={styles.tabIcon}>
      <Text style={{ fontSize: 22 }}>{icons[name]}</Text>
    </View>
  );
}

function WardrobeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#333',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="WardrobeMain" component={WardrobeScreen} options={{ title: '我的衣柜' }} />
      <Stack.Screen name="AddClothing" component={AddClothingScreen} options={{ title: '添加衣服' }} />
      <Stack.Screen name="ClothingDetail" component={ClothingDetailScreen} options={{ title: '衣服详情' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' },
          headerShown: false,
        })}
      >
        <Tab.Screen name="衣柜" component={WardrobeStack} />
        <Tab.Screen name="搭配" component={OutfitsScreen} options={{ headerShown: true, title: '我的搭配' }} />
        <Tab.Screen name="统计" component={StatsScreen} options={{ headerShown: true, title: '穿衣统计' }} />
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
