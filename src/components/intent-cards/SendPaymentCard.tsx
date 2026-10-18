import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AttentionVoice from '../../assets/voice_attention_dark.svg';
import ProcessingVoice from '../../assets/voice_processing_dark.svg';
import SuccessVoice from '../../assets/voice_success_dark.svg';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { usePaymentFlow } from '../../hooks/usePaymentFlow';
import { useWalletSession } from '../../hooks/useWalletSession';
import {
  PaymentNetworkStatus,
  PaymentValidationError,
} from '../../services/metevo/wallet-gateway';
import {
  PaymentVoiceIntent,
  parseVoicePaymentIntent,
} from '../../services/metevo/paymentIntent';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { IntentCardProps } from './IntentCard';

type PaymentStage = 'review' | 'pending' | 'settled' | 'failed' | 'unknown';

/**
 * The design's demo proposal (section 20/21 storyboard). Real amounts,
 * destination validation and fees arrive with the wallet payment flow; the
 * demo invoice is clearly marked and never reaches a real node in mock
 * mode.
 */
const MOCK_PROPOSAL = [
  { label: 'To', value: 'Maria' },
  { label: 'Destination', value: 'rgb:mock-destination…f0' },
  { label: 'Amount', value: '10.00 USDm' },
  { label: 'Fee', value: '0.02 USDm' },
  { label: 'Total', value: '10.02 USDm' },
] as const;

const DEMO_INVOICE = 'rgb:mock-destination-invoice (demo only)';
const DEMO_NOTE = 'Demo proposal - not a real payment.';

/** Poll cadence and the timeout that turns pending into unknown. */
const STATUS_POLL_INTERVAL_MS = 2_000;
const STATUS_TIMEOUT_MS = 60_000;

const PENDING_TITLE = 'Pending';
const FAILED_TITLE = 'The payment failed';
const UNKNOWN_TITLE = 'Status unknown';
const UNKNOWN_NOTE =
  'The payment may or may not have been submitted. Check the existing transaction before doing anything else.';
const CHECK_ACTION = 'Check again';
const NEW_REVIEW_ACTION = 'New review';

/**
 * Design sections 20/21: full payment review, then an explicit one-shot
 * confirmation. Without a valid voice payload this renders the demo
 * proposal; with one, the remote LSP-relayed payment flow takes over.
 */
export function SendPaymentCard(props: IntentCardProps) {
  const voiceIntent = useMemo(
    () => parseVoicePaymentIntent(props.payload),
    [props.payload],
  );
  if (voiceIntent === null) {
    return <DemoSendPaymentCard {...props} />;
  }
  return <VoiceSendPaymentCard intent={voiceIntent} {...props} />;
}

/**
 * Remote flow: the parsed voice intent drives the LSP invoice relay, the
 * biometric confirmation and the transfer watcher's settlement outcome.
 */
function VoiceSendPaymentCard({
  intent,
  onClearIntent,
}: { intent: PaymentVoiceIntent } & IntentCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { stage, proposal, note, start, confirm, cancel } = usePaymentFlow();

  useEffect(() => {
    // The voice command already decided "pay"; the invoice request starts
    // as soon as the card renders.
    void start(intent);
  }, [intent, start]);

  const finish = useCallback(() => {
    cancel();
    onClearIntent?.();
  }, [cancel, onClearIntent]);

  if (stage === 'requesting' || stage === 'authorizing' || stage === 'submitting') {
    return (
      <View style={styles.centered}>
        <ProcessingVoice width={64} height={64} />
        <Text style={styles.title}>
          {stage === 'requesting'
            ? 'Requesting the invoice…'
            : stage === 'authorizing'
              ? 'Waiting for your confirmation…'
              : 'Submitting the payment…'}
        </Text>
        {note !== null && <Text style={styles.caption}>{note}</Text>}
      </View>
    );
  }

  if (stage === 'watching') {
    return (
      <View style={styles.centered}>
        <ProcessingVoice width={64} height={64} />
        <Text style={styles.title}>{PENDING_TITLE}</Text>
        <Text style={styles.caption}>The payment is not confirmed yet.</Text>
      </View>
    );
  }

  if (stage === 'settled') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>Settled</Text>
        <Text style={styles.body}>
          {formatAmount(proposal)} sent to {proposal?.recipient ?? intent.recipient}.
        </Text>
        <ActionButton label="Done" variant="primary" onPress={finish} />
      </View>
    );
  }

  if (stage === 'failed') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={styles.title}>{FAILED_TITLE}</Text>
        <Text style={styles.caption}>
          The node reported a confirmed failure. Nothing was resent.
        </Text>
        <ActionButton label="Done" variant="primary" onPress={finish} />
      </View>
    );
  }

  if (stage === 'unknown') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={styles.title}>{UNKNOWN_TITLE}</Text>
        <Text style={styles.caption}>{UNKNOWN_NOTE}</Text>
        <ActionButton label="Done" variant="primary" onPress={finish} />
      </View>
    );
  }

  if (stage === 'error') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={styles.title}>The payment could not start</Text>
        <Text style={styles.caption}>
          {note ?? 'The invoice request failed. Try again.'}
        </Text>
        <View style={styles.actions}>
          <ActionButton label="Back" variant="outlined" onPress={finish} grow />
          <ActionButton
            label="Try again"
            variant="primary"
            onPress={() => void start(intent)}
            grow
          />
        </View>
      </View>
    );
  }

  if (stage === 'review' && proposal !== null) {
    return (
      <View style={styles.canvas}>
        <Text style={styles.title}>Send {proposal.asset}</Text>
        <View style={styles.row}>
          <Text style={styles.caption}>To</Text>
          <Text style={styles.value}>{proposal.recipient}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.caption}>Amount</Text>
          <Text style={styles.value}>{formatAmount(proposal)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.caption}>Destination</Text>
          <Text style={styles.invoiceText}>{shortenInvoice(proposal.invoice)}</Text>
        </View>
        {note !== null && <Text style={styles.rejection}>{note}</Text>}
        <View style={styles.actions}>
          <ActionButton label="Cancel" variant="outlined" onPress={finish} grow />
          <ActionButton
            label="Confirm payment"
            variant="primary"
            onPress={() => void confirm()}
            grow
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <ProcessingVoice width={64} height={64} />
      <Text style={styles.title}>Preparing…</Text>
    </View>
  );
}

