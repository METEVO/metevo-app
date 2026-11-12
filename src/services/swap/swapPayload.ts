import { SwapFlowStart } from './swapFlow';

const DEFAULT_START: SwapFlowStart = { direction: 'USDM_TO_BTC', draft: '', btcUnit: 'SATS' };

/**
 * The swap card's payload from voice. Anything malformed opens the card
 * empty in the default direction: the user still reviews every value.
 */
export function parseSwapStart(payload: unknown): SwapFlowStart {
  if (typeof payload !== 'object' || payload === null) {
    return DEFAULT_START;
  }
  const { direction, draft, btcUnit } = payload as Record<string, unknown>;
  if (direction !== 'USDM_TO_BTC' && direction !== 'BTC_TO_USDM') {
    return DEFAULT_START;
  }
  return {
    direction,
    draft: typeof draft === 'string' ? draft : '',
    btcUnit: btcUnit === 'BTC' ? 'BTC' : 'SATS',
  };
}
