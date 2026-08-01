import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@type/RouterTypes';
import { ChaptersScreen } from '@screens/ChaptersScreen';
import { FolderSetupScreen } from '@screens/FolderSetupScreen';
import { LibraryScreen } from '@screens/LibraryScreen';
import { PlayerScreen } from '@screens/PlayerScreen';
import { theme } from '@consts/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface Props {
  initialRoute: keyof RootStackParamList;
}

/**
 * Native stack navigator wiring the four screens with a consistent header style. The initial
 * route is chosen by the app shell based on whether a base folder has been selected yet.
 */
export function Routes({ initialRoute }: Props) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name='FolderSetup'
        component={FolderSetupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name='Library'
        component={LibraryScreen}
        options={{
          title: 'Vellum',
          headerTitleStyle: {
            fontSize: theme.fontSize.xl,
            fontWeight: '700',
            color: theme.colors.text,
          },
        }}
      />
      <Stack.Screen
        name='Player'
        component={PlayerScreen}
        options={{
          title: '',
        }}
      />
      <Stack.Screen
        name='Chapters'
        component={ChaptersScreen}
        options={{
          title: 'Chapters',
          headerTitleStyle: {
            fontSize: theme.fontSize.lg,
            fontWeight: '600',
            color: theme.colors.textSecondary,
          },
        }}
      />
    </Stack.Navigator>
  );
}
