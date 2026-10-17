import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../design/ThemeContext';

export interface BalanceEntry {
  label: string;
  value: string;
}

interface BalancesCardProps {
  balances: BalanceEntry[];
}

/**
 * The design's single top balance box, kept compact: one inline row per
 * balance ("USDm BAL ......20.00 USDm").
 * Purely presentational; values come from the wallet session.
 * TODO(phase 2): feed from the offline-first wallet state store.
 */
export function BalancesCard({ balances }: BalancesCardProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.card, styles.grow]}>
      {balances.map((entry) => (
        <View key={entry.label} style={styles.entry}>
          <Text style={theme.typography.caption}>{entry.label}</Text>
          <Text style={styles.value}>{entry.value}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  card: {
    ...theme.cardBase,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  grow: {
    flex: 1,
    gap: 2,
  },
  entry: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  value: {
    ...theme.typography.body,
    fontWeight: '600' as const,
  },
});
