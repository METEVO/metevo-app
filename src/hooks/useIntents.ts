import { useCallback, useState } from 'react';

import { IntentId } from '../types/intents';

/** Short, spoken-style description of every intent (demo + docs helper). */
const INTENT_DESCRIPTIONS: Record<IntentId, string> = {
  'send-usdm': 'Send stablecoins (USDm over RGB) to someone',
  'send-btc': 'Send on-chain bitcoin (sats) to someone',
  'create-usdm-invoice': 'Create a USDm invoice (request money)',
  'read-transactions': 'Read the last transactions out loud',
  'read-spending-overview': 'Summarise spending over time',
  'read-balance': 'Read all balances out loud',
  contacts: 'Open your contacts',
};

/**
 * Owns the CURRENT intent for the DynamicFrame.
 *
 * `simulateIntent` is the seam the voice pipeline feeds: `useVoicePipeline`
 * resolves a finished recording into a `VoiceOutcome` and lands its card id
 * here. Dev tools and tests can still drive the frame directly.
 */
export function useIntents(initialIntent: IntentId | null = null) {
  const [intent, setIntent] = useState<IntentId | null>(initialIntent);

  const simulateIntent = useCallback((next: IntentId | null) => {
    setIntent(next);
  }, []);

  return { intent, simulateIntent, descriptions: INTENT_DESCRIPTIONS };
}
