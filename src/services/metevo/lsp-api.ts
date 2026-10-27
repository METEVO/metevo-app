export interface MetevoLspConfig {
  baseUrl: string;
  bearerToken: string;
  fetchImpl?: typeof fetch;
  /** Per-request timeout in ms; the default keeps the flow fail-fast. */
  timeoutMs?: number;
}

export interface MetevoBuyQuote {
  paymentHash: string;
  invoice: string;
  amountMsat: number;
  sats: number;
  usdAmount: number;
  assetId: string;
  assetAmount: number;
  satsPerUsd: number;
  expiresAt: number;
}

export interface MetevoClaimResult {
  paymentHash: string;
  assetId: string;
  assetAmount: number;
  status: string;
  reason?: string;
}

/**
 * Invoice-relay contract (client side; the utexo-lsp routes are a
 * documented follow-up):
 * - POST /metevo/invoice-request  { recipient, asset_id?, amount_usd }
 *     -> { request_id, expires_at }  (the LSP forwards the request to the
 *        recipient's active node, which answers with a wallet.createInvoice
 *        payload)
 * - POST /metevo/invoice-response { request_id }
 *     -> { status: 'pending' | 'delivered', invoice?, payment_hash? }
 */
export interface MetevoInvoiceRequestResult {
  requestId: string;
  expiresAt: number;
}

export type MetevoInvoiceRelayResponse =
  | { status: 'pending' }
  | { status: 'declined' }
  | { status: 'expired' }
  | { status: 'delivered'; invoice: string; paymentHash: string | null };

/** A pending request in the recipient's relay inbox. */
export interface MetevoInvoiceInboxEntry {
  requestId: string;
  /** The requesting node; resolved to a contact name on the recipient side. */
  senderPubkey: string | null;
  amountUsd: number;
  assetId: string | null;
  /** Unix milliseconds. */
  expiresAt: number;
}

export class MetevoLspError extends Error {
  readonly endpoint: string;
  readonly status: number;
  readonly body: string;

