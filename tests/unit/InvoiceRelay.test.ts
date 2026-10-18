import { MetevoLspClient, MetevoLspError } from '../../src/services/metevo/lsp-api';
import {
  createLspInvoiceRelay,
  createMockInvoiceRelay,
} from '../../src/services/metevo/invoiceRelay';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const REQUEST_ID = 'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0';
const DEMO_INVOICE = 'lntb1070n1mockrelayinvoice';

function makeClient(responder: (url: string, body: unknown) => Response) {
  const fetchImpl = jest.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body === undefined ? undefined : JSON.parse(String(init.body));
    return responder(url, body);
  });
  const client = new MetevoLspClient({
    baseUrl: 'http://127.0.0.1:8080',
    bearerToken: 'test-token',
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { client, fetchImpl };
}

describe('LSP invoice relay client', () => {
  test('requestInvoice posts the relay request and maps the response', async () => {
    const { client, fetchImpl } = makeClient((url) =>
      url.endsWith('/metevo/invoice-request')
        ? jsonResponse(200, { request_id: REQUEST_ID, expires_at: 1_787_164_542 })
        : jsonResponse(404, 'nope'),
    );
    const relay = createLspInvoiceRelay(client);

    const result = await relay.requestInvoice({
      recipient: 'Maria',
      assetId: 'rgb:usdm-contract-id',
      amountUsd: 10,
    });

    expect(result).toEqual({ requestId: REQUEST_ID, expiresAt: 1_787_164_542 });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8080/metevo/invoice-request');
    expect(JSON.parse(String(init.body))).toEqual({
      recipient: 'Maria',
      asset_id: 'rgb:usdm-contract-id',
      amount_usd: 10,
    });
  });

  test('requestInvoice rejects a malformed request id', async () => {
    const { client } = makeClient(() =>
      jsonResponse(200, { request_id: 'not-a-hash', expires_at: 1 }),
    );
    const relay = createLspInvoiceRelay(client);
    await expect(
      relay.requestInvoice({ recipient: 'Maria', assetId: null, amountUsd: 1 }),
    ).rejects.toBeInstanceOf(MetevoLspError);
  });

  test('pollResponse passes through pending without an invoice', async () => {
    const { client } = makeClient((url) =>
      url.endsWith('/metevo/invoice-response')
        ? jsonResponse(200, { status: 'pending' })
        : jsonResponse(404, 'nope'),
    );
    const relay = createLspInvoiceRelay(client);
    await expect(relay.pollResponse(REQUEST_ID)).resolves.toEqual({
      status: 'pending',
    });
  });

  test('pollResponse maps a delivered response with the invoice', async () => {
    const { client } = makeClient((url) =>
      url.endsWith('/metevo/invoice-response')
        ? jsonResponse(200, {
            status: 'delivered',
            invoice: DEMO_INVOICE,
            payment_hash: REQUEST_ID,
          })
        : jsonResponse(404, 'nope'),
    );
    const relay = createLspInvoiceRelay(client);
    await expect(relay.pollResponse(REQUEST_ID)).resolves.toEqual({
      status: 'delivered',
      invoice: DEMO_INVOICE,
      paymentHash: REQUEST_ID,
    });
  });

  test('pollResponse rejects a delivered response without a bolt11 invoice', async () => {
    const { client } = makeClient((url) =>
      url.endsWith('/metevo/invoice-response')
        ? jsonResponse(200, { status: 'delivered' })
        : jsonResponse(404, 'nope'),
    );
    const relay = createLspInvoiceRelay(client);
    await expect(relay.pollResponse(REQUEST_ID)).rejects.toBeInstanceOf(MetevoLspError);
  });

  test('pollResponse rejects an unknown status', async () => {
    const { client } = makeClient((url) =>
      url.endsWith('/metevo/invoice-response')
        ? jsonResponse(200, { status: 'exploded' })
        : jsonResponse(404, 'nope'),
    );
    const relay = createLspInvoiceRelay(client);
    await expect(relay.pollResponse(REQUEST_ID)).rejects.toBeInstanceOf(MetevoLspError);
  });
});

describe('mock invoice relay', () => {
  test('delivers the recipient invoice after one pending poll, idempotently', async () => {
    let created = 0;
    const relay = createMockInvoiceRelay({
      createInvoice: async () => {
        created += 1;
        return DEMO_INVOICE;
      },
    });

    const request = await relay.requestInvoice({
      recipient: 'Maria',
      assetId: 'rgb:usdm-contract-id',
      amountUsd: 10,
    });
    expect(request.requestId.length).toBeGreaterThan(0);

    const pending = await relay.pollResponse(request.requestId);
    expect(pending.status).toBe('pending');

    const delivered = await relay.pollResponse(request.requestId);
    expect(delivered.status).toBe('delivered');
    expect(delivered.status === 'delivered' && delivered.invoice).toBe(DEMO_INVOICE);
    expect(
      delivered.status === 'delivered' && /^[0-9a-f]{64}$/.test(delivered.paymentHash ?? ''),
    ).toBe(true);

    // A repeated poll must return the same delivered invoice (idempotent).
    await relay.pollResponse(request.requestId);
    expect(created).toBe(1);
  });

  test('each request gets its own id and response', async () => {
    const relay = createMockInvoiceRelay({
      createInvoice: async () => 'lntb1secondinvoice',
    });
    const first = await relay.requestInvoice({
      recipient: 'Maria',
      assetId: null,
      amountUsd: 1,
    });
    const second = await relay.requestInvoice({
      recipient: 'Bob',
      assetId: null,
      amountUsd: 2,
    });
    expect(second.requestId).not.toBe(first.requestId);
    await relay.pollResponse(first.requestId);
    const response = await relay.pollResponse(second.requestId);
    expect(response).toMatchObject({ status: 'pending' });
  });
});
