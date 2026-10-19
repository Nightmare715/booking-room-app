// App.tsx - Root component của ứng dụng

// Bao bọc toàn bộ app trong NavigationContainer và SafeAreaProvider
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { onAuthStateChanged, User } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import RootNavigator from './src/navigation/RootNavigator';
import { AppStateProvider } from './src/context/AppStateContext';
import AuthScreen from './src/screens/AuthScreen';
import { auth } from './src/config/firebase';

const queryClient = new QueryClient();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
    });
    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          {checkingAuth ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#60A5FA" />
            </View>
          ) : user ? (
            <AppStateProvider key={user.uid}>
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
            </AppStateProvider>
          ) : (
            <AuthScreen />
          )}
          <Toast />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1120' },
});