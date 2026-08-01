import React from 'react';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@consts/theme';

interface PlayerHeaderRightProps {
  rate: number;
  onOpenChapters: () => void;
  onOpenRate: () => void;
}

export function PlayerHeaderRight({ rate, onOpenChapters, onOpenRate }: PlayerHeaderRightProps) {
  return (
    <View style={styles.headerRight}>
      <TouchableOpacity onPress={onOpenChapters} style={styles.headerBtn}>
        <MaterialCommunityIcons
          name='format-list-bulleted'
          size={24}
          color={theme.colors.primaryLight}
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={onOpenRate} style={styles.headerBtn}>
        <Text style={styles.rateHeaderText}>{rate.toFixed(rate % 1 === 0 ? 1 : 2)}x</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerBtn: {
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    minWidth: 44,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateHeaderText: {
    color: theme.colors.primaryLight,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
});
