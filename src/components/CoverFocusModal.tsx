import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Image, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@consts/theme';

interface CoverFocusModalProps {
  visible: boolean;
  coverUri: string;
  initialFocusY: number;
  onSave: (focusY: number) => void;
  onClose: () => void;
}

const PREVIEW_SIZE = 260;

export function CoverFocusModal({
  visible,
  coverUri,
  initialFocusY,
  onSave,
  onClose,
}: CoverFocusModalProps) {
  const [naturalAR, setNaturalAR] = useState<number | null>(null);
  const [focusY, setFocusY] = useState(initialFocusY);

  const focusYRef = useRef(initialFocusY);
  const startRef = useRef(initialFocusY);
  const overflowRef = useRef(0);

  useEffect(() => {
    if (visible && coverUri) {
      setFocusY(initialFocusY);
      focusYRef.current = initialFocusY;
      Image.getSize(
        coverUri,
        (w, h) => setNaturalAR(h / w),
        () => setNaturalAR(null),
      );
    }
  }, [visible, coverUri, initialFocusY]);

  const renderedHeight = naturalAR && naturalAR > 1 ? PREVIEW_SIZE * naturalAR : PREVIEW_SIZE;
  const overflow = Math.max(0, renderedHeight - PREVIEW_SIZE);
  overflowRef.current = overflow;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
        onPanResponderGrant: () => {
          startRef.current = focusYRef.current;
        },
        onPanResponderMove: (_, gs) => {
          const ov = overflowRef.current;
          if (ov <= 0) return;
          // Drag down → image shifts down → more of the top visible → focusY decreases
          const newVal = Math.max(0, Math.min(100, startRef.current - (gs.dy / ov) * 100));
          focusYRef.current = newVal;
          setFocusY(newVal);
        },
      }),
    [],
  );

  const imageTop = overflow > 0 ? -(overflow * (focusY / 100)) : 0;
  const canAdjust = naturalAR !== null && naturalAR > 1;

  const handleSave = () => {
    onSave(Math.round(focusY));
    onClose();
  };

  const handleReset = () => {
    setFocusY(50);
    focusYRef.current = 50;
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

          <View style={styles.previewFrame} {...(canAdjust ? panResponder.panHandlers : {})}>
            {canAdjust ? (
              <Image
                source={{ uri: coverUri }}
                style={{
                  position: 'absolute',
                  width: PREVIEW_SIZE,
                  height: renderedHeight,
                  top: imageTop,
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
