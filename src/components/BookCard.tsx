import React from 'react';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FocusedCoverImage } from '@components/FocusedCoverImage';
import { theme } from '@consts/theme';

interface BookCardProps {
  title: string;
  author: string;
  coverUri: string | null;
  progressPercent: number | null; // 0–100 or null if not started
  isPlaying: boolean;
  onPress: () => void;
  coverFocusY?: number; // 0–100, default 50
}

export function BookCard({
  title,
  author,
  coverUri,
  progressPercent,
  isPlaying,
  onPress,
  coverFocusY,
}: BookCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, isPlaying && styles.cardPlaying]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.coverContainer}>
        {coverUri ? (
          <FocusedCoverImage uri={coverUri} size={60} focusY={coverFocusY} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <MaterialCommunityIcons
              name='headphones'
              size={32}
              color={theme.colors.textSecondary}
            />
          </View>
        )}
        {isPlaying && (
          <View style={styles.playingBadge}>
            <MaterialCommunityIcons name='play' size={10} color={theme.colors.text} />
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {author && author !== 'Unknown Author' && (
          <Text style={styles.author} numberOfLines={1}>
            {author}
          </Text>
        )}

        {progressPercent !== null && progressPercent > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View
                style={[styles.progressFill, { width: `${Math.min(100, progressPercent)}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progressPercent)}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  cardPlaying: {
    borderColor: theme.colors.primaryLight,
    borderWidth: 2,
  },
  coverContainer: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceLight,
    overflow: 'hidden',
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
  placeholderIcon: {
    fontSize: 32,
  },
  playingBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingText: {
    color: theme.colors.text,
    fontSize: 10,
  },
  infoContainer: {
    flex: 1,
    paddingLeft: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  author: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.xs,
  },
  progressBg: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.progressBg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.progressFill,
    borderRadius: 2,
  },
  progressText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    minWidth: 28,
    textAlign: 'right',
  },
});
