import React from 'react';

import { useAttentionActive } from './AttentionSignal';
import { IntentCard } from './intent-cards';
import { TaskPanel } from './TaskPanel';
import { IntentId } from '../types/intents';

interface DynamicFrameProps {
  /** Current intent id; null shows the idle menu. */
  intent: IntentId | null;
  /** Hands a card's Done action the way back to the idle menu. */
  onClearIntent?: () => void;
  /** Starts an intent from the idle menu's quick actions. */
  onSelectIntent?: (intent: IntentId) => void;
  /** The voice pipeline's structured answer; cards validate their own shape. */
  payload?: unknown;
}

/**
 * The dynamic task card of the design.
 *
 * Rendering strategy (deliberately NOT a router): a lookup map over intent
 * ids inside `IntentCard`. The frame never decides what an intent does -
 * it only renders the card for the given intent inside the fixed panel.
 */
export function DynamicFrame({
  intent,
  onClearIntent,
  onSelectIntent,
  payload,
}: DynamicFrameProps) {
  // Error screens reuse the design's attention card (ERR-01..03): the card
  // reports the failure, the frame paints the panel.
  const attention = useAttentionActive();

  return (
    <TaskPanel variant={attention ? 'attention' : 'idle'}>
      <IntentCard
        id={intent}
        onClearIntent={onClearIntent}
        onSelectIntent={onSelectIntent}
        payload={payload}
      />
    </TaskPanel>
  );
}
