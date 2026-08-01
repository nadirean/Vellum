import React from 'react';

import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RATES } from '@consts/playback';
import { theme } from '@consts/theme';

interface RateModalProps {
  visible: boolean;
  rate: number;
  onSelect: (rate: number) => void;
  onClose: () => void;
}

export function RateModal({ visible, rate, onSelect, onClose }: RateModalProps) {
  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Playback Speed</Text>
          {RATES.map((r) => {
            const isActive = Math.abs(r - rate) < 0.01;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.rateOption, isActive && styles.rateOptionActive]}
                onPress={() => onSelect(r)}
              >
                <Text style={[styles.rateOptionText, isActive && styles.rateOptionTextActive]}>
                  {r.toFixed(r % 1 === 0 ? 1 : 2)}x
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: 240,
    elevation: 12,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  rateOption: {
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 4,
  },
  rateOptionActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  rateOptionText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.lg,
    textAlign: 'center',
  },
  rateOptionTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
