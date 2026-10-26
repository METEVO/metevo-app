import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { layout } from '../styles';

interface IntentCardShellProps {
  title: string;
  message: string;
}

/**
 * Shared shell for placeholder intent cards: intent name + TODO message.
 * Stateless on purpose - real card UIs arrive with the functional phases.
 *
 * The outline uses the design system's attention state: these placeholder
 * cards mark work that is not implemented yet.
 */
export function IntentCardShell({ title, message }: IntentCardShellProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.shell}>
      <Text style={styles.title}>{title}</Text>
      <Text style={theme.typography.body}>{message}</Text>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  shell: {
    ...theme.cardBase,
    width: '100%' as const,
    minHeight: layout.cardMinHeight,
    borderColor: theme.voiceStates.attention.fill,
  },
  title: {
    ...theme.typography.title,
    marginBottom: 8,
  },
});
