import { MetevoBuyQuote, MetevoClaimResult, MetevoLspError } from '../metevo/lsp-api';
import { PaymentNetworkStatus } from '../metevo/wallet-gateway';

/**
 * Buying USDm with sats through the LSP (`POST /metevo/buy` + `/metevo/claim`).
 *
 * Money rules (Andrea's review of #12):
 * - only the confirmed quote's invoice is ever paid, and never twice;
 * - an expired quote is re-quoted, never paid;
 * - once the sats are paid, delivery is retried with the same payment hash
 *   and the same RGB invoice: a failed claim never creates a second order;
 * - invoices, payment hashes and preimages are never logged.
 */

export const USDM_BASE_UNITS_PER_USD = 10 ** 8;

export interface UsdmPurchaseQuote {
  paymentHash: string;
  invoice: string;
  sats: number;
  usdAmount: number;
  assetId: string;
  assetAmount: number;
  satsPerUsd: number;
  /** Unix milliseconds. */
  expiresAt: number;
}

export interface UsdmPurchasePorts {
  buy(usdAmount: number): Promise<MetevoBuyQuote>;
  claim(params: { paymentHash: string; rgbInvoice: string }): Promise<MetevoClaimResult>;
  payInvoice(invoice: string): Promise<{ paymentHash: string | null }>;
  checkPayment(paymentHash: string): Promise<PaymentNetworkStatus>;
  createRgbReceiveInvoice(assetId: string, amountBaseUnits: number): Promise<string>;
  now(): number;
  sleep(ms: number): Promise<void>;
}

export interface UsdmPurchaseTiming {
  settlePollMs: number;
  settleTimeoutMs: number;
  claimAttempts: number;
  claimRetryMs: number;
}

export const DEFAULT_PURCHASE_TIMING: UsdmPurchaseTiming = {
  settlePollMs: 2_000,
  settleTimeoutMs: 120_000,
  claimAttempts: 5,
  claimRetryMs: 3_000,
};

export type UsdmPurchaseOutcome =
  | { status: 'delivered'; assetAmount: number }
  | { status: 'quote-expired' }
  /** Nothing was paid: a new quote may be requested. */
  | { status: 'payment-failed' }
  /** The payment may have left: never pay again, resume this purchase later. */
  | { status: 'payment-pending' }
  /** Sats are paid but USDm is not delivered yet: resume to retry the claim. */
  | { status: 'claim-pending'; reason: ClaimPendingReason };

export type ClaimPendingReason =
  | 'unauthorized'
  | 'unknown-order'
  | 'not-delivered'
  | 'unreachable';

export class UsdmQuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsdmQuoteError';
  }
}

type PurchaseStage =
  | { stage: 'paying' }
  | { stage: 'paid' }
  | { stage: 'claiming'; rgbInvoice: string }
  | { stage: 'delivered'; assetAmount: number };

/**
 * Per-session memory of every purchase that reached the payment step,
 * keyed by payment hash. It is what makes "never pay twice" hold across
 * double taps, retries and resumed purchases.
 */
export class UsdmPurchaseLedger {
  private readonly stages = new Map<string, PurchaseStage>();

  get(paymentHash: string): PurchaseStage | undefined {
    return this.stages.get(paymentHash);
  }

  set(paymentHash: string, stage: PurchaseStage): void {
    this.stages.set(paymentHash, stage);
  }

  forget(paymentHash: string): void {
    this.stages.delete(paymentHash);
  }
}

export async function quoteUsdmPurchase(
  ports: Pick<UsdmPurchasePorts, 'buy'>,
  usdAmount: number,
  expectedAssetId: string | null,
): Promise<UsdmPurchaseQuote> {
  if (!Number.isSafeInteger(usdAmount) || usdAmount <= 0) {
    throw new UsdmQuoteError('the LSP sells whole USD amounts only');
  }
  const quote = await ports.buy(usdAmount);
  if (expectedAssetId !== null && quote.assetId !== expectedAssetId) {
    throw new UsdmQuoteError('the LSP quoted a different asset than the wallet expects');
  }
  if (quote.usdAmount !== usdAmount || quote.assetAmount !== usdAmount * USDM_BASE_UNITS_PER_USD) {
    throw new UsdmQuoteError('the LSP quote does not match the requested amount');
  }
  return {
    paymentHash: quote.paymentHash.toLowerCase(),
    invoice: quote.invoice,
    sats: quote.sats,
    usdAmount: quote.usdAmount,
    assetId: quote.assetId,
    assetAmount: quote.assetAmount,
    satsPerUsd: quote.satsPerUsd,
    expiresAt: quote.expiresAt * 1_000,
  };
}

