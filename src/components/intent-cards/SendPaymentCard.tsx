import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ProcessingVoice from '../../assets/voice_processing_dark.svg';
import SuccessVoice from '../../assets/voice_success_dark.svg';
import {
  MetevoTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';

type PaymentStage = 'review' | 'pending' | 'settled';

/**
 * The design's demo proposal (section 20/21 storyboard). Real amounts,
 * destination validation and fees arrive with the wallet payment flow;
 * animation completion never counts as settlement confirmation.
 */
const MOCK_PROPOSAL = [
  { label: 'To', value: 'Maria' },
  { label: 'Destination', value: 'rgb:mock-destination…f0' },
  { label: 'Amount', value: '10.00 USDm' },
  { label: 'Fee', value: '0.02 USDm' },
  { label: 'Total', value: '10.02 USDm' },
] as const;

const DEMO_NOTE = 'Demo proposal - not a real payment.';
const MOCK_SETTLEMENT_DELAY_MS = 3_000;

/**
 * Design sections 20/21: full payment review, then an explicit one-shot
 * confirmation. Cancel discards the unsubmitted proposal; pending is never
 * displayed as success.
 */
export function SendPaymentCard() {
  const styles = useThemedStyles(makeStyles);
  const [stage, setStage] = useState<PaymentStage>('review');

  useEffect(() => {
    if (stage !== 'pending') {
      return undefined;
    }
    const settlementTimer = setTimeout(() => setStage('settled'), MOCK_SETTLEMENT_DELAY_MS);
    return () => clearTimeout(settlementTimer);
  }, [stage]);

  if (stage === 'pending') {
    return (
      <View style={styles.centered}>
        <ProcessingVoice width={64} height={64} />
        <Text style={styles.title}>Pending</Text>
        <Text style={styles.caption}>The payment is not confirmed yet.</Text>
      </View>
    );
  }

  if (stage === 'settled') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>Settled</Text>
        <Text style={styles.body}>10.00 USDm sent to Maria.</Text>
        <ActionButton label="Done" variant="primary" onPress={() => setStage('review')} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <Text style={styles.title}>Send USDm</Text>
      {MOCK_PROPOSAL.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.caption}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
      <Text style={styles.caption}>{DEMO_NOTE}</Text>
      <View style={styles.actions}>
        <ActionButton label="Cancel" variant="outlined" onPress={() => setStage('review')} grow />
        <ActionButton label="Confirm payment" variant="primary" onPress={() => setStage('pending')} grow />
      </View>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  canvas: {
    width: '100%' as const,
    gap: layout.rowGap,
  },
  centered: {
    width: '100%' as const,
    alignItems: 'center' as const,
    gap: layout.rowGap,
  },
  title: theme.typography.title,
  body: theme.typography.body,
  caption: theme.typography.caption,
  row: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: layout.rowGap,
  },
  value: {
    ...theme.typography.body,
    fontWeight: '700' as const,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: layout.rowGap,
  },
});
