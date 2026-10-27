import { ENV } from '../../config/env';
import { createBareWalletSessionGateway } from './bareGateway';
import { createRemoteRlnWalletSessionGateway } from './remoteRlnGateway';
import type { ReviewedPayment } from './paymentGuard';
import type { TransferInfo } from './transferWatcher';
import type { StoredWalletMeta } from './secure-store';

export type { StoredWalletMeta };

// Single source of truth lives in paymentGuard.ts (the worklet imports the
// same compiled module); re-exported here to keep the established import
// path.
export { PaymentValidationError } from './paymentGuard';
export type { ReviewedPayment } from './paymentGuard';

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
  /**
   * The payment the user reviewed. A gateway that can decode the invoice
   * refuses to submit when it does not match: the invoice may come from a
   * relay, never from the local intent alone.
   */
  expected?: ReviewedPayment;
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
  /** The named wallets stored on this device (metadata only, no seeds). */
  listWallets(): Promise<StoredWalletMeta[]>;
  /** Whether this device already holds at least one stored wallet seed. */
  hasStoredWallet(): Promise<boolean>;
  /** Generate a new seed behind device biometrics and store it by name. */
  createWallet(name: string): Promise<StoredWalletMeta>;
  /** Unlock the named wallet's node, connect to the LSP and wait for
   * channel provisioning. */
  openWallet(
    walletId: string,
    onProgress: WalletProgressListener,
  ): Promise<void>;
  readStatus(): Promise<WalletSessionSnapshot>;
  /** Submit the proposal exactly once; the caller owns confirmation UX. */
  submitPayment(proposal: PaymentProposal): Promise<SubmittedPayment>;
  /** Query an existing payment; never creates a replacement payment. */
  checkPayment(paymentHash: string): Promise<PaymentNetworkStatus>;
  /** Advance the WDK transfer state machine (refreshTransfers) and return
   * the current transfer list for the session asset (USDm). The settlement
   * watcher polls this until a watched transfer is Settled/Failed. */
  refreshTransfers(): Promise<TransferInfo[]>;
  /** Creates the receiver's USDm Lightning invoice (blind when the amount
   * is null). Serves the local-link receive flow and the relay answer. */
  createUsdmInvoice(
    amountBaseUnits: number | null,
  ): Promise<{ invoice: string; paymentHash: string | null }>;
  /** Whether a usable channel exists with exactly this peer (direct route). */
  hasUsableChannelWith(peerPubkey: string): Promise<boolean>;
  /** Opens the LDK peer session (pubkey@host:port) for a direct payment. */
  connectPeer(peerUri: string): Promise<void>;
  shutdown(): Promise<void>;
}

type SecureStoreModule = typeof import('./secure-store');

/** Deterministic demo pubkey; a freshly opened mock wallet is otherwise
 * empty (0 USDm, 0 sats, no transactions) like a real first-time wallet. */
const MOCK_NODE_PUBKEY =
  '020000000000000000000000000000000000000000000000000000000000000001';

const MOCK_STEP_DELAY_MS = 700;
const MOCK_PAYMENT_HASH =
  'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0';
/** The mock settles on the second status check, so demos show both states. */
const MOCK_SETTLE_AFTER_CHECKS = 2;
/** Demo peer the mock device shares a direct channel with. */
export const MOCK_DEMO_PEER_PUBKEY = `02${'ab'.repeat(32)}`;
const mockConnectedPeers = new Set<string>();

