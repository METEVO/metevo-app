import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import HistoryIcon from '../assets/history_dark.svg';
import SpendingIcon from '../assets/spending_dark.svg';
import { cardBase, layout, scale, typography } from './styles';

/** Intrinsic reference size shared by the bottom action asset viewBoxes. */
const ACTION_ICON_REFERENCE = { width: 16, height: 17 } as const;

const LINKS = [
  { label: 'HISTORY', Icon: HistoryIcon },
  { label: 'SPENDING', Icon: SpendingIcon },
] as const;

/**
 * Bottom "HISTORY" and "SPENDING" shell controls of the design.
 * Non-functional placeholders by design (no navigation in this phase).
 * TODO(phase 2): trigger the read-transactions / read-spending-overview
 * intents directly (voice-first product; these stay as visible shortcuts).
 */
export function HistorySpendingLinks() {
  return (
    <View style={styles.row}>
      {LINKS.map(({ label, Icon }) => (
        <TouchableOpacity
          key={label}
          style={styles.link}
          onPress={() => undefined}
          accessibilityRole="button"
          accessibilityLabel={label.charAt(0) + label.slice(1).toLowerCase()}
        >
          <Icon
            width={scale(ACTION_ICON_REFERENCE.width)}
            height={scale(ACTION_ICON_REFERENCE.height)}
          />
          <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: layout.rowGap,
  },
  link: {
    ...cardBase,
    flex: 1,
    minHeight: layout.secondaryButton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout.rowGap,
  },
  label: typography.caption,
});
