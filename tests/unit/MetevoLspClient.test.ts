import { MetevoLspClient, MetevoLspError } from '../../src/services/metevo/lsp-api';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const SAMPLE_QUOTE = {
  payment_hash: 'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
  invoice: 'lnbcrt300000n1...',
  amount_msat: 3_000_000,
  sats: 3000,
  usd_amount: 1,
  asset_id: 'rgb:usdm-contract-id',
  asset_amount: 100_000_000,
  sats_per_usd: 3000,
  expires_at: 1_787_164_542,
};

const SAMPLE_CLAIM = {
  payment_hash: 'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
  asset_id: 'rgb:usdm-contract-id',
  asset_amount: 100_000_000,
  status: 'delivered',
};

describe('MetevoLspClient', () => {
  describe('construction', () => {
    it('rejects an empty base URL', () => {
      expect(
        () =>
          new MetevoLspClient({
            baseUrl: '',
            bearerToken: 'token',
            fetchImpl: jest.fn(),
          }),
      ).toThrow(TypeError);
    });

    it('rejects an empty bearer token', () => {
      expect(
        () =>
          new MetevoLspClient({
            baseUrl: 'http://127.0.0.1:8080',
            bearerToken: '   ',
            fetchImpl: jest.fn(),
          }),
      ).toThrow(TypeError);
    });

    it('strips a trailing slash from the base URL', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, SAMPLE_QUOTE));
      const client = new MetevoLspClient({
        baseUrl: 'http://127.0.0.1:8080/',
        bearerToken: 'token',
        fetchImpl: fetchImpl,
      });
      await client.buy(1);
      expect(fetchImpl.mock.calls[0][0]).toBe('http://127.0.0.1:8080/metevo/buy');
    });
  });

  describe('buy', () => {
    it('sends the bearer token and the usd_amount', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, SAMPLE_QUOTE));
      const client = new MetevoLspClient({
        baseUrl: 'http://127.0.0.1:8080',
        bearerToken: 'test-token',
        fetchImpl: fetchImpl,
      });

      await client.buy(10);

      const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://127.0.0.1:8080/metevo/buy');
      expect(init.method).toBe('POST');
      expect(init.headers).toMatchObject({ Authorization: 'Bearer test-token' });
      expect(JSON.parse(String(init.body))).toEqual({ usd_amount: 10 });
    });

    it('maps the wire fields onto the quote', async () => {
      const client = makeClientResponding(jsonResponse(200, SAMPLE_QUOTE));

      const quote = await client.buy(1);

      expect(quote.paymentHash).toBe(SAMPLE_QUOTE.payment_hash);
      expect(quote.invoice).toBe(SAMPLE_QUOTE.invoice);
      expect(quote.amountMsat).toBe(3_000_000);
      expect(quote.sats).toBe(3000);
      expect(quote.usdAmount).toBe(1);
      expect(quote.assetId).toBe('rgb:usdm-contract-id');
      expect(quote.assetAmount).toBe(100_000_000);
      expect(quote.satsPerUsd).toBe(3000);
      expect(quote.expiresAt).toBe(1_787_164_542);
    });

    it('rejects a non-integer usd amount before any request', async () => {
      const fetchImpl = jest.fn();
      const client = new MetevoLspClient({
        baseUrl: 'http://127.0.0.1:8080',
        bearerToken: 'token',
        fetchImpl: fetchImpl,
      });

      await expect(client.buy(10.5)).rejects.toThrow(TypeError);
      await expect(client.buy(0)).rejects.toThrow(TypeError);
      await expect(client.buy(-1)).rejects.toThrow(TypeError);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('raises an LspError with the status for a 4xx response', async () => {
      const client = makeClientResponding(jsonResponse(400, { error: 'amount out of range' }));

      const error = await client.buy(1).catch((e: any) => e);

      expect(error).toBeInstanceOf(MetevoLspError);
      expect(error.status).toBe(400);
      expect(error.body).toContain('amount out of range');
    });

    it('raises a transport MetevoLspError when fetch rejects', async () => {
      const fetchImpl = jest.fn().mockRejectedValue(new Error('connection refused'));
      const client = new MetevoLspClient({
        baseUrl: 'http://127.0.0.1:8080',
        bearerToken: 'token',
        fetchImpl: fetchImpl,
      });

      const error = await client.buy(1).catch((e: any) => e);

      expect(error).toBeInstanceOf(MetevoLspError);
      expect(error.status).toBe(0);
    });
  });

  describe('claim', () => {
    it('sends the hash, the preimage and the rgb invoice', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, SAMPLE_CLAIM));
      const client = new MetevoLspClient({
        baseUrl: 'http://127.0.0.1:8080',
        bearerToken: 'test-token',
        fetchImpl: fetchImpl,
      });

      await client.claim({
        paymentHash: 'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
        rgbInvoice: 'rgb1blind...',
        paymentPreimage: 'aabbccdd',
      });

      const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toEqual({
        payment_hash: 'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
        rgb_invoice: 'rgb1blind...',
        payment_preimage: 'aabbccdd',
      });
    });

    it('omits the payment_preimage field when none was captured', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, SAMPLE_CLAIM));
      const client = new MetevoLspClient({
        baseUrl: 'http://127.0.0.1:8080',
        bearerToken: 'test-token',
        fetchImpl: fetchImpl,
      });

      await client.claim({
        paymentHash: 'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
        rgbInvoice: 'rgb1blind...',
      });

      const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toEqual({
        payment_hash: 'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
        rgb_invoice: 'rgb1blind...',
      });
    });

    it('sends the bearer token', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, SAMPLE_CLAIM));
      const client = new MetevoLspClient({
        baseUrl: 'http://127.0.0.1:8080',
        bearerToken: 'test-token',
        fetchImpl: fetchImpl,
      });

      await client.claim({
        paymentHash: 'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
        rgbInvoice: 'rgb1blind...',
      });

      const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
      expect(init.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    });

    it('raises an LspError with the status for a 4xx response', async () => {
      const client = makeClientResponding(jsonResponse(404, { error: 'no metevo order for this payment_hash' }));

      const error = await client
        .claim({
          paymentHash: 'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
          rgbInvoice: 'rgb1blind...',
        })
        .catch((e: any) => e);

      expect(error).toBeInstanceOf(MetevoLspError);
      expect(error.status).toBe(404);
    });
  });
});

function makeClientResponding(response: Response): MetevoLspClient {
  return new MetevoLspClient({
    baseUrl: 'http://127.0.0.1:8080',
    bearerToken: 'test-token',
    fetchImpl: jest.fn().mockResolvedValue(response),
  });
}
