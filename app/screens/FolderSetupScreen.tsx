import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Directory } from 'expo-file-system';

import type { RootStackParamList } from '@type/RouterTypes';
import * as LocalStore from '@utils/localStore';
import { theme } from '@consts/theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FolderSetup'>;

export function FolderSetupScreen() {
  const navigation = useNavigation<Nav>();

  const handleSelectFolder = async () => {
    try {
      const directory = await Directory.pickDirectoryAsync();

      if (directory && directory.uri) {
        LocalStore.saveBaseFolder(directory.uri);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Library' }],
        });
      }
    } catch (error) {
      console.error('Folder picker error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialCommunityIcons
          name='book-open-variant'
          color={theme.colors.primary}
          style={styles.icon}
        />

        <Text style={styles.heading}>Welcome to Vellum</Text>

        <Text style={styles.description}>
          Your local audiobook player. To get started, choose the folder where your audiobooks are
          stored. Each sub-folder will be treated as a separate audiobook.
        </Text>

        <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleSelectFolder}>
          <Text style={styles.buttonText}>CHOOSE FOLDER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 48,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  heading: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
  },
  description: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 32,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
});
