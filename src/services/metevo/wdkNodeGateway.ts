import { ENV } from '../../config/env';
import { walletConfigFromDevice } from './deviceConfig';
import { assertPayableInvoice, getPaymentStatus } from './paymentGuard';
import type {
  WalletProgressListener,
  WalletSessionGateway,
  WalletSessionSnapshot,
} from './wallet-gateway';

type WdkServiceModule = typeof import('./wallet');
type SecureStoreModule = typeof import('./secure-store');
type MnemonicModule = typeof import('./mnemonic');
type DeviceConfigModule = typeof import('./deviceConfig');

const CHANNEL_POLL_INTERVAL_MS = 2_000;

/**
 * The in-process WDK gateway: drives the wallet module directly from the
 * host JS runtime (Node tooling and scripts). It lives OUTSIDE the React
 * Native app bundle - on device the WDK binding resolves to a Node-only
 * entry, so the app uses the Bare worklet gateway instead. The WDK module
 * is required lazily here so jest suites never execute it.
 */
export function createWdkWalletSessionGateway(): WalletSessionGateway {
  let wallet: import('./wallet').MetevoWallet | null = null;
  let usdmAssetId: string | null = null;
  let deviceConfig: import('./deviceConfig').DeviceWalletConfig | null = null;

  const loadSecureStore = (): SecureStoreModule => require('./secure-store');
  const loadWdkService = (): WdkServiceModule => require('./wallet');
  const loadMnemonicSource = (): MnemonicModule => require('./mnemonic');
  const loadDeviceConfig = (): DeviceConfigModule => require('./deviceConfig');

  /** Fails fast (before the biometric prompt) when setup is impossible. */
  async function ensureDeviceConfig() {
    deviceConfig ??= await loadDeviceConfig().loadDeviceWalletConfig();
    return deviceConfig;
  }

  return {
    async listWallets() {
      return loadSecureStore().listWallets();
    },
    async hasStoredWallet() {
      const secureStore = loadSecureStore();
      return secureStore.walletExistsOnDevice();
    },
    async createWallet(name) {
      return loadSecureStore().createWalletEntry(
        name,
        () => loadMnemonicSource().generateMnemonicWithDeviceEntropy(),
      );
    },
    async openWallet(walletId: string, onProgress: WalletProgressListener) {
      const { createMetevoWallet, findAssetIdByTicker, getMetevoWalletStatus } =
        loadWdkService();
      const secureStore = loadSecureStore();

      onProgress('opening-node', 'Opening…');
      const device = await ensureDeviceConfig();
      // Hardening rule: reading the stored seed requires a fresh biometric
      // unlock, strictly before the secure store is touched.
      await secureStore.authenticateToAccessSecrets('Open your METEVO wallet');
      const mnemonic = await secureStore.readWalletMnemonicById(walletId);
      if (mnemonic === null) {
        throw new Error('no wallet seed is stored on this device');
      }
      wallet = await createMetevoWallet(mnemonic, walletConfigFromDevice(device));

      onProgress('connecting-lsp', 'Connecting to the METEVO LSP…');
      usdmAssetId = await findAssetIdByTicker(wallet.account);
      if (device.lspPeerUri) {
        await connectLspPeer(wallet.account, device.lspPeerUri);
      }
      await waitFor(CHANNEL_POLL_INTERVAL_MS);

      onProgress('provisioning-channel', 'Opening your USDm channel…');
      // The LSP provisions channels on a cron, so the wait is best-effort:
      // timing out here is not an error - the home shell opens and keeps
      // polling the wallet status until the channel is usable.
      const deadline = Date.now() + ENV.EXPO_PUBLIC_CHANNEL_PROVISION_TIMEOUT_MS;
      let status = await getMetevoWalletStatus(wallet.account, usdmAssetId);
      while (!status.usdmChannelReady && Date.now() < deadline) {
        await waitFor(CHANNEL_POLL_INTERVAL_MS);
        status = await getMetevoWalletStatus(wallet.account, usdmAssetId);
      }
      onProgress('ready', 'Wallet connected');
    },
    async readStatus(): Promise<WalletSessionSnapshot> {
      if (wallet === null) {
        return {
          nodePubkey: null,
          btcSpendableSat: 0,
          balanceUsdmBaseUnits: null,
          channelReady: false,
        };
      }
      const { getMetevoWalletStatus } = loadWdkService();
      const status = await getMetevoWalletStatus(wallet.account, usdmAssetId);
      return {
        nodePubkey: status.pubkey,
        btcSpendableSat: status.btcSpendableSat,
        balanceUsdmBaseUnits: status.usdmBaseUnits,
        channelReady: status.usdmChannelReady,
      };
    },
    async submitPayment(proposal) {
      if (wallet === null) {
        throw new Error('the wallet is not open');
      }
      // Real-node boundary: even a clearly-marked demo proposal must fail
      // validation here instead of reaching sendPayment.
      assertPayableInvoice(proposal.invoice);
      const response = (await wallet.account.sendPayment({
        invoice: proposal.invoice,
      })) as Record<string, unknown>;
      const paymentHash = String(response?.payment_hash ?? response?.paymentHash ?? '');
      return { paymentHash: paymentHash.length > 0 ? paymentHash : null };
    },
    async refreshTransfers() {
      if (wallet === null) {
        return [];
      }
      const { refreshWalletTransfers } = loadWdkService();
      return refreshWalletTransfers(wallet.account, usdmAssetId);
    },
    async createUsdmInvoice(amountBaseUnits) {
      if (wallet === null) {
        throw new Error('the wallet is not open');
      }
      const { createUsdmLightningInvoice } = loadWdkService();
      return createUsdmLightningInvoice(wallet.account, usdmAssetId, amountBaseUnits);
    },
    async hasUsableChannelWith(peerPubkey) {
      if (wallet === null) {
        return false;
      }
      const { hasUsableChannelWith } = loadWdkService();
      return hasUsableChannelWith(wallet.account, peerPubkey);
    },
    async connectPeer(peerUri) {
      if (wallet === null) {
        throw new Error('the wallet is not open');
      }
      await wallet.account.connectPeer(peerUri);
    },
    async checkPayment(paymentHash) {
      if (wallet === null) {
        return 'unknown';
      }
      return getPaymentStatus(wallet.account, paymentHash);
    },
    async shutdown() {
      if (wallet !== null) {
        const { shutdownMetevoWallet } = loadWdkService();
        await shutdownMetevoWallet(wallet);
        wallet = null;
      }
    },
  };
}

/**
 * The regtest flow script connects the LSP peer explicitly before the LSP's
 * cron provisions the channel; do the same when a peer URI is provisioned.
 * The call is optional on the beta module surface, so a missing method
 * skips the step instead of breaking the open flow.
 */
async function connectLspPeer(
  account: unknown,
  peerUri: string,
): Promise<void> {
  const connectable = account as {
    connectPeer?: (uri: string) => Promise<unknown>;
  };
  if (typeof connectable.connectPeer !== 'function') {
    return;
  }
  await connectable.connectPeer(peerUri);
}

function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
