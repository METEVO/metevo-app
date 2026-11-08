import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import AttentionVoice from '../../assets/voice_attention_dark.svg';
import ProcessingVoice from '../../assets/voice_processing_dark.svg';
import SuccessVoice from '../../assets/voice_success_dark.svg';
import { useAttentionSignal } from '../AttentionSignal';
import { InPersonPaymentCard } from './InPersonPaymentCard';
import { MetevoTheme, useThemedStyles } from '../../design/ThemeContext';
import { usePaymentFlow } from '../../hooks/usePaymentFlow';
import { StoredContact, listContacts } from '../../services/metevo/contacts';
import { paymentMessage, parseWholeUsdm } from '../../services/metevo/paymentMessages';
import {
  PaymentVoiceIntent,
  parseVoicePaymentIntent,
} from '../../services/metevo/paymentIntent';
import { metevoDesignTokens } from '../../design/designTokens';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { IntentCardProps } from './IntentCard';

/**
 * Design sections 20/21: voice and touch reach the same LSP-relayed
 * payment flow. A spoken command arrives as a payload; "Send money" picks
 * a contact and a whole amount first. "Pay in person" switches to the
 * NFC + Wi-Fi Direct local flow.
 */
export function SendPaymentCard(props: IntentCardProps) {
  const [inPerson, setInPerson] = useState(false);
  const [tapIntent, setTapIntent] = useState<PaymentVoiceIntent | null>(null);
  const voiceIntent = useMemo(
    () => parseVoicePaymentIntent(props.payload),
    [props.payload],
  );
  const intent = voiceIntent ?? tapIntent;

  if (inPerson) {
    return <InPersonPaymentCard {...props} />;
  }
  if (intent === null) {
    return (
      <TapSendSetup
        {...props}
        onReady={setTapIntent}
        onPayInPerson={() => setInPerson(true)}
      />
    );
  }
  return (
    <RelaySendPaymentCard
      intent={intent}
      {...props}
      onPayInPerson={() => setInPerson(true)}
    />
  );
}

/**
 * Touch entry: choose who gets the money, then how much. The result is the
 * same validated intent a spoken command produces.
 */
