import React, { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';

import { useThemedStyles } from '../../design/ThemeContext';
import { usePaymentJournal } from '../../hooks/usePaymentJournal';
import {
  JOURNAL_SCOPE_NOTE,
  formatUsdm,
  spokenSpending,
} from '../../services/metevo/journalMessages';
import { summarizeSpending } from '../../services/metevo/paymentJournal';
import { announceForAccessibility, speakEnglish } from '../../utils/speaker';
import { ActionButton } from '../ui/ActionButton';
import type { IntentCardProps } from './IntentCard';
import { makeSummaryCardStyles } from './summaryCardStyles';

/** Spending: sent and received totals over the last 7 and 30 days. */
export function ReadSpendingOverviewCard({ onClearIntent }: IntentCardProps) {
  const styles = useThemedStyles(makeSummaryCardStyles);
  const entries = usePaymentJournal();
  const summary = useMemo(
    () => (entries === null ? null : summarizeSpending(entries)),
    [entries],
  );

  useEffect(() => {
    if (summary === null) {
      return;
    }
    const spoken = spokenSpending(summary);
    speakEnglish(spoken);
    announceForAccessibility(spoken);
  }, [summary]);

  const rows =
    summary === null
      ? []
      : [
          { label: 'Sent this week', amount: summary.week.sentUsdm },
          { label: 'Received this week', amount: summary.week.receivedUsdm },
          { label: 'Sent this month', amount: summary.month.sentUsdm },
          { label: 'Received this month', amount: summary.month.receivedUsdm },
        ];

  return (
    <View style={styles.panel}>
      <View style={styles.content}>
        <Text style={styles.title}>Spending</Text>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.value}>{formatUsdm(row.amount)}</Text>
          </View>
        ))}
        <Text style={styles.caption}>{JOURNAL_SCOPE_NOTE}</Text>
      </View>
      <ActionButton label="Done" variant="primary" onPress={() => onClearIntent?.()} />
    </View>
  );
}
