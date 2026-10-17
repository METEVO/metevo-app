import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cardBase, layout, typography, voiceStates } from '../styles';

interface IntentCardShellProps {
  title: string;
  message: string;
}

/**
 * Shared wireframe shell for all intent cards: intent name + TODO message.
 * Stateless on purpose - real card UIs arrive with the functional phases.
 *
 * The outline uses the design system's attention state: these placeholder
 * cards mark work that is not implemented yet.
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
    borderColor: voiceStates.attention.fill,
  },
  title: { ...typography.title, marginBottom: 8 },
  message: typography.body,
});
