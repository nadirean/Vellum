import React, { useRef } from 'react';
import { View, StyleSheet, GestureResponderEvent } from 'react-native';
import { theme } from '../theme';

interface ProgressBarProps {
  /** 0 – 1 */
  progress: number;
  onSeek?: (ratio: number) => void;
}

export function ProgressBar({ progress, onSeek }: ProgressBarProps) {
  const barRef = useRef<View>(null);

  const handleTouch = (e: GestureResponderEvent) => {
    if (!onSeek) return;
    barRef.current?.measure((_x, _y, width) => {
      if (!width) return;
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / width));
      onSeek(ratio);
    });
  };

  return (
    <View
      ref={barRef}
      style={styles.container}
      onStartShouldSetResponder={() => !!onSeek}
      onMoveShouldSetResponder={() => !!onSeek}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]} />
        <View
          style={[
            styles.thumb,
            { left: `${Math.min(100, progress * 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  track: {
    height: 6,
    backgroundColor: theme.colors.progressBg,
    borderRadius: 3,
    overflow: 'visible',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.progressFill,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    marginLeft: -8,
    top: -5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
