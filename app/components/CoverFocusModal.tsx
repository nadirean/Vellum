import React, { useEffect, useState } from 'react';

import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { PREVIEW_SIZE } from '@consts/sizes';
import { theme } from '@consts/theme';

interface CoverFocusModalProps {
  visible: boolean;
  coverUri: string;
  initialFocusY: number;
  onSave: (focusY: number) => void;
  onClose: () => void;
}

/**
 * Modal for adjusting the vertical crop focus of a portrait cover. The drag is driven by a
 * native gesture (`Gesture.Pan`) and the image position by a reanimated shared value, so the
 * image tracks the finger on the UI thread instead of re-rendering on every move event.
 */
export function CoverFocusModal({
  visible,
  coverUri,
  initialFocusY,
  onSave,
  onClose,
}: CoverFocusModalProps) {
  const [naturalAR, setNaturalAR] = useState<number | null>(null);
  const focusY = useSharedValue(initialFocusY);
  const startFocusY = useSharedValue(initialFocusY);

  useEffect(() => {
    if (visible && coverUri) {
      focusY.value = initialFocusY;
      startFocusY.value = initialFocusY;
      Image.getSize(
        coverUri,
        (w, h) => setNaturalAR(h / w),
        () => setNaturalAR(null),
      );
    }
  }, [visible, coverUri, initialFocusY, focusY, startFocusY]);

  const renderedHeight = naturalAR && naturalAR > 1 ? PREVIEW_SIZE * naturalAR : PREVIEW_SIZE;
  const overflow = Math.max(0, renderedHeight - PREVIEW_SIZE);
  const canAdjust = naturalAR !== null && naturalAR > 1;

  const pan = Gesture.Pan()
    .enabled(overflow > 0)
    .onStart(() => {
      startFocusY.value = focusY.value;
    })
    .onUpdate((e) => {
      // Drag down → image shifts down → more of the top visible → focusY decreases
      const next = startFocusY.value - (e.translationY / overflow) * 100;
      focusY.value = Math.max(0, Math.min(100, next));
    });

  const imageStyle = useAnimatedStyle(() => ({
    top: overflow > 0 ? -(overflow * (focusY.value / 100)) : 0,
  }));

  const handleSave = () => {
    onSave(Math.round(focusY.value));
    onClose();
  };

  const handleReset = () => {
    focusY.value = 50;
  };

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Tap background to dismiss */}
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={styles.content}>
          <Text style={styles.title}>Adjust Cover Focus</Text>
          <Text style={styles.subtitle}>
            {canAdjust ? 'Drag the image up or down' : "This cover doesn't need adjustment"}
          </Text>

          <GestureDetector gesture={pan}>
            <View style={styles.previewFrame}>
              {canAdjust ? (
                <Animated.Image
                  source={{ uri: coverUri }}
                  style={{
                    position: 'absolute',
                    width: PREVIEW_SIZE,
                    height: renderedHeight,
                    ...imageStyle,
                  }}
                />
              ) : (
                <Image
                  source={{ uri: coverUri }}
                  style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                  resizeMode='cover'
                />
              )}
            </View>
          </GestureDetector>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    elevation: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  previewFrame: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceLight,
  },
  buttons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  resetBtn: {
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceLight,
  },
  resetBtnText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});
