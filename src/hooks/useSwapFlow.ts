import { useCallback, useEffect, useState } from 'react';

import { SwapFlow, SwapFlowStart, SwapFlowState } from '../services/swap/swapFlow';
import { createSimulatedSwapService } from '../services/swap/swapService';
import { announceForAccessibility, speakEnglish } from '../utils/speaker';

/** A device without any screen lock has no prompt to show: the tap on
 * "Confirm" is the confirmation there. */
async function authorizeWithDeviceLock(reason: string): Promise<void> {
  const { authenticateToAccessSecrets, hasDeviceLock } = await import(
    '../services/metevo/secure-store'
  );
  if (await hasDeviceLock().catch(() => true)) {
    await authenticateToAccessSecrets(reason);
  }
}

function announce(text: string): void {
  speakEnglish(text);
  announceForAccessibility(text);
}

function createFlow(start: SwapFlowStart): SwapFlow {
  return new SwapFlow(
    {
      service: createSimulatedSwapService(),
      authorize: authorizeWithDeviceLock,
      announce,
      now: Date.now,
    },
    start,
  );
}

/** Binds one `SwapFlow` to the card's lifetime; `restart` begins a fresh one. */
export function useSwapFlow(start: SwapFlowStart) {
  const [flow, setFlow] = useState(() => createFlow(start));
  const [state, setState] = useState<SwapFlowState>(() => flow.getState());

  useEffect(() => {
    setState(flow.getState());
    const unsubscribe = flow.subscribe(setState);
    return () => {
      unsubscribe();
      flow.dispose();
    };
  }, [flow]);

  const restart = useCallback(() => setFlow(createFlow(start)), [start]);

  return { flow, state, restart };
}
