import { MetevoBuyQuote, MetevoClaimResult, MetevoLspError } from '../metevo/lsp-api';
import { PaymentValidationError } from '../metevo/paymentGuard';
import type { DecodedInvoiceView } from '../metevo/paymentGuard';
import type { PaymentNetworkStatus } from '../metevo/wallet-gateway';

export const USDM_BASE_UNITS_PER_USD = 100_000_000;
export interface UsdmPurchaseQuote {
  paymentHash: string; invoice: string; sats: number; usdAmount: number;
  assetId: string; assetAmount: number; satsPerUsd: number; expiresAt: number;
}
export type PurchaseStage = 'prepared' | 'paying' | 'paid' | 'claiming' | 'receiving' | 'delivered' | 'failed' | 'mismatch';
export interface PurchaseOrder {
  quote: UsdmPurchaseQuote;
  rgbInvoice: string;
  recipientId: string;
  stage: PurchaseStage;
  approvedAt: number;
  updatedAt: number;
  submittedHash?: string;
  executedSats?: number;
  executedUsdAmount?: number;
}
export interface PurchaseStore {
  load(): Promise<PurchaseOrder[]>;
  save(orders: PurchaseOrder[]): Promise<void>;
}
export interface UsdmPurchasePorts {
  buy(amount: number): Promise<MetevoBuyQuote>;
  claim(params: { paymentHash: string; rgbInvoice: string }): Promise<MetevoClaimResult>;
  decodeInvoice(invoice: string): Promise<DecodedInvoiceView | null>;
  payInvoice(invoice: string): Promise<{ paymentHash: string | null }>;
  checkPayment(hash: string): Promise<PaymentNetworkStatus>;
  createRgbReceiveInvoice(assetId: string, amount: number): Promise<{ invoice: string; recipientId: string }>;
  verifyDelivery(recipientId: string, assetId: string, amount: number): Promise<boolean>;
  onStage?(stage: PurchaseStage): void;
  now(): number;
  sleep(ms: number): Promise<void>;
}
export interface UsdmPurchaseTiming { settlePollMs: number; settleTimeoutMs: number; claimAttempts: number; claimRetryMs: number }
export const DEFAULT_PURCHASE_TIMING: UsdmPurchaseTiming = {
  settlePollMs: 2000, settleTimeoutMs: 120000, claimAttempts: 5, claimRetryMs: 3000,
};
export type ClaimPendingReason = 'unauthorized' | 'unknown-order' | 'not-delivered' | 'unreachable';
export type UsdmPurchaseOutcome =
  | { status: 'delivered'; assetAmount: number }
  | { status: 'quote-expired' | 'payment-failed' | 'payment-pending' | 'invoice-mismatch' | 'receiving' }
  | { status: 'claim-pending'; reason: ClaimPendingReason };
export class UsdmQuoteError extends Error { constructor(message: string) { super(message); this.name = 'UsdmQuoteError'; } }

const rank: Record<PurchaseStage, number> = { prepared: 0, paying: 1, paid: 2, claiming: 3, receiving: 4, delivered: 5, failed: 5, mismatch: 5 };
const hashPattern = /^[a-f0-9]{64}$/;
export function validQuote(q: UsdmPurchaseQuote): boolean {
  return hashPattern.test(q.paymentHash) && /^ln[a-z0-9]+$/i.test(q.invoice) &&
    Number.isSafeInteger(q.usdAmount) && q.usdAmount > 0 && !!q.assetId.trim() &&
    Number.isSafeInteger(q.assetAmount) && q.assetAmount === q.usdAmount * USDM_BASE_UNITS_PER_USD &&
    Number.isSafeInteger(q.sats) && q.sats > 0 && Number.isSafeInteger(q.sats * 1000) &&
    Number.isSafeInteger(q.satsPerUsd) && q.satsPerUsd > 0 && q.sats === q.usdAmount * q.satsPerUsd &&
    Number.isSafeInteger(q.expiresAt) && q.expiresAt > 0;
}
export function validOrder(value: unknown): value is PurchaseOrder {
  if (!value || typeof value !== 'object') return false;
  const o = value as PurchaseOrder;
  return !!o.quote && validQuote(o.quote) && Object.hasOwn(rank, o.stage) &&
    typeof o.rgbInvoice === 'string' && !!o.rgbInvoice && typeof o.recipientId === 'string' && !!o.recipientId &&
    Number.isSafeInteger(o.approvedAt) && Number.isSafeInteger(o.updatedAt) &&
    (o.submittedHash === undefined || hashPattern.test(o.submittedHash));
}

