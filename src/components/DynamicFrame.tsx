import React from 'react';
import { StyleSheet, View } from 'react-native';

import { IntentCard } from './intent-cards';
import { IntentId } from '../types/intents';
import { cardBase } from './styles';

interface DynamicFrameProps {
  /** Current intent id; null shows the idle placeholder. */
  intent: IntentId | null;
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
export function DynamicFrame({ intent }: DynamicFrameProps) {
  return (
    <View style={[styles.frame, cardBase]}>
      <IntentCard id={intent} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
