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
const DEFAULT_AMOUNT_BASE_UNITS = DEFAULT_AMOUNT_USD * USDM_BASE_UNITS_PER_USD;

const WAITING_NOTE = 'Waiting is not a receipt.';

/** Formats base units as the panel's "20.00". */
function formatAmount(baseUnits: number): string {
  return (baseUnits / USDM_BASE_UNITS_PER_USD).toFixed(2);
}

/**
 * Strict parse of the typed amount into base units. Accepts "20", "20.5",
 * "20,5" (decimal-pad comma) and at most 8 decimals; anything else (thousand
 * separators, exponent notation, trailing text) is rejected instead of being
 * truncated to a different amount.
 */
function parseAmountBaseUnits(raw: string): number | null {
  const match = /^(\d{1,9})(?:[.,](\d{1,8}))?$/.exec(raw.trim());
  if (match === null) {
    return null;
  }
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(8, '0'));
  const baseUnits = whole * USDM_BASE_UNITS_PER_USD + fraction;
  return Number.isSafeInteger(baseUnits) && baseUnits > 0 ? baseUnits : null;
}

/** Validates the voice payload's amount (absent/invalid -> the default). */
function readPayloadBaseUnits(payload: unknown): number {
  const raw = (payload as { amountUsd?: unknown } | null | undefined)?.amountUsd;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_AMOUNT_BASE_UNITS;
  }
  const baseUnits = Math.round(raw * USDM_BASE_UNITS_PER_USD);
  return Number.isSafeInteger(baseUnits) && baseUnits > 0
    ? baseUnits
    : DEFAULT_AMOUNT_BASE_UNITS;
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
  const [amountBaseUnits, setAmountBaseUnits] = useState<number>(() =>
    readPayloadBaseUnits(payload),
  );
  const [amountDraft, setAmountDraft] = useState<string>(() =>
    formatAmount(readPayloadBaseUnits(payload)),
  );
  const [invoice, setInvoice] = useState<string | null>(null);
  const linkRef = useRef<ReturnType<typeof getLocalLink> | null>(null);
  const localStageRef = useRef<ReceiveStage>('compose');
  const cancelledRef = useRef(false);
  /** The pending public-request watch, so the local flow can wait it out. */
  const publicWatchRef = useRef<Promise<unknown> | null>(null);
  /** Set when the user leaves a public request: its outcome is discarded. */
  const abandonedRef = useRef(false);

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
    async (baseUnits: number) => {
      setNote(null);
      abandonedRef.current = false;
      setStage('creating');
      let created: { invoice: string; paymentHash: string | null };
      try {
        created = await createUsdmInvoice(baseUnits);
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
      if (__DEV__) {
        // Public payment request (no secret): lets a demo operator pay it from
        // the regtest CLI without copying the long string off the screen.
        console.log('[metevo] invoice ready:', created.invoice);
      }
      setStage('waiting');
      // The watcher owns the outcome: only a wallet-confirmed settlement
      // reaches the success state. LN invoices settle through the payment
      // list (the on-chain transfer list never shows them), so watch the
      // payment hash; blind invoices fall back to the transfer watch.
      const pending = created.paymentHash
        ? watcher.watchPayment(created.paymentHash)
        : watcher.watch();
      publicWatchRef.current = pending;
      const result = await pending;
      publicWatchRef.current = null;
      if (abandonedRef.current) {
        return; // the user left: a cancelled watch must not show an outcome
      }
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
    const baseUnits = parseAmountBaseUnits(amountDraft);
    if (baseUnits === null) {
      setNote('Enter an amount like 20 or 20.50, up to 8 decimals.');
      return;
    }
    setAmountBaseUnits(baseUnits);
    setAmountDraft(formatAmount(baseUnits));
    void createRequest(baseUnits);
  }, [amountDraft, createRequest]);

  const startLocalReceive = useCallback(async () => {
    setNote(null);
    cancelledRef.current = false;
    // The watcher is single-flight: end the pending public request and let it
    // unwind first, otherwise the local flow would inherit its promise and
    // report its outcome as this one.
    abandonedRef.current = true;
    watcher.stopWatching();
    const pending = publicWatchRef.current;
    if (pending !== null) {
      await pending;
      publicWatchRef.current = null;
    }
    abandonedRef.current = false;
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
      const { invoice } = await createUsdmInvoice(amountBaseUnits);
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
    abandonedRef.current = true;
    watcher.stopWatching();
    setStage('compose');
  }, [watcher]);

  /** Terminal screens return to the amount panel without their stale note. */
  const backToCompose = useCallback(() => {
    setNote(null);
    setStage('compose');
  }, []);

  if (stage === 'local-received') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>
          Received {formatAmount(amountBaseUnits)} USDm in person
        </Text>
        <ActionButton label="Done" variant="primary" onPress={backToCompose} />
      </View>
    );
  }

  if (stage === 'local-error') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={styles.title}>The local receive stopped</Text>
        <Text style={styles.caption}>{note ?? 'Nothing was received.'}</Text>
        <ActionButton label="Done" variant="primary" onPress={backToCompose} />
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
          Asking your node for a {formatAmount(amountBaseUnits)} USDm invoice.
        </Text>
      </View>
    );
  }

  if (stage === 'received') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>Received {formatAmount(amountBaseUnits)} USDm</Text>
        <ActionButton label="Done" variant="primary" onPress={backToCompose} />
      </View>
    );
  }

  if (stage === 'request-error') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={styles.title}>The request stopped</Text>
        <Text style={styles.caption}>{note ?? 'Nothing was received.'}</Text>
        <ActionButton label="Done" variant="primary" onPress={backToCompose} />
      </View>
    );
  }

  if (stage === 'waiting') {
    return (
      <View style={styles.canvas}>
        <Text style={styles.title}>Request ready</Text>
        <Text style={styles.body}>
          Share your request to receive {formatAmount(amountBaseUnits)} USDm.
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
