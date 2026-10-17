import { ENV } from '../../config/env';
import { createBareWalletSessionGateway } from './bareGateway';

// Single source of truth lives in paymentGuard.ts (the worklet imports the
// same compiled module); re-exported here to keep the established import
// path.
export { PaymentValidationError } from './paymentGuard';

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
  /** Whether this device already holds a stored wallet seed. */
  hasStoredWallet(): Promise<boolean>;
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

type SecureStoreModule = typeof import('./secure-store');

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
  const loadSecureStore = (): SecureStoreModule => require('./secure-store');
  let created = false;
  let opened = false;
  let submittedHash: string | null = null;
  let checkCount = 0;

  return {
    async hasStoredWallet() {
      return created;
    },
    async createWallet() {
      // Demo fidelity: run the real biometric prompt when the device has
      // enrolled credentials, without storing anything (mock mode never
      // touches the secure store).
      const secureStore = loadSecureStore();
      if (await secureStore.deviceSupportsBiometrics()) {
        await secureStore.authenticateToAccessSecrets('Set up your METEVO wallet');
      }
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

function selectGateway(): WalletSessionGateway {
  if (ENV.EXPO_PUBLIC_WALLET_MODE === 'mock') {
    return createMockWalletSessionGateway();
  }
  if (ENV.EXPO_PUBLIC_WALLET_TRANSPORT === 'bare') {
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
  let creation: Promise<void> | null = null;
  return {
    ...gateway,
    createWallet() {
      creation ??= gateway.createWallet().finally(() => {
        creation = null;
      });
      return creation;
    },
  };
}
