import { ENV } from '../../config/env';
import { WalletConfigError } from './deviceConfig';
import { assertPayableInvoice, getPaymentStatus } from './paymentGuard';
import { loadRemoteNodeBearerToken } from './remoteNodeCredentials';
import {
  RlnChannel,
  RlnRestClient,
  RlnTransfer,
  createRlnRestClient,
} from './rlnRestClient';
import { authenticateToAccessSecrets } from './secure-store';
import type { TransferInfo } from './transferWatcher';
import type {
  StoredWalletMeta,
  WalletProgressListener,
  WalletSessionGateway,
  WalletSessionSnapshot,
} from './wallet-gateway';

/**
 * Wallet session backed by an rgb-lightning-node daemon over REST. The
 * node holds the keys, so the phone stores no seed: the single wallet entry
 * is the node itself. Swapping to the on-device node later is a gateway
 * selection change only (EXPO_PUBLIC_WALLET_MODE).
 */

export const REMOTE_WALLET_ID = 'remote-rln-node';
const DEFAULT_WALLET_NAME = 'Remote node';
const INVOICE_EXPIRY_SEC = 3600;
const CHANNEL_POLL_INTERVAL_MS = 2_000;

export interface RemoteRlnGatewayDependencies {
  createClient(): Promise<RlnRestClient>;
  authenticate(reason: string): Promise<void>;
  usdmTicker: string;
  pinnedUsdmAssetId: string | null;
  peerUri: string | null;
  channelWaitTimeoutMs: number;
  channelPollIntervalMs: number;
  wait(ms: number): Promise<void>;
}

const EMPTY_SNAPSHOT: WalletSessionSnapshot = {
  nodePubkey: null,
  btcSpendableSat: 0,
  balanceUsdmBaseUnits: null,
  channelReady: false,
};

