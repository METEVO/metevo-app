import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../design/ThemeContext';
import { layout } from './styles';
import { MockTransaction } from './mocks';

interface TransactionListProps {
  transactions: MockTransaction[];
}

/**
 * "LAST TRANSACTIONS" block: a FlatList capped at three simple text rows.
 * FlatList is kept (not .map) so the future real-data shape matches;
 * scrollEnabled={false} keeps it static inside the screen.
 */
export function TransactionList({ transactions }: TransactionListProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.card}>
      <Text style={theme.typography.caption}>LAST TRANSACTIONS</Text>
      {transactions.length === 0 ? (
        <Text style={theme.typography.caption}>
          No transactions yet. Receive or send money to see activity here.
        </Text>
      ) : (
        <FlatList
          data={transactions.slice(0, 3)}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.main}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={theme.typography.caption}>{item.detail}</Text>
              </View>
              <Text style={styles.amount}>{item.amount}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  card: {
    ...theme.cardBase,
    gap: 8,
  },
  row: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  main: {
    gap: 2,
  },
  title: {
    ...theme.typography.body,
    fontWeight: '600' as const,
  },
  amount: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
});
