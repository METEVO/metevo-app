export interface MetevoLspConfig {
  baseUrl: string;
  bearerToken: string;
  fetchImpl?: typeof fetch;
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

  private async request(method: 'POST', endpoint: string, payload: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.bearerToken}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (cause) {
      throw new MetevoLspError(endpoint, 0, 'request failed', cause);
    }
    const text = await response.text();
    if (!response.ok) {
      throw new MetevoLspError(endpoint, response.status, text.trim());
    }
    if (text.length === 0) {
      throw new MetevoLspError(endpoint, response.status, 'empty response body');
    }
    try {
      return JSON.parse(text);
    } catch (cause) {
      throw new MetevoLspError(endpoint, response.status, `invalid JSON: ${text.slice(0, 200)}`, cause);
    }
  }
}

function parseBuyQuote(value: unknown): MetevoBuyQuote {
  if (typeof value !== 'object' || value === null) {
    throw new MetevoLspError('/metevo/buy', 200, 'response is not an object');
  }
  const record = value as Record<string, unknown>;
  const required = ['payment_hash', 'invoice', 'amount_msat', 'sats', 'usd_amount', 'asset_id', 'asset_amount', 'sats_per_usd'] as const;
  for (const key of required) {
    const present = typeof record[key] === 'string' || typeof record[key] === 'number';
    if (!present) {
      throw new MetevoLspError('/metevo/buy', 200, `response is missing ${key}`);
    }
  }
  return {
    paymentHash: String(record['payment_hash']),
    invoice: String(record['invoice']),
    amountMsat: Number(record['amount_msat']),
    sats: Number(record['sats']),
    usdAmount: Number(record['usd_amount']),
    assetId: String(record['asset_id']),
    assetAmount: Number(record['asset_amount']),
    satsPerUsd: Number(record['sats_per_usd']),
    expiresAt: Number(record['expires_at'] ?? 0),
  };
}

function parseClaimResult(value: unknown): MetevoClaimResult {
  if (typeof value !== 'object' || value === null) {
    throw new MetevoLspError('/metevo/claim', 200, 'response is not an object');
  }
  const record = value as Record<string, unknown>;
  return {
    paymentHash: String(record['payment_hash'] ?? ''),
    assetId: String(record['asset_id'] ?? ''),
    assetAmount: Number(record['asset_amount'] ?? 0),
    status: String(record['status'] ?? ''),
    ...(record['reason'] !== undefined ? { reason: String(record['reason']) } : {}),
  };
}
