import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import AttentionVoice from '../../assets/voice_attention_dark.svg';
import SuccessVoice from '../../assets/voice_success_dark.svg';
import { MetevoTheme, useThemedStyles } from '../../design/ThemeContext';
import { relayErrorMessage, useInvoiceInbox } from '../../hooks/useInvoiceInbox';
import { useWalletSession } from '../../hooks/useWalletSession';
import { playTacton } from '../../services/metevo/tacton';
import { speakAnnouncement } from '../../services/spokenInteraction';
import { useAttentionSignal } from '../AttentionSignal';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';

/**
 * The recipient's card for a relayed invoice request (the "Bob confirms"
 * half): the payer asked the LSP for an invoice, and this card decides
 * whether the recipient's own node creates one. Nothing is created, and no
 * money moves, before the recipient taps Create invoice.
 */

type InvoiceRequestStage = 'review' | 'creating' | 'sent' | 'declined' | 'error';

const USDM_BASE_UNITS_PER_USD = 10 ** 8;

interface InvoiceInboxPayload {
  requestId: string;
  amountUsd: number;
  senderName: string | null;
}

/** The payload comes from the inbox poll; validate it like any other input. */
function parsePayload(payload: unknown): InvoiceInboxPayload | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const requestId =
    typeof record['requestId'] === 'string' && /^[0-9a-f]{64}$/i.test(record['requestId'])
      ? record['requestId'].toLowerCase()
      : null;
  const amountUsd =
    typeof record['amountUsd'] === 'number' &&
    Number.isSafeInteger(record['amountUsd']) &&
    record['amountUsd'] > 0
      ? record['amountUsd']
      : null;
  if (requestId === null || amountUsd === null) {
    return null;
  }
  return {
    requestId,
    amountUsd,
    senderName:
      typeof record['senderName'] === 'string' && record['senderName'].length > 0
        ? record['senderName']
        : null,
  };
}

function formatUsd(amountUsd: number): string {
  return `${amountUsd.toFixed(2)} USDm`;
}

export function InvoiceRequestCard({
  payload,
  onClearIntent,
}: {
  payload?: unknown;
  onClearIntent?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const inbox = useInvoiceInbox();
  const { createUsdmInvoice } = useWalletSession();
  const request = parsePayload(payload);
  const [stage, setStage] = useState<InvoiceRequestStage>('review');
  const [note, setNote] = useState<string | null>(null);

  useAttentionSignal(stage === 'error');

  const accept = useCallback(async () => {
    if (request === null) {
      return;
    }
    setStage('creating');
    setNote(null);
    let created: { invoice: string; paymentHash: string | null };
    try {
      created = await createUsdmInvoice(request.amountUsd * USDM_BASE_UNITS_PER_USD);
    } catch (cause) {
      console.log(
        '[metevo] relay invoice creation failed:',
        cause instanceof Error ? cause.message : 'unknown',
      );
      setNote('Your node could not create the invoice. Nothing was sent.');
      setStage('error');
      playTacton('error');
      return;
    }
    try {
      await inbox.accept(request.requestId, created.invoice, created.paymentHash);
    } catch (cause) {
      setNote(relayErrorMessage(cause));
      setStage('error');
      playTacton('error');
      return;
    }
    setStage('sent');
    playTacton('success');
    speakAnnouncement('Invoice sent. The money arrives when they pay.');
  }, [createUsdmInvoice, inbox, request]);

  const decline = useCallback(async () => {
    setNote(null);
    try {
      await inbox.decline();
      setStage('declined');
      playTacton('success');
    } catch (cause) {
      setNote(relayErrorMessage(cause));
      setStage('error');
      playTacton('error');
    }
  }, [inbox]);

  if (request === null) {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={[styles.title, styles.errorTitle]}>The request is unavailable</Text>
        <Text style={styles.caption}>Nothing was created.</Text>
        <ActionButton label="Done" variant="primary" onPress={() => onClearIntent?.()} />
      </View>
    );
  }

  if (stage === 'creating') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Creating your invoice…</Text>
        <Text style={styles.body}>
          Asking your node for a {formatUsd(request.amountUsd)} invoice.
        </Text>
      </View>
    );
  }

  if (stage === 'sent') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>Invoice sent</Text>
        <Text style={styles.body}>
          {formatUsd(request.amountUsd)} arrives when they pay.
        </Text>
        <Text style={styles.caption}>Waiting is not a receipt.</Text>
        <ActionButton label="Done" variant="primary" onPress={() => onClearIntent?.()} />
      </View>
    );
  }

  if (stage === 'declined') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>Request declined</Text>
        <Text style={styles.caption}>No invoice was created and no money moved.</Text>
        <ActionButton label="Done" variant="primary" onPress={() => onClearIntent?.()} />
      </View>
    );
  }

  if (stage === 'error') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={[styles.title, styles.errorTitle]}>The request stopped</Text>
        <Text style={styles.caption}>{note ?? 'Nothing was sent.'}</Text>
        <ActionButton label="Done" variant="primary" onPress={() => onClearIntent?.()} />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {request.senderName === null
            ? 'Invoice request'
            : `Invoice request from ${request.senderName}`}
        </Text>
        <Text style={styles.body}>
          They want to send you {formatUsd(request.amountUsd)}. Create the invoice so they can
          pay.
        </Text>
        {inbox.error !== null && (
          <Text style={styles.caption}>{inbox.error}</Text>
        )}
      </View>
      <Text style={styles.caption}>
        No money moves until they pay the invoice.
      </Text>
      <View style={styles.actions}>
        <ActionButton label="Decline" variant="outlined" onPress={() => void decline()} grow />
        <ActionButton
          label="Create invoice"
          variant="primary"
          onPress={() => void accept()}
          grow
        />
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
  centered: {
    width: '100%' as const,
    alignItems: 'center' as const,
    gap: layout.rowGap,
  },
  title: {
    ...theme.typography.title,
    color: theme.voiceStates.idle.ink,
  },
  errorTitle: {
    color: theme.voiceStates.attention.ink,
  },
  body: theme.typography.body,
  caption: theme.typography.caption,
  actions: {
    flexDirection: 'row' as const,
    gap: layout.rowGap,
  },
});
