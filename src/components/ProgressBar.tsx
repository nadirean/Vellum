import React, { useRef, useState } from 'react';
import { View, StyleSheet, GestureResponderEvent } from 'react-native';
import { theme } from '@consts/theme';

interface ProgressBarProps {
  /** 0 – 1 */
  progress: number;
  onSeek?: (ratio: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function ProgressBar({ progress, onSeek, onDragStart, onDragEnd }: ProgressBarProps) {
  const barRef = useRef<View>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const handleTouchStart = (e: GestureResponderEvent) => {
    if (!onSeek) return;
    setIsDragging(true);
    onDragStart?.();
    updateProgress(e);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    if (!isDragging || !onSeek) return;
    updateProgress(e);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  const updateProgress = (e: GestureResponderEvent) => {
    if (!onSeek) return;
    barRef.current?.measure((_x, _y, width) => {
      if (!width) return;
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / width));
      setDragProgress(ratio);
      onSeek(ratio);
    });
  };

  // Use dragged progress during drag, otherwise use actual progress
  const displayProgress = isDragging ? dragProgress : progress;

  return (
    <View
      ref={barRef}
      style={styles.container}
      onStartShouldSetResponder={() => !!onSeek}
      onMoveShouldSetResponder={() => !!onSeek}
      onResponderGrant={handleTouchStart}
      onResponderMove={handleTouchMove}
      onResponderRelease={handleTouchEnd}
      onResponderTerminate={handleTouchEnd}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, displayProgress * 100)}%` }]} />
        <View
          style={[
            styles.thumb,
            { left: `${Math.min(100, displayProgress * 100)}%` },
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
    backgroundColor: theme.colors.primaryLight,
    marginLeft: -8,
    top: -5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
