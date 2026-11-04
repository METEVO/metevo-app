import React, { useCallback, useEffect } from 'react';
import { BackHandler, Text, TextInput, View } from 'react-native';

import { useTheme, useThemedStyles, type MetevoTheme } from '../../design/ThemeContext';
import { useContactImport } from '../../hooks/useContactImport';
import { MAX_CONTACT_NAME_CHARACTERS } from '../../services/metevo/contactLink';
import { speakEnglish } from '../../utils/speaker';
import { replyForContactImport } from '../../voice/replies';
import { useAttentionSignal } from '../AttentionSignal';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { ContactCheckWords } from '../contacts/ContactCheckWords';
import { ContactDetailLines } from '../contacts/ContactDetailLines';
import type { IntentCardProps } from './IntentCard';

export function ImportContactCard({ onClearIntent }: IntentCardProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { controller, active, overflowed } = useContactImport();
  const message = active === null ? null : replyForContactImport(active);
  const activeId = active?.id;
  useAttentionSignal(active?.stage === 'invalid' || active?.error != null);

  useEffect(() => {
    if (message !== null) speakEnglish(message);
  }, [activeId, message]);

  const finish = useCallback(() => {
    if (controller.close()) onClearIntent?.();
  }, [controller, onClearIntent]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      finish();
      return true;
    });
    return () => subscription.remove();
  }, [finish]);

  if (active === null) return null;
  const busy = active.stage === 'saving';
  const done = active.stage === 'saved' || active.stage === 'duplicate' || active.stage === 'updated'
    || active.stage === 'invalid';
  const canUpdate = active.stage === 'duplicate' && active.detailUpdate !== null;
  const title = active.stage === 'saved' ? 'Contact added'
    : active.stage === 'updated' ? 'Contact updated'
      : active.stage === 'duplicate' ? 'Contact already saved'
        : active.stage === 'invalid' ? 'Invalid contact link' : 'Add a contact?';

  // Actions sit right under the name: the task panel has a fixed height,
  // and details below may need scrolling.
  return (
    <View style={styles.canvas}>
      <Text style={theme.typography.title} accessibilityRole="header">{title}</Text>
      <Text style={theme.typography.body} accessibilityLiveRegion="polite">{message}</Text>
      {active.contact !== null && active.stage === 'review' && (
        <ContactCheckWords nodePubkey={active.contact.nodePubkey} />
      )}
      {active.stage === 'review' && (
        <TextInput
          style={styles.input}
          accessibilityLabel="Name on this phone"
          placeholder="Name on this phone"
          placeholderTextColor={theme.colors.textMuted}
          value={active.name}
          onChangeText={controller.setName}
          maxLength={MAX_CONTACT_NAME_CHARACTERS}
          autoCorrect={false}
        />
      )}
      <View style={styles.actions}>
        <ActionButton label={done && !canUpdate ? 'Done' : 'Cancel'} variant="outlined" onPress={finish} disabled={busy} grow />
        {canUpdate && (
          <ActionButton label="Update" variant="primary" onPress={() => void controller.updateDetails()} grow />
        )}
        {active.stage === 'review' && (
          <ActionButton label="Add contact" variant="primary" onPress={() => void controller.confirm()} disabled={active.name.trim().length === 0} grow />
        )}
        {active.stage === 'load-error' && (
          <ActionButton label="Try again" variant="primary" onPress={controller.retry} grow />
        )}
      </View>
      {overflowed && (
        <Text style={styles.error}>Some links were not queued. Finish these contacts, then open those links again.</Text>
      )}
      {active.contact !== null && active.stage !== 'duplicate' && (
        <ContactDetailLines phone={active.contact.phone} email={active.contact.email} />
      )}
      {canUpdate && (
        <ContactDetailLines phone={active.detailUpdate?.phone} email={active.detailUpdate?.email} />
      )}
      {active.stage === 'review' && active.pendingName !== null && (
        <Text style={theme.typography.caption}>This completes {active.pendingName}, who you asked for a contact.</Text>
      )}
      {active.contact !== null && (
        <Text style={theme.typography.caption} selectable accessibilityLabel={`Node public key ${active.contact.nodePubkey}`}>
          Node {active.contact.nodePubkey.slice(0, 12)}…{active.contact.nodePubkey.slice(-8)}
        </Text>
      )}
      {active.stage === 'review' && (
        <Text style={theme.typography.caption}>
          The name does not prove who sent it. Ask them to read the check words on their phone: they must be the same.
        </Text>
      )}
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  canvas: { gap: layout.rowGap },
  input: { ...theme.typography.body, ...theme.cardBase, color: theme.colors.text, padding: layout.rowGap },
  error: { ...theme.typography.caption, color: theme.voiceStates.attention.ink },
  actions: { flexDirection: 'row' as const, gap: layout.rowGap },
});
