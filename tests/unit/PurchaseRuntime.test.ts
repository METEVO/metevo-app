import { PurchaseOrder, UsdmPurchaseLedger } from '../../src/services/swap/usdmPurchase';
import type { WalletSession } from '../../src/hooks/useWalletSession';

let mockRows: PurchaseOrder[] = [];
let mockLedger: UsdmPurchaseLedger;
const mockClaim = jest.fn(async () => ({
  paymentHash: 'a'.repeat(64), assetId: 'rgb:usdm', assetAmount: 100000000, status: 'delivered',
}));
jest.mock('../../src/config/env', () => ({
  ENV: {
    EXPO_PUBLIC_WALLET_MODE: 'remote',
    EXPO_PUBLIC_NETWORK_TARGET: 'regtest',
    EXPO_PUBLIC_REAL_USDM_PURCHASE: false,
  },
}));
jest.mock('../../src/services/swap/purchaseStore', () => ({ purchaseLedgerFor: () => mockLedger }));
jest.mock('../../src/services/metevo/relayClient', () => ({ loadRelayClient: async () => ({ claim: mockClaim }) }));
import { purchaseRuntime, resumePurchaseOrders } from '../../src/services/swap/purchaseRuntime';

const quote = {
  paymentHash: 'a'.repeat(64), invoice: 'lnbcrt1test', sats: 1000, usdAmount: 1,
  assetId: 'rgb:usdm', assetAmount: 100000000, satsPerUsd: 1000, expiresAt: 100000,
};
const transfer = {
  transferId: '1', recipientId: 'receiver', kind: 'ReceiveWitness',
  status: 'Settled', amount: 100000000,
};

beforeEach(() => {
  mockRows = [{
    quote, rgbInvoice: 'rgb:invoice', recipientId: 'receiver',
    stage: 'paid', approvedAt: 1, updatedAt: 1,
  }];
  mockLedger = new UsdmPurchaseLedger({
    load: async () => mockRows,
    save: async (rows) => { mockRows = rows; },
  });
  mockClaim.mockClear();
});

function setup() {
  const submitPayment = jest.fn();
  const refreshTransfers = jest.fn(async () => [transfer]);
  let session = {
    wallet: { nodePubkey: 'node', usdmAssetId: 'rgb:usdm' },
    connection: 'online', refreshTransfers, submitPayment,
  } as unknown as WalletSession;
  return {
    runtime: purchaseRuntime(() => session, 'node'), submitPayment, refreshTransfers,
    replaceSession(patch: Partial<WalletSession>) { session = { ...session, ...patch }; },
  };
}

test('startup recovery works with new purchases disabled and never submits prepared orders', async () => {
  const prepared: PurchaseOrder = {
    quote: { ...quote, paymentHash: 'b'.repeat(64) }, rgbInvoice: 'rgb:other',
    recipientId: 'other', stage: 'prepared', approvedAt: 1, updatedAt: 1,
  };
  mockRows.push(prepared);
  const { runtime, submitPayment } = setup();
  await resumePurchaseOrders(runtime);
  expect((await runtime.ledger.get(quote.paymentHash))?.stage).toBe('delivered');
  expect(await runtime.ledger.get(prepared.quote.paymentHash)).toEqual(prepared);
  expect(submitPayment).not.toHaveBeenCalled();
  expect(mockClaim).toHaveBeenCalledTimes(1);
  expect(mockClaim).toHaveBeenCalledWith({ paymentHash: quote.paymentHash, rgbInvoice: 'rgb:invoice' });
});

test.each([
  { recipientId: 'unrelated' }, { status: 'WaitingCounterparty' },
  { amount: 1 }, { kind: 'Send' },
])('recovery waits for the exact settled local receive transfer: %j', async (patch) => {
  const { runtime, refreshTransfers, submitPayment } = setup();
  refreshTransfers.mockResolvedValue([{ ...transfer, ...patch }]);
  await resumePurchaseOrders(runtime);
  expect((await runtime.ledger.get(quote.paymentHash))?.stage).toBe('receiving');
  refreshTransfers.mockResolvedValue([transfer]);
  await resumePurchaseOrders(runtime);
  expect((await runtime.ledger.get(quote.paymentHash))?.stage).toBe('delivered');
  expect(mockClaim).toHaveBeenCalledTimes(1);
  expect(submitPayment).not.toHaveBeenCalled();
});

test('a different local asset cannot mark the purchase as delivered', async () => {
  const { runtime, replaceSession } = setup();
  replaceSession({ wallet: { nodePubkey: 'node', usdmAssetId: 'rgb:other' } as WalletSession['wallet'] });
  await resumePurchaseOrders(runtime);
  expect((await runtime.ledger.get(quote.paymentHash))?.stage).toBe('receiving');
});

test.each([
  { wallet: { nodePubkey: 'different-wallet' } }, { connection: 'offline' },
])('a changed or disconnected wallet cannot submit a payment: %j', async (patch) => {
  const { runtime, replaceSession, submitPayment } = setup();
  replaceSession(patch as Partial<WalletSession>);
  await expect(runtime.ports.payInvoice(quote.invoice)).rejects.toThrow('not connected');
  expect(submitPayment).not.toHaveBeenCalled();
});
