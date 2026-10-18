jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/tmp/metevo-test/',
  readAsStringAsync: jest.fn(async () => mockDeviceConfigContent),
}));
jest.mock('../../src/services/metevo/secure-store', () => ({
  SecureWalletStoreError: class SecureWalletStoreError extends Error {},
  authenticateToAccessSecrets: jest.fn().mockResolvedValue(undefined),
  createWalletEntry: jest.fn(async (name: string) => ({
    id: 'w-test',
    name,
    createdAt: new Date().toISOString(),
  })),
  readWalletMnemonicById: jest.fn().mockResolvedValue('fake test seed, never a real one'),
  listWallets: jest.fn(async () => [
    { id: 'w-test', name: 'Everyday wallet', createdAt: new Date().toISOString() },
  ]),
  walletExistsOnDevice: jest.fn().mockResolvedValue(false),
  deviceSupportsBiometrics: jest.fn().mockResolvedValue(true),
}));

/** Obviously fake device config; values are test-only, never real. */
const DEVICE_CONFIG_FIXTURE = {
  lspApiUrl: 'http://127.0.0.1:8080',
  lspBearerToken: 'test-token',
  lspPeerUri: `02${'d'.repeat(64)}@127.0.0.1:9735`,
  bitcoindRpcHost: '127.0.0.1',
  bitcoindRpcPort: 18443,
  bitcoindRpcUsername: 'regtest',
  bitcoindRpcPassword: 'test-only-password',
  rgbIndexerUrl: '127.0.0.1:50001',
  rgbProxyEndpoint: 'rpc://127.0.0.1:3000/json-rpc',
};

let mockDeviceConfigContent = JSON.stringify(DEVICE_CONFIG_FIXTURE);

import { createBareWalletSessionGateway } from '../../src/services/metevo/bareGateway';
import { Worklet } from 'react-native-bare-kit';

const mockedSecureStore = jest.mocked(
  require('../../src/services/metevo/secure-store'),
);

interface FakeWorklet {
  dataHandlers: Array<(chunk: Uint8Array) => void>;
  written: string[];
}

function lastWorklet(): FakeWorklet {
  const instances = (
    Worklet as unknown as { mockInstances: FakeWorklet[] }
  ).mockInstances;
  const instance = instances.at(-1);
  if (instance === undefined) {
    throw new Error('no worklet was constructed');
  }
  return instance;
}

/** Simulates the worklet: feeds a frame back through the data handlers. */
function emitFromWorklet(worklet: FakeWorklet, frame: object): void {
  const chunk = new TextEncoder().encode(JSON.stringify(frame) + '\n');
  for (const handler of worklet.dataHandlers) {
    handler(chunk);
  }
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const originalFetch = global.fetch;

beforeEach(() => {
  mockDeviceConfigContent = JSON.stringify(DEVICE_CONFIG_FIXTURE);
  mockedSecureStore.authenticateToAccessSecrets.mockClear();
  mockedSecureStore.readWalletMnemonicById.mockClear();
  // Scoped stub: jest.restoreAllMocks would also strip the implementations
  // of the global setup-file mocks (Worklet, resolveAssetSource).
  (global as { fetch: unknown }).fetch = jest.fn(async () => ({
    text: async () => 'worklet bundle placeholder',
  }));
});

afterEach(() => {
  (global as { fetch: unknown }).fetch = originalFetch;
});

describe('bare gateway ipc bridge', () => {
  test('sends the seed and wallet config, and reports progress events', async () => {
    const gateway = createBareWalletSessionGateway();
    const progressSteps: string[] = [];

    const opening = gateway.openWallet('w-test', (step) =>
      progressSteps.push(step),
    );
    await flushMicrotasks();

    const worklet = lastWorklet();
    expect(worklet.written).toHaveLength(1);
    const request = JSON.parse(worklet.written[0]);
    expect(request.method).toBe('openWallet');
    expect(request.params.mnemonic).toBe('fake test seed, never a real one');
    expect(request.params.walletConfig.lspBaseUrl).toBe('http://127.0.0.1:8080');
    expect(request.params.lspPeerUri).toBe(DEVICE_CONFIG_FIXTURE.lspPeerUri);

    emitFromWorklet(worklet, {
      event: 'progress',
      step: 'connecting-lsp',
      message: 'Connecting to the METEVO LSP…',
    });
    emitFromWorklet(worklet, {
      id: request.id,
      ok: true,
      result: { channelReady: true },
    });
    await opening;

    expect(progressSteps).toContain('connecting-lsp');
    expect(
      mockedSecureStore.authenticateToAccessSecrets.mock.invocationCallOrder[0],
    ).toBeDefined();
  });

  test('correlates replies to the right request and reports worklet errors', async () => {
    const gateway = createBareWalletSessionGateway();

    const statusPromise = gateway.readStatus();
    await flushMicrotasks();

    const worklet = lastWorklet();
    const request = JSON.parse(worklet.written.at(-1)!);
    emitFromWorklet(worklet, {
      id: request.id,
      ok: true,
      result: {
        nodePubkey: 'test-node-pubkey',
        btcSpendableSat: 0,
        balanceUsdmBaseUnits: 2_000_000_000,
        channelReady: true,
      },
    });

    await expect(statusPromise).resolves.toMatchObject({
      nodePubkey: 'test-node-pubkey',
      channelReady: true,
    });

    const failing = gateway.submitPayment({ invoice: 'rgb:demo' });
    await flushMicrotasks();
    const failureRequest = JSON.parse(worklet.written.at(-1)!);
    emitFromWorklet(worklet, {
      id: failureRequest.id,
      ok: false,
      error: 'the proposal is not a payable lightning invoice; nothing was submitted',
    });

    await expect(failing).rejects.toThrow('nothing was submitted');
  });

  test('keeps partial frames across chunks until the newline arrives', async () => {
    const gateway = createBareWalletSessionGateway();
    const statusPromise = gateway.readStatus();
    await flushMicrotasks();

    const worklet = lastWorklet();
    const request = JSON.parse(worklet.written.at(-1)!);
    const reply = JSON.stringify({
      id: request.id,
      ok: true,
      result: { nodePubkey: 'pk', btcSpendableSat: 0, balanceUsdmBaseUnits: null, channelReady: false },
    });
    const chunk = new TextEncoder().encode(reply + '\n');
    // Split one reply across two data events to simulate stream chunks.
    const firstHandler = worklet.dataHandlers[0];
    firstHandler(chunk.slice(0, 10));
    firstHandler(chunk.slice(10));

    await expect(statusPromise).resolves.toMatchObject({ nodePubkey: 'pk' });
  });
});
