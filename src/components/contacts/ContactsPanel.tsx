import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Share, Text, TouchableOpacity, View } from 'react-native';

import { MetevoTheme, useTheme, useThemedStyles } from '../../design/ThemeContext';
import {
  PendingContact,
  StoredContact,
  forgetContact,
  forgetPendingContact,
  isValidNodePubkey,
  listContacts,
  listPendingContacts,
  rememberContact,
  rememberPendingContact,
} from '../../services/metevo/contacts';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import {
  encodeContactLink,
  normalizeContactEmail,
  normalizeContactPhone,
} from '../../services/metevo/contactLink';
import { useContactImport } from '../../hooks/useContactImport';
import { ContactQrView } from './ContactQrCode';
import { CompactField, TextLink } from './CompactField';
import { ContactDetailLines } from './ContactDetailLines';
import { ContactQrScanner } from './ContactQrScanner';
import { OwnContactPanel } from './OwnContactPanel';
import { logContactEvent } from '../../services/metevo/contactEvents';
import { PendingContactDetails } from './PendingContactDetails';

/**
 * The contact book. A contact is a local label plus the node pubkey the
 * relay needs: the spoken name never leaves the phone, and a payment can
 * only be addressed to a saved node. People known only by phone or email
 * wait in a pending list until their METEVO contact arrives.
 */
type ContactsStage =
  | 'list' | 'details' | 'pending' | 'qr' | 'scan' | 'add' | 'alias' | 'delete' | 'self';

function fieldErrorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.name === 'ContactLinkError' ? cause.message : fallback;
}

interface ContactsPanelProps {
  /** Clears the canvas back to the home idle hint (the Done action). */
  onClearIntent?: () => void;
}

