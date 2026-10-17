import * as FileSystem from 'expo-file-system/legacy';

import { ENV } from '../../config/env';

/**
 * Setup flow stages in the design's order (section 29): the node is
 * created and unlocked, then it connects to the LSP as a peer, and the
 * LSP provisions the USDm channel for the connected peer.
 */
export type WalletSetupStep =
  | 'idle'
  | 'creating-secret'
  | 'opening-node'
  | 'connecting-lsp'
  | 'provisioning-channel'
  | 'ready';

export interface WalletSessionSnapshot {
  nodePubkey: string | null;
  btcSpendableSat: number;
  balanceUsdmBaseUnits: number | null;
  channelReady: boolean;
}

export type WalletProgressListener = (step: WalletSetupStep, message: string) => void;

/**
 * A payment proposal ready for one-shot submission. The payable invoice is
 * produced by the resolver/wallet contract; the mockup's demo proposal
 * carries a clearly-marked fake invoice and never reaches a real node.
 */
export interface PaymentProposal {
  invoice: string;
}

export interface SubmittedPayment {
  /** Trackable payment hash; null when the node did not report one. */
  paymentHash: string | null;
}

/**
 * Network settlement status per the design rules: pending is not success,
 * failed requires a confirmed failure, and a timeout after possible
 * submission is unknown - never guessed.
 */
export type PaymentNetworkStatus = 'pending' | 'settled' | 'failed' | 'unknown';

export interface WalletSessionGateway {
  /** Generate the seed, gate it behind device biometrics and store it. */
  createWallet(): Promise<void>;
  /** Unlock the node, connect to the LSP and wait for channel provisioning. */
  openWallet(onProgress: WalletProgressListener): Promise<void>;
  readStatus(): Promise<WalletSessionSnapshot>;
  /** Submit the proposal exactly once; the caller owns confirmation UX. */
  submitPayment(proposal: PaymentProposal): Promise<SubmittedPayment>;
  /** Query an existing payment; never creates a replacement payment. */
  checkPayment(paymentHash: string): Promise<PaymentNetworkStatus>;
  shutdown(): Promise<void>;
}

/** Fixed demo values so mock-mode screens show the design's example data. */
const MOCK_NODE_PUBKEY =
  '020000000000000000000000000000000000000000000000000000000000000001';
const MOCK_BALANCE_USDM_BASE_UNITS = 2_000_000_000; // 20.00 USDm at precision 8

const MOCK_STEP_DELAY_MS = 700;
const MOCK_PAYMENT_HASH =
  'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0';
/** The mock settles on the second status check, so demos show both states. */
const MOCK_SETTLE_AFTER_CHECKS = 2;

function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMockWalletSessionGateway(): WalletSessionGateway {
  let created = false;
  let opened = false;
  let submittedHash: string | null = null;
  let checkCount = 0;

  return {
    async createWallet() {
      await waitFor(MOCK_STEP_DELAY_MS);
      created = true;
    },
    async openWallet(onProgress) {
      if (!created) {
        throw new Error('no wallet was created on this device');
      }
      onProgress('opening-node', 'Opening…');
      await waitFor(MOCK_STEP_DELAY_MS);
      onProgress('connecting-lsp', 'Connecting to the METEVO LSP…');
      await waitFor(MOCK_STEP_DELAY_MS);
      onProgress('provisioning-channel', 'Opening your USDm channel…');
      await waitFor(MOCK_STEP_DELAY_MS * 2);
      opened = true;
      onProgress('ready', 'Wallet connected');
    },
    async readStatus() {
      return {
        nodePubkey: opened ? MOCK_NODE_PUBKEY : null,
        btcSpendableSat: opened ? 0 : 0,
        balanceUsdmBaseUnits: opened ? MOCK_BALANCE_USDM_BASE_UNITS : null,
        channelReady: opened,
      };
    },
    async submitPayment() {
      await waitFor(MOCK_STEP_DELAY_MS);
      submittedHash = MOCK_PAYMENT_HASH;
      checkCount = 0;
      return { paymentHash: submittedHash };
    },
    async checkPayment(paymentHash) {
      if (submittedHash === null || paymentHash !== submittedHash) {
        return 'unknown';
      }
      checkCount += 1;
      return checkCount >= MOCK_SETTLE_AFTER_CHECKS ? 'settled' : 'pending';
    },
    async shutdown() {
      opened = false;
    },
  };
}

