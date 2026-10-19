import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AppNavigator from './AppNavigator';
import NotificationScreen from '../screens/NotificationScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={AppNavigator} />
    <Stack.Screen
      name="Notifications"
      component={NotificationScreen}
      options={{ presentation: 'modal' }}
    />
  </Stack.Navigator>
);

export default RootNavigator;
