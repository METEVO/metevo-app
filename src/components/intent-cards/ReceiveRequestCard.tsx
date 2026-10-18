import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AttentionVoice from '../../assets/voice_attention_dark.svg';
import SuccessVoice from '../../assets/voice_success_dark.svg';
import {
  MetevoTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { useKeepScreenOn } from '../../hooks/useKeepScreenOn';
import { useTransferWatcher } from '../../hooks/useTransferWatcher';
import { useWalletSession } from '../../hooks/useWalletSession';
import { getLocalLink, isLocalLinkNative } from '../../services/localelink';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';

type ReceiveStage =
  | 'compose'
  | 'waiting'
  | 'received'
  | 'local-preparing'
  | 'local-serving'
  | 'local-received'
  | 'local-error';

const MOCK_RECEIVE_AMOUNT = '20.00 USDm';
const MOCK_RECEIVE_AMOUNT_BASE_UNITS = 2_000_000_000; // precision 8
const MOCK_INVOICE = 'rgb:mock-usdm-receive-request (demo only, not payable)';

const WAITING_NOTE = 'Waiting is not a receipt.';
/** Demo-only stand-in for the wallet-confirmed settlement event. */
const MOCK_SETTLEMENT_DELAY_MS = 3_000;

/** Generates the session secrets shown on the tag (never a stored secret). */
async function generateLocalLinkSecrets(): Promise<{ sessionId: string; passphrase: string }> {
  const Crypto = require('expo-crypto') as typeof import('expo-crypto');
  const random = await Crypto.getRandomBytesAsync(16);
  const hex = Array.from(random.slice(0, 8))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const passphrase = Array.from(random.slice(8))
    .map((byte) => String.fromCharCode(97 + (byte % 26)))
    .join('');
  return { sessionId: hex, passphrase };
}

/**
 * Design section 19: create a receive request, wait for the payment, then
 * the receipt. The waiting stage never counts as a receipt; only the
 * wallet-confirmed transition shows the success state.
 *
 * "Receive in person" starts the NFC + Wi-Fi Direct local link: the phone
 * emulates the credential tag, forms the 2.4 GHz group and serves the
 * invoice over the P2P socket. stopGroup() runs in a finally block - the
 * hardware is released on success, error AND cancel.
 */
export function ReceiveRequestCard() {
  const styles = useThemedStyles(makeStyles);
  const { createUsdmInvoice } = useWalletSession();
  const watcher = useTransferWatcher();
  const [stage, setStage] = useState<ReceiveStage>('compose');
  const [note, setNote] = useState<string | null>(null);
  const linkRef = useRef<ReturnType<typeof getLocalLink> | null>(null);
  const localStageRef = useRef<ReceiveStage>('compose');
  const cancelledRef = useRef(false);

  const isLocalLinkActive =
    stage === 'local-preparing' || stage === 'local-serving';
  useKeepScreenOn(isLocalLinkActive);

  useEffect(() => {
    localStageRef.current = stage;
  }, [stage]);

  // Unmount while serving: release the hardware whatever happened.
  useEffect(() => {
    return () => {
      const link = linkRef.current;
      if (link !== null && isLocalLinkActive) {
        void link.stopGroup().catch(() => undefined);
      }
    };
  }, [isLocalLinkActive]);

  useEffect(() => {
    if (stage !== 'waiting') {
      return undefined;
    }
    const settlementTimer = setTimeout(() => setStage('received'), MOCK_SETTLEMENT_DELAY_MS);
    return () => clearTimeout(settlementTimer);
  }, [stage]);

  const startLocalReceive = useCallback(async () => {
    setNote(null);
    cancelledRef.current = false;
    setStage('local-preparing');
    const link = getLocalLink();
    linkRef.current = link;
    try {
      const { sessionId, passphrase } = await generateLocalLinkSecrets();
      await link.startTagEmulation({
        ssid: `DIRECT-metevo-${sessionId.slice(0, 4)}`,
        password: passphrase,
        sessionId,
      });
      const group = await link.startGroup(48_444);
      const { invoice } = await createUsdmInvoice(MOCK_RECEIVE_AMOUNT_BASE_UNITS);
      await link.serveInvoice({ sessionId, invoice });

      setStage('local-serving');
      // The payer taps, joins the group and pays the invoice; the watcher
      // owns the settlement outcome (attention pulse on start, then
      // success/error feedback on the terminal state).
      const result = await watcher.watch();
      if (cancelledRef.current) {
        return; // user cancelled: the finally below already tore down
      }
      if (result.status === 'settled') {
        setStage('local-received');
      } else {
        setNote(
          result.status === 'failed'
            ? 'The payment failed before it settled.'
            : 'No settled payment arrived in time.',
        );
        setStage('local-error');
      }
    } catch (cause) {
      if (cancelledRef.current) {
        return;
      }
      console.log(
        '[metevo] local receive failed:',
        cause instanceof Error ? cause.message : 'unknown',
      );
      setNote('The local link could not start on this device.');
      setStage('local-error');
    } finally {
      // Mandatory teardown: releases the Wi-Fi Direct group, the socket
      // server and the NFC credential regardless of the outcome above.
      await link.stopGroup().catch(() => undefined);
      linkRef.current = null;
    }
  }, [createUsdmInvoice, watcher]);

  const stopLocalReceive = useCallback(() => {
    cancelledRef.current = true;
    if (localStageRef.current === 'local-serving') {
      // Cancelling stops the watch loop; its promise unwinds into the
      // finally of startLocalReceive, which runs the mandatory teardown.
      watcher.stopWatching();
    }
    setStage('compose');
  }, [watcher]);

  if (stage === 'local-received') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>Received {MOCK_RECEIVE_AMOUNT} in person</Text>
        <ActionButton label="Done" variant="primary" onPress={() => setStage('compose')} />
      </View>
    );
  }

  if (stage === 'local-error') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={styles.title}>The local receive stopped</Text>
        <Text style={styles.caption}>{note ?? 'Nothing was received.'}</Text>
        <ActionButton label="Done" variant="primary" onPress={() => setStage('compose')} />
      </View>
    );
  }

  if (stage === 'local-preparing' || stage === 'local-serving') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>
          {stage === 'local-preparing' ? 'Preparing your tag…' : 'Tap to pay you'}
        </Text>
        <Text style={styles.body}>
          {stage === 'local-serving'
            ? 'The payer taps your phone and joins your group. Keep the screen on.'
            : 'Forming the Wi-Fi Direct group…'}
        </Text>
        {!isLocalLinkNative() && (
          <Text style={styles.caption}>
            Demo mode: no native NFC module on this device (Expo Go).
          </Text>
        )}
        <ActionButton label="Cancel" variant="outlined" onPress={stopLocalReceive} />
      </View>
    );
  }

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
      <ActionButton
        label="Receive in person"
        variant="outlined"
        onPress={() => void startLocalReceive()}
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
    width: '100%' as const,
    padding: layout.rowGap,
    borderRadius: 8,
    backgroundColor: theme.cardBase.backgroundColor,
  },
  invoice: theme.typography.caption,
});
