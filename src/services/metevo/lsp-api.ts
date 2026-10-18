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

  private async request(method: 'POST', endpoint: string, payload: unknown): Promise<unknown> {
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
          body: JSON.stringify(payload),
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
