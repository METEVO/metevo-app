import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';

/**
 * Local contacts mock for the design sections 30-34. Contacts are local to
 * the phone; the real store, resolver and legacy-data handling arrive with
 * the contacts functional phase.
 */
interface MockContact {
  id: string;
  name: string;
  bitcoinAddress?: string;
  lightningKey?: string;
  phone?: string;
  /** Demo payment count driving the delete confirmation rule. */
  paymentCount: number;
}

const INITIAL_CONTACTS: MockContact[] = [
  { id: 'maria', name: 'Maria', phone: '+256772123456', paymentCount: 3 },
  { id: 'luca', name: 'Luca', paymentCount: 0 },
];

type ContactsStage = 'list' | 'details' | 'add' | 'alias' | 'delete';

interface ContactsPanelProps {
  /** Clears the canvas back to the home idle hint (the Done action). */
  onClearIntent?: () => void;
}

/**
 * Design sections 30-34: contacts list and details, manual add, alias
 * confirmation (never auto-save) and transaction-aware soft deletion.
 * Name is required; payment fields are pasted, never dictated.
 */
export function ContactsPanel({ onClearIntent }: ContactsPanelProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [contacts, setContacts] = useState<MockContact[]>(INITIAL_CONTACTS);
  const [stage, setStage] = useState<ContactsStage>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [bitcoinDraft, setBitcoinDraft] = useState('');
  const [lightningDraft, setLightningDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const selected = contacts.find((contact) => contact.id === selectedId) ?? null;

  function resetDraft() {
    setNameDraft('');
    setBitcoinDraft('');
    setLightningDraft('');
    setPhoneDraft('');
    setFieldError(null);
  }

  function startAdd() {
    resetDraft();
    setStage('add');
  }

  function saveDraft() {
    if (nameDraft.trim().length === 0) {
      setFieldError('Enter a name for the contact.');
      return;
    }
    if (phoneDraft.trim().length > 0 && normalizePhoneNumber(phoneDraft) === null) {
      setFieldError('Enter the phone number with country code, e.g. +256 772 123 456.');
      return;
    }
    setFieldError(null);
    setStage('alias');
  }

  function confirmAlias() {
    const next: MockContact = {
      id: `contact-${Date.now()}`,
      name: nameDraft.trim(),
      ...(bitcoinDraft.trim().length > 0 ? { bitcoinAddress: bitcoinDraft.trim() } : {}),
      ...(lightningDraft.trim().length > 0 ? { lightningKey: lightningDraft.trim() } : {}),
      ...(phoneDraft.trim().length > 0 ? { phone: normalizePhoneNumber(phoneDraft) ?? undefined } : {}),
      paymentCount: 0,
    };
    setContacts((current) => [...current, next]);
    resetDraft();
    setSelectedId(next.id);
    setStage('details');
  }

  /** Soft deletion: zero payments hides immediately; otherwise confirm. */
  function requestDelete(contact: MockContact) {
    setSelectedId(contact.id);
    if (contact.paymentCount === 0) {
      removeSelected();
      return;
    }
    setStage('delete');
  }

  function removeSelected() {
    setContacts((current) => current.filter((contact) => contact.id !== selectedId));
    setSelectedId(null);
    setStage('list');
  }

  if (stage === 'add') {
    return (
      <View style={styles.canvas}>
        <Text style={theme.typography.title}>Add a contact</Text>
        <LabeledField label="Full name" value={nameDraft} onChangeText={setNameDraft} />
        <LabeledField label="Bitcoin address (paste only)" value={bitcoinDraft} onChangeText={setBitcoinDraft} />
        <LabeledField label="Lightning key (paste only)" value={lightningDraft} onChangeText={setLightningDraft} />
        <LabeledField label="Phone (with country code)" value={phoneDraft} onChangeText={setPhoneDraft} />
        {fieldError !== null && <Text style={styles.error}>{fieldError}</Text>}
        <View style={styles.actions}>
          <ActionButton label="Back" variant="outlined" onPress={() => setStage('list')} />
          <ActionButton label="Save" variant="primary" onPress={saveDraft} grow />
        </View>
      </View>
    );
  }

  if (stage === 'alias') {
    return (
      <View style={styles.canvas}>
        <Text style={theme.typography.title}>Save the contact?</Text>
        <Text style={theme.typography.body}>{nameDraft.trim()}</Text>
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
          You have {selected.paymentCount} payments with this contact. Delete anyway?
        </Text>
        <Text style={theme.typography.caption}>
          Transaction records stay linked and history is preserved.
        </Text>
        <View style={styles.actions}>
          <ActionButton label="Keep" variant="outlined" onPress={() => setStage('details')} grow />
          <ActionButton label="Delete" variant="primary" attention onPress={removeSelected} grow />
        </View>
      </View>
    );
  }

  if (stage === 'details' && selected !== null) {
    return (
      <View style={styles.canvas}>
        <Text style={theme.typography.title}>{selected.name}</Text>
        {selected.bitcoinAddress !== undefined && (
          <Text style={theme.typography.body}>Bitcoin: {selected.bitcoinAddress}</Text>
        )}
        {selected.lightningKey !== undefined && (
          <Text style={theme.typography.body}>Lightning: {selected.lightningKey}</Text>
        )}
        {selected.phone !== undefined && (
          <Text style={theme.typography.body}>Phone: {selected.phone}</Text>
        )}
        <View style={styles.actions}>
          <ActionButton label="Back" variant="outlined" onPress={() => setStage('list')} />
          <ActionButton
            label="Delete"
            variant="primary"
            attention
            onPress={() => requestDelete(selected)}
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
        {contacts.length === 0 && (
          <Text style={theme.typography.body}>No contacts yet.</Text>
        )}
      </View>
      <View style={styles.list}>
        {contacts.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={styles.rowCard}
            onPress={() => {
              setSelectedId(contact.id);
              setStage('details');
            }}
            accessibilityRole="button"
            accessibilityLabel={contact.name}
          >
            <Text style={styles.rowTitle}>{contact.name}</Text>
            <Text style={theme.typography.caption}>{contact.phone ?? 'No details yet'}</Text>
          </TouchableOpacity>
        ))}
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

interface LabeledFieldProps {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
}

function LabeledField({ label, value, onChangeText }: LabeledFieldProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.field}>
      <Text style={theme.typography.caption}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        autoCapitalize="none"
      />
    </View>
  );
}

/**
 * Design rule: strip spaces, dashes and brackets, require an explicit
 * country code and never guess one. "0772 123 456" is rejected;
 * "+256 772 123 456" normalizes to "+256772123456".
 */
function normalizePhoneNumber(raw: string): string | null {
  const stripped = raw.replace(/[\s\-.()]/g, '');
  return /^\+\d{8,15}$/.test(stripped) ? stripped : null;
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
  field: {
    ...theme.cardBase,
    gap: layout.rowGap / 4,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    padding: 0,
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
