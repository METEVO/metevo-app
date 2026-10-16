import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cardBase, colors, layout, typography } from '../styles';

interface IntentCardShellProps {
  title: string;
  message: string;
}

/**
 * Shared wireframe shell for all intent cards: intent name + TODO message.
 * Stateless on purpose - real card UIs arrive with the functional phases.
 */
export function IntentCardShell({ title, message }: IntentCardShellProps) {
  return (
    <View style={styles.shell}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    ...cardBase,
    width: '100%',
    minHeight: layout.cardMinHeight,
    borderColor: colors.danger,
  },
  title: { ...typography.title, marginBottom: 8 },
  message: typography.body,
});
