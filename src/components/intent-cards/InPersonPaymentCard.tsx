import React from 'react';
import { Text, View } from 'react-native';

import AttentionVoice from '../../assets/voice_attention_dark.svg';
import ProcessingVoice from '../../assets/voice_processing_dark.svg';
import SuccessVoice from '../../assets/voice_success_dark.svg';
import { useInPersonPayment } from '../../hooks/useInPersonPayment';
import { useThemedStyles, MetevoTheme } from '../../design/ThemeContext';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { IntentCardProps } from './IntentCard';

/**
 * The in-person payer flow: NFC tap -> Wi-Fi Direct group -> invoice
 * fetch -> contact verification -> biometric -> settlement over the
 * direct channel or the LSP. Hardware teardown lives in the hook's
 * finally block and in its unmount cleanup.
 */
export function InPersonPaymentCard({ onClearIntent }: IntentCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { stage, proposal, note, payInPerson, confirm, cancel } = useInPersonPayment();

  const finish = React.useCallback(() => {
    cancel();
    onClearIntent?.();
  }, [cancel, onClearIntent]);

  React.useEffect(() => {
    if (stage === 'idle') {
      void payInPerson();
    }
  }, [stage, payInPerson]);

  if (stage === 'scanning' || stage === 'fetching') {
    return (
      <View style={styles.centered}>
        <ProcessingVoice width={64} height={64} />
        <Text style={styles.title}>
          {stage === 'scanning' ? "Tap the receiver's tag" : 'Joining their group…'}
        </Text>
        <Text style={styles.caption}>Keep both phones close together.</Text>
      </View>
    );
  }

  if (stage === 'paying' || stage === 'watching') {
    return (
      <View style={styles.centered}>
        <ProcessingVoice width={64} height={64} />
        <Text style={styles.title}>
          {stage === 'paying' ? 'Authorizing…' : 'Pending'}
        </Text>
        <Text style={styles.caption}>The payment is not confirmed yet.</Text>
      </View>
    );
  }

  if (stage === 'settled') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>Settled in person</Text>
        {proposal?.plan?.route === 'direct' && (
          <Text style={styles.caption}>Settled over your direct channel.</Text>
        )}
        <ActionButton label="Done" variant="primary" onPress={finish} />
      </View>
    );
  }

  if (stage === 'failed' || stage === 'unknown') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={styles.title}>
          {stage === 'failed' ? 'The payment failed' : 'Status unknown'}
        </Text>
        <Text style={styles.caption}>
          {stage === 'failed'
            ? 'The node reported a confirmed failure. Nothing was resent.'
            : 'The payment may or may not have been submitted. Check the existing transaction before doing anything else.'}
        </Text>
        <ActionButton label="Done" variant="primary" onPress={finish} />
      </View>
    );
  }

  if (stage === 'error') {
    return (
      <View style={styles.centered}>
        <AttentionVoice width={64} height={64} />
        <Text style={styles.title}>The in-person payment stopped</Text>
        <Text style={styles.caption}>{note ?? 'Nothing was submitted.'}</Text>
        <ActionButton label="Done" variant="primary" onPress={finish} />
      </View>
    );
  }

  if (stage === 'review' && proposal !== null) {
    return (
      <View style={styles.canvas}>
        <Text style={styles.title}>Pay in person</Text>
        <View style={styles.row}>
          <Text style={styles.caption}>Contact</Text>
          <Text style={styles.value}>
            {proposal.nodePubkey === null
              ? 'unknown node'
              : proposal.knownContact
                ? 'saved contact'
                : 'NOT in contacts'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.caption}>Destination</Text>
          <Text style={styles.invoiceText}>{shorten(proposal.invoice)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.caption}>Route</Text>
          <Text style={styles.value}>{proposal.plan?.reason ?? 'via LSP'}</Text>
        </View>
        {proposal.knownContact === false && (
          <Text style={styles.warning}>
            This node id is not in your contacts. Only confirm if you trust the receiver.
          </Text>
        )}
        {note !== null && <Text style={styles.warning}>{note}</Text>}
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

function shorten(invoice: string): string {
  if (invoice.length <= 24) {
    return invoice;
  }
  return `${invoice.slice(0, 12)}…${invoice.slice(-8)}`;
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
  warning: {
    ...theme.typography.caption,
    color: theme.voiceStates.attention.fill,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: layout.rowGap,
  },
});
