import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { theme } from '@consts/theme';
import { usePlayer } from '@contexts/PlayerContext';

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

export function Chapters() {
  const player = usePlayer();
  const { currentBook, currentChapterIndex, chapterDurations } = player;

  if (!currentBook) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.surface} />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.headerTitle}>Chapters</Text>
        <Text style={styles.bookTitle} numberOfLines={1}>{currentBook.title}</Text>

        <View style={styles.listContainer}>
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
                <View style={styles.chapterNumberContainer}>
                  <Text style={[styles.chapterNumber, isCurrent && styles.chapterNumberActive]}>
                    {(idx + 1).toString().padStart(2, '0')}
                  </Text>
                </View>
                <View style={styles.chapterContent}>
                  <Text
                    style={[styles.chapterText, isCurrent && styles.chapterTextActive]}
                    numberOfLines={2}
                  >
                    {ch.filename.replace(/\.\w+$/, '')}
                  </Text>
                  {dur > 0 && (
                    <Text style={styles.chapterDur}>{formatTime(dur)}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  headerTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  bookTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    marginBottom: theme.spacing.xl,
  },
  listContainer: {
    gap: 12,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chapterItemActive: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderColor: theme.colors.primary,
  },
  chapterNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  chapterNumber: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  chapterNumberActive: {
    color: theme.colors.primaryLight,
  },
  chapterContent: {
    flex: 1,
  },
  chapterText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    marginBottom: 2,
  },
  chapterTextActive: {
    color: theme.colors.primaryLight,
    fontWeight: '700',
  },
  chapterDur: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
});
