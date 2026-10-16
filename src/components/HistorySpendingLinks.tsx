import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { cardBase, layout, typography } from './styles';

const LINKS = ['HISTORY', 'SPENDING'] as const;

/**
 * Bottom "HISTORY" and "SPENDING" text buttons of the sketch.
 * Non-functional placeholders by design (no navigation in this phase).
 * TODO(phase 2): trigger the read-transactions / read-spending-overview
 * intents directly (voice-first product; these stay as visible shortcuts).
 */
export function HistorySpendingLinks() {
  return (
    <View style={styles.row}>
      {LINKS.map((label) => (
        <TouchableOpacity
          key={label}
          style={styles.link}
          onPress={() => undefined}
          accessibilityRole="button"
          accessibilityLabel={label.charAt(0) + label.slice(1).toLowerCase()}
        >
          <Text style={typography.body}>{label}</Text>
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
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