function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMockWalletSessionGateway(): WalletSessionGateway {
  const loadSecureStore = (): SecureStoreModule => require('./secure-store');
  const wallets: StoredWalletMeta[] = [];
  let opened = false;
  let submittedHash: string | null = null;
  let checkCount = 0;
  let transferRefreshCount = 0;
  let mockTransfers: TransferInfo[] = [];

  return {
    async listWallets() {
      return [...wallets];
    },
    async hasStoredWallet() {
      return wallets.length > 0;
    },
    async createWallet(name) {
      // Demo fidelity: run the real biometric prompt when the device has
      // enrolled credentials, without storing anything (mock mode never
      // touches the secure store).
      const secureStore = loadSecureStore();
      if (await secureStore.deviceSupportsBiometrics()) {
        await secureStore.authenticateToAccessSecrets('Set up your METEVO wallet');
      }
      await waitFor(MOCK_STEP_DELAY_MS);
      const entry: StoredWalletMeta = {
        id: `mock-${wallets.length + 1}`,
        name: name.trim().length > 0 ? name.trim() : 'Everyday wallet',
        createdAt: new Date().toISOString(),
      };
      wallets.push(entry);
      return entry;
    },
    async openWallet(walletId, onProgress) {
      if (!wallets.some((wallet) => wallet.id === walletId)) {
        throw new Error('no wallet with that id exists on this device');
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
        btcSpendableSat: 0,
        balanceUsdmBaseUnits: opened ? 0 : null,
        channelReady: opened,
      };
    },
    async submitPayment() {
      await waitFor(MOCK_STEP_DELAY_MS);
      submittedHash = MOCK_PAYMENT_HASH;
      checkCount = 0;
      // The demo transfer follows the same settle-after-N rhythm as
      // checkPayment so the watcher hook shows both pending and settled.
      transferRefreshCount = 0;
      mockTransfers = [
        {
          transferId: `mock-transfer-${MOCK_PAYMENT_HASH.slice(0, 8)}`,
          kind: 'outbound',
          status: 'Pending',
          amount: null,
        },
      ];
      return { paymentHash: submittedHash };
    },
    async checkPayment(paymentHash) {
      if (submittedHash === null || paymentHash !== submittedHash) {
        return 'unknown';
      }
      checkCount += 1;
      return checkCount >= MOCK_SETTLE_AFTER_CHECKS ? 'settled' : 'pending';
    },
    async refreshTransfers() {
      transferRefreshCount += 1;
      mockTransfers = mockTransfers.map((entry) =>
        entry.status === 'Pending' && transferRefreshCount >= MOCK_SETTLE_AFTER_CHECKS
          ? { ...entry, status: 'Settled' }
          : entry,
      );
      return mockTransfers.map((entry) => ({ ...entry }));
    },
    async createUsdmInvoice(amountBaseUnits) {
      // The demo invoice is bolt11-shaped so payer-side guards accept it;
      // it never reaches a real node.
      const invoice = `lntb1metevomockreceive${amountBaseUnits ?? 'blind'}usdmdemo`;
      return { invoice, paymentHash: null };
    },
    async hasUsableChannelWith(peerPubkey) {
      // The demo device shares a channel with the demo peer, so the
      // in-person flow exercises the direct route in mock mode.
      return peerPubkey.toLowerCase() === MOCK_DEMO_PEER_PUBKEY;
    },
    async connectPeer(peerUri) {
      mockConnectedPeers.add(peerUri);
    },
    async shutdown() {
      opened = false;
    },
  };
}

function selectGateway(): WalletSessionGateway {
  if (ENV.EXPO_PUBLIC_WALLET_MODE === 'mock') {
    return createMockWalletSessionGateway();
  }
  if (ENV.EXPO_PUBLIC_WALLET_MODE === 'remote') {
    return createRemoteRlnWalletSessionGateway();
  }
  if (ENV.EXPO_PUBLIC_WALLET_TRANSPORT === 'bare') {
    // See docs/known-issues/wallet-bare-android-crash.md: a real duplicate
    // declaration in bare/wallet-worklet.js previously aborted the whole
    // app natively on Android (fixed, with a regression test). Any syntax
    // error in that file's module graph crashes just as hard and just as
    // silently, so re-verify on a real device after editing the worklet
    // before defaulting on-device builds to this transport again.
    return createBareWalletSessionGateway();
  }
  // The in-process WDK gateway cannot exist inside the app bundle: the WDK
  // binding resolves to a Node-only entry there. Node tooling uses
  // wdkNodeGateway.ts directly.
  throw new Error(
    'wdk mode requires the bare transport inside the app; set EXPO_PUBLIC_WALLET_TRANSPORT=bare',
  );
}

export function createWalletSessionGateway(): WalletSessionGateway {
  const gateway = selectGateway();

  // Single-flight guard: concurrent createWallet calls (double-tap before
  // the UI disables the button) must not race the check-then-act seed
  // storage and silently overwrite one generated mnemonic.
  let creation: Promise<StoredWalletMeta> | null = null;
  return {
    ...gateway,
    createWallet(name: string) {
      creation ??= gateway.createWallet(name).finally(() => {
        creation = null;
      });
      return creation;
    },
  };
}
