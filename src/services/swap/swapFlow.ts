import { PurchaseOrder, PurchaseStage, completeUsdmPurchase, quoteUsdmPurchase, UsdmPurchaseLedger, UsdmPurchasePorts, UsdmPurchaseQuote, UsdmPurchaseOutcome } from './usdmPurchase';

export interface SwapFlowStart { draft: string; note?: string }
export interface SwapFlowState {
  stage: 'entry' | 'quoting' | 'review' | 'authorizing' | 'executing' | 'pending' | 'completed' | 'failed';
  draft: string;
  quote: UsdmPurchaseQuote | null;
  note: string | null;
}
export interface SwapFlowPorts {
  enabled(): boolean;
  expectedAssetId(): string | null;
  purchase: UsdmPurchasePorts;
  ledger(): UsdmPurchaseLedger;
  authorize(reason: string): Promise<void>;
  announce(text: string): void;
  now(): number;
}
export function describeQuote(q: UsdmPurchaseQuote): string {
  return `Pay ${q.sats} sats to receive ${q.usdAmount} USDm. Rate: ${q.satsPerUsd} sats per USDm. Expires ${new Date(q.expiresAt).toLocaleTimeString('en-GB')}.`;
}
export const OUTCOME_NOTES: Record<UsdmPurchaseOutcome['status'], string> = {
  delivered: 'USDm received.', 'quote-expired': 'The quote expired. Review a new quote.',
  'payment-failed': 'The payment failed. This order will not be paid again.',
  'payment-pending': 'Payment is not confirmed. Check this order; do not pay again.',
  'invoice-mismatch': 'The invoice or delivery does not match this purchase. This order is stopped.',
  receiving: 'The LSP sent USDm. Waiting for this wallet to confirm receipt.',
  'claim-pending': 'Your purchase is saved. Check this order to continue receiving USDm.',
};
export class SwapFlow {
  private state: SwapFlowState;
  private generation = 0;
  private listeners = new Set<() => void>();
  constructor(private readonly ports: SwapFlowPorts, start: SwapFlowStart) {
    this.state = { stage: 'entry', draft: start.draft, quote: null, note: start.note ?? null };
  }
  getState = (): SwapFlowState => this.state;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private update(next: Partial<SwapFlowState>) { this.state = { ...this.state, ...next }; this.listeners.forEach((listener) => listener()); }
  setDraft(draft: string) { if (this.state.stage === 'entry') this.update({ draft, note: null }); }
  private async pendingOrder(): Promise<PurchaseOrder | undefined> {
    const ledger = this.ports.ledger();
    const orders = await ledger.list();
    for (const order of orders) {
      if (order.stage === 'prepared' && this.ports.now() >= order.quote.expiresAt) {
        await ledger.save({ ...order, stage: 'failed', updatedAt: this.ports.now() });
      } else if (!['failed', 'mismatch', 'delivered'].includes(order.stage)) return order;
    }
    return undefined;
  }
  async restore(): Promise<void> {
    const run = this.generation;
    try {
      const pending = await this.pendingOrder();
      if (pending && run === this.generation && this.state.stage === 'entry') this.update({
        stage: pending.stage === 'prepared' ? 'review' : 'pending', quote: pending.quote,
        draft: String(pending.quote.usdAmount), note: 'A saved purchase needs your attention.',
      });
    } catch { if (run === this.generation) this.update({ note: 'The saved purchase could not be read. Reconnect the wallet before buying.' }); }
  }
  async review(): Promise<void> {
    if (this.state.stage !== 'entry') return;
    if (!this.ports.enabled()) { this.update({ note: 'Buying USDm is not enabled on this build.' }); return; }
    const amount = /^\d+$/.test(this.state.draft.trim()) ? Number(this.state.draft) : NaN;
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000) { this.update({ note: 'Enter a whole USDm amount from 1 to 1000000.' }); return; }
    const run = ++this.generation;
    this.update({ stage: 'quoting', note: null });
    try {
      const pending = await this.pendingOrder();
      if (run !== this.generation) return;
      if (pending) { this.update({ stage: pending.stage === 'prepared' ? 'review' : 'pending', quote: pending.quote, note: 'Finish the saved purchase before starting another.' }); return; }
      const quote = await quoteUsdmPurchase(this.ports.purchase, amount, this.ports.expectedAssetId());
      if (run !== this.generation) return;
      this.update({ stage: 'review', quote }); this.ports.announce(describeQuote(quote));
    } catch { if (run === this.generation) this.update({ stage: 'entry', note: 'A verified quote is unavailable. Check your wallet and LSP connection.' }); }
  }
  edit(): void { if (['review', 'failed', 'completed'].includes(this.state.stage)) { this.generation++; this.update({ stage: 'entry', quote: null, note: null }); } }
  async confirm(): Promise<void> {
    if (this.state.stage !== 'review' || !this.state.quote || !this.ports.enabled()) return;
    const quote = this.state.quote;
    if (this.ports.now() >= quote.expiresAt) { await this.pendingOrder(); this.update({ stage: 'failed', note: OUTCOME_NOTES['quote-expired'] }); return; }
    const run = ++this.generation;
    this.update({ stage: 'authorizing', note: null });
    try { await this.ports.authorize(`Buy ${quote.usdAmount} USDm for ${quote.sats} sats`); }
    catch { if (run === this.generation) this.update({ stage: 'review', note: 'Not confirmed. Nothing was submitted.' }); return; }
    if (run === this.generation) await this.execute(run, quote);
  }
  async resume(): Promise<void> {
    if (this.state.stage !== 'pending' || !this.state.quote) return;
    await this.execute(++this.generation, this.state.quote);
  }
  private async execute(run: number, quote: UsdmPurchaseQuote) {
    this.update({ stage: 'executing', note: 'Checking your saved purchase…' });
    try {
      const messages: Partial<Record<PurchaseStage, string>> = {
        paying: 'Paying the confirmed sats invoice…', paid: 'Sats payment confirmed.',
        claiming: 'Requesting your USDm delivery…', receiving: 'Waiting for this wallet to confirm receipt…',
      };
      const result = await completeUsdmPurchase({ ...this.ports.purchase, onStage: (stage) => {
        const note = messages[stage];
        if (note && run === this.generation) { this.update({ note }); this.ports.announce(note); }
      } }, this.ports.ledger(), quote);
      if (run !== this.generation) return;
      const note = OUTCOME_NOTES[result.status];
      const stage = result.status === 'delivered' ? 'completed' :
        ['quote-expired', 'payment-failed', 'invoice-mismatch'].includes(result.status) ? 'failed' : 'pending';
      this.update({ stage, note }); this.ports.announce(note);
    } catch { if (run === this.generation) this.update({ stage: 'pending', note: 'Purchase paused. Check this saved order before trying again.' }); }
  }
  dispose() { this.generation++; this.listeners.clear(); }
}
