import React from 'react';

import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@consts/theme';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onTogglePlayPause: () => void;
  onSeekRelative: (deltaMs: number) => void;
}

/**
 * Transport controls: rewind 60 seconds, play/pause toggle, and forward 60 seconds. Seeks are
 * expressed as relative deltas so the caller (the player store) decides how to apply them.
 */
export function PlaybackControls({
  isPlaying,
  onTogglePlayPause,
  onSeekRelative,
}: PlaybackControlsProps) {
  return (
    <View style={styles.controls}>
      <TouchableOpacity
        style={styles.seekBtn}
        activeOpacity={0.6}
        onPress={() => onSeekRelative(-60000)}
      >
        <MaterialCommunityIcons name='rewind' size={36} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.playBtn} activeOpacity={0.7} onPress={onTogglePlayPause}>
        <MaterialCommunityIcons
          name={isPlaying ? 'pause' : 'play'}
          size={54}
          color={theme.colors.text}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.seekBtn}
        activeOpacity={0.6}
        onPress={() => onSeekRelative(60000)}
      >
        <MaterialCommunityIcons name='fast-forward' size={36} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
