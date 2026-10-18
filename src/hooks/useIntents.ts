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
 * here, optionally with a payload. The payload carries the voice
 * pipeline's structured answer (e.g. a parsed payment intent for
 * send-usdm); cards validate it themselves and fall back to the demo path
 * when it is missing or invalid. Dev tools and tests can still drive the
 * frame directly.
 */
export function useIntents(initialIntent: IntentId | null = null) {
  const [intent, setIntent] = useState<IntentId | null>(initialIntent);
  const [payload, setPayload] = useState<unknown>(null);

  const simulateIntent = useCallback(
    (next: IntentId | null, nextPayload?: unknown) => {
      setIntent(next);
      setPayload(nextPayload ?? null);
    },
    [],
  );

  return { intent, payload, simulateIntent, descriptions: INTENT_DESCRIPTIONS };
}
