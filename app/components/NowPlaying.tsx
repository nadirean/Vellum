import React from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FocusedCoverImage } from '@components/FocusedCoverImage';
import { COVER_CONTENT_SIZE } from '@consts/sizes';
import { theme } from '@consts/theme';

interface NowPlayingProps {
  chapterIndex: number;
  chapterCount: number;
  chapterName: string;
  coverUri: string | null;
  focusY: number;
  title: string;
  author: string;
  onLongPressCover: () => void;
}

/**
 * Player "now playing" block: the current chapter index/name, the vertically-focusable cover image
 * (long-press opens the cover focus editor), and the book's title and author.
 */
export function NowPlaying({
  chapterIndex,
  chapterCount,
  chapterName,
  coverUri,
  focusY,
  title,
  author,
  onLongPressCover,
}: NowPlayingProps) {
  return (
    <>
      <View style={styles.chapterContainer}>
        <Text style={styles.chapterCount}>
          Chapter {chapterIndex + 1} of {chapterCount}
        </Text>
        {chapterName && (
          <Text style={styles.chapterName} numberOfLines={1}>
            {chapterName}
          </Text>
        )}
      </View>

      <Pressable style={styles.coverWrapper} onLongPress={onLongPressCover} delayLongPress={400}>
        {coverUri ? (
          <FocusedCoverImage
            uri={coverUri}
            size={COVER_CONTENT_SIZE}
            focusY={focusY}
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

      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {author && author !== 'Unknown Author' && (
        <Text style={styles.author} numberOfLines={1}>
          {author}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.lg,
  },
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
});
