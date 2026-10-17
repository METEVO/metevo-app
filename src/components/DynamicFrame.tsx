import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemedStyles, type MetevoTheme } from '../design/ThemeContext';
import { IntentCard } from './intent-cards';
import { IntentId } from '../types/intents';
import { layout } from './styles';

interface DynamicFrameProps {
  /** Current intent id; null shows the idle placeholder. */
  intent: IntentId | null;
  /** Hands a card's Done action the way back to the idle hint. */
  onClearIntent?: () => void;
}

/**
 * The dynamic "black box" area of the sketch.
 *
 * Rendering strategy (deliberately NOT a router): a lookup map over intent
 * ids inside `IntentCard`. The frame never decides what an intent does -
 * it only renders the card for the given intent.
 * TODO(phase 2): `intent` comes from `useIntents`, fed by the QVAC
 * voice-to-intent pipeline.
 */
export function DynamicFrame({ intent, onClearIntent }: DynamicFrameProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.frame}>
      <IntentCard id={intent} onClearIntent={onClearIntent} />
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  frame: {
    ...theme.cardBase,
    minHeight: layout.cardMinHeight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
