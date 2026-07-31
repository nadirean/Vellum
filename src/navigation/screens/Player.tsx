import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import { CoverFocusModal } from '@components/CoverFocusModal';
import { FocusedCoverImage } from '@components/FocusedCoverImage';
import { ProgressBar } from '@components/ProgressBar';
import { usePlayerStore, useUIStore } from '@providers/StoreProvider';
import { theme } from '@consts/theme';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTime(ms: number): string {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

// coverWrapper is 272×272 with padding:6 + borderWidth:2 → content area = 256
const COVER_CONTENT_SIZE = 256;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const Player = observer(function Player() {
  const navigation = useNavigation();
  const player = usePlayerStore();
  const ui = useUIStore();
  const [showRateModal, setShowRateModal] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const {
    currentBook,
    currentChapterIndex,
    isPlaying,
    rate,
    isLoading,
    totalBookDurationMs,
    bookPositionMs,
    bookProgress,
  } = player;

  const handleSaveCoverFocus = (focusY: number) => {
    if (currentBook) {
      ui.setCoverFocusY(currentBook.id, focusY);
    }
  };

  // Configure header with rate selector and chapters
  useEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Chapters')}
            style={styles.headerBtn}
          >
            <MaterialCommunityIcons
              name='format-list-bulleted'
              size={24}
              color={theme.colors.primaryLight}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowRateModal(true)} style={styles.headerBtn}>
            <Text style={styles.rateHeaderText}>{rate.toFixed(rate % 1 === 0 ? 1 : 2)}x</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, rate]);

  const handleProgressPreviewChange = (ratio: number) => {
    setDragProgress(ratio);
  };

  const handleProgressSeek = async (ratio: number) => {
    setDragProgress(ratio);
    if (totalBookDurationMs > 0) {
      await player.seekToBookPosition(ratio * totalBookDurationMs);
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

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

  const chapter = currentBook.chapters[currentChapterIndex];
  const chapterName = chapter ? chapter.filename.replace(/\.\w+$/, '') : '';
  const coverFocusY = ui.getCoverFocusY(currentBook.id);

  const progressRatio = isDragging
    ? dragProgress
    : totalBookDurationMs > 0
      ? bookPositionMs / totalBookDurationMs
      : 0;
  const displayBookPositionMs = isDragging ? dragProgress * totalBookDurationMs : bookPositionMs;
  const displayBookProgress = isDragging ? dragProgress * 100 : bookProgress;
  const displayTimeLeftMs = Math.max(0, totalBookDurationMs - displayBookPositionMs);
  const displayTimeLeftWithTempoMs = rate > 0 ? displayTimeLeftMs / rate : displayTimeLeftMs;

  // Use the parsed title and author from currentBook
  const displayTitle = currentBook.title;
  const author = currentBook.author;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      bounces={false}
    >
      <StatusBar barStyle='light-content' backgroundColor={theme.colors.surface} />

      {/* Chapter Information */}
      <View style={styles.chapterContainer}>
        <Text style={styles.chapterCount}>
          Chapter {currentChapterIndex + 1} of {currentBook.chapters.length}
        </Text>
        {chapterName && (
          <Text style={styles.chapterName} numberOfLines={1}>
            {chapterName}
          </Text>
        )}
      </View>

      {/* Cover Art – long-press to adjust focus area */}
      <Pressable
        style={styles.coverWrapper}
        onLongPress={() => currentBook.coverUri && setShowFocusModal(true)}
        delayLongPress={400}
      >
        {currentBook.coverUri ? (
          <FocusedCoverImage
            uri={currentBook.coverUri}
            size={COVER_CONTENT_SIZE}
            focusY={coverFocusY}
            borderRadius={theme.borderRadius.lg}
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <MaterialCommunityIcons
              name='headphones'
              size={72}
              color={theme.colors.textSecondary}
            />
          </View>
        )}
      </Pressable>

      {/* Title & Author */}
      <Text style={styles.title} numberOfLines={2}>
        {displayTitle}
      </Text>
      {author && author !== 'Unknown Author' && (
        <Text style={styles.author} numberOfLines={1}>
          {author}
        </Text>
      )}

      {/* Spacer to push controls downwards */}
      <View style={styles.spacer} />

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <ProgressBar
          progress={progressRatio}
          onPreviewChange={handleProgressPreviewChange}
          onSeek={handleProgressSeek}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />

        <View style={styles.timeRow}>
          <Text style={styles.timeText} numberOfLines={1}>
            {formatTime(displayBookPositionMs)} ({displayBookProgress.toFixed(1)}%)
          </Text>
          <Text style={styles.timeText} numberOfLines={1}>
            -{formatTime(displayTimeLeftMs)}
            {rate !== 1.0 && ` (-${formatTime(displayTimeLeftWithTempoMs)})`}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.seekBtn}
          activeOpacity={0.6}
          onPress={() => player.seekRelative(-60000)}
        >
          <MaterialCommunityIcons name='rewind' size={36} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playBtn}
          activeOpacity={0.7}
          onPress={player.togglePlayPause}
        >
          <MaterialCommunityIcons
            name={isPlaying ? 'pause' : 'play'}
            size={54}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.seekBtn}
          activeOpacity={0.6}
          onPress={() => player.seekRelative(60000)}
        >
          <MaterialCommunityIcons
            name='fast-forward'
            size={36}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Cover Focus Modal */}
      {currentBook.coverUri && (
        <CoverFocusModal
          visible={showFocusModal}
          coverUri={currentBook.coverUri}
          initialFocusY={coverFocusY}
          onSave={handleSaveCoverFocus}
          onClose={() => setShowFocusModal(false)}
        />
      )}

      {/* Rate Modal */}
      <Modal
        visible={showRateModal}
        transparent
        animationType='fade'
        onRequestClose={() => setShowRateModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRateModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Playback Speed</Text>
            {RATES.map((r) => {
              const isActive = Math.abs(r - rate) < 0.01;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.rateOption, isActive && styles.rateOptionActive]}
                  onPress={() => {
                    player.setRate(r);
                    setShowRateModal(false);
                  }}
                >
                  <Text style={[styles.rateOptionText, isActive && styles.rateOptionTextActive]}>
                    {r.toFixed(r % 1 === 0 ? 1 : 2)}x
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
});

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

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

  /* Cover */
  coverWrapper: {
    width: 272,
    height: 272,
    borderRadius: theme.borderRadius.lg + 4,
    padding: 6,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceLight,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  cover: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.lg,
  },
  placeholderEmoji: {
    fontSize: 72,
  },

  /* Title / Chapter */
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
  author: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  chapterContainer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  chapterCount: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chapterName: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    marginTop: 4,
  },

  /* Progress */
  progressSection: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontVariant: ['tabular-nums'],
  },

  /* Controls */
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  seekBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceLight,
  },
  playBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },

  /* Chapter list (removed from here, styles kept for other uses if needed or cleaned up) */
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: 240,
    elevation: 12,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  rateOption: {
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 4,
  },
  rateOptionActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  rateOptionText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.lg,
    textAlign: 'center',
  },
  rateOptionTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },

  /* Header buttons */
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerBtn: {
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    minWidth: 44,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateHeaderText: {
    color: theme.colors.primaryLight,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
});
