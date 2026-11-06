import { SwapQuote, SwapQuoteRequest, SwapQuoteResult, quoteSwap } from './swapQuote';

/**
 * The seam the real LSP swap will plug into. It is deliberately separate
 * from `WalletSessionGateway`: the simulated implementation below never
 * touches the wallet, its balances or its transaction history.
 */
export interface SwapService {
  readonly simulated: boolean;
  quote(request: SwapQuoteRequest): SwapQuoteResult;
  execute(quote: SwapQuote, now: number): Promise<SwapExecutionResult>;
}

export type SwapExecutionResult =
  | { status: 'completed'; quote: SwapQuote }
  | { status: 'failed'; reason: 'quote-expired' | 'simulated-failure' };

export interface SimulatedSwapOptions {
  /** How long the fake execution waits, so the "in progress" state is visible. */
  delayMs?: number;
  /** Forces the failure outcome (tests and demo rehearsals). */
  fail?: boolean;
}

export function createSimulatedSwapService(options: SimulatedSwapOptions = {}): SwapService {
  const delayMs = options.delayMs ?? 1_500;
  return {
    simulated: true,
    quote: quoteSwap,
    async execute(quote, now) {
      if (now >= quote.expiresAt) {
        return { status: 'failed', reason: 'quote-expired' };
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      if (options.fail === true) {
        return { status: 'failed', reason: 'simulated-failure' };
      }
      return { status: 'completed', quote };
    },
  };
}
