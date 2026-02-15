import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { RootNavigator } from '@navigation';
import { PlayerProvider } from '@contexts/PlayerContext';
import { theme } from '@consts/theme';
import * as Storage from '@utils/storage';

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

export function App() {
  const [baseFolder, setBaseFolder] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    Storage.getBaseFolder().then((folder) => {
      setBaseFolder(folder);
      SplashScreen.hideAsync();
    });
  }, []);

  if (baseFolder === undefined) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <PlayerProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.surface} />
        <RootNavigator initialRoute={baseFolder ? 'Library' : 'FolderSetup'} />
      </NavigationContainer>
    </PlayerProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
