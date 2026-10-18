import WalletManagerRgbLightning from '@utexo/wdk-rgb-lightning';

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
  lspPeerUri: `02${'a'.repeat(64)}@127.0.0.1:9735`,
  bitcoindRpcHost: '127.0.0.1',
  bitcoindRpcPort: 18443,
  bitcoindRpcUsername: 'regtest',
  bitcoindRpcPassword: 'test-only-password',
  rgbIndexerUrl: 'http://127.0.0.1:3000',
  rgbProxyEndpoint: 'http://127.0.0.1:3001',
};

let mockDeviceConfigContent = JSON.stringify(DEVICE_CONFIG_FIXTURE);
jest.mock('expo-crypto', () => ({
  getRandomValues: jest.fn((array: Uint8Array) => array),
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

type GatewayModule = {
  createWalletSessionGateway: () => import('../../src/services/metevo/wallet-gateway').WalletSessionGateway;
};

const mockedSecureStore = jest.mocked(
  require('../../src/services/metevo/secure-store'),
);

/**
 * Loads the gateway module fresh so the eager ENV validation sees the
 * requested wallet mode (the module caches its parsed environment). The
 * in-process wdk gateway lives outside the app bundle, in wdkNodeGateway.
 */
function loadGatewayWithMode(mode: 'mock' | 'wdk'): GatewayModule {
  let loaded!: GatewayModule;
  jest.isolateModules(() => {
    process.env.EXPO_PUBLIC_WALLET_MODE = mode;
    process.env.EXPO_PUBLIC_CHANNEL_PROVISION_TIMEOUT_MS = '5000';
    const gatewayModule =
      mode === 'wdk'
        ? require('../../src/services/metevo/wdkNodeGateway')
        : require('../../src/services/metevo/wallet-gateway');
    loaded = {
      createWalletSessionGateway: () =>
        mode === 'wdk'
          ? gatewayModule.createWdkWalletSessionGateway()
          : gatewayModule.createWalletSessionGateway(),
    };
  });
  return loaded;
}

function mockWdkAccount() {
  const account = {
    unlock: jest.fn().mockResolvedValue(undefined),
    listAssets: jest.fn().mockResolvedValue({ ifa: [], nia: [] }),
    getNodeInfo: jest.fn().mockResolvedValue({ pubkey: 'test-node-pubkey' }),
    getBalanceDetails: jest.fn().mockResolvedValue({ vanilla: { spendable: 0 } }),
    sendPayment: jest.fn().mockResolvedValue({ payment_hash: 'f'.repeat(64) }),
    connectPeer: jest.fn().mockResolvedValue(undefined),
  };
  const manager = { getAccount: jest.fn().mockResolvedValue(account) };
  (WalletManagerRgbLightning as unknown as jest.Mock).mockImplementation(
    () => manager,
  );
  return account;
}

describe('payment submission guard', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('rejects non-bolt11 proposals before touching the node', async () => {
    const account = mockWdkAccount();
    const { createWalletSessionGateway } = loadGatewayWithMode('wdk');
    const gateway = createWalletSessionGateway();

    jest.useFakeTimers();
    const opening = gateway.openWallet('w-test', () => undefined);
    await jest.advanceTimersByTimeAsync(60_000);
    await opening;

    await expect(
      gateway.submitPayment({ invoice: 'rgb:mock-destination-invoice (demo only)' }),
    ).rejects.toThrow('nothing was submitted');
    expect(account.sendPayment).not.toHaveBeenCalled();
  });
});

describe('mock gateway transfer refresh', () => {
  test('submitPayment opens a pending transfer that settles on a later refresh', async () => {
    const { createWalletSessionGateway } = loadGatewayWithMode('mock');
    const gateway = createWalletSessionGateway();

    // Nothing to watch before any payment was submitted.
    await expect(gateway.refreshTransfers()).resolves.toEqual([]);

    await gateway.submitPayment({ invoice: 'lntb1demo' });

    const pending = await gateway.refreshTransfers();
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('Pending');

    // The mock settles on the second refresh, mirroring checkPayment.
    const settled = await gateway.refreshTransfers();
    expect(settled[0].status).toBe('Settled');
    expect(settled[0].transferId.length).toBeGreaterThan(0);
  });
});

describe('wallet creation single-flight', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('concurrent createWallet calls share one run', async () => {
    const { createWalletSessionGateway } = loadGatewayWithMode('mock');
    const gateway = createWalletSessionGateway();

    jest.useFakeTimers();
    const first = gateway.createWallet('Everyday wallet');
    const second = gateway.createWallet('Everyday wallet');
    expect(second).toBe(first);
    await jest.advanceTimersByTimeAsync(5_000);
    await Promise.all([first, second]);

    const third = gateway.createWallet('Savings wallet');
    expect(third).not.toBe(first);
    await jest.advanceTimersByTimeAsync(5_000);
    await third;
  });
});

describe('wallet gateway open path', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedSecureStore.authenticateToAccessSecrets.mockClear();
    mockedSecureStore.readWalletMnemonicById.mockClear();
    (WalletManagerRgbLightning as unknown as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('requires biometric authentication before reading the seed', async () => {
    const account = mockWdkAccount();
    const { createWalletSessionGateway } = loadGatewayWithMode('wdk');
    const gateway = createWalletSessionGateway();

    const opening = gateway.openWallet('w-test', () => undefined);
    await jest.advanceTimersByTimeAsync(60_000);
    await opening;

    const authOrder =
      mockedSecureStore.authenticateToAccessSecrets.mock.invocationCallOrder[0];
    const readOrder =
      mockedSecureStore.readWalletMnemonicById.mock.invocationCallOrder[0];
    expect(authOrder).toBeDefined();
    expect(readOrder).toBeDefined();
    expect(authOrder).toBeLessThan(readOrder);
    expect(account.connectPeer).toHaveBeenCalledWith(
      DEVICE_CONFIG_FIXTURE.lspPeerUri,
    );
  });
});
