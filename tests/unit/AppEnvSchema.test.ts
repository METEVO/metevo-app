import { appEnvSchema } from '../../src/config/schema';

function issuesFor(env: Record<string, string>): string[] {
  const parsed = appEnvSchema.safeParse(env);
  return parsed.success
    ? []
    : parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}

describe('remote wallet env validation', () => {
  test('remote mode requires a node URL', () => {
    expect(issuesFor({ EXPO_PUBLIC_WALLET_MODE: 'remote' })).toEqual([
      'EXPO_PUBLIC_RLN_NODE_URL: required when EXPO_PUBLIC_WALLET_MODE=remote',
    ]);
  });

  test('remote mode accepts a plain http URL in dev', () => {
    expect(
      issuesFor({
        EXPO_PUBLIC_WALLET_MODE: 'remote',
        EXPO_PUBLIC_RLN_NODE_URL: 'http://localhost:3001',
      }),
    ).toEqual([]);
  });

  test('prod rejects a cleartext node URL', () => {
    expect(
      issuesFor({
        EXPO_PUBLIC_METEVO_ENV: 'prod',
        EXPO_PUBLIC_WALLET_MODE: 'remote',
        EXPO_PUBLIC_RLN_NODE_URL: 'http://node.example:3001',
      }),
    ).toEqual(['EXPO_PUBLIC_RLN_NODE_URL: must use https:// in prod']);
  });

  test('prod accepts a TLS node URL', () => {
    expect(
      issuesFor({
        EXPO_PUBLIC_METEVO_ENV: 'prod',
        EXPO_PUBLIC_WALLET_MODE: 'remote',
        EXPO_PUBLIC_RLN_NODE_URL: 'https://node.example',
      }),
    ).toEqual([]);
  });

  test('an empty optional peer URI counts as unset, a malformed one fails', () => {
    expect(issuesFor({ EXPO_PUBLIC_RLN_PEER_URI: '' })).toEqual([]);
    expect(issuesFor({ EXPO_PUBLIC_RLN_PEER_URI: 'not-a-peer' })).toHaveLength(1);
  });
});
