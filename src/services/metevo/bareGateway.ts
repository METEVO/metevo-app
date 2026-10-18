import { Image } from 'react-native';

import { ENV } from '../../config/env';
import {
  loadDeviceWalletConfig,
  walletConfigFromDevice,
} from './deviceConfig';
import {
  authenticateToAccessSecrets,
  createWalletEntry,
  listWallets,
  readWalletMnemonicById,
  walletExistsOnDevice,
} from './secure-store';
import type { StoredWalletMeta } from './wallet-gateway';
import type { MetevoPaymentStatus } from './paymentGuard';
import type {
  WalletProgressListener,
  WalletSessionGateway,
  WalletSessionSnapshot,
  WalletSetupStep,
} from './wallet-gateway';

// Metro serves this file as an asset (see metro.config.js); the worklet
// evaluates its contents inside the Bare runtime.
import walletBundleAsset from '../../../bare/wallet.rlnbundle';

// bare-module types the worklet source by the URL extension of this name:
// only a ".bundle" suffix is recognized as a bare bundle and mounted as
// one. Any other extension is compiled as a plain script, which dies on
// the bundle header's first ':' and SIGABRTs the whole app (observed on
// react-native-bare-kit 0.15.5, bare-module 7.0.3).
const WORKLET_ENTRY_NAME = '/wallet.bundle';

type WorkletInstance = {
  IPC: {
    on(event: string, handler: (chunk: Uint8Array) => void): void;
    write(chunk: Uint8Array): void;
  };
  start(entry: string, source: string): void;
};
type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (cause: Error) => void;
};

/**
 * The device gateway: runs the real wallet inside a Bare worklet and talks
 * to it over IPC with the same WalletSessionGateway contract the UI already
 * knows. The app side owns SecureStore, biometrics and the provisioned
 * device config; the seed crosses the in-process IPC bridge once per open.
 */
export function createBareWalletSessionGateway(): WalletSessionGateway {
  let worklet: WorkletInstance | null = null;
  const pending = new Map<number, PendingRequest>();
  let nextRequestId = 1;
  let progressListener: WalletProgressListener | null = null;
  let receiveBuffer = '';

  async function ensureWorkletStarted(): Promise<WorkletInstance> {
    if (worklet !== null) {
      return worklet;
    }
    // The bundle resolves to a packaged file URI in release builds and to
    // the Metro dev-server URL in development; fetch reads both.
    const source = Image.resolveAssetSource(walletBundleAsset);
    console.log('[metevo] worklet: fetching bundle from', source.uri);
    const response = await fetch(source.uri);
    const bundleContent = await response.text();
    console.log('[metevo] worklet: bundle fetched,', bundleContent.length, 'chars');

    // Lazy require: bare-kit's JS calls TurboModuleRegistry.getEnforcing at
    // import time, which must never happen in runtimes without the native
    // BareKit module (Expo Go, mock mode, Node tooling).
    const { Worklet } = require('react-native-bare-kit') as typeof import('react-native-bare-kit');
    const started = new Worklet();
    started.IPC.on('data', (chunk: Uint8Array) => {
      receiveBuffer += new TextDecoder().decode(chunk);
      let newlineIndex = receiveBuffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = receiveBuffer.slice(0, newlineIndex);
        receiveBuffer = receiveBuffer.slice(newlineIndex + 1);
        if (line.length > 0) {
          handleWorkletLine(line);
        }
        newlineIndex = receiveBuffer.indexOf('\n');
      }
    });
    started.start(WORKLET_ENTRY_NAME, bundleContent);
    console.log('[metevo] worklet: start() accepted');
    worklet = started;
    return started;
  }

  function handleWorkletLine(line: string) {
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(line);
    } catch {
      return;
    }
    if (frame.event === 'progress') {
      const event = frame as unknown as { step: string; message: string };
      progressListener?.(event.step as WalletSetupStep, event.message);
      return;
    }
    if (frame.event === 'worklet-error') {
      const event = frame as unknown as { scope: string; message: string };
      console.log('[metevo] worklet fatal:', event.scope, '-', event.message);
      // Fail every in-flight request so the UI surfaces the error instead
      // of waiting on a worklet that is about to die.
      const inFlight = [...pending.values()];
      pending.clear();
      for (const request of inFlight) {
        request.reject(new Error(`wallet node error: ${event.message}`));
      }
      return;
    }
    const pendingRequest = pending.get(Number(frame.id));
    if (pendingRequest === undefined) {
      return;
    }
    pending.delete(Number(frame.id));
    if (frame.ok === true) {
      pendingRequest.resolve(frame.result);
    } else {
      pendingRequest.reject(new Error(String(frame.error ?? 'worklet error')));
    }
  }

  async function request(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<unknown> {
    const started = await ensureWorkletStarted();
    const requestId = nextRequestId;
    nextRequestId += 1;
    const reply = new Promise<unknown>((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
    });
    started.IPC.write(
      new TextEncoder().encode(
        JSON.stringify({ id: requestId, method, params: params ?? {} }) + '\n',
      ),
    );
    return reply;
  }

  return {
    async listWallets(): Promise<StoredWalletMeta[]> {
      return listWallets();
    },
    async hasStoredWallet() {
      return walletExistsOnDevice();
    },
    async createWallet(name) {
      // Lazy require: the ESM-only BIP-39 source must never load at module
      // import time (mock mode, Expo Go and the unit tests skip it).
      const mnemonicSource = require('./mnemonic') as typeof import('./mnemonic');
      return createWalletEntry(name, () =>
        mnemonicSource.generateMnemonicWithDeviceEntropy(),
      );
    },
    async openWallet(walletId: string, onProgress) {
      progressListener = onProgress;
      try {
        await authenticateToAccessSecrets('Open your METEVO wallet');
        console.log('[metevo] openWallet: biometric ok');
        const mnemonic = await readWalletMnemonicById(walletId);
        if (mnemonic === null) {
          throw new Error('no wallet seed is stored on this device');
        }
        console.log(
          '[metevo] openWallet: seed loaded,',
          mnemonic.trim().split(/\s+/).length,
          'words',
        );
        const device = await loadDeviceWalletConfig();
        console.log(
          '[metevo] openWallet: device config loaded, peer',
          device.lspPeerUri ?? '(none)',
        );
        await request('openWallet', {
          mnemonic,
          walletConfig: walletConfigFromDevice(device),
          lspPeerUri: device.lspPeerUri ?? null,
          channelTimeoutMs: ENV.EXPO_PUBLIC_CHANNEL_PROVISION_TIMEOUT_MS,
        });
        console.log('[metevo] openWallet: worklet reported success');
      } catch (cause) {
        console.log(
          '[metevo] openWallet failed:',
          cause instanceof Error ? cause.message : String(cause),
        );
        throw cause;
      } finally {
        progressListener = null;
      }
    },
    async readStatus(): Promise<WalletSessionSnapshot> {
      return (await request('readStatus')) as WalletSessionSnapshot;
    },
    async submitPayment(proposal) {
      return (await request('submitPayment', {
        invoice: proposal.invoice,
      })) as { paymentHash: string | null };
    },
    async checkPayment(paymentHash): Promise<MetevoPaymentStatus> {
      return (await request('checkPayment', { paymentHash })) as MetevoPaymentStatus;
    },
    async shutdown() {
      if (worklet !== null) {
        await request('shutdown');
        worklet = null;
      }
    },
  };
}
