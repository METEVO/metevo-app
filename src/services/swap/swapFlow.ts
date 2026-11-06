import {
  SwapDirection,
  SwapQuote,
  SwapQuoteRejection,
  formatSwapAmount,
  inputAsset,
  outputAsset,
  parseSwapAmount,
  reverseDirection,
} from './swapQuote';
import { SwapService } from './swapService';

export const SIMULATION_NOTICE = 'Simulation: no funds will be exchanged.';

export type SwapFlowState =
  | { stage: 'entry'; direction: SwapDirection; draft: string; note: string | null }
  | { stage: 'review'; quote: SwapQuote; note: string | null }
  | { stage: 'authorizing'; quote: SwapQuote }
  | { stage: 'simulating'; quote: SwapQuote }
  | { stage: 'completed'; quote: SwapQuote }
  | { stage: 'failed'; quote: SwapQuote; note: string };

export interface SwapFlowPorts {
  service: SwapService;
  /** Biometric prompt; rejects when the user cancels or it fails. */
  authorize: (reason: string) => Promise<void>;
  /** Spoken line for every state change the user must hear. */
  announce: (text: string) => void;
  now: () => number;
}

export interface SwapFlowStart {
  direction: SwapDirection;
  /** Prefilled amount as typed text (from voice), or empty. */
  draft: string;
}

const REJECTION_NOTES: Record<SwapQuoteRejection | 'quote-expired', string> = {
  'invalid-amount': 'Enter a valid amount.',
  'below-minimum': 'The amount is below the minimum.',
  'above-maximum': 'The amount is above the maximum.',
  'insufficient-balance': 'Your balance is too low for this amount.',
  'quote-expired': 'The quote expired. Check the amount and review again.',
};

/**
 * The swap screen's state machine, kept out of React so every transition
 * is testable: entry -> review -> authorizing -> simulating -> completed
 * or failed. Each transition bumps a generation counter, so a late
 * biometric or simulation result from an abandoned step lands nowhere.
 */
export class SwapFlow {
  private state: SwapFlowState;
  private generation = 0;
  private listeners = new Set<(state: SwapFlowState) => void>();

  constructor(
    private readonly ports: SwapFlowPorts,
    start: SwapFlowStart,
  ) {
    this.state = { stage: 'entry', direction: start.direction, draft: start.draft, note: null };
  }

  getState(): SwapFlowState {
    return this.state;
  }

  subscribe(listener: (state: SwapFlowState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setDraft(draft: string): void {
    if (this.state.stage === 'entry') {
      this.update({ ...this.state, draft, note: null });
    }
  }

  reverse(): void {
    if (this.state.stage === 'entry') {
      this.update({ ...this.state, direction: reverseDirection(this.state.direction), note: null });
    }
  }

  /** Validates the typed amount and moves to the review on a valid quote. */
  review(availableIn: number | null): void {
    if (this.state.stage !== 'entry') {
      return;
    }
    const { direction, draft } = this.state;
    const amountIn = parseSwapAmount(draft, inputAsset(direction));
    if (amountIn === null) {
      this.reject('invalid-amount');
      return;
    }
    const result = this.ports.service.quote({
      direction,
      amountIn,
      availableIn,
      now: this.ports.now(),
    });
    if (!result.ok) {
      this.reject(result.reason);
      return;
    }
    this.update({ stage: 'review', quote: result.quote, note: null });
    this.ports.announce(`${describeQuote(result.quote)} ${SIMULATION_NOTICE}`);
  }

  /** Back from the review to the amount, keeping the reviewed values. */
  edit(): void {
    if (this.state.stage !== 'review') {
      return;
    }
    const { quote } = this.state;
    this.update({
      stage: 'entry',
      direction: quote.direction,
      draft: draftFor(quote),
      note: null,
    });
  }

  async confirm(): Promise<void> {
    if (this.state.stage !== 'review') {
      return; // double taps land here: only one confirmation per review
    }
    const { quote } = this.state;
    if (this.ports.now() >= quote.expiresAt) {
      this.update({
        stage: 'entry',
        direction: quote.direction,
        draft: draftFor(quote),
        note: REJECTION_NOTES['quote-expired'],
      });
      this.ports.announce(REJECTION_NOTES['quote-expired']);
      return;
    }

    const turn = this.update({ stage: 'authorizing', quote });
    try {
      await this.ports.authorize(`Confirm the swap simulation: ${describeQuote(quote)}`);
    } catch {
      if (turn !== this.generation) return;
      this.update({ stage: 'review', quote, note: 'Confirmation cancelled. Nothing happened.' });
      return;
    }
    if (turn !== this.generation) return;

    const simulating = this.update({ stage: 'simulating', quote });
    this.ports.announce('Running the simulation.');
    const result = await this.ports.service.execute(quote, this.ports.now());
    if (simulating !== this.generation) return;

    if (result.status === 'completed') {
      this.update({ stage: 'completed', quote });
      this.ports.announce(
        `Simulation complete: ${describeQuote(quote)} No funds were exchanged.`,
      );
      return;
    }
    const note =
      result.reason === 'quote-expired'
        ? REJECTION_NOTES['quote-expired']
        : 'The simulation failed. No funds were exchanged.';
    this.update({ stage: 'failed', quote, note });
    this.ports.announce(note);
  }

  /** Leaves the flow; any pending biometric or simulation result is dropped. */
  dispose(): void {
    this.generation += 1;
    this.listeners.clear();
  }

  private reject(reason: SwapQuoteRejection): void {
    if (this.state.stage !== 'entry') return;
    const note = REJECTION_NOTES[reason];
    this.update({ ...this.state, note });
    this.ports.announce(note);
  }

  private update(next: SwapFlowState): number {
    this.generation += 1;
    this.state = next;
    this.listeners.forEach((listener) => listener(next));
    return this.generation;
  }
}

export function describeQuote(quote: SwapQuote): string {
  const paid = formatSwapAmount(quote.amountIn, inputAsset(quote.direction));
  const received = formatSwapAmount(quote.amountOut, outputAsset(quote.direction));
  return `Swap ${paid} for ${received}.`;
}

function draftFor(quote: SwapQuote): string {
  return inputAsset(quote.direction) === 'USDM'
    ? (quote.amountIn / 100).toFixed(2)
    : String(quote.amountIn);
}
