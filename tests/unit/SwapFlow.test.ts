import { SwapFlow, SwapFlowPorts } from '../../src/services/swap/swapFlow';
import { PurchaseOrder, UsdmPurchaseLedger, UsdmPurchasePorts } from '../../src/services/swap/usdmPurchase';
const hash = 'a'.repeat(64);
function setup(enabled = true) {
  let rows: PurchaseOrder[] = [];
  const ledger = new UsdmPurchaseLedger({ load: async () => rows, save: async (next) => { rows = next; } });
  const purchase: UsdmPurchasePorts = {
    buy: jest.fn(async () => ({ paymentHash: hash, invoice: 'lnbcrt1test', sats: 1000, usdAmount: 1, assetId: 'rgb:usdm', assetAmount: 100000000, amountMsat: 1000000, satsPerUsd: 1000, expiresAt: 100 })),
    decodeInvoice: async () => ({ paymentHash: hash, amountMsat: 1000000, assetId: null, assetAmount: null, payeePubkey: null }),
    payInvoice: jest.fn(async () => ({ paymentHash: hash })), checkPayment: async () => 'settled',
    createRgbReceiveInvoice: async () => ({ invoice: 'rgb:receive', recipientId: 'receiver' }),
    claim: async () => ({ paymentHash: hash, assetId: 'rgb:usdm', assetAmount: 100000000, status: 'delivered' }),
    verifyDelivery: async () => true, now: () => 1000, sleep: async () => {},
  };
  const ports: SwapFlowPorts = { enabled: () => enabled, expectedAssetId: () => 'rgb:usdm', ledger: () => ledger, purchase, authorize: jest.fn(async () => {}), announce: jest.fn(), now: () => 1000 };
  const flow = new SwapFlow(ports, { draft: '1' });
  return { flow, ports, purchase, ledger };
}
test('disabled purchase never requests a quote or payment', async () => { const s = setup(false); await s.flow.review(); await s.flow.confirm(); expect(s.purchase.buy).not.toHaveBeenCalled(); expect(s.purchase.payInvoice).not.toHaveBeenCalled(); });
test('whole USD only; voice cannot execute without review and confirmation', async () => { const s = setup(); await s.flow.confirm(); expect(s.purchase.payInvoice).not.toHaveBeenCalled(); s.flow.setDraft('1.5'); await s.flow.review(); expect(s.purchase.buy).not.toHaveBeenCalled(); });
test('review shows real quote; concurrent confirmations pay once', async () => { const s = setup(); await s.flow.review(); expect(s.flow.getState()).toMatchObject({ stage: 'review', quote: { sats: 1000, usdAmount: 1 } }); await Promise.all([s.flow.confirm(), s.flow.confirm()]); expect(s.purchase.payInvoice).toHaveBeenCalledTimes(1); expect(s.flow.getState().stage).toBe('completed'); });
test('cancelled authorization and disposal while authorizing never submit', async () => {
  const s = setup(); await s.flow.review(); s.ports.authorize = async () => { throw new Error('cancel'); }; await s.flow.confirm(); expect(s.flow.getState().stage).toBe('review');
  let finish!: () => void; s.ports.authorize = () => new Promise((resolve) => { finish = resolve; }); const confirming = s.flow.confirm(); s.flow.dispose(); finish(); await confirming; expect(s.purchase.payInvoice).not.toHaveBeenCalled();
});
test('quote expiry after authorization never pays', async () => { const s = setup(); await s.flow.review(); s.ports.authorize = async () => { s.purchase.now = () => 200000; }; await s.flow.confirm(); expect(s.purchase.payInvoice).not.toHaveBeenCalled(); expect(s.flow.getState().stage).toBe('failed'); });
test('a pending purchase is restored and resumed without another payment', async () => {
  const s = setup(); s.purchase.verifyDelivery = async () => false;
  await s.flow.review(); await s.flow.confirm(); expect(s.flow.getState().stage).toBe('pending');
  const reopened = new SwapFlow(s.ports, { draft: '2' }); await reopened.restore(); expect(reopened.getState().stage).toBe('pending');
  s.purchase.verifyDelivery = async () => true; await reopened.resume(); expect(reopened.getState().stage).toBe('completed'); expect(s.purchase.payInvoice).toHaveBeenCalledTimes(1);
});
