import {
  BtcUnit,
  SwapDirection,
  SwapQuote,
  SwapQuoteRejection,
  convertAtExampleRate,
  draftFromAmount,
  formatSwapAmount,
  inputAsset,
  outputAsset,
  parseSwapAmount,
  reverseDirection,
} from './swapQuote';
import { SwapService } from './swapService';

export const SIMULATION_NOTICE = 'Simulation: no funds will be exchanged.';

export type SwapFlowState =
  | {
      stage: 'entry';
      direction: SwapDirection;
      draft: string;
      btcUnit: BtcUnit;
      note: string | null;
    }
  | { stage: 'review'; quote: SwapQuote; note: string | null; balanceWarning: string | null }
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
  /** Unit the bitcoin amount is typed in; sats when omitted. */
  btcUnit?: BtcUnit;
}

const REJECTION_NOTES: Record<SwapQuoteRejection | 'quote-expired', string> = {
  'invalid-amount': 'Enter a valid amount.',
  'below-minimum': 'The amount is below the minimum.',
  'above-maximum': 'The amount is above the maximum.',
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
  private btcUnit: BtcUnit;

  constructor(
    private readonly ports: SwapFlowPorts,
    start: SwapFlowStart,
  ) {
    this.btcUnit = start.btcUnit ?? 'SATS';
    this.state = {
      stage: 'entry',
      direction: start.direction,
      draft: start.draft,
      btcUnit: this.btcUnit,
      note: null,
    };
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

  /** Flips the pair and converts the typed amount at the example rate, so
   * "10" USDm becomes about "10000" sats instead of a literal 10 sats. */
  reverse(): void {
    if (this.state.stage !== 'entry') {
      return;
    }
    const { direction, draft } = this.state;
    const from = inputAsset(direction);
    const amount = parseSwapAmount(draft, from, this.btcUnit);
    const nextDirection = reverseDirection(direction);
    const nextDraft =
      amount === null
        ? ''
        : draftFromAmount(convertAtExampleRate(amount, from), inputAsset(nextDirection), this.btcUnit);
    this.update({ ...this.state, direction: nextDirection, draft: nextDraft, note: null });
  }

  /** Switches between typing sats and BTC; the typed value is kept. */
  setBtcUnit(unit: BtcUnit): void {
    if (this.state.stage !== 'entry' || unit === this.btcUnit) {
      return;
    }
    const { direction, draft } = this.state;
    const from = inputAsset(direction);
    const amount = from === 'BTC' ? parseSwapAmount(draft, from, this.btcUnit) : null;
    this.btcUnit = unit;
    this.update({
      ...this.state,
      btcUnit: unit,
      draft: amount === null ? (from === 'BTC' ? '' : draft) : draftFromAmount(amount, from, unit),
      note: null,
    });
  }

  /**
   * Validates the typed amount and moves to the review on a valid quote.
   * A known balance below the amount only adds a warning: the simulation
   * still runs, so the screens can be shown with an empty wallet.
   */
  review(availableIn: number | null): void {
    if (this.state.stage !== 'entry') {
      return;
    }
    const { direction, draft } = this.state;
    const amountIn = parseSwapAmount(draft, inputAsset(direction), this.btcUnit);
    if (amountIn === null) {
      this.reject('invalid-amount');
      return;
    }
    const result = this.ports.service.quote({
      direction,
      amountIn,
      now: this.ports.now(),
    });
    if (!result.ok) {
      this.reject(result.reason);
      return;
    }
    const balanceWarning =
      availableIn !== null && amountIn > availableIn
        ? `Your balance is ${formatSwapAmount(availableIn, inputAsset(direction))}: a real swap would fail.`
        : null;
    this.update({ stage: 'review', quote: result.quote, note: null, balanceWarning });
    this.ports.announce(
      [describeQuote(result.quote), balanceWarning, SIMULATION_NOTICE].filter(Boolean).join(' '),
    );
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
      draft: this.draftFor(quote),
      btcUnit: this.btcUnit,
      note: null,
    });
  }

  async confirm(): Promise<void> {
    if (this.state.stage !== 'review') {
      return; // double taps land here: only one confirmation per review
    }
    const { quote, balanceWarning } = this.state;
    if (this.ports.now() >= quote.expiresAt) {
      this.update({
        stage: 'entry',
        direction: quote.direction,
        draft: this.draftFor(quote),
        btcUnit: this.btcUnit,
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
      this.update({
        stage: 'review',
        quote,
        note: 'Confirmation cancelled. Nothing happened.',
        balanceWarning,
      });
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

  private draftFor(quote: SwapQuote): string {
    return draftFromAmount(quote.amountIn, inputAsset(quote.direction), this.btcUnit);
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