  constructor(endpoint: string, status: number, body: string, cause?: unknown) {
    super(`Metevo LSP ${endpoint} -> HTTP ${status || 'transport failure'}: ${body}`);
    this.name = 'MetevoLspError';
    this.endpoint = endpoint;
    this.status = status;
    this.body = body;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export class MetevoLspClient {
  private readonly baseUrl: string;
  private readonly bearerToken: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(config: MetevoLspConfig) {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    if (baseUrl.length === 0) {
      throw new TypeError('MetevoLspClient: baseUrl is required');
    }
    if (config.bearerToken.trim().length === 0) {
      throw new TypeError('MetevoLspClient: bearerToken is required');
    }
    this.baseUrl = baseUrl;
    this.bearerToken = config.bearerToken;
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  async buy(usdAmount: number): Promise<MetevoBuyQuote> {
    if (!Number.isSafeInteger(usdAmount) || usdAmount <= 0) {
      throw new TypeError('buy: usdAmount must be a positive integer (whole USD)');
    }
    const body = await this.request('POST', '/metevo/buy', { usd_amount: usdAmount });
    return parseBuyQuote(body);
  }

  async claim(params: {
    paymentHash: string;
    rgbInvoice: string;
    paymentPreimage?: string | null;
  }): Promise<MetevoClaimResult> {
    const body = await this.request('POST', '/metevo/claim', {
      payment_hash: params.paymentHash,
      rgb_invoice: params.rgbInvoice,
      ...(params.paymentPreimage ? { payment_preimage: params.paymentPreimage } : {}),
    });
    return parseClaimResult(body);
  }

  /**
   * Asks the LSP to relay a dynamic USDm invoice request to the recipient's
   * node. The recipient is a node pubkey (a contact), never a display name:
   * the LSP never sees who the payer calls them.
   */
  async requestInvoice(params: {
    recipientPubkey: string;
    senderPubkey: string | null;
    assetId: string | null;
    amountUsd: number;
  }): Promise<MetevoInvoiceRequestResult> {
    if (!NODE_PUBKEY_PATTERN.test(params.recipientPubkey.trim())) {
      throw new TypeError('requestInvoice: recipientPubkey must be a 66-hex node pubkey');
    }
    if (params.senderPubkey !== null && !NODE_PUBKEY_PATTERN.test(params.senderPubkey.trim())) {
      throw new TypeError('requestInvoice: senderPubkey must be a 66-hex node pubkey');
    }
    if (!Number.isSafeInteger(params.amountUsd) || params.amountUsd <= 0) {
      throw new TypeError('requestInvoice: amountUsd must be a positive integer (whole USD)');
    }
    const body = await this.request('POST', '/metevo/invoice-request', {
      recipient_pubkey: params.recipientPubkey.trim().toLowerCase(),
      ...(params.senderPubkey !== null
        ? { sender_pubkey: params.senderPubkey.trim().toLowerCase() }
        : {}),
      ...(params.assetId !== null ? { asset_id: params.assetId } : {}),
      amount_usd: params.amountUsd,
    });
    return parseInvoiceRequestResult(body);
  }

  /** Polls the relay for the recipient's invoice answer; safe to call
   * repeatedly while the answer is pending. */
  async pollInvoiceResponse(requestId: string): Promise<MetevoInvoiceRelayResponse> {
    if (!/^[0-9a-f]{64}$/i.test(requestId)) {
      throw new TypeError('pollInvoiceResponse: requestId must be a 64-hex hash');
    }
    const body = await this.request('POST', '/metevo/invoice-response', {
      request_id: requestId,
    });
    return parseInvoiceRelayResponse(body);
  }

  /** The recipient's inbox: requests that are still pending and unexpired. */
  async listInvoiceInbox(nodePubkey: string): Promise<MetevoInvoiceInboxEntry[]> {
    if (!NODE_PUBKEY_PATTERN.test(nodePubkey.trim())) {
      throw new TypeError('listInvoiceInbox: nodePubkey must be a 66-hex node pubkey');
    }
    const body = await this.request(
      'GET',
      `/metevo/invoice-inbox?pubkey=${encodeURIComponent(nodePubkey.trim().toLowerCase())}`,
      undefined,
    );
    return parseInvoiceInbox(body);
  }

  /** The recipient's answer: a real invoice from its own node, or a decline. */
  async answerInvoiceRequest(params: {
    requestId: string;
    recipientPubkey: string;
    invoice: string | null;
    paymentHash: string | null;
    declined: boolean;
  }): Promise<void> {
    if (!/^[0-9a-f]{64}$/i.test(params.requestId)) {
      throw new TypeError('answerInvoiceRequest: requestId must be a 64-hex hash');
    }
    if (!NODE_PUBKEY_PATTERN.test(params.recipientPubkey.trim())) {
      throw new TypeError('answerInvoiceRequest: recipientPubkey must be a 66-hex node pubkey');
    }
    if (!params.declined && (params.invoice === null || !params.invoice.startsWith('ln'))) {
      throw new TypeError('answerInvoiceRequest: a bolt11 invoice is required unless declined');
    }
    await this.request('POST', '/metevo/invoice-answer', {
      request_id: params.requestId,
      recipient_pubkey: params.recipientPubkey.trim().toLowerCase(),
      ...(params.invoice !== null ? { invoice: params.invoice } : {}),
      ...(params.paymentHash !== null ? { payment_hash: params.paymentHash } : {}),
      ...(params.declined ? { declined: true } : {}),
    });
  }

  private async request(
    method: 'GET' | 'POST',
    endpoint: string,
    payload: unknown,
  ): Promise<unknown> {
    const controller = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        controller.abort();
        reject(new MetevoLspError(endpoint, 0, 'request timed out'));
      }, this.timeoutMs);
    });

