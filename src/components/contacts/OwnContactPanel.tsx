import React, { useEffect, useRef, useState } from 'react';
import { Share, Text, TextInput, View } from 'react-native';

import { useTheme, useThemedStyles, type MetevoTheme } from '../../design/ThemeContext';
import { useWalletSession } from '../../hooks/useWalletSession';
import { encodeContactLink, MAX_CONTACT_NAME_CHARACTERS } from '../../services/metevo/contactLink';
import { readOwnContactName, saveOwnContact } from '../../services/metevo/ownContact';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';

export function OwnContactPanel({ onBack }: { onBack: () => void }) {
  const { wallet } = useWalletSession();
  const nodePubkey = wallet?.nodePubkey ?? null;
  // Reset drafts if the session ever changes nodes.
  return <OwnContactForm key={nodePubkey ?? 'unavailable'} nodePubkey={nodePubkey} onBack={onBack} />;
}

function OwnContactForm({ nodePubkey, onBack }: { nodePubkey: string | null; onBack: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sharingRef = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    if (nodePubkey === null) {
      setLoading(false);
      return undefined;
    }
    void readOwnContactName(nodePubkey).then((savedName) => {
      if (!cancelled) setName(savedName ?? '');
    }).catch(() => {
      if (!cancelled) {
        setLoadFailed(true);
        setError('Your sharing name could not be loaded. Try again.');
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [nodePubkey, attempt]);

  async function share() {
    if (nodePubkey === null || sharingRef.current || loading || loadFailed) return;
    sharingRef.current = true;
    setSharing(true);
    setError(null);
    try {
      const contact = await saveOwnContact(name, nodePubkey);
      if (!mounted.current) return;
      setName(contact.name);
      await Share.share({ message: encodeContactLink(contact) });
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Your contact could not be shared. Try again.');
    } finally {
      sharingRef.current = false;
      if (mounted.current) setSharing(false);
    }
  }

  return (
    <View style={styles.canvas}>
      <Text style={theme.typography.title}>My contact</Text>
      {nodePubkey === null ? (
        <Text style={theme.typography.body}>Your wallet node must be ready before you can share your contact.</Text>
      ) : (
        <>
          <Text style={theme.typography.caption}>Name to share</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel="Your contact name"
            value={name}
            onChangeText={setName}
            editable={!loading && !sharing && !loadFailed}
            maxLength={MAX_CONTACT_NAME_CHARACTERS}
            autoCorrect={false}
          />
          <Text style={theme.typography.caption} selectable>{nodePubkey}</Text>
          <Text style={theme.typography.body}>Only your name and this public node key are shared.</Text>
          {loading && <Text style={theme.typography.caption}>Loading your name…</Text>}
        </>
      )}
      {error !== null && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
      <View style={styles.actions}>
        <ActionButton label="Back" variant="outlined" onPress={onBack} disabled={sharing} grow />
        {loadFailed ? (
          <ActionButton label="Try again" variant="primary" onPress={() => setAttempt((value) => value + 1)} grow />
        ) : (
          <ActionButton
            label={sharing ? 'Sharing…' : 'Share my contact'}
            variant="primary"
            onPress={() => void share()}
            disabled={nodePubkey === null || loading || sharing || name.trim().length === 0}
            grow
          />
        )}
      </View>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  canvas: { gap: layout.rowGap },
  input: { ...theme.typography.body, ...theme.cardBase, padding: layout.rowGap },
  error: { ...theme.typography.caption, color: theme.voiceStates.attention.ink },
  actions: { flexDirection: 'row' as const, gap: layout.rowGap },
});
