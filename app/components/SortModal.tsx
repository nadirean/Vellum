import React from 'react';

import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LibrarySort, LibrarySortMode } from '@type/LibraryTypes';
import { theme } from '@consts/theme';

interface SortModalProps {
  visible: boolean;
  sort: LibrarySort;
  onSelect: (mode: LibrarySortMode) => void;
  onFlipDirection: () => void;
  onClose: () => void;
}

const SORT_OPTIONS: { mode: LibrarySortMode; label: string }[] = [
  { mode: 'recent', label: 'Recently played' },
  { mode: 'title', label: 'Title' },
  { mode: 'author', label: 'Author' },
];

/**
 * Modal for choosing the library ordering. Tapping a mode selects it; tapping the already-active
 * mode flips its direction, with an arrow icon showing the current order. The modal stays open so
 * mode and direction can be adjusted in one go - tap the dimmed backdrop to close.
 */
export function SortModal({ visible, sort, onSelect, onFlipDirection, onClose }: SortModalProps) {
  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Sort Library</Text>
          <Text style={styles.modalHint}>Tap the active option to flip the order</Text>
          {SORT_OPTIONS.map(({ mode, label }) => {
            const isActive = sort.mode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.sortOption, isActive && styles.sortOptionActive]}
                onPress={() => (isActive ? onFlipDirection() : onSelect(mode))}
              >
                <Text style={[styles.sortOptionText, isActive && styles.sortOptionTextActive]}>
                  {label}
                </Text>
                {isActive && (
                  <MaterialCommunityIcons
                    name={sort.ascending ? 'arrow-up' : 'arrow-down'}
                    size={18}
                    color={theme.colors.text}
                  />
                )}
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
    width: 260,
    elevation: 12,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalHint: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: theme.spacing.md,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 4,
  },
  sortOptionActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  sortOptionText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.lg,
  },
  sortOptionTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