/** One shared ledger per wallet. A durable transition precedes each external effect. */
export class UsdmPurchaseLedger {
  private orders: Map<string, PurchaseOrder> | null = null;
  private writes = Promise.resolve();
  private loading: Promise<void> | null = null;
  private readonly flights = new Map<string, Promise<UsdmPurchaseOutcome>>();
  constructor(private readonly store: PurchaseStore) {}
  private initialize(): Promise<void> {
    this.loading ??= this.store.load().then((rows) => {
      if (!rows.every(validOrder) || new Set(rows.map((o) => o.quote.paymentHash)).size !== rows.length) throw new Error('invalid purchase store');
      this.orders = new Map(rows.map((o) => [o.quote.paymentHash, structuredCopy(o)]));
    }).catch((error) => { this.loading = null; throw error; });
    return this.loading;
  }
  async list(): Promise<PurchaseOrder[]> {
    await this.initialize();
    await this.writes;
    return [...this.orders!.values()].map((o) => structuredCopy(o));
  }
  async get(hash: string): Promise<PurchaseOrder | undefined> { return (await this.list()).find((o) => o.quote.paymentHash === hash); }
  save(order: PurchaseOrder): Promise<void> {
    const operation = this.writes.then(async () => {
      await this.initialize();
      const old = this.orders!.get(order.quote.paymentHash);
      if (!validOrder(order)) throw new Error('invalid purchase order');
      if (old && (rank[order.stage] < rank[old.stage] || (rank[old.stage] === 5 && order.stage !== old.stage))) throw new Error('purchase stage regression');
      const next = new Map(this.orders!);
      next.set(order.quote.paymentHash, structuredCopy(order));
      await this.store.save([...next.values()]);
      this.orders = next;
    });
    this.writes = operation.catch(() => {});
    return operation;
  }
  once(hash: string, run: () => Promise<UsdmPurchaseOutcome>): Promise<UsdmPurchaseOutcome> {
    const existing = this.flights.get(hash);
    if (existing) return existing;
    // Register before the first await: double taps share the entire completion.
    const flight = Promise.resolve().then(run).finally(() => this.flights.delete(hash));
    this.flights.set(hash, flight);
    return flight;
  }
}
function structuredCopy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

export async function quoteUsdmPurchase(ports: Pick<UsdmPurchasePorts, 'buy'>, usdAmount: number, expectedAssetId: string | null): Promise<UsdmPurchaseQuote> {
  if (!expectedAssetId?.trim() || !Number.isSafeInteger(usdAmount) || usdAmount <= 0 || !Number.isSafeInteger(usdAmount * USDM_BASE_UNITS_PER_USD)) throw new UsdmQuoteError('enter whole USDm and configure the expected asset');
  const raw = await ports.buy(usdAmount);
  const quote = { ...raw, paymentHash: raw.paymentHash.toLowerCase(), expiresAt: raw.expiresAt * 1000 };
  if (!validQuote(quote) || raw.assetId !== expectedAssetId || raw.usdAmount !== usdAmount || raw.amountMsat !== raw.sats * 1000) throw new UsdmQuoteError('the quote does not match the requested purchase');
  return quote;
}