type WdkServiceModule = typeof import('./wallet');
type SecureStoreModule = typeof import('./secure-store');
type MnemonicModule = typeof import('./mnemonic');

const CHANNEL_POLL_INTERVAL_MS = 2_000;

/**
 * Real mode drives the prepared WDK service functions. The native
 * `@utexo/wdk-rgb-lightning` module and the ESM-only BIP-39 source are
 * required lazily inside this module: mock mode (Expo Go) and the unit
 * tests never execute them. Debug APK builds include the native module
 * and can run `EXPO_PUBLIC_WALLET_MODE=wdk`.
 */
function createWdkWalletSessionGateway(): WalletSessionGateway {
  let wallet: import('./wallet').MetevoWallet | null = null;
  let usdmAssetId: string | null = null;

  const loadSecureStore = (): SecureStoreModule => require('./secure-store');
  const loadWdkService = (): WdkServiceModule => require('./wallet');
  const loadMnemonicSource = (): MnemonicModule => require('./mnemonic');

  function walletDataDirectory(): string {
    const base =
      FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
    return `${base}wdk-wallet`;
  }

  function walletConfig(): import('./wallet').MetevoWalletConfig {
    return {
      network: ENV.EXPO_PUBLIC_WALLET_NETWORK,
      dataDir: walletDataDirectory(),
      lspBaseUrl: ENV.METEVO_LSP_URL,
      lspBearerToken: ENV.METEVO_LSP_BEARER_TOKEN,
      bitcoindRpcHost: ENV.EXPO_PUBLIC_BITCOIND_RPC_HOST,
      bitcoindRpcPort: ENV.EXPO_PUBLIC_BITCOIND_RPC_PORT,
      bitcoindRpcUsername: ENV.EXPO_PUBLIC_BITCOIND_RPC_USERNAME ?? '',
      bitcoindRpcPassword: ENV.EXPO_PUBLIC_BITCOIND_RPC_PASSWORD ?? '',
      indexerUrl: ENV.EXPO_PUBLIC_RGB_INDEXER_URL ?? '',
      proxyEndpoint: ENV.EXPO_PUBLIC_RGB_PROXY_ENDPOINT ?? '',
    };
  }

  return {
    async createWallet() {
      const secureStore = loadSecureStore();
      if (await secureStore.walletExistsOnDevice()) {
        throw new Error('a wallet already exists on this device');
      }
      await secureStore.createWalletSecurely(
        () => loadMnemonicSource().generateMnemonicWithDeviceEntropy(),
      );
    },
    async openWallet(onProgress) {
      const { createMetevoWallet, findAssetIdByTicker, getMetevoWalletStatus } =
        loadWdkService();
      const secureStore = loadSecureStore();

      onProgress('opening-node', 'Opening…');
      // Hardening rule: reading the stored seed requires a fresh biometric
      // unlock, strictly before the secure store is touched.
      await secureStore.authenticateToAccessSecrets('Open your METEVO wallet');
      const mnemonic = await secureStore.readWalletMnemonic();
      if (mnemonic === null) {
        throw new Error('no wallet seed is stored on this device');
      }
      wallet = await createMetevoWallet(mnemonic, walletConfig());

      onProgress('connecting-lsp', 'Connecting to the METEVO LSP…');
      usdmAssetId = await findAssetIdByTicker(wallet.account);
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
    async readStatus() {
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
      const response = (await wallet.account.sendPayment({
        invoice: proposal.invoice,
      })) as Record<string, unknown>;
      const paymentHash = String(response?.payment_hash ?? response?.paymentHash ?? '');
      return { paymentHash: paymentHash.length > 0 ? paymentHash : null };
    },
    async checkPayment(paymentHash) {
      if (wallet === null || paymentHash.length === 0) {
        return 'unknown';
      }
      await wallet.account.sync();
      const payments = (await wallet.account.listPayments()) as unknown;
      const list = Array.isArray(payments) ? payments : (payments as Record<string, unknown>)?.payments;
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

export function createWalletSessionGateway(): WalletSessionGateway {
  if (ENV.EXPO_PUBLIC_WALLET_MODE === 'wdk') {
    return createWdkWalletSessionGateway();
  }
  return createMockWalletSessionGateway();
}
