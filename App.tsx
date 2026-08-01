import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';

import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import * as SplashScreen from 'expo-splash-screen';

import { Routes } from '@router/Routes';
import { StoreProvider } from '@providers/StoreProvider';
import * as Storage from '@utils/storage';
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

export default function App() {
  const [baseFolder, setBaseFolder] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    Storage.getBaseFolder().then((folder) => {
      setBaseFolder(folder);
      SplashScreen.hideAsync();
    });
  }, []);

  if (baseFolder === undefined) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.loading}>
          <StatusBar barStyle='light-content' backgroundColor={theme.colors.background} />
          <ActivityIndicator color={theme.colors.primary} size='large' />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StoreProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar barStyle='light-content' backgroundColor={theme.colors.surface} />
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
