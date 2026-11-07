import React, { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useThemedStyles } from '../../design/ThemeContext';
import { usePaymentJournal } from '../../hooks/usePaymentJournal';
import {
  EMPTY_HISTORY,
  JOURNAL_SCOPE_NOTE,
  describeDay,
  describeEntry,
  spokenHistory,
} from '../../services/metevo/journalMessages';
import { announceForAccessibility, speakEnglish } from '../../utils/speaker';
import { ActionButton } from '../ui/ActionButton';
import type { IntentCardProps } from './IntentCard';
import { makeSummaryCardStyles } from './summaryCardStyles';

const VISIBLE_ENTRIES = 10;

/** History: the latest payments this phone saw settle, read out loud. */
export function ReadTransactionsCard({ onClearIntent }: IntentCardProps) {
  const styles = useThemedStyles(makeSummaryCardStyles);
  const entries = usePaymentJournal();

  useEffect(() => {
    if (entries === null) {
      return;
    }
    const spoken = spokenHistory(entries);
    speakEnglish(spoken);
    announceForAccessibility(spoken);
  }, [entries]);

  return (
    <View style={styles.panel}>
      <View style={styles.content}>
        <Text style={styles.title}>History</Text>
        {entries !== null && entries.length === 0 && (
          <Text style={styles.body}>{EMPTY_HISTORY}</Text>
        )}
        {entries?.slice(0, VISIBLE_ENTRIES).map((entry) => (
          <View key={entry.id} style={styles.row}>
            <Text style={styles.rowLabel}>{describeEntry(entry)}</Text>
            <Text style={styles.caption}>
              {describeDay(entry.settledAt)}
              {entry.demo ? ' · Demo' : ''}
            </Text>
          </View>
        ))}
        <Text style={styles.caption}>{JOURNAL_SCOPE_NOTE}</Text>
      </View>
      <ActionButton label="Done" variant="primary" onPress={() => onClearIntent?.()} />
    </View>
  );
}