function formatAmount(proposal: { amount: number; asset: string } | null): string {
  if (proposal === null) {
    return '';
  }
  return `${(proposal.amount).toFixed(2)} ${proposal.asset}`;
}

function shortenInvoice(invoice: string): string {
  if (invoice.length <= 24) {
    return invoice;
  }
  return `${invoice.slice(0, 12)}…${invoice.slice(-8)}`;
}

/**
 * Demo path (no voice payload): the section 20/21 storyboard with the
 * clearly-marked fake proposal, polling checkPayment for the outcome.
 */
function DemoSendPaymentCard({ onClearIntent }: IntentCardProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { submitPayment, checkPayment } = useWalletSession();

  const [stage, setStage] = useState<PaymentStage>('review');
  const [rejectionNote, setRejectionNote] = useState<string | null>(null);
  const paymentHashRef = useRef<string | null>(null);

  const confirm = useCallback(async () => {
    setRejectionNote(null);
    setStage('pending');
    try {
      const submitted = await submitPayment({ invoice: DEMO_INVOICE });
      paymentHashRef.current = submitted.paymentHash;
    } catch (cause) {
      if (cause instanceof PaymentValidationError) {
        // Validation ran before the node was touched: nothing was sent.
        setStage('review');
        setRejectionNote('Nothing was submitted: this demo proposal is not a payable invoice.');
        return;
      }
      // Submission may or may not have reached the node; unknown keeps the
      // outcome honest instead of guessing.
      setStage('unknown');
    }
  }, [submitPayment]);

  useEffect(() => {
    if (stage !== 'pending') {
      return undefined;
    }
    let cancelled = false;
    const deadline = Date.now() + STATUS_TIMEOUT_MS;

    const poll = async () => {
      const hash = paymentHashRef.current;
      if (hash === null) {
        setStage('unknown');
        return;
      }
      const status: PaymentNetworkStatus = await checkPayment(hash);
      if (cancelled) {
        return;
      }
      if (status === 'settled' || status === 'failed') {
        setStage(status);
        return;
      }
      if (Date.now() >= deadline) {
        setStage('unknown');
        return;
      }
      pollTimer = setTimeout(poll, STATUS_POLL_INTERVAL_MS);
    };

    let pollTimer = setTimeout(poll, STATUS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [stage, checkPayment]);

  const checkExisting = useCallback(async () => {
    const hash = paymentHashRef.current;
    if (hash === null) {
      return;
    }
    const status = await checkPayment(hash);
    if (status === 'settled' || status === 'failed') {
      setStage(status);
      return;
    }
    // Still unconfirmed stays unknown: pending is not resubmitted.
  }, [checkPayment]);

  if (stage === 'pending') {
    return (
      <View style={styles.centered}>
        <ProcessingVoice width={64} height={64} />
        <Text style={styles.title}>{PENDING_TITLE}</Text>
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
        <ActionButton
          label="Done"
          variant="primary"
          onPress={() => {
            setStage('review');
            onClearIntent?.();
          }}
        />
      </View>
    );
  }

  if (stage === 'failed') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={styles.title}>{FAILED_TITLE}</Text>
        <Text style={styles.caption}>
          The node reported a confirmed failure. Nothing was resent.
        </Text>
        <ActionButton
          label={NEW_REVIEW_ACTION}
          variant="primary"
          onPress={() => setStage('review')}
        />
      </View>
    );
  }

  if (stage === 'unknown') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={styles.title}>{UNKNOWN_TITLE}</Text>
        <Text style={styles.caption}>{UNKNOWN_NOTE}</Text>
        <ActionButton
          label={CHECK_ACTION}
          variant="primary"
          onPress={() => void checkExisting()}
        />
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
      {rejectionNote !== null && (
        <Text style={styles.rejection}>{rejectionNote}</Text>
      )}
      <View style={styles.actions}>
        <ActionButton label="Cancel" variant="outlined" onPress={() => setStage('review')} grow />
        <ActionButton label="Confirm payment" variant="primary" onPress={() => void confirm()} grow />
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
  invoiceText: {
    ...theme.typography.caption,
    flexShrink: 1,
  },
  rejection: {
    ...theme.typography.caption,
    color: theme.voiceStates.attention.fill,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: layout.rowGap,
  },
});