export function createRemoteRlnWalletSessionGateway(
  dependencies: RemoteRlnGatewayDependencies = defaultDependencies(),
): WalletSessionGateway {
  let walletEntry: StoredWalletMeta = {
    id: REMOTE_WALLET_ID,
    name: DEFAULT_WALLET_NAME,
    createdAt: new Date().toISOString(),
  };
  let client: RlnRestClient | null = null;
  let usdmAssetId: string | null = null;

  function openClient(): RlnRestClient {
    if (client === null) {
      throw new Error('the wallet is not open');
    }
    return client;
  }

  function hasUsableUsdmChannel(channels: RlnChannel[]): boolean {
    return channels.some(
      (channel) => channel.is_usable && (usdmAssetId === null || channel.asset_id === usdmAssetId),
    );
  }

  async function waitForUsdmChannel(node: RlnRestClient): Promise<void> {
    const deadline = Date.now() + dependencies.channelWaitTimeoutMs;
    while (!hasUsableUsdmChannel(await node.listChannels()) && Date.now() < deadline) {
      await dependencies.wait(dependencies.channelPollIntervalMs);
    }
  }

  return {
    async listWallets() {
      return [walletEntry];
    },

    async hasStoredWallet() {
      return true;
    },

    async createWallet(name) {
      const trimmed = name.trim();
      walletEntry = { ...walletEntry, name: trimmed.length > 0 ? trimmed : DEFAULT_WALLET_NAME };
      return walletEntry;
    },

    async openWallet(walletId: string, onProgress: WalletProgressListener) {
      if (walletId !== REMOTE_WALLET_ID) {
        throw new Error('no wallet with that id exists on this device');
      }
      await dependencies.authenticate('Open your METEVO wallet');

      onProgress('opening-node', 'Opening…');
      const node = await dependencies.createClient();
      await node.nodeInfo();
      usdmAssetId =
        dependencies.pinnedUsdmAssetId ?? (await node.findNiaAssetIdByTicker(dependencies.usdmTicker));

      if (dependencies.peerUri !== null) {
        onProgress('connecting-lsp', 'Connecting to your payment peer…');
        await node.connectPeer(dependencies.peerUri);
      }

      // Best effort, as in the other gateways: the home shell keeps polling
      // and gates send/receive on channelReady.
      onProgress('provisioning-channel', 'Checking your USDm channel…');
      await waitForUsdmChannel(node);

      client = node;
      onProgress('ready', 'Wallet connected');
    },

    async readStatus() {
      if (client === null) {
        return EMPTY_SNAPSHOT;
      }
      const node = client;
      const [info, btc, channels, usdm] = await Promise.all([
        node.nodeInfo(),
        node.btcBalance(false),
        node.listChannels(),
        usdmAssetId === null ? Promise.resolve(null) : node.assetBalance(usdmAssetId),
      ]);
      return {
        nodePubkey: info.pubkey,
        btcSpendableSat: btc.vanilla.spendable,
        // Spendable over Lightning; the on-chain figure still counts the
        // allocation that funds the channel.
        balanceUsdmBaseUnits: usdm === null ? null : usdm.offchain_outbound,
        channelReady: hasUsableUsdmChannel(channels),
      };
    },

    async submitPayment(proposal) {
      assertPayableInvoice(proposal.invoice);
      const sent = await openClient().sendPayment(proposal.invoice);
      return { paymentHash: sent.paymentHash };
    },

    async checkPayment(paymentHash) {
      if (client === null) {
        return 'unknown';
      }
      const node = client;
      return getPaymentStatus(
        { sync: async () => undefined, listPayments: () => node.listPayments() },
        paymentHash,
      );
    },

    async refreshTransfers() {
      const node = openClient();
      if (usdmAssetId === null) {
        return [];
      }
      await node.refreshTransfers();
      return (await node.listTransfers(usdmAssetId)).map(toTransferInfo);
    },

    async createUsdmInvoice(amountBaseUnits) {
      const node = openClient();
      if (usdmAssetId === null) {
        throw new Error('the USDm asset is not known to this node');
      }
      const { rgb_htlc_min_msat: htlcMinimumMsat } = await node.nodeInfo();
      const invoice = await node.createLnInvoice({
        amtMsat: htlcMinimumMsat,
        expirySec: INVOICE_EXPIRY_SEC,
        assetId: usdmAssetId,
        assetAmount: amountBaseUnits,
      });
      return { invoice, paymentHash: await node.decodeLnInvoicePaymentHash(invoice) };
    },

    async hasUsableChannelWith(peerPubkey) {
      const target = peerPubkey.toLowerCase();
      return (await openClient().listChannels()).some(
        (channel) => channel.is_usable && channel.peer_pubkey.toLowerCase() === target,
      );
    },

    async connectPeer(peerUri) {
      await openClient().connectPeer(peerUri);
    },

    async shutdown() {
      client = null;
      usdmAssetId = null;
    },
  };
}

function toTransferInfo(transfer: RlnTransfer): TransferInfo {
  const fungible = transfer.assignments.find((assignment) => assignment.type === 'Fungible');
  return {
    transferId: String(transfer.idx),
    kind: transfer.kind,
    status: transfer.status,
    amount: typeof fungible?.value === 'number' ? fungible.value : null,
  };
}

function defaultDependencies(): RemoteRlnGatewayDependencies {
  return {
    async createClient() {
      const baseUrl = ENV.EXPO_PUBLIC_RLN_NODE_URL;
      if (baseUrl === undefined) {
        throw new WalletConfigError('EXPO_PUBLIC_RLN_NODE_URL is not set');
      }
      return createRlnRestClient({
        baseUrl,
        timeoutMs: ENV.EXPO_PUBLIC_RLN_REQUEST_TIMEOUT_MS,
        bearerToken: await loadRemoteNodeBearerToken(),
      });
    },
    // The remote node holds the keys and the phone stores no secret, so the
    // biometric prompt is opt-in (EXPO_PUBLIC_WALLET_AUTH), not the default.
    authenticate: ENV.EXPO_PUBLIC_WALLET_AUTH
      ? authenticateToAccessSecrets
      : async () => undefined,
    usdmTicker: ENV.EXPO_PUBLIC_RLN_USDM_TICKER,
    pinnedUsdmAssetId: ENV.EXPO_PUBLIC_RLN_USDM_ASSET_ID ?? null,
    peerUri: ENV.EXPO_PUBLIC_RLN_PEER_URI ?? null,
    channelWaitTimeoutMs: ENV.EXPO_PUBLIC_CHANNEL_PROVISION_TIMEOUT_MS,
    channelPollIntervalMs: CHANNEL_POLL_INTERVAL_MS,
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}