export function completeUsdmPurchase(ports: UsdmPurchasePorts, ledger: UsdmPurchaseLedger, quote: UsdmPurchaseQuote, timing = DEFAULT_PURCHASE_TIMING): Promise<UsdmPurchaseOutcome> {
  return ledger.once(quote.paymentHash, async () => {
    if (!validQuote(quote)) return { status: 'invoice-mismatch' };
    let order = await ledger.get(quote.paymentHash);
    if (order && JSON.stringify(order.quote) !== JSON.stringify(quote)) return { status: 'invoice-mismatch' };
    if (order?.stage === 'delivered') return { status: 'delivered', assetAmount: order.quote.assetAmount };
    if (order?.stage === 'failed') return { status: 'payment-failed' };
    if (order?.stage === 'mismatch') return { status: 'invoice-mismatch' };
    const advance = async (stage: PurchaseStage, submittedHash?: string) => {
      const next = { ...order!, stage, updatedAt: ports.now(), ...(submittedHash ? { submittedHash, executedSats: quote.sats, executedUsdAmount: quote.usdAmount } : {}) };
      await ledger.save(next);
      order = next;
      try { ports.onStage?.(stage); } catch { /* UI callbacks cannot interrupt an order. */ }
    };
    if (!order || order.stage === 'prepared') {
      if (ports.now() >= quote.expiresAt) { if (order) await advance('failed'); return { status: 'quote-expired' }; }
      // Bind hash AND amount before paying. Missing decoding support fails closed.
      const decoded = await ports.decodeInvoice(quote.invoice);
      if (!decoded || decoded.paymentHash?.toLowerCase() !== quote.paymentHash || decoded.amountMsat !== quote.sats * 1000 || decoded.assetId !== null) return { status: 'invoice-mismatch' };
      if (!order) {
        // Failure to create a destination must happen while the sats are still here.
        const receive = await ports.createRgbReceiveInvoice(quote.assetId, quote.assetAmount);
        if (!receive.invoice || !receive.recipientId) throw new Error('RGB receive invoice unavailable');
        order = { quote: structuredCopy(quote), rgbInvoice: receive.invoice, recipientId: receive.recipientId,
          stage: 'prepared', approvedAt: ports.now(), updatedAt: ports.now() };
        await ledger.save(order);
      }
      if (ports.now() >= quote.expiresAt) { if (order) await advance('failed'); return { status: 'quote-expired' }; }
      // A crash after this durable marker resumes by querying, never by submitting again.
      await advance('paying');
      let sent: { paymentHash: string | null };
      try { sent = await ports.payInvoice(quote.invoice); }
      catch (error) {
        if (error instanceof PaymentValidationError) { await advance('failed'); return { status: 'payment-failed' }; }
        return { status: 'payment-pending' };
      }
      if (sent.paymentHash?.toLowerCase() !== quote.paymentHash) {
        await advance('mismatch'); return { status: 'invoice-mismatch' };
      }
      await advance('paying', quote.paymentHash);
    }
    if (order!.stage === 'paying') {
      const deadline = ports.now() + timing.settleTimeoutMs;
      while (true) {
        let status: PaymentNetworkStatus = 'unknown';
        try { status = await ports.checkPayment(quote.paymentHash); } catch { /* Ambiguous: retain the durable order. */ }
        if (status === 'failed') { await advance('failed'); return { status: 'payment-failed' }; }
        if (status === 'settled') { await advance('paid'); break; }
        if (ports.now() >= deadline) return { status: 'payment-pending' };
        await ports.sleep(timing.settlePollMs);
      }
    }
    if (order!.stage !== 'receiving') {
      await advance('claiming');
      let delivered = false;
      let reason: ClaimPendingReason = 'not-delivered';
      for (let attempt = 0; attempt < timing.claimAttempts; attempt++) {
        try {
          const result = await ports.claim({ paymentHash: quote.paymentHash, rgbInvoice: order!.rgbInvoice });
          if (result.paymentHash.toLowerCase() !== quote.paymentHash || result.assetId !== quote.assetId || result.assetAmount !== quote.assetAmount) {
            await advance('mismatch'); return { status: 'invoice-mismatch' };
          }
          if (result.status === 'delivered') { delivered = true; break; }
        } catch (error) {
          const status = error instanceof MetevoLspError ? error.status : 0;
          if (status === 401) return { status: 'claim-pending', reason: 'unauthorized' };
          if (status === 404) return { status: 'claim-pending', reason: 'unknown-order' };
          if (status !== 0 && status !== 409 && status !== 502 && status !== 503 && status !== 504) return { status: 'claim-pending', reason: 'not-delivered' };
          reason = status === 409 ? 'not-delivered' : 'unreachable';
        }
        if (attempt + 1 < timing.claimAttempts) await ports.sleep(timing.claimRetryMs);
      }
      if (!delivered) return { status: 'claim-pending', reason };
      await advance('receiving');
    }
    // The LSP's acknowledgement is not local settlement. Match this receive identity.
    let received = false;
    try { received = await ports.verifyDelivery(order!.recipientId, quote.assetId, quote.assetAmount); } catch { /* Retry local verification later. */ }
    if (!received) return { status: 'receiving' };
    await advance('delivered');
    return { status: 'delivered', assetAmount: quote.assetAmount };
  });
}
