import type {
  PaymentNetworkStatus,
  PaymentProposal,
  StoredWalletMeta,
  SubmittedPayment,
  WalletSessionGateway,
  WalletSessionSnapshot,
} from './wallet-gateway';
import type { DecodedInvoiceView } from './paymentGuard';
import type { TransferInfo } from './transferWatcher';
import { wasmCall } from './wasmBridge';

type WasmStatus = {
  nodePubkey: string | null;
  btcSpendableSat: number;
  balanceUsdmBaseUnits: number | null;
  channelReady: boolean;
};

const WALLET_ID = 'wasm-1';

/**
 * WalletSessionGateway over the on-device WASM RLN running in a WebView.
 * The node, keys and channel state live inside the WebView; this adapter is
 * only a typed RPC facade.
 */
export function createWasmWalletSessionGateway(): WalletSessionGateway {
  return {
    async listWallets(): Promise<StoredWalletMeta[]> {
      const has = await wasmCall<boolean>('hasWallet');
      return has
        ? [{ id: WALLET_ID, name: 'On-device wallet', createdAt: new Date(0).toISOString() }]
        : [];
    },

    async hasStoredWallet(): Promise<boolean> {
      return wasmCall<boolean>('hasWallet');
    },

    async createWallet(name: string): Promise<StoredWalletMeta> {
      await wasmCall('create');
      return { id: WALLET_ID, name, createdAt: new Date().toISOString() };
    },

    async openWallet(_walletId, onProgress): Promise<void> {
      onProgress('opening-node', 'Starting the on-device node');
      await wasmCall('open');
      onProgress('ready', 'Node ready');
    },

    async readStatus(): Promise<WalletSessionSnapshot> {
      const status = await wasmCall<WasmStatus>('status');
      return status;
    },

    async submitPayment(proposal: PaymentProposal): Promise<SubmittedPayment> {
      const result = await wasmCall<{ paymentHash: string | null }>('send', {
        invoice: proposal.invoice,
      });
      return result;
    },

    async decodeInvoice(invoice: string): Promise<DecodedInvoiceView> {
      return wasmCall<DecodedInvoiceView>('decode', { invoice });
    },

    async checkPayment(paymentHash: string): Promise<PaymentNetworkStatus> {
      return wasmCall<PaymentNetworkStatus>('check', { paymentHash });
    },

    async refreshTransfers(): Promise<TransferInfo[]> {
      return [];
    },

    async createUsdmInvoice(
      amountBaseUnits: number | null,
    ): Promise<{ invoice: string; paymentHash: string | null }> {
      return wasmCall<{ invoice: string; paymentHash: string | null }>('invoice', {
        amountBaseUnits,
      });
    },

    async hasUsableChannelWith(peerPubkey: string): Promise<boolean> {
      return wasmCall<boolean>('hasChannel', { peerPubkey });
    },

    async connectPeer(peerUri: string): Promise<void> {
      await wasmCall('connect', { peerUri });
    },

    async shutdown(): Promise<void> {
      await wasmCall('shutdown');
    },
  };
}
