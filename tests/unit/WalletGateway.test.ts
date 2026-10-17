import WalletManagerRgbLightning from '@utexo/wdk-rgb-lightning';

jest.mock('@utexo/wdk-rgb-lightning', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/tmp/metevo-test/',
  cacheDirectory: '/tmp/metevo-cache/',
}));
jest.mock('expo-crypto', () => ({
  getRandomValues: jest.fn((array: Uint8Array) => array),
}));
jest.mock('../../src/services/metevo/secure-store', () => ({
  SecureWalletStoreError: class SecureWalletStoreError extends Error {},
  authenticateToAccessSecrets: jest.fn().mockResolvedValue(undefined),
  createWalletSecurely: jest.fn().mockResolvedValue(undefined),
  readWalletMnemonic: jest.fn().mockResolvedValue('fake test seed, never a real one'),
  walletExistsOnDevice: jest.fn().mockResolvedValue(false),
  deviceSupportsBiometrics: jest.fn().mockResolvedValue(true),
}));

type GatewayModule = typeof import('../../src/services/metevo/wallet-gateway');

const mockedSecureStore = jest.mocked(
  require('../../src/services/metevo/secure-store'),
);

/**
 * Loads the gateway module fresh so the eager ENV validation sees the
 * requested wallet mode (the module caches its parsed environment).
 */
function loadGatewayWithMode(mode: 'mock' | 'wdk'): GatewayModule {
  let loaded!: GatewayModule;
  jest.isolateModules(() => {
    process.env.EXPO_PUBLIC_WALLET_MODE = mode;
    loaded = require('../../src/services/metevo/wallet-gateway');
  });
  return loaded;
}

function mockWdkAccount() {
  const account = {
    unlock: jest.fn().mockResolvedValue(undefined),
    listAssets: jest.fn().mockResolvedValue({ ifa: [], nia: [] }),
    getNodeInfo: jest.fn().mockResolvedValue({ pubkey: 'test-node-pubkey' }),
    getBalanceDetails: jest.fn().mockResolvedValue({ vanilla: { spendable: 0 } }),
  };
  const manager = { getAccount: jest.fn().mockResolvedValue(account) };
  (WalletManagerRgbLightning as unknown as jest.Mock).mockImplementation(
    () => manager,
  );
  return account;
}

describe('wallet gateway open path', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedSecureStore.authenticateToAccessSecrets.mockClear();
    mockedSecureStore.readWalletMnemonic.mockClear();
    (WalletManagerRgbLightning as unknown as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('requires biometric authentication before reading the seed', async () => {
    mockWdkAccount();
    const { createWalletSessionGateway } = loadGatewayWithMode('wdk');
    const gateway = createWalletSessionGateway();

    const opening = gateway.openWallet(() => undefined);
    await jest.advanceTimersByTimeAsync(60_000);
    await opening;

    const authOrder =
      mockedSecureStore.authenticateToAccessSecrets.mock.invocationCallOrder[0];
    const readOrder =
      mockedSecureStore.readWalletMnemonic.mock.invocationCallOrder[0];
    expect(authOrder).toBeDefined();
    expect(readOrder).toBeDefined();
    expect(authOrder).toBeLessThan(readOrder);
  });
});
