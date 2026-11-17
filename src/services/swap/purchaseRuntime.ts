import type { WalletSession } from '../../hooks/useWalletSession';
import { ENV } from '../../config/env';
import { PaymentValidationError } from '../metevo/paymentGuard';
import { RlnApiError } from '../metevo/rlnRestClient';
import { loadRelayClient } from '../metevo/relayClient';
import { purchaseLedgerFor } from './purchaseStore';
import { completeUsdmPurchase, UsdmPurchasePorts } from './usdmPurchase';

export function purchaseRuntime(session: () => WalletSession, nodePubkey: string) {
  if (!nodePubkey || ENV.EXPO_PUBLIC_WALLET_MODE === 'mock') throw new Error('a real wallet is required');
  const ledger = purchaseLedgerFor(`${ENV.EXPO_PUBLIC_WALLET_MODE}.${ENV.EXPO_PUBLIC_NETWORK_TARGET}.${nodePubkey}`);
  let client: ReturnType<typeof loadRelayClient> | undefined;
  const lsp = () => { client ??= loadRelayClient().catch((error) => { client = undefined; throw error; }); return client; };
  const wallet = () => {
    const value = session();
    if (value.wallet?.nodePubkey !== nodePubkey || value.connection !== 'online') throw new PaymentValidationError('the purchase wallet is not connected');
    return value;
  };
  const ports: UsdmPurchasePorts = {
    buy: async (amount) => { wallet(); return (await lsp()).buy(amount); },
    claim: async (params) => { wallet(); return (await lsp()).claim(params); },
    decodeInvoice: (invoice) => wallet().decodeInvoice(invoice),
    async payInvoice(invoice) {
      try { return await wallet().submitPayment({ invoice }); }
      catch (error) {
        // These node errors explicitly reject submission; transport errors stay ambiguous.
        if (error instanceof RlnApiError && ['InsufficientFunds', 'InsufficientBalance', 'InvalidInvoice', 'NotUnlocked'].includes(error.errorName)) throw new PaymentValidationError('the node rejected the payment before submission');
        throw error;
      }
    },
    checkPayment: (hash) => wallet().checkPayment(hash),
    createRgbReceiveInvoice: (asset, amount) => wallet().createRgbReceiveInvoice(asset, amount),
    async verifyDelivery(recipientId, assetId, amount) {
      const current = wallet();
      if (current.wallet?.usdmAssetId !== assetId) return false;
      const transfers = await current.refreshTransfers();
      return transfers.some((t) => t.recipientId === recipientId && t.status.toLowerCase() === 'settled' && t.amount === amount && /receive/i.test(t.kind));
    },
    now: Date.now, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
  return { ledger, ports };
}
export async function resumePurchaseOrders(runtime: ReturnType<typeof purchaseRuntime>): Promise<void> {
  // Recovery never submits prepared orders: they return to the review screen.
  for (const order of await runtime.ledger.list()) {
    if (['paying', 'paid', 'claiming', 'receiving'].includes(order.stage)) await completeUsdmPurchase(runtime.ports, runtime.ledger, order.quote);
  }
}
