import React from 'react';

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { observer } from 'mobx-react-lite';

import { usePlayerStore } from '@providers/StoreProvider';
import { formatTime } from '@utils/time';
import { EXTENSION_REGEX } from '@consts/regexes';
import { theme } from '@consts/theme';

export const ChaptersScreen = observer(function ChaptersScreen() {
  const player = usePlayerStore();
  const { currentBook, currentChapterIndex, chapterDurations } = player;

  if (!currentBook) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.headerTitle}>CHAPTERS</Text>
        <Text style={styles.bookTitle} numberOfLines={1}>
          {currentBook.title}
        </Text>

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
                    {ch.filename.replace(EXTENSION_REGEX, '')}
                  </Text>
                  {dur > 0 && <Text style={styles.chapterDur}>{formatTime(dur)}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {},
  contentContainer: {
    padding: 24,
  },
  headerTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  bookTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    marginBottom: 32,
  },
  listContainer: {
    gap: 12,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
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
    marginRight: 16,
  },
  chapterNumber: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  chapterNumberActive: {
    color: theme.colors.primaryLight,
  },
  chapterContent: {},
  chapterText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    marginBottom: 2,
  },
  chapterTextActive: {
    color: theme.colors.primaryLight,
  },
  chapterDur: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
  },
});
