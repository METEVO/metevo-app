import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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
import { metevoDesignTokens } from '../../design/designTokens';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';

type ReceiveStage =
  | 'compose'
  | 'creating'
  | 'waiting'
  | 'received'
  | 'request-error'
  | 'local-preparing'
  | 'local-serving'
  | 'local-received'
  | 'local-error';

/** The request amount when the voice command named none. */
const DEFAULT_AMOUNT_USD = 20;
const USDM_BASE_UNITS_PER_USD = 10 ** 8;
const MOCK_RECEIVE_AMOUNT = '20.00 USDm';
const MOCK_RECEIVE_AMOUNT_BASE_UNITS = 2_000_000_000; // precision 8

const WAITING_NOTE = 'Waiting is not a receipt.';

/** Validates the voice payload's amount (absent/invalid -> the default). */
function readPayloadAmount(payload: unknown): number {
  const raw = (payload as { amountUsd?: unknown } | null | undefined)?.amountUsd;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0
    ? raw
    : DEFAULT_AMOUNT_USD;
}

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
 * The request is a REAL invoice on this node for the amount the voice
 * command carried ("a payment request of 30 dollars" -> 30 USDm; the
 * default applies when no amount was spoken). The settlement comes from
 * the transfer watcher, never from a timer.
 *
 * "Receive in person" starts the NFC + Wi-Fi Direct local link: the phone
 * emulates the credential tag, forms the 2.4 GHz group and serves the
 * invoice over the P2P socket. stopGroup() runs in a finally block - the
 * hardware is released on success, error AND cancel.
 */
export function ReceiveRequestCard({
  payload,
  onClearIntent,
}: {
  payload?: unknown;
  onClearIntent?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { createUsdmInvoice } = useWalletSession();
  const watcher = useTransferWatcher();
  const [stage, setStage] = useState<ReceiveStage>('compose');
  const [note, setNote] = useState<string | null>(null);
  const [amountUsd, setAmountUsd] = useState<number>(() => readPayloadAmount(payload));
  const [amountDraft, setAmountDraft] = useState<string>(() =>
    readPayloadAmount(payload).toFixed(2),
  );
  const [invoice, setInvoice] = useState<string | null>(null);
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

  const createRequest = useCallback(
    async (amount: number) => {
      setNote(null);
      setStage('creating');
      let created: { invoice: string; paymentHash: string | null };
      try {
        created = await createUsdmInvoice(
          Math.round(amount * USDM_BASE_UNITS_PER_USD),
        );
      } catch (cause) {
        console.log(
          '[metevo] invoice creation failed:',
          cause instanceof Error ? cause.message : 'unknown',
        );
        setNote('The invoice could not be created. Try again.');
        setStage('request-error');
        return;
      }
      setInvoice(created.invoice);
      // Public payment request: log it so a demo operator can pay it from the
      // regtest CLI without copying the long string off the screen.
      console.log('[metevo] invoice ready:', created.invoice);
      setStage('waiting');
      // The watcher owns the outcome: only a wallet-confirmed settlement
      // reaches the success state. LN invoices settle through the payment
      // list (the on-chain transfer list never shows them), so watch the
      // payment hash; blind invoices fall back to the transfer watch.
      const result = created.paymentHash
        ? await watcher.watchPayment(created.paymentHash)
        : await watcher.watch();
      if (result.status === 'settled') {
        setStage('received');
      } else {
        setNote(
          result.status === 'failed'
            ? 'The payment failed before it settled.'
            : 'No settled payment arrived in time.',
        );
        setStage('request-error');
      }
    },
    [createUsdmInvoice, watcher],
  );

  /** Done on the amount panel: validates the typed amount, then invoices. */
  const submitAmount = useCallback(() => {
    const parsed = Number.parseFloat(amountDraft.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setNote('Enter an amount greater than zero.');
      return;
    }
    setAmountUsd(parsed);
    void createRequest(parsed);
  }, [amountDraft, createRequest]);

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

  const stopWaiting = useCallback(() => {
    watcher.stopWatching();
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

  if (stage === 'creating') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Creating your request…</Text>
        <Text style={styles.body}>
          Asking your node for a {amountUsd.toFixed(2)} USDm invoice.
        </Text>
      </View>
    );
  }

  if (stage === 'received') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>Received {amountUsd.toFixed(2)} USDm</Text>
        <ActionButton label="Done" variant="primary" onPress={() => setStage('compose')} />
      </View>
    );
  }

  if (stage === 'request-error') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={styles.title}>The request stopped</Text>
        <Text style={styles.caption}>{note ?? 'Nothing was received.'}</Text>
        <ActionButton label="Done" variant="primary" onPress={() => setStage('compose')} />
      </View>
    );
  }

  if (stage === 'waiting') {
    return (
      <View style={styles.canvas}>
        <Text style={styles.title}>Request ready</Text>
        <Text style={styles.body}>
          Share your request to receive {amountUsd.toFixed(2)} USDm.
        </Text>
        <View style={styles.invoiceBox}>
          <ScrollView style={styles.invoiceScroll}>
            <Text style={styles.invoice} selectable>
              {invoice}
            </Text>
          </ScrollView>
        </View>
        <Text style={styles.caption}>{WAITING_NOTE}</Text>
        <View style={styles.actions}>
          <ActionButton label="Back" variant="outlined" onPress={stopWaiting} grow />
          <ActionButton
            label="Receive in person"
            variant="outlined"
            onPress={() => void startLocalReceive()}
            grow
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Request amount</Text>
        <Text style={styles.body}>Amount in USDm</Text>
        <TextInput
          style={styles.amountInput}
          value={amountDraft}
          onChangeText={setAmountDraft}
          keyboardType="decimal-pad"
          accessibilityLabel="Amount in USDm"
          selectTextOnFocus
        />
        <Text style={styles.caption}>Use the number keyboard.</Text>
        {note !== null && <Text style={styles.rejection}>{note}</Text>}
      </View>
      <View style={styles.actions}>
        <ActionButton
          label="Cancel"
          variant="outlined"
          onPress={() => onClearIntent?.()}
          grow
        />
        <ActionButton label="Done" variant="primary" onPress={submitAmount} grow />
      </View>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  panel: {
    flex: 1,
    justifyContent: 'space-between' as const,
    gap: layout.rowGap,
  },
  header: {
    gap: layout.rowGap / 2,
  },
  canvas: {
    width: '100%' as const,
    gap: layout.rowGap,
  },
  centered: {
    width: '100%' as const,
    alignItems: 'center' as const,
    gap: layout.rowGap,
  },
  title: {
    ...theme.typography.title,
    color: theme.voiceStates.idle.ink,
  },
  body: theme.typography.body,
  caption: theme.typography.caption,
  amountInput: {
    ...theme.typography.body,
    minHeight: scale(metevoDesignTokens.layout.actionHeight),
    paddingHorizontal: scale(8),
    borderRadius: scale(metevoDesignTokens.layout.cardRadius),
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
  },
  rejection: {
    ...theme.typography.caption,
    color: theme.voiceStates.attention.ink,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: scale(metevoDesignTokens.layout.pairedActionGap),
  },
  invoiceBox: {
    width: '100%' as const,
    padding: layout.rowGap,
    borderRadius: 8,
    backgroundColor: theme.cardBase.backgroundColor,
  },
  /** Keeps the long invoice from pushing the actions out of the panel. */
  invoiceScroll: {
    maxHeight: scale(26),
  },
  invoice: theme.typography.caption,
});
