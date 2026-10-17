import { entropyToMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import * as FileSystem from 'expo-file-system/legacy';
import { getRandomValues } from 'expo-crypto';

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

export interface WalletSessionGateway {
  /** Generate the seed, gate it behind device biometrics and store it. */
  createWallet(): Promise<void>;
  /** Unlock the node, connect to the LSP and wait for channel provisioning. */
  openWallet(onProgress: WalletProgressListener): Promise<void>;
  readStatus(): Promise<WalletSessionSnapshot>;
  shutdown(): Promise<void>;
}

/** Fixed demo values so mock-mode screens show the design's example data. */
const MOCK_NODE_PUBKEY =
  '020000000000000000000000000000000000000000000000000000000000000001';
const MOCK_BALANCE_USDM_BASE_UNITS = 2_000_000_000; // 20.00 USDm at precision 8

const MOCK_STEP_DELAY_MS = 700;

function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMockWalletSessionGateway(): WalletSessionGateway {
  let created = false;
  let opened = false;

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
    async shutdown() {
      opened = false;
    },
  };
}

type WdkServiceModule = typeof import('./wallet');
type SecureStoreModule = typeof import('./secure-store');

const CHANNEL_PROVISION_TIMEOUT_MS = 30_000;
const CHANNEL_POLL_INTERVAL_MS = 2_000;

/**
 * Real mode drives the prepared WDK service functions. The native
 * `@utexo/wdk-rgb-lightning` module is required lazily inside this module:
 * mock mode (Expo Go) never executes the require, so the missing native
 * module cannot crash the app there. Debug APK builds include the module
 * and can run `EXPO_PUBLIC_WALLET_MODE=wdk`.
 */
function createWdkWalletSessionGateway(): WalletSessionGateway {
  let wallet: import('./wallet').MetevoWallet | null = null;
  let usdmAssetId: string | null = null;

  const loadSecureStore = (): SecureStoreModule => require('./secure-store');
  const loadWdkService = (): WdkServiceModule => require('./wallet');

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
      await secureStore.createWalletSecurely(generateMnemonicWithDeviceEntropy);
    },
    async openWallet(onProgress) {
      const { createMetevoWallet, findAssetIdByTicker, getMetevoWalletStatus } =
        loadWdkService();
      const secureStore = loadSecureStore();

      onProgress('opening-node', 'Opening…');
      const mnemonic = await secureStore.readWalletMnemonic();
      if (mnemonic === null) {
        throw new Error('no wallet seed is stored on this device');
      }
      wallet = await createMetevoWallet(mnemonic, walletConfig());

      onProgress('connecting-lsp', 'Connecting to the METEVO LSP…');
      usdmAssetId = await findAssetIdByTicker(wallet.account);
      await waitFor(CHANNEL_POLL_INTERVAL_MS);

      onProgress('provisioning-channel', 'Opening your USDm channel…');
      const deadline = Date.now() + CHANNEL_PROVISION_TIMEOUT_MS;
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
    async shutdown() {
      if (wallet !== null) {
        const { shutdownMetevoWallet } = loadWdkService();
        await shutdownMetevoWallet(wallet);
        wallet = null;
      }
    },
  };
}

/** 256-bit BIP-39 mnemonic from the platform CSPRNG (expo-crypto). */
function generateMnemonicWithDeviceEntropy(): string {
  return entropyToMnemonic(getRandomValues(new Uint8Array(32)), wordlist);
}

export function createWalletSessionGateway(): WalletSessionGateway {
  if (ENV.EXPO_PUBLIC_WALLET_MODE === 'wdk') {
    return createWdkWalletSessionGateway();
  }
  return createMockWalletSessionGateway();
}
