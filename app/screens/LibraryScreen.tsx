import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SortModal } from '@components/SortModal';
import { usePlayerStore, useUIStore } from '@providers/StoreProvider';
import * as LocalStore from '@utils/localStore';
import { computeLastPlayedMap, computeProgressMap } from '@utils/progress';
import { scanAudiobooks } from '@utils/scanner';
import { LastPlayedMap, sortAudiobooks } from '@utils/sorting';
import { theme } from '@consts/theme';

/**
 * Library screen showing every audiobook found in the selected base folder. It scans the folder
 * (only re-scanning when the folder changes), computes each book's overall progress from persisted
 * data, and renders a pull-to-refreshable card list. The header button re-opens the folder picker.
 */
export const LibraryScreen = observer(function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Library'>>();
  const player = usePlayerStore();
  const ui = useUIStore();

  const [books, setBooks] = useState<Audiobook[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [lastFolder, setLastFolder] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [lastPlayedMap, setLastPlayedMap] = useState<LastPlayedMap>({});
  const [showSortModal, setShowSortModal] = useState(false);

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
      setLastPlayedMap(computeLastPlayedMap(scanned));
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setIsScanning(false);
    }
  }, [lastFolder, books.length]);

  const refreshProgress = useCallback(() => {
    setProgressMap(computeProgressMap(books));
    setLastPlayedMap(computeLastPlayedMap(books));
  }, [books]);

  // Sorted for display; recomputed when books, playback recency, or the sort preference change.
  const sortedBooks = useMemo(
    () => sortAudiobooks(books, lastPlayedMap, ui.librarySort),
    [books, lastPlayedMap, ui.librarySort],
  );

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
        <View style={styles.headerBtns}>
          <TouchableOpacity onPress={() => setShowSortModal(true)} style={styles.headerBtn}>
            <MaterialCommunityIcons name='sort' size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('FolderSetup')}
            style={styles.headerBtn}
          >
            <MaterialCommunityIcons name='folder' size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
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
        <StatusBar barStyle='light-content' />
        <ActivityIndicator size='large' color={theme.colors.primary} />
        <Text style={styles.scanText}>Scanning audiobooks…</Text>
      </View>
    );
  }

  if (books.length === 0) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle='light-content' />
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
      <StatusBar barStyle='light-content' />
      <FlatList
        data={sortedBooks}
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

      <SortModal
        visible={showSortModal}
        sort={ui.librarySort}
        onSelect={(mode) => ui.setLibrarySort(mode)}
        onFlipDirection={ui.flipLibrarySortDirection}
        onClose={() => setShowSortModal(false)}
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
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    paddingHorizontal: theme.spacing.sm,
  },
  headerBtnText: {
    fontSize: 22,
  },
});
