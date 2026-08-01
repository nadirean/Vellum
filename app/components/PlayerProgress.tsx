import React, { useState } from 'react';
import Slider from '@react-native-community/slider';

import { StyleSheet, Text, View } from 'react-native';

import { formatTime } from '@utils/time';
import { theme } from '@consts/theme';

interface PlayerProgressProps {
  durationMs: number;
  positionMs: number;
  rate: number;
  onSeek: (positionMs: number) => void;
}

/**
 * Seek bar + time readout. The slider is "write-only" while dragging, so the
 * component mirrors a local seek position back into `value` instead of feeding
 * it live progress; the preview resolves to the live position when released.
 */
export function PlayerProgress({ durationMs, positionMs, rate, onSeek }: PlayerProgressProps) {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPositionMs, setSeekPositionMs] = useState(0);

  const displayPositionMs = isSeeking ? seekPositionMs : positionMs;
  const displayProgress = durationMs > 0 ? (displayPositionMs / durationMs) * 100 : 0;
  const timeLeftMs = Math.max(0, durationMs - displayPositionMs);
  const timeLeftWithTempoMs = timeLeftMs / rate;

  return (
    <View style={styles.progressSection}>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={Math.max(1, durationMs)}
        value={Math.min(displayPositionMs, Math.max(1, durationMs))}
        minimumTrackTintColor={theme.colors.progressFill}
        maximumTrackTintColor={theme.colors.progressBg}
        thumbTintColor={theme.colors.primaryLight}
        onValueChange={(value) => {
          setIsSeeking(true);
          setSeekPositionMs(value);
        }}
        onSlidingStart={() => setIsSeeking(true)}
        onSlidingComplete={(value) => {
          setSeekPositionMs(value);
          setIsSeeking(false);
          onSeek(value);
        }}
      />

      <View style={styles.timeRow}>
        <Text style={styles.timeText} numberOfLines={1}>
          {formatTime(displayPositionMs)} ({displayProgress.toFixed(1)}%)
        </Text>
        <Text style={styles.timeText} numberOfLines={1}>
          -{formatTime(timeLeftMs)}
          {rate !== 1.0 && ` (-${formatTime(timeLeftWithTempoMs)})`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressSection: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  slider: {
    width: '100%',
    height: 36,
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
});
