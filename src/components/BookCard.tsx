import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { theme } from '../theme';

interface BookCardProps {
  title: string;
  coverUri: string | null;
  progressPercent: number | null; // 0–100 or null if not started
  isPlaying: boolean;
  onPress: () => void;
}

const CARD_GAP = theme.spacing.md;
const SCREEN_PADDING = theme.spacing.md;
const CARD_WIDTH = (Dimensions.get('window').width - SCREEN_PADDING * 2 - CARD_GAP) / 2;

export function BookCard({ title, coverUri, progressPercent, isPlaying, onPress }: BookCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, isPlaying && styles.cardPlaying]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.coverContainer}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.placeholderIcon}>🎧</Text>
          </View>
        )}
        {isPlaying && (
          <View style={styles.playingBadge}>
            <Text style={styles.playingText}>▶</Text>
          </View>
        )}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>

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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: CARD_GAP,
  },
  cardPlaying: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surfaceLight,
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
    fontSize: 48,
  },
  playingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    padding: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    gap: 6,
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
