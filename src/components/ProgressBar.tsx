import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { theme } from '@consts/theme';

interface ProgressBarProps {
  /** 0 – 1 */
  progress: number;
  onPreviewChange?: (ratio: number) => void;
  onSeek?: (ratio: number) => void | Promise<void>;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function ProgressBar({
  progress,
  onPreviewChange,
  onSeek,
  onDragStart,
  onDragEnd,
}: ProgressBarProps) {
  const barWidthRef = useRef(0);
  const dragProgressRef = useRef(progress);
  const interactionIdRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);

  const isInteractive = !!onSeek;

  const clampRatio = (ratio: number) => Math.max(0, Math.min(1, ratio));

  useEffect(() => {
    if (!isDragging && dragProgress === null) {
      dragProgressRef.current = progress;
    }
  }, [progress, isDragging, dragProgress]);

  const handleLayout = (e: LayoutChangeEvent) => {
    barWidthRef.current = e.nativeEvent.layout.width;
  };

  const handleTouchStart = (e: GestureResponderEvent) => {
    if (!isInteractive) return;
    interactionIdRef.current += 1;
    setIsDragging(true);
    onDragStart?.();
    updatePreview(e);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    if (!isDragging || !isInteractive) return;
    updatePreview(e);
  };

  const handleTouchEnd = () => {
    if (!isDragging || !isInteractive) return;

    const interactionId = interactionIdRef.current;
    const finalRatio = dragProgressRef.current;
    const completeInteraction = () => {
      if (interactionIdRef.current !== interactionId) return;
      setIsDragging(false);
      setDragProgress(null);
      onDragEnd?.();
    };

    Promise.resolve(onSeek?.(finalRatio))
      .catch(() => {
        // The caller owns user-facing error handling.
      })
      .finally(completeInteraction);
  };

  const updatePreview = (e: GestureResponderEvent) => {
    const width = barWidthRef.current;
    if (!width) return;

    const ratio = clampRatio(e.nativeEvent.locationX / width);
    dragProgressRef.current = ratio;
    setDragProgress(ratio);
    onPreviewChange?.(ratio);
  };

  // Use dragged progress during drag, otherwise use actual progress
  const displayProgress = dragProgress ?? progress;

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      onStartShouldSetResponder={() => isInteractive}
      onMoveShouldSetResponder={() => isInteractive}
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
