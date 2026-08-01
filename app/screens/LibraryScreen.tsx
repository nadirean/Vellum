import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import { Audiobook } from '@type/LibraryTypes';
import type { RootStackParamList } from '@type/RouterTypes';
import { BookCard } from '@components/BookCard';
import { usePlayerStore, useUIStore } from '@providers/StoreProvider';
import * as LocalStore from '@utils/localStore';
import { computeProgressMap } from '@utils/progress';
import { scanAudiobooks } from '@utils/scanner';
import { theme } from '@consts/theme';

export const LibraryScreen = observer(function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Library'>>();
  const player = usePlayerStore();
  const ui = useUIStore();

  const [books, setBooks] = useState<Audiobook[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [lastFolder, setLastFolder] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  const loadBooks = useCallback(async () => {
    const folder = LocalStore.getBaseFolder();
    if (!folder) {
      setIsScanning(false);
      return;
    }

    // Only re‑scan when folder changed
    if (folder === lastFolder && books.length > 0) {
      setIsScanning(false);
      refreshProgress();
      return;
    }

    setIsScanning(true);
    try {
      const scanned = await scanAudiobooks(folder);
      setBooks(scanned);
      setLastFolder(folder);
      setProgressMap(computeProgressMap(scanned));
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setIsScanning(false);
    }
  }, [lastFolder, books.length]);

  const refreshProgress = useCallback(() => {
    setProgressMap(computeProgressMap(books));
  }, [books]);

  // Scan on focus
  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [loadBooks]),
  );

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('FolderSetup')}
          style={styles.headerBtn}
        >
          <MaterialCommunityIcons name='folder' size={22} color={theme.colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleBookPress = async (book: Audiobook) => {
    navigation.navigate('Player');
    // Start loading in parallel with navigation transition
    player.loadBook(book);
  };

  const renderBook = ({ item }: { item: Audiobook }) => (
    <BookCard
      title={item.title}
      author={item.author}
      coverUri={item.coverUri}
      progressPercent={progressMap[item.id] ?? null}
      isPlaying={player.currentBook?.id === item.id && player.isPlaying}
      onPress={() => handleBookPress(item)}
      coverFocusY={ui.getCoverFocusY(item.id)}
    />
  );

  if (isScanning) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle='light-content' backgroundColor={theme.colors.surface} />
        <ActivityIndicator size='large' color={theme.colors.primary} />
        <Text style={styles.scanText}>Scanning audiobooks…</Text>
      </View>
    );
  }

  if (books.length === 0) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle='light-content' backgroundColor={theme.colors.surface} />
        <MaterialCommunityIcons
          name='inbox'
          size={56}
          color={theme.colors.textSecondary}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyTitle}>No audiobooks found</Text>
        <Text style={styles.emptyDesc}>
          Make sure your audiobooks are in sub‑folders inside the selected folder, and each
          sub‑folder contains audio files.
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setLastFolder(null);
            loadBooks();
          }}
        >
          <Text style={styles.retryText}>Rescan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle='light-content' backgroundColor={theme.colors.surface} />
      <FlatList
        data={books}
        renderItem={renderBook}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isScanning}
            onRefresh={() => {
              setLastFolder(null);
              loadBooks();
            }}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  scanText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyDesc: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
  },
  retryText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  list: {
    padding: theme.spacing.md,
  },
  headerBtn: {
    paddingHorizontal: theme.spacing.sm,
  },
  headerBtnText: {
    fontSize: 22,
  },
});
