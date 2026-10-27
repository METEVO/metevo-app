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
const RECIPIENT_PUBKEY = `02${'ab'.repeat(32)}`;
const SENDER_PUBKEY = `03${'cd'.repeat(32)}`;

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
      recipientPubkey: RECIPIENT_PUBKEY,
      senderPubkey: SENDER_PUBKEY,
      assetId: 'rgb:usdm-contract-id',
      amountUsd: 10,
    });

    expect(result).toEqual({ requestId: REQUEST_ID, expiresAt: 1_787_164_542 });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8080/metevo/invoice-request');
    expect(JSON.parse(String(init.body))).toEqual({
      recipient_pubkey: RECIPIENT_PUBKEY,
      sender_pubkey: SENDER_PUBKEY,
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
      relay.requestInvoice({
        recipientPubkey: RECIPIENT_PUBKEY,
        senderPubkey: null,
        assetId: null,
        amountUsd: 1,
      }),
    ).rejects.toBeInstanceOf(MetevoLspError);
  });

  test('requestInvoice rejects a recipient that is not a node pubkey', async () => {
    const { client } = makeClient(() => jsonResponse(200, {}));
    const relay = createLspInvoiceRelay(client);
    await expect(
      relay.requestInvoice({
        recipientPubkey: 'Maria',
        senderPubkey: null,
        assetId: null,
        amountUsd: 1,
      }),
    ).rejects.toBeInstanceOf(TypeError);
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

  test('pollResponse maps declined and expired answers', async () => {
    const declined = makeClient(() =>
      jsonResponse(200, { status: 'declined' }),
    );
    await expect(
      createLspInvoiceRelay(declined.client).pollResponse(REQUEST_ID),
    ).resolves.toEqual({ status: 'declined' });

    const expired = makeClient(() => jsonResponse(200, { status: 'expired' }));
    await expect(
      createLspInvoiceRelay(expired.client).pollResponse(REQUEST_ID),
    ).resolves.toEqual({ status: 'expired' });
  });

  test('listInvoiceInbox GETs the recipient inbox and validates entries', async () => {
    const { client, fetchImpl } = makeClient((url) =>
      url.includes('/metevo/invoice-inbox')
        ? jsonResponse(200, {
            requests: [
              {
                request_id: REQUEST_ID,
                sender_pubkey: SENDER_PUBKEY.toUpperCase(),
                amount_usd: 20,
                expires_at: 1_787_164_542,
              },
              {
                request_id: REQUEST_ID,
                sender_pubkey: 'not-a-pubkey',
                amount_usd: '5',
                asset_id: 'rgb:usdm-contract-id',
                expires_at: 1_787_164_542,
              },
            ],
          })
        : jsonResponse(404, 'nope'),
    );

    const inbox = await client.listInvoiceInbox(RECIPIENT_PUBKEY.toUpperCase());
    expect(fetchImpl.mock.calls[0][0]).toBe(
      `http://127.0.0.1:8080/metevo/invoice-inbox?pubkey=${RECIPIENT_PUBKEY}`,
    );
    expect((fetchImpl.mock.calls[0][1] as RequestInit).method).toBe('GET');
    expect(inbox).toEqual([
      {
        requestId: REQUEST_ID,
        senderPubkey: SENDER_PUBKEY,
        amountUsd: 20,
        assetId: null,
        expiresAt: 1_787_164_542,
      },
      {
        requestId: REQUEST_ID,
        senderPubkey: null,
        amountUsd: 5,
        assetId: 'rgb:usdm-contract-id',
        expiresAt: 1_787_164_542,
      },
    ]);
  });

  test('answerInvoiceRequest posts the invoice answer', async () => {
    const { client, fetchImpl } = makeClient(() => jsonResponse(200, { ok: true }));
    await client.answerInvoiceRequest({
      requestId: REQUEST_ID,
      recipientPubkey: RECIPIENT_PUBKEY,
      invoice: DEMO_INVOICE,
      paymentHash: REQUEST_ID,
      declined: false,
    });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8080/metevo/invoice-answer');
    expect(JSON.parse(String(init.body))).toEqual({
      request_id: REQUEST_ID,
      recipient_pubkey: RECIPIENT_PUBKEY,
      invoice: DEMO_INVOICE,
      payment_hash: REQUEST_ID,
    });
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
      recipientPubkey: 'Maria',
      senderPubkey: null,
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
      recipientPubkey: 'Maria',
      senderPubkey: null,
      assetId: null,
      amountUsd: 1,
    });
    const second = await relay.requestInvoice({
      recipientPubkey: 'Bob',
      senderPubkey: null,
      assetId: null,
      amountUsd: 2,
    });
    expect(second.requestId).not.toBe(first.requestId);
    await relay.pollResponse(first.requestId);
    const response = await relay.pollResponse(second.requestId);
    expect(response).toMatchObject({ status: 'pending' });
  });
});
