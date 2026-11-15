import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';

import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import * as SplashScreen from 'expo-splash-screen';

import { Routes } from '@router/Routes';
import { StoreProvider } from '@providers/StoreProvider';
import * as LocalStore from '@utils/localStore';
import { theme } from '@consts/theme';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  dark: true as const,
  colors: {
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.primary,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};

/**
 * App shell that reads the persisted base folder synchronously from MMKV to pick the initial
 * route (FolderSetup on first run, otherwise the Library), hides the splash screen once mounted,
 * and wraps the navigation tree in the MobX StoreProvider and gesture-handler root view.
 */
export default function App() {
  const [baseFolder] = useState<string | null>(() => LocalStore.getBaseFolder());

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StoreProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar barStyle='light-content' />
          <Routes initialRoute={baseFolder ? 'Library' : 'FolderSetup'} />
        </NavigationContainer>
      </StoreProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
