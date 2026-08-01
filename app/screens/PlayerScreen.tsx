import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { observer } from 'mobx-react-lite';

import type { RootStackParamList } from '@type/RouterTypes';
import { CoverFocusModal } from '@components/CoverFocusModal';
import { NowPlaying } from '@components/NowPlaying';
import { PlaybackControls } from '@components/PlaybackControls';
import { PlayerHeaderRight } from '@components/PlayerHeaderRight';
import { PlayerProgress } from '@components/PlayerProgress';
import { RateModal } from '@components/RateModal';
import { usePlayerStore, useUIStore } from '@providers/StoreProvider';
import { getChapterName } from '@utils/chapterName';
import { theme } from '@consts/theme';

/**
 * Full-screen player for the current audiobook. A thin composer that wires the player and UI
 * stores into the presentational components (NowPlaying, PlayerProgress, PlaybackControls) and
 * hosts the cover-focus and rate modals. The header holds the chapter list and rate buttons.
 */
export const PlayerScreen = observer(function PlayerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Player'>>();
  const player = usePlayerStore();
  const ui = useUIStore();
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);

  const {
    currentBook,
    currentChapterIndex,
    isPlaying,
    rate,
    isLoading,
    totalBookDurationMs,
    bookPositionMs,
  } = player;

  // Configure header with chapters and rate selector
  useEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: () => (
        <PlayerHeaderRight
          rate={rate}
          onOpenChapters={() => navigation.navigate('Chapters')}
          onOpenRate={() => setShowRateModal(true)}
        />
      ),
    });
  }, [navigation, rate]);

  if (!currentBook) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle='light-content' backgroundColor={theme.colors.surface} />
        <Text style={styles.noBookText}>No book selected</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle='light-content' backgroundColor={theme.colors.surface} />
        <ActivityIndicator size='large' color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading audiobook…</Text>
        <Text style={styles.loadingSubtext}>Scanning chapter durations</Text>
      </View>
    );
  }

  const coverFocusY = ui.getCoverFocusY(currentBook.id);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      bounces={false}
    >
      <StatusBar barStyle='light-content' backgroundColor={theme.colors.surface} />

      <NowPlaying
        chapterIndex={currentChapterIndex}
        chapterCount={currentBook.chapters.length}
        chapterName={getChapterName(currentBook.chapters[currentChapterIndex])}
        coverUri={currentBook.coverUri}
        focusY={coverFocusY}
        title={currentBook.title}
        author={currentBook.author}
        onLongPressCover={() => currentBook.coverUri && setShowFocusModal(true)}
      />

      {/* Spacer to push controls downwards */}
      <View style={styles.spacer} />

      <PlayerProgress
        durationMs={totalBookDurationMs}
        positionMs={bookPositionMs}
        rate={rate}
        onSeek={(positionMsValue) => {
          if (totalBookDurationMs > 0) {
            void player.seekToBookPosition(positionMsValue);
          }
        }}
      />

      <PlaybackControls
        isPlaying={isPlaying}
        onTogglePlayPause={player.togglePlayPause}
        onSeekRelative={(deltaMs) => void player.seekRelative(deltaMs)}
      />

      {/* Cover Focus Modal */}
      {currentBook.coverUri && (
        <CoverFocusModal
          visible={showFocusModal}
          coverUri={currentBook.coverUri}
          initialFocusY={coverFocusY}
          onSave={(focusY) => ui.setCoverFocusY(currentBook.id, focusY)}
          onClose={() => setShowFocusModal(false)}
        />
      )}

      <RateModal
        visible={showRateModal}
        rate={rate}
        onSelect={(r) => {
          player.setRate(r);
          setShowRateModal(false);
        }}
        onClose={() => setShowRateModal(false)}
      />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
  },
  spacer: {
    flex: 1,
    minHeight: theme.spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noBookText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.lg,
  },
  loadingText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    marginTop: theme.spacing.md,
  },
  loadingSubtext: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
});
