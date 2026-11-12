let mockValues: Record<string, string> = {};
let mockFailHead = false;
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'unlocked',
  getItemAsync: async (key: string) => mockValues[key] ?? null,
  setItemAsync: async (key: string, value: string) => {
    if (mockFailHead && key.endsWith('.head')) throw new Error('storage');
    if (value.length > 1500) throw new Error('value too large'); mockValues[key] = value;
  },
  deleteItemAsync: async (key: string) => { delete mockValues[key]; },
}));
import { createPurchaseStore } from '../../src/services/swap/purchaseStore';
import { PurchaseOrder } from '../../src/services/swap/usdmPurchase';
const order: PurchaseOrder = {
  quote: { paymentHash: 'a'.repeat(64), invoice: 'lnbcrt1' + 'a'.repeat(3000), sats: 1000, usdAmount: 1, assetId: 'rgb:usdm', assetAmount: 100000000, satsPerUsd: 1000, expiresAt: 100000 },
  rgbInvoice: 'rgb:' + 'b'.repeat(2000), recipientId: 'recipient', stage: 'paid', approvedAt: 1, updatedAt: 2,
};
beforeEach(() => { mockValues = {}; mockFailHead = false; });
test('large encrypted records survive a new store instance without exceeding chunk limits', async () => {
  await createPurchaseStore('wallet1').save([order]);
  await expect(createPurchaseStore('wallet1').load()).resolves.toEqual([order]);
  await expect(createPurchaseStore('wallet2').load()).resolves.toEqual([]);
});
test('an interrupted snapshot leaves the previous durable head readable', async () => {
  const store = createPurchaseStore('wallet'); await store.save([order]); mockFailHead = true;
  await expect(store.save([{ ...order, stage: 'claiming' }])).rejects.toThrow();
  await expect(createPurchaseStore('wallet').load()).resolves.toEqual([order]);
});
test('missing chunks fail closed instead of treating the ledger as empty', async () => {
  await createPurchaseStore('wallet').save([order]);
  const key = Object.keys(mockValues).find((key) => key.endsWith('.0'))!; delete mockValues[key];
  await expect(createPurchaseStore('wallet').load()).rejects.toThrow('incomplete');
});
