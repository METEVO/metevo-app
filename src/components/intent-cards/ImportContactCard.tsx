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
  const done = active.stage === 'saved' || active.stage === 'duplicate' || active.stage === 'invalid';
  const title = active.stage === 'saved' ? 'Contact added'
    : active.stage === 'duplicate' ? 'Contact already saved'
      : active.stage === 'invalid' ? 'Invalid contact link' : 'Add a contact?';

  return (
    <View style={styles.canvas}>
      <Text style={theme.typography.title} accessibilityRole="header">{title}</Text>
      <Text style={theme.typography.body} accessibilityLiveRegion="polite">{message}</Text>
      {active.contact !== null && (
        <Text style={theme.typography.caption} selectable accessibilityLabel={`Node public key ${active.contact.nodePubkey}`}>
          {active.contact.nodePubkey.slice(0, 12)}…{active.contact.nodePubkey.slice(-8)}
        </Text>
      )}
      {active.stage === 'review' && (
        <>
          <Text style={theme.typography.caption}>Name on this phone</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel="Contact name"
            value={active.name}
            onChangeText={controller.setName}
            maxLength={MAX_CONTACT_NAME_CHARACTERS}
            autoCorrect={false}
          />
          <Text style={theme.typography.caption}>This link does not verify the person's identity.</Text>
        </>
      )}
      {overflowed && (
        <Text style={styles.error}>Some links were not queued. Finish these contacts, then open those links again.</Text>
      )}
      <View style={styles.actions}>
        <ActionButton label={done ? 'Done' : 'Cancel'} variant="outlined" onPress={finish} disabled={busy} grow />
        {active.stage === 'review' && (
          <ActionButton label="Add contact" variant="primary" onPress={() => void controller.confirm()} disabled={active.name.trim().length === 0} grow />
        )}
        {active.stage === 'load-error' && (
          <ActionButton label="Try again" variant="primary" onPress={controller.retry} grow />
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
