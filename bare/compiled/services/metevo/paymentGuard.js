/**
 * Payment-boundary guards shared by every wallet runtime (Node tooling,
 * the app bundle and the Bare worklet). This module must stay free of
 * wallet-runtime imports: it is bundled into the React Native app, where
 * the WDK module resolves to a Node-only binding.
 */
/** Thrown before a proposal reaches the node: nothing was submitted and no
 * funds moved, so callers must not treat this as an ambiguous outcome. */
export class PaymentValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PaymentValidationError';
    }
}
/** Lightning invoices carry an "ln" human-readable prefix; anything else is
 * not payable and is rejected before the node is touched. */
const BOLT11_INVOICE_PATTERN = /^ln[a-z0-9]{6,}/i;
export function assertPayableInvoice(invoice) {
    if (!BOLT11_INVOICE_PATTERN.test(invoice)) {
        throw new PaymentValidationError('the proposal is not a payable lightning invoice; nothing was submitted');
    }
}
/**
 * The relay (or any third party) supplies the invoice, so the node must only
 * pay one that matches what the user saw. Returns the first mismatched field,
 * or null when the invoice is the reviewed payment. A missing asset amount is
 * a mismatch: a zero-amount invoice cannot satisfy a fixed-amount review.
 */
export function describeInvoiceMismatch(decoded, reviewed, expectedAssetId) {
    const payee = decoded.payeePubkey?.toLowerCase() ?? null;
    const wanted = reviewed.payeePubkey?.toLowerCase() ?? null;
    if (payee !== null && wanted !== null && payee !== wanted) {
        return 'destination';
    }
    if (expectedAssetId !== null && decoded.assetId !== expectedAssetId) {
        return 'asset';
    }
    if (decoded.assetAmount === null ||
        decoded.assetAmount !== reviewed.assetAmountBaseUnits) {
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
export function invoicePaysAnotherNode(decoded, nodePubkey) {
    const payee = decoded.payeePubkey?.toLowerCase() ?? null;
    return payee === null || payee !== nodePubkey.toLowerCase();
}
export async function getPaymentStatus(account, paymentHash) {
    if (paymentHash.length === 0) {
        return 'unknown';
    }
    await account.sync();
    const payments = await account.listPayments();
    const list = Array.isArray(payments)
        ? payments
        : payments?.payments;
    if (!Array.isArray(list)) {
        return 'unknown';
    }
    const match = list.find((entry) => {
        const hash = String(entry?.payment_hash ??
            entry?.paymentHash ??
            '').toLowerCase();
        return hash === paymentHash.toLowerCase();
    });
    if (match === undefined) {
        return 'unknown';
    }
    const status = String(match?.status ?? 'Pending');
    if (status === 'Succeeded') {
        return 'settled';
    }
    if (status === 'Failed') {
        return 'failed';
    }
    return 'pending';
}
/** Normalize the wallet SDK's decoded BOLT11 without inventing missing fields. */
export function decodedInvoiceView(value) {
    const raw = value;
    const text = (snake, camel) => {
        const item = raw?.[snake] ?? raw?.[camel];
        return typeof item === 'string' && item.length > 0 ? item : null;
    };
    const integer = (snake, camel) => {
        const item = raw?.[snake] ?? raw?.[camel];
        return typeof item === 'number' && Number.isSafeInteger(item) ? item : null;
    };
    return { paymentHash: text('payment_hash', 'paymentHash'), amountMsat: integer('amt_msat', 'amountMsat'),
        payeePubkey: text('payee_pubkey', 'payeePubkey'), assetId: text('asset_id', 'assetId'),
        assetAmount: integer('asset_amount', 'assetAmount') };
}
export function assertRgbReceiveRequest(assetId, amount) {
    if (!assetId.trim() || !Number.isSafeInteger(amount) || amount <= 0) {
        throw new PaymentValidationError('RGB receive requires an asset and a positive safe integer amount');
    }
}
