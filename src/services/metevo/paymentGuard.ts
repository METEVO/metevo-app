/**
 * Payment-boundary guards shared by every wallet runtime (Node tooling,
 * the app bundle and the Bare worklet). This module must stay free of
 * wallet-runtime imports: it is bundled into the React Native app, where
 * the WDK module resolves to a Node-only binding.
 */

/** Thrown before a proposal reaches the node: nothing was submitted and no
 * funds moved, so callers must not treat this as an ambiguous outcome. */
export class PaymentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentValidationError';
  }
}

/** Lightning invoices carry an "ln" human-readable prefix; anything else is
 * not payable and is rejected before the node is touched. */
const BOLT11_INVOICE_PATTERN = /^ln[a-z0-9]{6,}/i;

export function assertPayableInvoice(invoice: string): void {
  if (!BOLT11_INVOICE_PATTERN.test(invoice)) {
    throw new PaymentValidationError(
      'the proposal is not a payable lightning invoice; nothing was submitted',
    );
  }
}

/** What the user reviewed and confirmed, before any invoice is trusted. */
export interface ReviewedPayment {
  /** The contact's node pubkey; null when the payer has no addressable node. */
  payeePubkey: string | null;
  assetAmountBaseUnits: number;
}

/** The decoded bolt11 fields the payment boundary checks. */
export interface DecodedInvoiceView {
  payeePubkey: string | null;
  assetId: string | null;
  assetAmount: number | null;
}

/**
 * The relay (or any third party) supplies the invoice, so the node must only
 * pay one that matches what the user saw. Returns the first mismatched field,
 * or null when the invoice is the reviewed payment. A missing asset amount is
 * a mismatch: a zero-amount invoice cannot satisfy a fixed-amount review.
 */
export function describeInvoiceMismatch(
  decoded: DecodedInvoiceView,
  reviewed: ReviewedPayment,
  expectedAssetId: string | null,
): 'destination' | 'asset' | 'amount' | null {
  const payee = decoded.payeePubkey?.toLowerCase() ?? null;
  const wanted = reviewed.payeePubkey?.toLowerCase() ?? null;
  if (payee !== null && wanted !== null && payee !== wanted) {
    return 'destination';
  }
  if (expectedAssetId !== null && decoded.assetId !== expectedAssetId) {
    return 'asset';
  }
  if (
    decoded.assetAmount === null ||
    decoded.assetAmount !== reviewed.assetAmountBaseUnits
  ) {
    return 'amount';
  }
  return null;
}

/**
 * The in-person receiver serves its own invoice, so the invoice must pay the
 * node that offered it. One addressed to another node is not the receiver's,
 * and one that names no payee cannot be checked: both are refused rather than
 * paid blind.
 */
export function invoicePaysAnotherNode(
  decoded: DecodedInvoiceView,
  nodePubkey: string,
): boolean {
  const payee = decoded.payeePubkey?.toLowerCase() ?? null;
  return payee === null || payee !== nodePubkey.toLowerCase();
}

/** Network settlement status per the design rules: pending is not success,
 * failed requires a confirmed failure, and no match stays unknown. */export type MetevoPaymentStatus = 'pending' | 'settled' | 'failed' | 'unknown';

/** Minimal structural view of an unlocked wallet account. */
interface PaymentQueryingAccount {
  sync(): Promise<unknown>;
  listPayments(): Promise<unknown>;
}

export async function getPaymentStatus(
  account: PaymentQueryingAccount,
  paymentHash: string,
): Promise<MetevoPaymentStatus> {
  if (paymentHash.length === 0) {
    return 'unknown';
  }
  await account.sync();
  const payments = await account.listPayments();
  const list = Array.isArray(payments)
    ? payments
    : (payments as Record<string, unknown>)?.payments;
  if (!Array.isArray(list)) {
    return 'unknown';
  }
  const match = list.find((entry: unknown) => {
    const hash = String(
      (entry as Record<string, unknown>)?.payment_hash ??
        (entry as Record<string, unknown>)?.paymentHash ??
        '',
    ).toLowerCase();
    return hash === paymentHash.toLowerCase();
  });
  if (match === undefined) {
    return 'unknown';
  }
  const status = String((match as Record<string, unknown>)?.status ?? 'Pending');
  if (status === 'Succeeded') {
    return 'settled';
  }
  if (status === 'Failed') {
    return 'failed';
  }
  return 'pending';
}
