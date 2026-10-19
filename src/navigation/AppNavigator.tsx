// src/navigation/AppNavigator.tsx
// Bottom Tab Navigator với 3 tab: Browse Rooms, My Bookings, Profile.

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BrowseRoomsScreen from '../screens/BrowseRoomsScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const AppNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Cấu hình icon cho từng tab dựa trên tên route
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'BrowseRooms':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'MyBookings':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#315A45',
        tabBarInactiveTintColor: '#918B7E',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: -2 },
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 5),
          backgroundColor: '#FFFCF6',
          borderTopColor: '#E8DFCF',
          borderTopWidth: 1,
          elevation: 10,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="BrowseRooms"
        component={BrowseRoomsScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ tabBarLabel: 'My Bookings' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;