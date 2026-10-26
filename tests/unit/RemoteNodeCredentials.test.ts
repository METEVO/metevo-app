import { loadRemoteNodeBearerToken } from '../../src/services/metevo/remoteNodeCredentials';

let mockFileExists = false;
let mockFileContent = '';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/tmp/remote-node-test/',
  getInfoAsync: jest.fn(async () => ({ exists: mockFileExists })),
  readAsStringAsync: jest.fn(async () => mockFileContent),
}));

describe('loadRemoteNodeBearerToken', () => {
  test('no provisioned file means an unauthenticated node', async () => {
    mockFileExists = false;
    await expect(loadRemoteNodeBearerToken()).resolves.toBeNull();
  });

  test('returns the provisioned token', async () => {
    mockFileExists = true;
    mockFileContent = JSON.stringify({ bearerToken: 'test-only-token' });
    await expect(loadRemoteNodeBearerToken()).resolves.toBe('test-only-token');
  });

  test('a malformed file fails loudly instead of falling back to no auth', async () => {
    mockFileExists = true;
    mockFileContent = JSON.stringify({ bearerToken: '' });
    await expect(loadRemoteNodeBearerToken()).rejects.toMatchObject({ name: 'WalletConfigError' });

    mockFileContent = '{not json';
    await expect(loadRemoteNodeBearerToken()).rejects.toMatchObject({ name: 'WalletConfigError' });
  });
});