function TapSendSetup({
  onClearIntent,
  onSelectIntent,
  onReady,
  onPayInPerson,
}: IntentCardProps & {
  onReady: (intent: PaymentVoiceIntent) => void;
  onPayInPerson: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [contacts, setContacts] = useState<StoredContact[] | null>(null);
  const [recipient, setRecipient] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState('');
  const [rejection, setRejection] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void listContacts().then((stored) => {
      if (alive) setContacts(stored);
    });
    return () => {
      alive = false;
    };
  }, []);

  const submitAmount = useCallback(() => {
    if (recipient === null) return;
    const amount = parseWholeUsdm(amountDraft);
    const intent =
      amount === null
        ? null
        : parseVoicePaymentIntent({ action: 'pay', asset: 'USDM', amount, recipient });
    if (intent === null) {
      setRejection('Enter whole dollars, for example 20.');
      return;
    }
    setRejection(null);
    onReady(intent);
  }, [amountDraft, onReady, recipient]);

  if (contacts === null) {
    return (
      <View style={styles.centered}>
        <ProcessingVoice width={64} height={64} />
        <Text style={styles.title}>Loading your contacts…</Text>
      </View>
    );
  }

  if (recipient === null) {
    return (
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Who gets the money?</Text>
          {contacts.length === 0 ? (
            <Text style={styles.body}>No contacts yet. Add someone in Contacts first.</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {contacts.map((contact) => (
                <ActionButton
                  key={contact.nodePubkey}
                  label={contact.name}
                  variant="outlined"
                  onPress={() => setRecipient(contact.name)}
                />
              ))}
            </ScrollView>
          )}
        </View>
        <View style={styles.actions}>
          <ActionButton label="Cancel" variant="outlined" onPress={() => onClearIntent?.()} grow />
          {contacts.length === 0 ? (
            <ActionButton
              label="Open Contacts"
              variant="primary"
              onPress={() => onSelectIntent?.('contacts')}
              grow
            />
          ) : (
            <ActionButton label="Pay in person" variant="outlined" onPress={onPayInPerson} grow />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>How much to {recipient}?</Text>
        <Text style={styles.body}>Amount in USDm</Text>
        <TextInput
          style={styles.amountInput}
          value={amountDraft}
          onChangeText={setAmountDraft}
          keyboardType="number-pad"
          accessibilityLabel={`Amount in USDm for ${recipient}`}
          autoFocus
        />
        <Text style={styles.caption}>Whole dollars only for now.</Text>
        {rejection !== null && <Text style={styles.rejection}>{rejection}</Text>}
      </View>
      <View style={styles.actions}>
        <ActionButton label="Back" variant="outlined" onPress={() => setRecipient(null)} grow />
        <ActionButton label="Continue" variant="primary" onPress={submitAmount} grow />
      </View>
    </View>
  );
}

/**
 * The relayed flow for both entries: invoice request to the contact's
 * phone, review, biometric confirmation and the node's settlement outcome.
 * Every stage shows the same sentence the flow reads out loud.
 */
function RelaySendPaymentCard({
  intent,
  onClearIntent,
  onPayInPerson,
}: { intent: PaymentVoiceIntent } & IntentCardProps & { onPayInPerson?: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const {
    stage,
    proposal,
    note,
    balanceWarning,
    start,
    confirm,
    cancel,
    checkStatus,
    canCheckStatus,
  } = usePaymentFlow();
  useAttentionSignal(stage === 'failed' || stage === 'unknown' || stage === 'error');
  const message = paymentMessage(stage, {
    recipient: intent.recipient,
    amount: intent.amount,
    canCheckStatus,
  });

  useEffect(() => {
    // The payment decision was made by voice or on the setup screen; the
    // invoice request starts as soon as the card renders.
    void start(intent);
  }, [intent, start]);

  const finish = useCallback(() => {
    cancel();
    onClearIntent?.();
  }, [cancel, onClearIntent]);

  if (stage === 'requesting') {
    return (
      <View style={styles.centered}>
        <ProcessingVoice width={64} height={64} />
        <Text style={styles.title}>{message.title}</Text>
        <Text style={styles.body}>
          {intent.recipient} needs to open METEVO and tap "Create invoice".
        </Text>
        <ActionButton label="Cancel" variant="outlined" onPress={finish} />
      </View>
    );
  }

  if (stage === 'authorizing' || stage === 'submitting' || stage === 'watching') {
    return (
      <View style={styles.centered}>
        <ProcessingVoice width={64} height={64} />
        <Text style={styles.title}>{message.title}</Text>
      </View>
    );
  }

  if (stage === 'settled') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>{message.title}</Text>
        <Text style={styles.body}>
          {formatAmount(proposal?.amount ?? intent.amount)} sent to {intent.recipient}.
        </Text>
        <ActionButton label="Done" variant="primary" onPress={finish} />
      </View>
    );
  }

  if (stage === 'failed') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={[styles.title, styles.errorTitle]}>{message.title}</Text>
        <Text style={styles.caption}>No money left your wallet. Nothing was resent.</Text>
        <ActionButton label="Done" variant="primary" onPress={finish} />
      </View>
    );
  }

  if (stage === 'unknown') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={[styles.title, styles.errorTitle]}>{message.title}</Text>
        <Text style={styles.caption}>
          Do not pay again.{' '}
          {canCheckStatus
            ? 'Check status asks about this same payment; it never sends a new one.'
            : 'Check your history first.'}
        </Text>
        {note !== null && <Text style={styles.rejection}>{note}</Text>}
        <View style={styles.actions}>
          <ActionButton label="Done" variant="outlined" onPress={finish} grow />
          {canCheckStatus && (
            <ActionButton
              label="Check status"
              variant="primary"
              onPress={() => void checkStatus()}
              grow
            />
          )}
        </View>
      </View>
    );
  }

  if (stage === 'error') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={[styles.title, styles.errorTitle]}>{message.title}</Text>
        <Text style={styles.caption}>{note ?? 'The invoice request failed. Try again.'}</Text>
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
        <Text style={styles.title}>{message.title}</Text>
        <View style={styles.row}>
          <Text style={styles.caption}>To</Text>
          <Text style={styles.value}>{proposal.recipient}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.caption}>Amount</Text>
          <Text style={styles.value}>{formatAmount(proposal.amount)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.caption}>Invoice</Text>
          <Text style={styles.invoiceText}>{shortenInvoice(proposal.invoice)}</Text>
        </View>
        {balanceWarning !== null && <Text style={styles.rejection}>{balanceWarning}</Text>}
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
        <ActionButton
          label="Pay in person instead"
          variant="outlined"
          onPress={() => onPayInPerson?.()}
        />
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

function formatAmount(amount: number): string {
  return `${amount.toFixed(2)} USDm`;
}

function shortenInvoice(invoice: string): string {
  if (invoice.length <= 24) {
    return invoice;
  }
  return `${invoice.slice(0, 12)}…${invoice.slice(-8)}`;
}

const makeStyles = (theme: MetevoTheme) => ({
  panel: {
    flex: 1,
    justifyContent: 'space-between' as const,
    gap: layout.rowGap,
  },
  header: {
    flexShrink: 1,
    gap: layout.rowGap / 2,
  },
  list: {
    gap: layout.rowGap,
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
  errorTitle: {
    color: theme.voiceStates.attention.ink,
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
    color: theme.voiceStates.attention.ink,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: scale(metevoDesignTokens.layout.pairedActionGap),
  },
});
