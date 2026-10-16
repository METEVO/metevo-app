import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cardBase, typography } from './styles';

export interface BalanceEntry {
  label: string;
  value: string;
}

interface BalancesCardProps {
  balances: BalanceEntry[];
}

/**
 * The sketch's single top-right balances box, kept compact: one inline row
 * per balance ("USDm BAL ......$100.00").
 * Purely presentational; values are mocked at the call site for now.
 * TODO(phase 2): feed from the offline-first wallet state store.
 */
export function BalancesCard({ balances }: BalancesCardProps) {
  return (
    <View style={[styles.card, styles.grow]}>
      {balances.map((entry) => (
        <View key={entry.label} style={styles.entry}>
          <Text style={typography.caption}>{entry.label}</Text>
          <Text style={styles.value}>{entry.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase, paddingVertical: 8, paddingHorizontal: 12 },
  grow: { flex: 1, gap: 2 },
  entry: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  value: { ...typography.body, fontWeight: '600' },
});