    try {
      const work = (async () => {
        const response = await this.fetchImpl(`${this.baseUrl}${endpoint}`, {
          method,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.bearerToken}`,
          },
          ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
          signal: controller.signal,
        });
        const text = await response.text();
        if (!response.ok) {
          throw new MetevoLspError(endpoint, response.status, text.trim());
        }
        if (text.length === 0) {
          throw new MetevoLspError(endpoint, response.status, 'empty response body');
        }
        try {
          return JSON.parse(text) as unknown;
        } catch (cause) {
          throw new MetevoLspError(endpoint, response.status, `invalid JSON: ${text.slice(0, 200)}`, cause);
        }
      })();
      // A rejection after the timeout won the race must not surface as an
      // unhandled promise rejection.
      void work.catch(() => undefined);
      return await Promise.race([work, timeoutPromise]);
    } catch (cause) {
      if (cause instanceof MetevoLspError) {
        throw cause;
      }
      if (controller.signal.aborted) {
        throw new MetevoLspError(endpoint, 0, 'request timed out', cause);
      }
      throw new MetevoLspError(endpoint, 0, 'request failed', cause);
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/** Compressed secp256k1 node pubkey: 33 bytes, hex. */
const NODE_PUBKEY_PATTERN = /^(02|03)[0-9a-f]{64}$/i;

/**
 * Strict validators for untrusted LSP responses: a malicious or buggy LSP
 * must not be able to inject NaN, negative or non-numeric amounts, or
 * garbage hashes/invoices into the payment flow.
 */
function requireFiniteInteger(
  value: unknown,
  endpoint: string,
  field: string,
  minimum: number,
): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new MetevoLspError(
      endpoint,
      200,
      `response field ${field} is not an integer >= ${minimum}`,
    );
  }
  return parsed;
}

function requireHexHash(value: unknown, endpoint: string, field: string): string {
  const text = typeof value === 'string' ? value : '';
  if (!/^[0-9a-f]{64}$/i.test(text)) {
    throw new MetevoLspError(
      endpoint,
      200,
      `response field ${field} is not a 64-hex hash`,
    );
  }
  return text.toLowerCase();
}

function requireBolt11Invoice(value: unknown, endpoint: string): string {
  const text = typeof value === 'string' ? value : '';
  if (!/^ln[a-z0-9]{6,}/i.test(text)) {
    throw new MetevoLspError(
      endpoint,
      200,
      'response field invoice is not a bolt11 string',
    );
  }
  return text;
}

function parseBuyQuote(value: unknown): MetevoBuyQuote {
  const ENDPOINT = '/metevo/buy';
  if (typeof value !== 'object' || value === null) {
    throw new MetevoLspError(ENDPOINT, 200, 'response is not an object');
  }
  const record = value as Record<string, unknown>;
  const rawExpires = record['expires_at'] ?? 0;
  const expiresAt = typeof rawExpires === 'number' ? rawExpires : Number(rawExpires);
  if (!Number.isFinite(expiresAt) || expiresAt < 0) {
    throw new MetevoLspError(ENDPOINT, 200, 'response field expires_at is not a timestamp');
  }
  return {
    paymentHash: requireHexHash(record['payment_hash'], ENDPOINT, 'payment_hash'),
    invoice: requireBolt11Invoice(record['invoice'], ENDPOINT),
    amountMsat: requireFiniteInteger(record['amount_msat'], ENDPOINT, 'amount_msat', 1),
    sats: requireFiniteInteger(record['sats'], ENDPOINT, 'sats', 1),
    usdAmount: requireFiniteInteger(record['usd_amount'], ENDPOINT, 'usd_amount', 1),
    assetId: String(record['asset_id'] ?? ''),
    assetAmount: requireFiniteInteger(record['asset_amount'], ENDPOINT, 'asset_amount', 1),
    satsPerUsd: requireFiniteInteger(record['sats_per_usd'], ENDPOINT, 'sats_per_usd', 1),
    expiresAt,
  };
}

function parseClaimResult(value: unknown): MetevoClaimResult {
  const ENDPOINT = '/metevo/claim';
  if (typeof value !== 'object' || value === null) {
    throw new MetevoLspError(ENDPOINT, 200, 'response is not an object');
  }
  const record = value as Record<string, unknown>;
  const assetId = String(record['asset_id'] ?? '');
  if (assetId.length === 0) {
    throw new MetevoLspError(ENDPOINT, 200, 'response field asset_id is empty');
  }
  return {
    paymentHash: requireHexHash(record['payment_hash'], ENDPOINT, 'payment_hash'),
    assetId,
    assetAmount: requireFiniteInteger(record['asset_amount'], ENDPOINT, 'asset_amount', 0),
    status: String(record['status'] ?? ''),
    ...(record['reason'] !== undefined ? { reason: String(record['reason']) } : {}),
  };
}

function parseInvoiceRequestResult(value: unknown): MetevoInvoiceRequestResult {
  const ENDPOINT = '/metevo/invoice-request';
  if (typeof value !== 'object' || value === null) {
    throw new MetevoLspError(ENDPOINT, 200, 'response is not an object');
  }
  const record = value as Record<string, unknown>;
  const rawExpires = record['expires_at'] ?? 0;
  const expiresAt = typeof rawExpires === 'number' ? rawExpires : Number(rawExpires);
  if (!Number.isFinite(expiresAt) || expiresAt < 0) {
    throw new MetevoLspError(ENDPOINT, 200, 'response field expires_at is not a timestamp');
  }
  return {
    requestId: requireHexHash(record['request_id'], ENDPOINT, 'request_id'),
    expiresAt,
  };
}

function parseInvoiceRelayResponse(value: unknown): MetevoInvoiceRelayResponse {
  const ENDPOINT = '/metevo/invoice-response';
  if (typeof value !== 'object' || value === null) {
    throw new MetevoLspError(ENDPOINT, 200, 'response is not an object');
  }
  const record = value as Record<string, unknown>;
  const status = String(record['status'] ?? '');
  if (status === 'pending') {
    return { status: 'pending' };
  }
  if (status === 'delivered') {
    const rawHash = record['payment_hash'];
    return {
      status: 'delivered',
      invoice: requireBolt11Invoice(record['invoice'], ENDPOINT),
      paymentHash:
        rawHash === undefined || rawHash === null ? null : requireHexHash(rawHash, ENDPOINT, 'payment_hash'),
    };
  }
  if (status === 'declined' || status === 'expired') {
    return { status };
  }
  throw new MetevoLspError(
    ENDPOINT,
    200,
    `response status ${status} is not pending, delivered, declined or expired`,
  );
}

function parseInvoiceInbox(value: unknown): MetevoInvoiceInboxEntry[] {
  const ENDPOINT = '/metevo/invoice-inbox';
  if (typeof value !== 'object' || value === null) {
    throw new MetevoLspError(ENDPOINT, 200, 'response is not an object');
  }
  const raw = (value as Record<string, unknown>)['requests'];
  if (!Array.isArray(raw)) {
    throw new MetevoLspError(ENDPOINT, 200, 'response field requests is not an array');
  }
  return raw.map((item) => {
    if (typeof item !== 'object' || item === null) {
      throw new MetevoLspError(ENDPOINT, 200, 'inbox entry is not an object');
    }
    const record = item as Record<string, unknown>;
    const rawSender = record['sender_pubkey'];
    const rawAsset = record['asset_id'];
    return {
      requestId: requireHexHash(record['request_id'], ENDPOINT, 'request_id'),
      senderPubkey:
        typeof rawSender === 'string' && NODE_PUBKEY_PATTERN.test(rawSender)
          ? rawSender.toLowerCase()
          : null,
      amountUsd: requireFiniteInteger(record['amount_usd'], ENDPOINT, 'amount_usd', 1),
      assetId: typeof rawAsset === 'string' && rawAsset.length > 0 ? rawAsset : null,
      expiresAt: requireFiniteInteger(record['expires_at'], ENDPOINT, 'expires_at', 0),
    };
  });
}

