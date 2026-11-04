import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Share, Text, View } from 'react-native';

import { useTheme, useThemedStyles, type MetevoTheme } from '../../design/ThemeContext';
import { useWalletSession } from '../../hooks/useWalletSession';
import {
  encodeContactLink,
  MAX_CONTACT_EMAIL_CHARACTERS,
  MAX_CONTACT_NAME_CHARACTERS,
} from '../../services/metevo/contactLink';
import { readOwnContactDetails, readOwnContactName, saveOwnContact } from '../../services/metevo/ownContact';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { CompactField, TextLink } from './CompactField';
import { ContactQrView } from './ContactQrCode';

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
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const sharingRef = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!sharingRef.current) onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    if (nodePubkey === null) {
      setLoading(false);
      return undefined;
    }
    void Promise.all([readOwnContactName(nodePubkey), readOwnContactDetails(nodePubkey)]).then(([savedName, details]) => {
      if (cancelled) return;
      setName(savedName ?? '');
      setPhone(details.phone ?? '');
      setEmail(details.email ?? '');
      setShowDetails(details.phone !== undefined || details.email !== undefined);
    }).catch(() => {
      if (!cancelled) {
        setLoadFailed(true);
        setError('Your sharing name could not be loaded. Try again.');
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [nodePubkey, attempt]);

  /** Both transports share the name that was saved, never an unsaved draft. */
  async function publish(deliver: (link: string) => Promise<unknown> | void) {
    if (nodePubkey === null || sharingRef.current || loading || loadFailed) return;
    sharingRef.current = true;
    setSharing(true);
    setError(null);
    try {
      const contact = await saveOwnContact(name, nodePubkey, { phone, email });
      if (!mounted.current) return;
      setName(contact.name);
      setPhone(contact.phone ?? '');
      setEmail(contact.email ?? '');
      await deliver(encodeContactLink(contact));
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Your contact could not be shared. Try again.');
    } finally {
      sharingRef.current = false;
      if (mounted.current) setSharing(false);
    }
  }

  const insideQr = phone.trim() || email.trim()
    ? 'Your name, public node key and the phone or email you chose are inside.'
    : 'Only your name and your public node key are inside.';

  if (qrLink !== null) {
    return (
      <ContactQrView link={qrLink} name={name.trim()} contents={insideQr} onBack={() => setQrLink(null)} />
    );
  }

  const cannotShare = nodePubkey === null || loading || sharing || loadFailed || name.trim().length === 0;

  const fieldsEditable = !loading && !sharing && !loadFailed;

  return (
    <View style={styles.canvas}>
      <Text style={theme.typography.title}>My contact</Text>
      {nodePubkey === null ? (
        <Text style={theme.typography.body}>Your wallet node must be ready before you can share your contact.</Text>
      ) : (
        <>
          <CompactField
            label="Your name"
            value={name}
            onChangeText={setName}
            editable={fieldsEditable}
            maxLength={MAX_CONTACT_NAME_CHARACTERS}
          />
          {showDetails ? (
            <>
              <CompactField
                label="Phone with country code (optional)"
                value={phone}
                onChangeText={setPhone}
                editable={fieldsEditable}
                keyboardType="phone-pad"
              />
              <CompactField
                label="Email (optional)"
                value={email}
                onChangeText={setEmail}
                editable={fieldsEditable}
                maxLength={MAX_CONTACT_EMAIL_CHARACTERS}
                keyboardType="email-address"
              />
            </>
          ) : (
            <TextLink label="Add phone or email (optional)" onPress={() => setShowDetails(true)} disabled={!fieldsEditable} />
          )}
          {loading && <Text style={theme.typography.caption}>Loading your name…</Text>}
        </>
      )}
      {error !== null && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
      {loadFailed ? (
        <View style={styles.actions}>
          <ActionButton label="Back" variant="outlined" onPress={onBack} grow />
          <ActionButton label="Try again" variant="primary" onPress={() => setAttempt((value) => value + 1)} grow />
        </View>
      ) : (
        <>
          <View style={styles.actions}>
            <ActionButton
              label="Show QR code"
              variant="outlined"
              onPress={() => void publish((link) => {
                setQrLink(link);
              })}
              disabled={cannotShare}
              grow
            />
            <ActionButton
              label={sharing ? 'Sharing…' : 'Share link'}
              variant="primary"
              onPress={() => void publish((link) => Share.share({ message: link }))}
              disabled={cannotShare}
              grow
            />
          </View>
          <ActionButton label="Back" variant="outlined" onPress={onBack} disabled={sharing} />
        </>
      )}
      {nodePubkey !== null && (
        <>
          <Text style={theme.typography.caption}>
            You share your name and public node key; phone and email only if you fill them in.
          </Text>
          <Text style={theme.typography.caption} selectable>{nodePubkey}</Text>
        </>
      )}
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  canvas: { gap: layout.rowGap },
  error: { ...theme.typography.caption, color: theme.voiceStates.attention.ink },
  actions: { flexDirection: 'row' as const, gap: layout.rowGap },
});
