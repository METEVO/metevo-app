import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { cardBase, colors, typography } from './styles';
import { MockTransaction } from './mocks';

interface TransactionListProps {
  transactions: MockTransaction[];
}

/**
 * "LAST 2/3 TRANSACTIONS" block of the sketch: a FlatList capped at three
 * simple text rows. FlatList is kept (not .map) so the future real-data
 * shape matches; scrollEnabled={false} keeps it static inside the screen.
 */
export function TransactionList({ transactions }: TransactionListProps) {
  return (
    <View style={[styles.card, styles.list]}>
      <Text style={typography.caption}>LAST TRANSACTIONS</Text>
      <FlatList
        data={transactions.slice(0, 3)}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.main}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={typography.caption}>{item.detail}</Text>
            </View>
            <Text style={styles.amount}>{item.amount}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  main: { gap: 2 },
  title: { ...typography.body, fontWeight: '600' },
  amount: { ...typography.body, color: colors.textMuted },
});
