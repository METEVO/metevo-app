import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import SuccessVoice from '../../assets/voice_success_dark.svg';
import {
  MetevoTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';

type ReceiveStage = 'compose' | 'waiting' | 'received';

const MOCK_RECEIVE_AMOUNT = '20.00 USDm';
const MOCK_INVOICE = 'rgb:mock-usdm-receive-request (demo only, not payable)';

const WAITING_NOTE = 'Waiting is not a receipt.';
/** Demo-only stand-in for the wallet-confirmed settlement event. */
const MOCK_SETTLEMENT_DELAY_MS = 3_000;

/**
 * Design section 19: create a receive request, wait for the payment, then
 * the receipt. The waiting stage never counts as a receipt; only the
 * wallet-confirmed transition shows the success state.
 */
export function ReceiveRequestCard() {
  const styles = useThemedStyles(makeStyles);
  const [stage, setStage] = useState<ReceiveStage>('compose');

  useEffect(() => {
    if (stage !== 'waiting') {
      return undefined;
    }
    const settlementTimer = setTimeout(() => setStage('received'), MOCK_SETTLEMENT_DELAY_MS);
    return () => clearTimeout(settlementTimer);
  }, [stage]);

  if (stage === 'received') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>Received {MOCK_RECEIVE_AMOUNT}</Text>
        <ActionButton label="Done" variant="primary" onPress={() => setStage('compose')} />
      </View>
    );
  }

  if (stage === 'waiting') {
    return (
      <View style={styles.canvas}>
        <Text style={styles.title}>Request ready</Text>
        <Text style={styles.body}>
          Share your request to receive {MOCK_RECEIVE_AMOUNT}.
        </Text>
        <View style={styles.invoiceBox}>
          <Text style={styles.invoice}>{MOCK_INVOICE}</Text>
        </View>
        <Text style={styles.caption}>{WAITING_NOTE}</Text>
        <ActionButton label="Back" variant="outlined" onPress={() => setStage('compose')} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <Text style={styles.title}>Receive money</Text>
      <Text style={styles.body}>Create a request to receive.</Text>
      <ActionButton
        label="Create request"
        variant="primary"
        onPress={() => setStage('waiting')}
      />
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
  invoiceBox: {
    ...theme.cardBase,
    padding: 8,
  },
  invoice: theme.typography.caption,
});