export function ContactsPanel({ onClearIntent }: ContactsPanelProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [contacts, setContacts] = useState<StoredContact[] | null>(null);
  const [pendingContacts, setPendingContacts] = useState<PendingContact[]>([]);
  const [stage, setStage] = useState<ContactsStage>('list');
  const [selectedPubkey, setSelectedPubkey] = useState<string | null>(null);
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [pubkeyDraft, setPubkeyDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [showDetailsDraft, setShowDetailsDraft] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);
  const { controller: contactImports } = useContactImport();

  const selected =
    contacts?.find((contact) => contact.nodePubkey === selectedPubkey) ?? null;
  const selectedPending =
    pendingContacts.find((contact) => contact.id === selectedPendingId) ?? null;

  const reload = useCallback(async () => {
    const [saved, pending] = await Promise.all([listContacts(), listPendingContacts()]);
    setContacts(saved);
    setPendingContacts(pending);
  }, []);

  useEffect(() => {
    void reload().catch(() => setFieldError('Your contacts could not be loaded.'));
  }, [reload]);

  function resetDraft() {
    setNameDraft('');
    setPubkeyDraft('');
    setPhoneDraft('');
    setEmailDraft('');
    setShowDetailsDraft(false);
    setFieldError(null);
  }

  const draftDetails = () => ({ phone: phoneDraft, email: emailDraft });

  function startAdd() {
    resetDraft();
    setStage('add');
  }

  function saveDraft() {
    if (nameDraft.trim().length === 0) {
      setFieldError('Enter a name for the contact.');
      return;
    }
    const hasPubkey = pubkeyDraft.trim().length > 0;
    if (hasPubkey && !isValidNodePubkey(pubkeyDraft)) {
      setFieldError('Paste their node pubkey (66 hex characters, starting 02 or 03).');
      return;
    }
    if (!hasPubkey && phoneDraft.trim().length === 0 && emailDraft.trim().length === 0) {
      setFieldError('Add their node pubkey, or a phone number or email to ask for it.');
      return;
    }
    try {
      if (phoneDraft.trim().length > 0) setPhoneDraft(normalizeContactPhone(phoneDraft));
      if (emailDraft.trim().length > 0) setEmailDraft(normalizeContactEmail(emailDraft));
    } catch (cause) {
      setFieldError(fieldErrorMessage(cause, 'Check the phone number and email.'));
      return;
    }
    setFieldError(null);
    setStage('alias');
  }

  function confirmAlias() {
    const hasPubkey = pubkeyDraft.trim().length > 0;
    const save = hasPubkey
      ? rememberContact(nameDraft, pubkeyDraft, draftDetails()).then((saved) => {
        logContactEvent('contact:saved');
        setSelectedPubkey(saved.nodePubkey);
        setStage('details');
      })
      : rememberPendingContact(nameDraft, draftDetails()).then((saved) => {
        logContactEvent('contact:saved-pending');
        setSelectedPendingId(saved.id);
        setStage('pending');
      });
    void save
      .then(() => {
        resetDraft();
        return reload();
      })
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : '';
        setFieldError(
          message.startsWith('another contact already uses')
            ? `Another contact already uses that ${message.endsWith('name') ? 'name' : 'phone or email'}.`
            : 'The contact could not be saved.',
        );
        setStage('add');
      });
  }

  function removeSelectedPending() {
    if (selectedPending === null) return;
    void forgetPendingContact(selectedPending.id).then(() => {
      setSelectedPendingId(null);
      setStage('list');
      return reload();
    });
  }

  function removeSelected() {
    if (selected === null) {
      return;
    }
    void forgetContact(selected.nodePubkey).then(() => {
      setSelectedPubkey(null);
      setStage('list');
      return reload();
    });
  }

  async function shareSelected() {
    if (selected === null || sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    setFieldError(null);
    try {
      await Share.share({ message: encodeContactLink(selected) });
    } catch {
      setFieldError('The contact could not be shared. Check its name and try again.');
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  }

  // Closing Contacts frees the shell, which then opens the same confirmation
  // card a deep link would.
  const importScannedLink = useCallback((link: string) => {
    if (!contactImports.enqueue(link)) return false;
    onClearIntent?.();
    return true;
  }, [contactImports, onClearIntent]);

  const leaveScanner = useCallback(() => setStage('list'), []);

  function showSelectedQr() {
    if (selected === null) return;
    try {
      encodeContactLink(selected);
      setFieldError(null);
      logContactEvent('qr:shown-contact');
      setStage('qr');
    } catch {
      setFieldError('The QR code could not be created. Check the contact name and try again.');
    }
  }

  if (stage === 'self') {
    return <OwnContactPanel onBack={() => setStage('list')} />;
  }

  if (stage === 'scan') {
    return <ContactQrScanner onContactLink={importScannedLink} onCancel={leaveScanner} />;
  }

  if (stage === 'pending' && selectedPending !== null) {
    return (
      <PendingContactDetails
        contact={selectedPending}
        onAnswer={importScannedLink}
        onChanged={() => void reload()}
        onBack={() => setStage('list')}
        onDelete={removeSelectedPending}
      />
    );
  }

  if (stage === 'qr' && selected !== null) {
    return (
      <ContactQrView
        link={encodeContactLink(selected)}
        name={selected.name}
        contents={selected.phone || selected.email
          ? 'The name, public node key, phone and email saved for this contact are inside.'
          : 'Only the name and the public node key are inside.'}
        onBack={() => setStage('details')}
      />
    );
  }

  if (stage === 'add') {
    return (
      <View style={styles.canvas}>
        <Text style={theme.typography.title}>Add a contact</Text>
        <CompactField label="Full name" value={nameDraft} onChangeText={setNameDraft} />
        <CompactField label="Node pubkey (optional, paste)" value={pubkeyDraft} onChangeText={setPubkeyDraft} keyboardType="email-address" />
        {showDetailsDraft ? (
          <>
            <CompactField
              label="Phone with country code"
              value={phoneDraft}
              onChangeText={setPhoneDraft}
              keyboardType="phone-pad"
            />
            <CompactField label="Email" value={emailDraft} onChangeText={setEmailDraft} keyboardType="email-address" />
          </>
        ) : (
          <TextLink label="Add phone or email" onPress={() => setShowDetailsDraft(true)} />
        )}
        {fieldError !== null && <Text style={styles.error} accessibilityLiveRegion="polite">{fieldError}</Text>}
        <View style={styles.actions}>
          <ActionButton label="Back" variant="outlined" onPress={() => setStage('list')} />
          <ActionButton label="Save" variant="primary" onPress={saveDraft} grow />
        </View>
        <Text style={theme.typography.caption}>
          Without a node pubkey, the contact waits until you ask for their METEVO contact.
        </Text>
      </View>
    );
  }

  if (stage === 'alias') {
    return (
      <View style={styles.canvas}>
        <Text style={theme.typography.title}>Save the contact?</Text>
        <Text style={theme.typography.body}>{nameDraft.trim()}</Text>
        {pubkeyDraft.trim().length > 0 ? (
          <Text style={styles.pubkey}>{pubkeyDraft.trim().toLowerCase()}</Text>
        ) : (
          <Text style={theme.typography.caption}>No node pubkey yet: you cannot pay them until they send it.</Text>
        )}
        <ContactDetailLines
          phone={phoneDraft.trim() || undefined}
          email={emailDraft.trim() || undefined}
        />
        <View style={styles.actions}>
          <ActionButton label="Try again" variant="outlined" onPress={() => setStage('add')} />
          <ActionButton label="Yes" variant="primary" onPress={confirmAlias} grow />
        </View>
      </View>
    );
  }

  if (stage === 'delete' && selected !== null) {
    return (
      <View style={styles.canvas}>
        <Text style={theme.typography.title}>Delete {selected.name}?</Text>
        <Text style={theme.typography.body}>
          You will no longer be able to pay this node by name.
        </Text>
        <Text style={theme.typography.caption}>
          Transaction records stay linked and history is preserved.
        </Text>
        <View style={styles.actions}>
          <ActionButton label="Keep" variant="outlined" onPress={() => setStage('details')} grow />
          <ActionButton
            label="Delete"
            variant="primary"
            attention
            onPress={removeSelected}
            grow
          />
        </View>
      </View>
    );
  }

  if (stage === 'details' && selected !== null) {
    return (
      <View style={styles.canvas}>
        <Text style={theme.typography.title}>{selected.name}</Text>
        <Text
          style={styles.pubkey}
          selectable
          accessibilityLabel={`Payments go to node ${selected.nodePubkey}`}
        >
          Node {selected.nodePubkey.slice(0, 10)}…{selected.nodePubkey.slice(-6)}
        </Text>
        <ContactDetailLines phone={selected.phone} email={selected.email} />
        {fieldError !== null && <Text style={styles.error} accessibilityLiveRegion="polite">{fieldError}</Text>}
        <View style={styles.actions}>
          <ActionButton label="Show QR code" variant="outlined" onPress={showSelectedQr} grow />
          <ActionButton
            label={sharing ? 'Sharing…' : 'Share link'}
            variant="outlined"
            onPress={() => void shareSelected()}
            disabled={sharing}
            grow
          />
        </View>
        <View style={styles.actions}>
          <ActionButton label="Back" variant="outlined" onPress={() => setStage('list')} />
          <ActionButton
            label="Delete"
            variant="primary"
            attention
            onPress={() => setStage('delete')}
            grow
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Contacts</Text>
        <Text style={theme.typography.body}>Saved only on this phone.</Text>
        {fieldError !== null && <Text style={styles.error}>{fieldError}</Text>}
        {contacts !== null && contacts.length === 0 && pendingContacts.length === 0 && (
          <Text style={theme.typography.body}>No contacts yet.</Text>
        )}
      </View>
      <View style={styles.list}>
        {(contacts ?? []).map((contact) => (
          <TouchableOpacity
            key={contact.nodePubkey}
            style={styles.rowCard}
            onPress={() => {
              setSelectedPubkey(contact.nodePubkey);
              setFieldError(null);
              setStage('details');
            }}
            accessibilityRole="button"
            accessibilityLabel={contact.name}
          >
            <Text style={styles.rowTitle}>{contact.name}</Text>
            <Text style={theme.typography.caption}>
              {contact.nodePubkey.slice(0, 10)}…{contact.nodePubkey.slice(-6)}
            </Text>
          </TouchableOpacity>
        ))}
        {pendingContacts.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={styles.rowCard}
            onPress={() => {
              setSelectedPendingId(contact.id);
              setFieldError(null);
              setStage('pending');
            }}
            accessibilityRole="button"
            accessibilityLabel={`${contact.name}, waiting for their METEVO contact`}
          >
            <Text style={styles.rowTitle}>{contact.name}</Text>
            <Text style={theme.typography.caption}>
              {contact.requestedAt === undefined ? 'No METEVO contact yet' : 'Request sent'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.actions}>
        <ActionButton label="My contact" variant="outlined" onPress={() => setStage('self')} grow />
        <ActionButton
          label="Scan QR code"
          variant="outlined"
          onPress={() => {
            setFieldError(null);
            setStage('scan');
          }}
          grow
        />
      </View>
      <View style={styles.actions}>
        <ActionButton
          label="Close"
          variant="outlined"
          onPress={() => onClearIntent?.()}
          grow
        />
        <ActionButton label="Add contact" variant="primary" onPress={startAdd} grow />
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
  title: {
    ...theme.typography.title,
    color: theme.voiceStates.idle.ink,
  },
  list: {
    gap: layout.rowGap / 2,
  },
  canvas: {
    width: '100%' as const,
    gap: layout.rowGap,
  },
  rowCard: {
    ...theme.cardBase,
    padding: scale(4),
    minHeight: scale(14.16),
    gap: layout.rowGap / 4,
  },
  rowTitle: {
    ...theme.typography.body,
    fontWeight: '700' as const,
  },
  pubkey: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  error: {
    ...theme.typography.caption,
    color: theme.voiceStates.attention.fill,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: layout.rowGap,
  },
});