/**
 * Runs (or resumes) one confirmed purchase. Safe to call again with the
 * same quote and ledger after any non-final outcome: it continues from the
 * last step instead of starting a new payment.
 */
export async function completeUsdmPurchase(
  ports: UsdmPurchasePorts,
  ledger: UsdmPurchaseLedger,
  quote: UsdmPurchaseQuote,
  timing: UsdmPurchaseTiming = DEFAULT_PURCHASE_TIMING,
): Promise<UsdmPurchaseOutcome> {
  const known = ledger.get(quote.paymentHash);
  if (known?.stage === 'delivered') {
    return { status: 'delivered', assetAmount: known.assetAmount };
  }

  if (known === undefined) {
    if (ports.now() >= quote.expiresAt) {
      return { status: 'quote-expired' };
    }
    ledger.set(quote.paymentHash, { stage: 'paying' });
    try {
      await ports.payInvoice(quote.invoice);
    } catch {
      // A submit error does not prove the payment never left: the node is
      // asked below instead of assuming "not paid".
    }
  }

  if (known === undefined || known.stage === 'paying') {
    const settlement = await awaitSettlement(ports, quote.paymentHash, timing);
    if (settlement === 'failed') {
      ledger.forget(quote.paymentHash);
      return { status: 'payment-failed' };
    }
    if (settlement !== 'settled') {
      return { status: 'payment-pending' };
    }
    ledger.set(quote.paymentHash, { stage: 'paid' });
  }

  const current = ledger.get(quote.paymentHash);
  let rgbInvoice: string;
  if (current?.stage === 'claiming') {
    rgbInvoice = current.rgbInvoice;
  } else {
    try {
      rgbInvoice = await ports.createRgbReceiveInvoice(quote.assetId, quote.assetAmount);
    } catch {
      return { status: 'claim-pending', reason: 'not-delivered' };
    }
    ledger.set(quote.paymentHash, { stage: 'claiming', rgbInvoice });
  }

  const claimed = await claimWithRetries(ports, quote, rgbInvoice, timing);
  if (claimed.status === 'delivered') {
    ledger.set(quote.paymentHash, { stage: 'delivered', assetAmount: claimed.assetAmount });
  }
  return claimed;
}

async function awaitSettlement(
  ports: UsdmPurchasePorts,
  paymentHash: string,
  timing: UsdmPurchaseTiming,
): Promise<PaymentNetworkStatus> {
  const deadline = ports.now() + timing.settleTimeoutMs;
  let status: PaymentNetworkStatus = 'unknown';
  while (true) {
    try {
      status = await ports.checkPayment(paymentHash);
    } catch {
      status = 'unknown';
    }
    if (status === 'settled' || status === 'failed') {
      return status;
    }
    if (ports.now() >= deadline) {
      return status;
    }
    await ports.sleep(timing.settlePollMs);
  }
}

async function claimWithRetries(
  ports: UsdmPurchasePorts,
  quote: UsdmPurchaseQuote,
  rgbInvoice: string,
  timing: UsdmPurchaseTiming,
): Promise<UsdmPurchaseOutcome> {
  let lastReason: ClaimPendingReason = 'not-delivered';
  for (let attempt = 1; attempt <= timing.claimAttempts; attempt += 1) {
    try {
      const result = await ports.claim({ paymentHash: quote.paymentHash, rgbInvoice });
      if (result.status === 'delivered') {
        if (result.assetId !== quote.assetId || result.assetAmount !== quote.assetAmount) {
          return { status: 'claim-pending', reason: 'not-delivered' };
        }
        return { status: 'delivered', assetAmount: result.assetAmount };
      }
      lastReason = 'not-delivered';
    } catch (error) {
      const httpStatus = error instanceof MetevoLspError ? error.status : 0;
      if (httpStatus === 401) {
        return { status: 'claim-pending', reason: 'unauthorized' };
      }
      if (httpStatus === 404) {
        return { status: 'claim-pending', reason: 'unknown-order' };
      }
      // 409 means another attempt owns the delivery; 502 and transport
      // failures are transient. All three wait and claim again.
      lastReason = httpStatus === 409 ? 'not-delivered' : 'unreachable';
    }
    if (attempt < timing.claimAttempts) {
      await ports.sleep(timing.claimRetryMs);
    }
  }
  return { status: 'claim-pending', reason: lastReason };
}
