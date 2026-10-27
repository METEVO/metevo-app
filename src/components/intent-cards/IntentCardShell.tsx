import React from 'react';
import { Text, View } from 'react-native';

import {
  MetevoTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { layout } from '../styles';

interface IntentCardShellProps {
  title: string;
  message: string;
}

/**
 * Shared shell for placeholder intent cards: intent name + TODO message.
 * The task panel already draws the card frame, so this adds content only.
 */
export function IntentCardShell({ title, message }: IntentCardShellProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.shell}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  shell: {
    gap: layout.rowGap / 4,
  },
  title: {
    ...theme.typography.title,
    color: theme.voiceStates.idle.ink,
  },
  message: theme.typography.body,
});
