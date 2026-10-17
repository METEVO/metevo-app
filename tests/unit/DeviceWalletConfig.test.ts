import {
  WalletConfigError,
  loadDeviceWalletConfig,
} from '../../src/services/metevo/deviceConfig';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/tmp/device-config-test/',
  readAsStringAsync: jest.fn(async () => mockFileContent),
}));

const VALID_CONFIG = {
  lspApiUrl: 'http://127.0.0.1:8080',
  lspBearerToken: 'test-token',
  lspPeerUri: `02${'c'.repeat(64)}@127.0.0.1:9735`,
  bitcoindRpcHost: '127.0.0.1',
  bitcoindRpcPort: 18443,
  bitcoindRpcUsername: 'regtest',
  bitcoindRpcPassword: 'test-only-password',
  rgbIndexerUrl: 'http://127.0.0.1:3000',
  rgbProxyEndpoint: 'http://127.0.0.1:3001',
};

let mockFileContent = JSON.stringify(VALID_CONFIG);

const mockedFileSystem = jest.mocked(require('expo-file-system/legacy'));

describe('loadDeviceWalletConfig', () => {
  beforeEach(() => {
    mockFileContent = JSON.stringify(VALID_CONFIG);
    mockedFileSystem.readAsStringAsync.mockClear();
  });

  test('returns the parsed configuration for a valid file', async () => {
    const config = await loadDeviceWalletConfig();
    expect(config).toEqual(VALID_CONFIG);
  });

  test('fails fast with a provisioning hint when the file is missing', async () => {
    mockedFileSystem.readAsStringAsync.mockRejectedValueOnce(new Error('ENOENT'));

    const error = await loadDeviceWalletConfig().then(
      () => null,
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(WalletConfigError);
    expect((error as Error).message).toContain('push metevo-wallet-config.json');
  });

  test('rejects content that is not valid JSON', async () => {
    mockFileContent = 'not json at all';

    const error = await loadDeviceWalletConfig().then(
      () => null,
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(WalletConfigError);
    expect((error as Error).message).toContain('valid JSON');
  });

  test('reports invalid fields by path without leaking values', async () => {
    mockFileContent = JSON.stringify({
      ...VALID_CONFIG,
      lspApiUrl: 'not-a-url',
      lspBearerToken: 'super-secret-regtest-token-value',
      lspPeerUri: 'not-a-peer-uri',
      unexpectedKey: true,
    });

    const error = await loadDeviceWalletConfig().then(
      () => null,
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(WalletConfigError);
    const message = (error as Error).message;
    expect(message).toContain('lspApiUrl');
    expect(message).toContain('unexpectedKey');
    expect(message).not.toContain('super-secret-regtest-token-value');
  });
});
