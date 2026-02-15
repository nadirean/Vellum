import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '@consts/theme';
import { usePlayer } from '@contexts/PlayerContext';
import { ProgressBar } from '@components/ProgressBar';

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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Player() {
  const navigation = useNavigation();
  const player = usePlayer();
  const [showRateModal, setShowRateModal] = useState(false);

  const {
    currentBook,
    currentChapterIndex,
    isPlaying,
    rate,
    isLoading,
    totalBookDurationMs,
    bookPositionMs,
    bookProgress,
    timeLeftMs,
    timeLeftWithTempoMs,
    chapterDurations,
  } = player;

  // Configure header with rate selector
  useEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowRateModal(true)}
          style={styles.rateHeaderBtn}
        >
          <Text style={styles.rateHeaderText}>{rate.toFixed(rate % 1 === 0 ? 1 : 2)}x</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, rate]);

  const handleProgressSeek = (ratio: number) => {
    if (totalBookDurationMs > 0) {
      player.seekToBookPosition(ratio * totalBookDurationMs);
    }
  };

  if (!currentBook) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.surface} />
        <Text style={styles.noBookText}>No book selected</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.surface} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading audiobook…</Text>
        <Text style={styles.loadingSubtext}>Scanning chapter durations</Text>
      </View>
    );
  }

  const chapter = currentBook.chapters[currentChapterIndex];
  const chapterName = chapter
    ? chapter.filename.replace(/\.\w+$/, '')
    : '';

  const progressRatio = totalBookDurationMs > 0 ? bookPositionMs / totalBookDurationMs : 0;

  // Parse author from title if it ends with [Author Name]
  const authorMatch = currentBook.title.match(/(.+)\s*\[(.+)\]$/);
  const displayTitle = authorMatch ? authorMatch[1].trim() : currentBook.title;
  const author = authorMatch ? authorMatch[2].trim() : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      bounces={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.surface} />

      {/* Cover Art */}
      <View style={styles.coverWrapper}>
        {currentBook.coverUri ? (
          <Image
            source={{ uri: currentBook.coverUri }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <MaterialCommunityIcons name="headphones" size={72} color={theme.colors.textSecondary} />
          </View>
        )}
      </View>

      {/* Title & Author */}
      <Text style={styles.title} numberOfLines={2}>
        {displayTitle}
      </Text>
      {author && (
        <Text style={styles.author} numberOfLines={1}>
          {author}
        </Text>
      )}

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

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <ProgressBar progress={progressRatio} onSeek={handleProgressSeek} />

        <View style={styles.timeRow}>
          <Text style={styles.timeText} numberOfLines={1}>
            {formatTime(bookPositionMs)} ({bookProgress.toFixed(1)}%)
          </Text>
          <Text style={styles.timeText} numberOfLines={1}>
            -{formatTime(timeLeftMs)}
            {rate !== 1.0 && ` (-${formatTime(timeLeftWithTempoMs)})`}
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
          <MaterialCommunityIcons name="rewind" size={22} color={theme.colors.textSecondary} />
          <Text style={styles.seekLabel}>60s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playBtn}
          activeOpacity={0.7}
          onPress={player.togglePlayPause}
        >
          <MaterialCommunityIcons name={isPlaying ? 'pause' : 'play'} size={32} color={theme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.seekBtn}
          activeOpacity={0.6}
          onPress={() => player.seekRelative(60000)}
        >
          <MaterialCommunityIcons name="fast-forward" size={22} color={theme.colors.textSecondary} />
          <Text style={styles.seekLabel}>60s</Text>
        </TouchableOpacity>
      </View>

      {/* Chapter list (collapsible / scrollable) */}
      {currentBook.chapters.length > 1 && (
        <View style={styles.chapterSection}>
          <Text style={styles.chapterSectionTitle}>Chapters</Text>
          {currentBook.chapters.map((ch, idx) => {
            const isCurrent = idx === currentChapterIndex;
            const dur = chapterDurations[idx] ?? 0;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.chapterItem, isCurrent && styles.chapterItemActive]}
                onPress={() => player.goToChapter(idx)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chapterItemText, isCurrent && styles.chapterItemTextActive]}
                  numberOfLines={1}
                >
                  {idx + 1}. {ch.filename.replace(/\.\w+$/, '')}
                </Text>
                {dur > 0 && (
                  <Text style={styles.chapterDur}>{formatTime(dur)}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Rate Modal */}
      <Modal
        visible={showRateModal}
        transparent
        animationType="fade"
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
                  <Text
                    style={[styles.rateOptionText, isActive && styles.rateOptionTextActive]}
                  >
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
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
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
    width: 260,
    height: 260,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginTop: theme.spacing.lg,
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
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
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
    marginTop: theme.spacing.xl,
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
    marginTop: theme.spacing.xl,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceLight,
  },
  seekIcon: {
    fontSize: 22,
  },
  seekLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  playIcon: {
    fontSize: 32,
  },

  /* Chapter list */
  chapterSection: {
    width: '100%',
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  chapterSectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  chapterItemActive: {
    backgroundColor: theme.colors.surfaceHighlight,
  },
  chapterItemText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  chapterItemTextActive: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  chapterDur: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontVariant: ['tabular-nums'],
  },

  /* Rate modal */
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

  /* Header rate button */
  rateHeaderBtn: {
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  rateHeaderText: {
    color: theme.colors.primaryLight,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
});
