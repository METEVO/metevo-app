jest.mock('@utexo/wdk-rgb-lightning', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/tmp/metevo-test/',
  cacheDirectory: '/tmp/metevo-cache/',
  readAsStringAsync: jest.fn(async () => mockDeviceConfigContent),
}));

/** Obviously fake device config; values are test-only, never real. */
const DEVICE_CONFIG_FIXTURE = {
  lspApiUrl: 'http://127.0.0.1:8080',
  lspBearerToken: 'test-token',
  lspPeerUri: `02${'b'.repeat(64)}@127.0.0.1:9735`,
  bitcoindRpcHost: '127.0.0.1',
  bitcoindRpcPort: 18443,
  bitcoindRpcUsername: 'regtest',
  bitcoindRpcPassword: 'test-only-password',
  rgbIndexerUrl: 'http://127.0.0.1:3000',
  rgbProxyEndpoint: 'http://127.0.0.1:3001',
};

let mockDeviceConfigContent = JSON.stringify(DEVICE_CONFIG_FIXTURE);
jest.mock('../../src/services/metevo/secure-store', () => ({
  SecureWalletStoreError: class SecureWalletStoreError extends Error {},
  authenticateToAccessSecrets: jest.fn().mockResolvedValue(undefined),
  createWalletSecurely: jest.fn().mockResolvedValue(undefined),
  readWalletMnemonic: jest.fn().mockResolvedValue('fake test seed, never a real one'),
  walletExistsOnDevice: jest.fn().mockResolvedValue(false),
  deviceSupportsBiometrics: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../src/services/metevo/wallet', () => ({
  ...jest.requireActual('../../src/services/metevo/wallet'),
  createMetevoWallet: jest.fn(),
  findAssetIdByTicker: jest.fn().mockResolvedValue(null),
  getMetevoWalletStatus: jest.fn().mockResolvedValue({
    pubkey: 'test-node-pubkey',
    btcSpendableSat: 0,
    usdmBaseUnits: null,
    usdmChannelReady: false,
    unlocked: true,
  }),
  shutdownMetevoWallet: jest.fn().mockResolvedValue(undefined),
}));

const mockedWalletService = jest.mocked(
  require('../../src/services/metevo/wallet'),
);

type GatewayModule = typeof import('../../src/services/metevo/wallet-gateway');

const PAYMENT_HASH = 'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0';

function makeAccount(paymentStatus: string) {
  return {
    unlock: jest.fn().mockResolvedValue(undefined),
    sync: jest.fn().mockResolvedValue(undefined),
    listPayments: jest.fn().mockResolvedValue({
      payments: [{ payment_hash: PAYMENT_HASH, status: paymentStatus }],
    }),
    sendPayment: jest.fn().mockResolvedValue({ payment_hash: PAYMENT_HASH }),
  };
}

/**
 * Loads the gateway inside a fresh module registry with the requested
 * wallet mode: config/env parses and caches the environment at import
 * time, so the mode must be set before the (re-)import.
 */
function loadGateway(mode: 'mock' | 'wdk'): GatewayModule {
  let loaded!: GatewayModule;
  jest.isolateModules(() => {
    process.env.EXPO_PUBLIC_WALLET_MODE = mode;
    process.env.EXPO_PUBLIC_CHANNEL_PROVISION_TIMEOUT_MS = '5000';
    loaded = require('../../src/services/metevo/wallet-gateway');
  });
  return loaded;
}

async function openGatewayWithAccount(account: Record<string, jest.Mock>) {
  mockedWalletService.createMetevoWallet.mockResolvedValue({
    manager: {} as never,
    account: account as never,
  });
  const { createWalletSessionGateway } = loadGateway('wdk');
  const gateway = createWalletSessionGateway();
  const opening = gateway.openWallet(() => undefined);
  await jest.advanceTimersByTimeAsync(60_000);
  await opening;
  return gateway;
}

describe('payment status mapping', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test.each([
    ['Succeeded', 'settled'],
    ['Failed', 'failed'],
    ['Pending', 'pending'],
  ])('maps node status %s to %s', async (nodeStatus, expected) => {
    const gateway = await openGatewayWithAccount(makeAccount(nodeStatus));

    const submitted = await gateway.submitPayment({
      invoice: 'lnbcrt1000u1pmockfakeppayload-not-a-real-invoice',
    });
    expect(submitted.paymentHash).toBe(PAYMENT_HASH);
    await expect(gateway.checkPayment(PAYMENT_HASH)).resolves.toBe(expected);
  });

  test('reports unknown when the node has no matching payment', async () => {
    const account = makeAccount('Succeeded');
    account.listPayments.mockResolvedValue({ payments: [] });
    const gateway = await openGatewayWithAccount(account);

    await gateway.submitPayment({ invoice: 'lnbcrt1000u1pmockfakeppayload-not-a-real-invoice' });
    await expect(gateway.checkPayment(PAYMENT_HASH)).resolves.toBe('unknown');
  });

  test('reports unknown when the hash is untrackable', async () => {
    const gateway = await openGatewayWithAccount(makeAccount('Succeeded'));
    await expect(gateway.checkPayment('')).resolves.toBe('unknown');
  });
});

describe('mock payment sequence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('stays pending first, then settles, never guessing', async () => {
    const { createWalletSessionGateway } = loadGateway('mock');
    const gateway = createWalletSessionGateway();
    const creating = gateway.createWallet();
    await jest.advanceTimersByTimeAsync(5_000);
    await creating;

    const submitting = gateway.submitPayment({ invoice: 'rgb:demo' });
    await jest.advanceTimersByTimeAsync(5_000);
    const submitted = await submitting;
    expect(submitted.paymentHash).not.toBeNull();

    await expect(gateway.checkPayment(submitted.paymentHash as string)).resolves.toBe('pending');
    await expect(gateway.checkPayment(submitted.paymentHash as string)).resolves.toBe('settled');
  });
});
