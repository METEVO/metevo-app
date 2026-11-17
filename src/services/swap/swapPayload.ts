import type { SwapFlowStart } from './swapFlow';
/** Voice prefills only an explicitly USD-denominated purchase, never a sats
 * input reinterpreted as dollars or a request for the unsupported sell direction. */
export function parseSwapStart(payload: unknown): SwapFlowStart {
  if (!payload || typeof payload !== 'object') return { draft: '' };
  const value = payload as Record<string, unknown>;
  if (value.purchaseUsd === true && typeof value.draft === 'string') return { draft: value.draft };
  return { draft: '', note: 'Buy USDm with sats. Enter the whole USDm amount you want to receive.' };
}
