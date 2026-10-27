import React, { useCallback, useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { MetevoTheme, useTheme, useThemedStyles } from '../../design/ThemeContext';
import {
  StoredContact,
  forgetContact,
  isValidNodePubkey,
  listContacts,
  rememberContact,
} from '../../services/metevo/contacts';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';

/**
 * The contact book. A contact is a local label plus the node pubkey the
 * relay needs: the spoken name never leaves the phone, and a payment can
 * only be addressed to a saved node.
 */
type ContactsStage = 'list' | 'details' | 'add' | 'alias' | 'delete';

interface ContactsPanelProps {
  /** Clears the canvas back to the home idle hint (the Done action). */
  onClearIntent?: () => void;
}

export function ContactsPanel({ onClearIntent }: ContactsPanelProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [contacts, setContacts] = useState<StoredContact[] | null>(null);
  const [stage, setStage] = useState<ContactsStage>('list');
  const [selectedPubkey, setSelectedPubkey] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [pubkeyDraft, setPubkeyDraft] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const selected =
    contacts?.find((contact) => contact.nodePubkey === selectedPubkey) ?? null;

  const reload = useCallback(async () => {
    setContacts(await listContacts());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function resetDraft() {
    setNameDraft('');
    setPubkeyDraft('');
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
    if (!isValidNodePubkey(pubkeyDraft)) {
      setFieldError('Paste their node pubkey (66 hex characters, starting 02 or 03).');
      return;
    }
    setFieldError(null);
    setStage('alias');
  }

  function confirmAlias() {
    void rememberContact(nameDraft, pubkeyDraft)
      .then((saved) => {
        resetDraft();
        setSelectedPubkey(saved.nodePubkey);
        setStage('details');
        return reload();
      })
      .catch(() => {
        setFieldError('The contact could not be saved.');
        setStage('add');
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

  if (stage === 'add') {
    return (
      <View style={styles.canvas}>
        <Text style={theme.typography.title}>Add a contact</Text>
        <LabeledField label="Full name" value={nameDraft} onChangeText={setNameDraft} />
        <LabeledField
          label="Node pubkey (paste only)"
          value={pubkeyDraft}
          onChangeText={setPubkeyDraft}
        />
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
        <Text style={styles.pubkey}>{pubkeyDraft.trim().toLowerCase()}</Text>
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
        <Text style={styles.pubkey}>{selected.nodePubkey}</Text>
        <Text style={theme.typography.caption}>Payments are addressed to this node.</Text>
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
        {contacts !== null && contacts.length === 0 && (
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
