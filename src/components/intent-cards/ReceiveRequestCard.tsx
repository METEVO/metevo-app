import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import SuccessVoice from '../../assets/voice_success_dark.svg';
import { cardBase, layout, typography } from '../styles';
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
        <Text style={typography.title}>Received {MOCK_RECEIVE_AMOUNT}</Text>
        <ActionButton label="Done" variant="primary" onPress={() => setStage('compose')} />
      </View>
    );
  }

  if (stage === 'waiting') {
    return (
      <View style={styles.canvas}>
        <Text style={typography.title}>Request ready</Text>
        <Text style={typography.body}>Share your request to receive {MOCK_RECEIVE_AMOUNT}.</Text>
        <View style={styles.invoiceBox}>
          <Text style={styles.invoice}>{MOCK_INVOICE}</Text>
        </View>
        <Text style={typography.caption}>{WAITING_NOTE}</Text>
        <ActionButton label="Back" variant="outlined" onPress={() => setStage('compose')} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <Text style={typography.title}>Receive money</Text>
      <Text style={typography.body}>Create a request to receive.</Text>
      <ActionButton
        label="Create request"
        variant="primary"
        onPress={() => setStage('waiting')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    gap: layout.rowGap,
  },
  centered: {
    width: '100%',
    alignItems: 'center',
    gap: layout.rowGap,
  },
  invoiceBox: {
    ...cardBase,
    padding: 8,
  },
  invoice: {
    ...typography.caption,
    fontVariant: ['tabular-nums'],
  },
});
