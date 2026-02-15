import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Directory } from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../index';
import { theme } from '../../theme';
import * as Storage from '../../utils/storage';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FolderSetup'>;

export function FolderSetup() {
  const navigation = useNavigation<Nav>();

  const handleSelectFolder = async () => {
    try {
      const directory = await Directory.pickDirectoryAsync();

      if (directory && directory.uri) {
        await Storage.setBaseFolder(directory.uri);
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
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      <View style={styles.content}>
        <Text style={styles.icon}>📚</Text>

        <Text style={styles.heading}>Welcome to Vellum</Text>

        <Text style={styles.description}>
          Your local audiobook player. To get started, choose the folder where
          your audiobooks are stored. Each sub‑folder will be treated as a
          separate audiobook.
        </Text>

        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={handleSelectFolder}
        >
          <Text style={styles.buttonText}>Choose Audiobooks Folder</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          You can change the folder later from the library screen.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  icon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  heading: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  hint: {
    marginTop: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
