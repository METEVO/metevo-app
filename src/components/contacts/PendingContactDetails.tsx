import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { useTheme, useThemedStyles, type MetevoTheme } from '../../design/ThemeContext';
import { useWalletSession } from '../../hooks/useWalletSession';
import { getContactRequestRelay } from '../../services/metevo/contactRequestRelay';
import { markPendingContactRequested, type PendingContact } from '../../services/metevo/contacts';
import { readOwnContactDetails, readOwnContactName } from '../../services/metevo/ownContact';
import { relayAvailable } from '../../services/metevo/relayClient';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { ContactDetailLines } from './ContactDetailLines';

interface PendingContactDetailsProps {
  contact: PendingContact;
  /** Hands an answered request to the shared import queue; false if not queued. */
  onAnswer: (link: string) => boolean;
  onChanged: () => void;
  onBack: () => void;
  onDelete: () => void;
}

const ANSWER_MESSAGES = {
  pending: 'No answer yet. Try again later.',
  declined: 'They did not send their contact. You can ask again.',
  expired: 'The request expired. You can ask again.',
} as const;

export function PendingContactDetails({ contact, onAnswer, onChanged, onBack, onDelete }: PendingContactDetailsProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { wallet } = useWalletSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  async function run(work: () => Promise<string | null>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const outcome = await work();
      if (mounted.current) setMessage(outcome);
    } catch (cause) {
      if (mounted.current) setMessage(cause instanceof Error ? cause.message : 'Something went wrong. Try again.');
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const relay = () => getContactRequestRelay(relayAvailable());

  const ask = () => run(async () => {
    const nodePubkey = wallet?.nodePubkey ?? null;
    if (nodePubkey === null) return 'Your wallet must be ready before you can ask.';
    const name = await readOwnContactName(nodePubkey);
    if (name === null) return 'Set your name in My contact first, so they know who is asking.';
    const details = await readOwnContactDetails(nodePubkey);
    const { requestId } = await relay().sendContactRequest({
      to: { phone: contact.phone, email: contact.email },
      from: { name, nodePubkey, ...details },
    });
    await markPendingContactRequested(contact.id, requestId);
    onChanged();
    return `Request sent to ${contact.name}.`;
  });

  const checkAnswer = () => run(async () => {
    if (contact.requestId === undefined) return null;
    const answer = await relay().pollContactRequest(contact.requestId);
    if (answer.status !== 'answered') return ANSWER_MESSAGES[answer.status];
    return onAnswer(answer.link) ? null : 'Their contact is already waiting for review. Close Contacts to see it.';
  });

  return (
    <View style={styles.canvas}>
      <Text style={theme.typography.title}>{contact.name}</Text>
      <ContactDetailLines phone={contact.phone} email={contact.email} />
      <Text style={theme.typography.body}>
        {contact.requestedAt === undefined
          ? 'No METEVO contact yet. Ask for it to be able to pay them.'
          : 'Request sent. When they answer, you will confirm their contact.'}
      </Text>
      {message !== null && <Text style={styles.notice} accessibilityLiveRegion="polite">{message}</Text>}
      {contact.requestId === undefined ? (
        <ActionButton
          label={busy ? 'Please wait…' : 'Ask for METEVO contact'}
          variant="primary"
          onPress={() => void ask()}
          disabled={busy}
        />
      ) : (
        <View style={styles.actions}>
          <ActionButton label="Ask again" variant="outlined" onPress={() => void ask()} disabled={busy} grow />
          <ActionButton
            label={busy ? 'Please wait…' : 'Check answer'}
            variant="primary"
            onPress={() => void checkAnswer()}
            disabled={busy}
            grow
          />
        </View>
      )}
      <View style={styles.actions}>
        <ActionButton label="Back" variant="outlined" onPress={onBack} disabled={busy} grow />
        <ActionButton label="Delete" variant="primary" attention onPress={onDelete} disabled={busy} grow />
      </View>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  canvas: { width: '100%' as const, gap: layout.rowGap },
  notice: { ...theme.typography.caption, color: theme.colors.text },
  actions: { flexDirection: 'row' as const, gap: layout.rowGap },
});
