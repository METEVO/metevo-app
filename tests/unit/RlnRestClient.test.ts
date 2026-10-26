import {
  RlnApiError,
  RlnUnreachableError,
  createRlnRestClient,
} from '../../src/services/metevo/rlnRestClient';

type FetchCall = { url: string; init: RequestInit };

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function clientWith(
  respond: (call: FetchCall) => Promise<Response>,
  options: { bearerToken?: string | null; timeoutMs?: number } = {},
) {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    return respond(call);
  }) as unknown as typeof fetch;
  const client = createRlnRestClient({
    baseUrl: 'http://node.test:3001/',
    timeoutMs: options.timeoutMs ?? 1_000,
    bearerToken: options.bearerToken,
    fetchImpl,
  });
  return { client, calls };
}

const NODE_INFO = { pubkey: '02'.padEnd(66, 'a'), num_usable_channels: 1, rgb_htlc_min_msat: 3_000_000 };

describe('rgb-lightning-node REST client', () => {
  test('POSTs always carry a JSON content type, even with an empty body', async () => {
    const { client, calls } = clientWith(async () => jsonResponse(200, { transfers: {} }));
    await client.refreshTransfers();

    expect(calls[0].url).toBe('http://node.test:3001/refreshtransfers');
    expect(calls[0].init.method).toBe('POST');
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ filter: [], skip_sync: false });
  });

  test('sends the bearer token only when one is provisioned', async () => {
    const withToken = clientWith(async () => jsonResponse(200, NODE_INFO), { bearerToken: 'test-token' });
    await withToken.client.nodeInfo();
    expect((withToken.calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');

    const withoutToken = clientWith(async () => jsonResponse(200, NODE_INFO));
    await withoutToken.client.nodeInfo();
    expect((withoutToken.calls[0].init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  test('maps the node error body to RlnApiError with the error name', async () => {
    const { client } = clientWith(async () =>
      jsonResponse(403, { error: 'Node is locked (hint: call unlock)', code: 403, name: 'LockedNode' }),
    );
    await expect(client.nodeInfo()).rejects.toMatchObject({
      name: 'RlnApiError',
      errorName: 'LockedNode',
      status: 403,
    });
  });

  test('a network failure is reported as unreachable', async () => {
    const { client } = clientWith(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(client.nodeInfo()).rejects.toBeInstanceOf(RlnUnreachableError);
  });

  test('a slow node times out as unreachable', async () => {
    const { client } = clientWith(
      ({ init }) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
      { timeoutMs: 20 },
    );
    await expect(client.nodeInfo()).rejects.toThrow('timed out');
  });

  test('an unexpected response shape is rejected, never passed through', async () => {
    const { client } = clientWith(async () => jsonResponse(200, { pubkey: 42 }));
    await expect(client.nodeInfo()).rejects.toThrow('unexpected response shape');
  });

  test('resolves the USDm asset id by ticker, case-insensitively', async () => {
    const { client } = clientWith(async () =>
      jsonResponse(200, {
        nia: [{ asset_id: 'rgb:usdm', ticker: 'USDM' }],
        uda: null,
        cfa: null,
        ifa: null,
      }),
    );
    await expect(client.findNiaAssetIdByTicker('usdm')).resolves.toBe('rgb:usdm');
    await expect(client.findNiaAssetIdByTicker('EURM')).resolves.toBeNull();
  });

  test('maps the invoice request to the node snake_case body', async () => {
    const { client, calls } = clientWith(async () => jsonResponse(200, { invoice: 'lnbcrt1test' }));
    await expect(
      client.createLnInvoice({ amtMsat: 3_000_000, expirySec: 3600, assetId: 'rgb:usdm', assetAmount: 100 }),
    ).resolves.toBe('lnbcrt1test');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      amt_msat: 3_000_000,
      expiry_sec: 3600,
      asset_id: 'rgb:usdm',
      asset_amount: 100,
    });
  });

  test('RlnApiError is distinguishable from transport failures', () => {
    expect(new RlnApiError('/x', 400, 'InvalidRequest')).toBeInstanceOf(Error);
    expect(new RlnApiError('/x', 400, 'InvalidRequest').name).toBe('RlnApiError');
  });
});
