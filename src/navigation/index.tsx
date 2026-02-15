import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FolderSetup } from '@screens/FolderSetup';
import { Library } from '@screens/Library';
import { Player } from '@screens/Player';
import { theme } from '@consts/theme';

export type RootStackParamList = {
  FolderSetup: undefined;
  Library: undefined;
  Player: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface Props {
  initialRoute: keyof RootStackParamList;
}

export function RootNavigator({ initialRoute }: Props) {
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
        name="FolderSetup"
        component={FolderSetup}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Library"
        component={Library}
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
        name="Player"
        component={Player}
        options={{
          title: '',
        }}
      />
    </Stack.Navigator>
  );
}

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
