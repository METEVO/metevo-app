import { completeUsdmPurchase, quoteUsdmPurchase, PurchaseOrder, PurchaseStore, UsdmPurchaseLedger, UsdmPurchasePorts, UsdmPurchaseQuote } from '../../src/services/swap/usdmPurchase';
import { PaymentValidationError } from '../../src/services/metevo/paymentGuard';
import { MetevoLspError } from '../../src/services/metevo/lsp-api';
const hash = 'a'.repeat(64);
const quote: UsdmPurchaseQuote = { paymentHash: hash, invoice: 'lnbcrt1invoice', sats: 1000, usdAmount: 1, assetId: 'rgb:usdm', assetAmount: 100000000, satsPerUsd: 1000, expiresAt: 100000 };
const timing = { settlePollMs: 1, settleTimeoutMs: 2, claimAttempts: 2, claimRetryMs: 1 };
function setup() {
  let now = 1000;
  let rows: PurchaseOrder[] = [];
  const store: PurchaseStore = {
    load: jest.fn(async () => JSON.parse(JSON.stringify(rows))),
    save: jest.fn(async (next) => { rows = JSON.parse(JSON.stringify(next)); }),
  };
  const ports = {
    buy: jest.fn(async () => ({ ...quote, amountMsat: 1000000, expiresAt: 100 })),
    decodeInvoice: jest.fn(async () => ({ paymentHash: hash, amountMsat: 1000000, payeePubkey: null, assetId: null, assetAmount: null })),
    payInvoice: jest.fn(async () => ({ paymentHash: hash as string | null })),
    checkPayment: jest.fn(async () => 'settled' as const),
    createRgbReceiveInvoice: jest.fn(async () => ({ invoice: 'rgb:receive', recipientId: 'utxob:receiver' })),
    claim: jest.fn(async () => ({ paymentHash: hash, assetId: quote.assetId, assetAmount: quote.assetAmount, status: 'delivered' })),
    verifyDelivery: jest.fn(async () => true),
    now: () => now,
    sleep: async (ms: number) => { now += ms; },
  };
  const ledger = new UsdmPurchaseLedger(store);
  const complete = (q = quote) => completeUsdmPurchase(ports, ledger, q, timing);
  return { ports, ledger, store, complete };
}
test('a complete purchase creates receive before paying, with durable stages and approval audit', async () => {
  const s = setup();
  await expect(s.complete()).resolves.toEqual({ status: 'delivered', assetAmount: quote.assetAmount });
  expect(s.ports.createRgbReceiveInvoice.mock.invocationCallOrder[0]).toBeLessThan(s.ports.payInvoice.mock.invocationCallOrder[0]);
  expect((await s.ledger.get(hash))?.stage).toBe('delivered');
  expect(s.store.save).toHaveBeenCalledWith([expect.objectContaining({ stage: 'paying', approvedAt: 1000, rgbInvoice: 'rgb:receive' })]);
});
test('concurrent completions share payment, receive creation and claim', async () => {
  const s = setup(); await Promise.all([s.complete(), s.complete(), s.complete()]);
  expect(s.ports.payInvoice).toHaveBeenCalledTimes(1);
  expect(s.ports.createRgbReceiveInvoice).toHaveBeenCalledTimes(1);
  expect(s.ports.claim).toHaveBeenCalledTimes(1);
});
test('expired quote never pays', async () => { const s = setup(); await expect(s.complete({ ...quote, expiresAt: 1 })).resolves.toEqual({ status: 'quote-expired' }); expect(s.ports.payInvoice).not.toHaveBeenCalled(); });
test('receive failure and persistence failure happen before submission', async () => {
  const s = setup(); s.ports.createRgbReceiveInvoice.mockRejectedValueOnce(new Error('receive failed'));
  await expect(s.complete()).rejects.toThrow(); expect(s.ports.payInvoice).not.toHaveBeenCalled();
  (s.store.save as jest.Mock).mockRejectedValueOnce(new Error('disk'));
  await expect(s.complete()).rejects.toThrow(); expect(s.ports.payInvoice).not.toHaveBeenCalled();
});
test('wrong decoded hash, amount or missing decoder result never pays', async () => {
  for (const patch of [{ paymentHash: 'b'.repeat(64) }, { amountMsat: 1 }, { assetId: 'rgb:unexpected' }]) {
    const s = setup(); s.ports.decodeInvoice.mockResolvedValue({ paymentHash: hash, amountMsat: 1000000, payeePubkey: null, assetId: null, assetAmount: null, ...patch } as never);
    await expect(s.complete()).resolves.toEqual({ status: 'invoice-mismatch' }); expect(s.ports.payInvoice).not.toHaveBeenCalled();
  }
});
test.each([null, 'b'.repeat(64)])('wrong returned hash %s stops before polling or claim', async (paymentHash) => {
  const s = setup(); s.ports.payInvoice.mockResolvedValue({ paymentHash });
  await expect(s.complete()).resolves.toEqual({ status: 'invoice-mismatch' });
  expect(s.ports.checkPayment).not.toHaveBeenCalled(); expect(s.ports.claim).not.toHaveBeenCalled();
  await s.complete(); expect(s.ports.payInvoice).toHaveBeenCalledTimes(1);
});
test('a fresh ledger resumes a paid order without another payment or receive invoice', async () => {
  const s = setup(); s.ports.claim.mockRejectedValue(new Error('offline'));
  await expect(s.complete()).resolves.toMatchObject({ status: 'claim-pending' });
  s.ports.claim.mockResolvedValue({ paymentHash: hash, assetId: quote.assetId, assetAmount: quote.assetAmount, status: 'delivered' });
  const fresh = new UsdmPurchaseLedger(s.store);
  await expect(completeUsdmPurchase(s.ports, fresh, quote, timing)).resolves.toMatchObject({ status: 'delivered' });
  expect(s.ports.payInvoice).toHaveBeenCalledTimes(1); expect(s.ports.createRgbReceiveInvoice).toHaveBeenCalledTimes(1);
  expect(s.ports.claim).toHaveBeenLastCalledWith({ paymentHash: hash, rgbInvoice: 'rgb:receive' });
});
test('crash at the durable paying marker never resubmits', async () => {
  const s = setup(); await s.ledger.save({ quote, rgbInvoice: 'rgb:receive', recipientId: 'utxob:receiver', stage: 'paying', approvedAt: 1, updatedAt: 1 });
  await completeUsdmPurchase(s.ports, new UsdmPurchaseLedger(s.store), quote, timing);
  expect(s.ports.payInvoice).not.toHaveBeenCalled();
});
test('terminal failure retains its hash and cannot be paid again', async () => {
  const s = setup(); s.ports.payInvoice.mockRejectedValue(new PaymentValidationError('insufficient'));
  await expect(s.complete()).resolves.toEqual({ status: 'payment-failed' }); await s.complete();
  expect(s.ports.payInvoice).toHaveBeenCalledTimes(1); expect((await s.ledger.get(hash))?.stage).toBe('failed');
});
test.each(['paymentHash', 'assetId', 'assetAmount'])('wrong claim %s is terminal', async (field) => {
  const s = setup(); s.ports.claim.mockResolvedValue({ paymentHash: hash, assetId: quote.assetId, assetAmount: quote.assetAmount, status: 'delivered', [field]: field === 'assetAmount' ? 7 : 'wrong' } as never);
  await expect(s.complete()).resolves.toEqual({ status: 'invoice-mismatch' }); await s.complete(); expect(s.ports.claim).toHaveBeenCalledTimes(1);
});
test('LSP delivery remains receiving until the local recipient transfer settles', async () => {
  const s = setup(); s.ports.verifyDelivery.mockResolvedValueOnce(false);
  await expect(s.complete()).resolves.toEqual({ status: 'receiving' });
  await expect(s.complete()).resolves.toMatchObject({ status: 'delivered' }); expect(s.ports.claim).toHaveBeenCalledTimes(1);
});
test('transport submission failure is ambiguous and restart only queries', async () => {
  const s = setup(); s.ports.payInvoice.mockRejectedValueOnce(new Error('transport'));
  await expect(s.complete()).resolves.toEqual({ status: 'payment-pending' });
  await completeUsdmPurchase(s.ports, new UsdmPurchaseLedger(s.store), quote, timing); expect(s.ports.payInvoice).toHaveBeenCalledTimes(1);
});
test.each([401, 404, 409, 502])('claim HTTP %s never causes another payment', async (status) => {
  const s = setup(); s.ports.claim.mockRejectedValue(new MetevoLspError('/metevo/claim', status, 'test'));
  await expect(s.complete()).resolves.toMatchObject({ status: 'claim-pending' }); await s.complete(); expect(s.ports.payInvoice).toHaveBeenCalledTimes(1);
});
test('quotes reject missing asset, fractional USD, and inconsistent sats/rate/msats', async () => {
  const s = setup(); await expect(quoteUsdmPurchase(s.ports, 1, null)).rejects.toThrow(); await expect(quoteUsdmPurchase(s.ports, 1.5, quote.assetId)).rejects.toThrow();
  for (const patch of [{ amountMsat: 7 }, { satsPerUsd: 7 }, { assetId: '' }]) {
    s.ports.buy.mockResolvedValueOnce({ ...quote, expiresAt: 100, amountMsat: 1000000, ...patch });
    await expect(quoteUsdmPurchase(s.ports, 1, quote.assetId)).rejects.toThrow();
  }
});
test('delivered stage cannot regress', async () => { const s = setup(); await s.complete(); const order = (await s.ledger.get(hash))!; await expect(s.ledger.save({ ...order, stage: 'paid' })).rejects.toThrow('regression'); });

test('failure to persist a post-submit transition resumes from the durable marker', async () => {
  const s = setup(); const save = s.store.save;
  s.store.save = async (rows) => { if (rows[0].submittedHash) throw new Error('storage failed after submit'); await save(rows); };
  await expect(s.complete()).rejects.toThrow();
  s.store.save = save;
  await completeUsdmPurchase(s.ports, new UsdmPurchaseLedger(s.store), quote, timing);
  expect(s.ports.payInvoice).toHaveBeenCalledTimes(1);
});
test('missing decoding support never submits', async () => {
  const s = setup(); s.ports.decodeInvoice.mockResolvedValueOnce(null as never);
  await expect(s.complete()).resolves.toEqual({ status: 'invoice-mismatch' });
  expect(s.ports.payInvoice).not.toHaveBeenCalled();
});
