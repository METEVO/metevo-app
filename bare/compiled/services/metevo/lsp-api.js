export class MetevoLspError extends Error {
    endpoint;
    status;
    body;
    constructor(endpoint, status, body, cause) {
        super(`Metevo LSP ${endpoint} -> HTTP ${status || 'transport failure'}: ${body}`);
        this.name = 'MetevoLspError';
        this.endpoint = endpoint;
        this.status = status;
        this.body = body;
        if (cause !== undefined) {
            this.cause = cause;
        }
    }
}
export class MetevoLspClient {
    baseUrl;
    bearerToken;
    fetchImpl;
    timeoutMs;
    constructor(config) {
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
    async buy(usdAmount) {
        if (!Number.isSafeInteger(usdAmount) || usdAmount <= 0) {
            throw new TypeError('buy: usdAmount must be a positive integer (whole USD)');
        }
        const body = await this.request('POST', '/metevo/buy', { usd_amount: usdAmount });
        return parseBuyQuote(body);
    }
    async claim(params) {
        const body = await this.request('POST', '/metevo/claim', {
            payment_hash: params.paymentHash,
            rgb_invoice: params.rgbInvoice,
            ...(params.paymentPreimage ? { payment_preimage: params.paymentPreimage } : {}),
        });
        return parseClaimResult(body);
    }
    /**
     * Asks the LSP to relay a dynamic USDm invoice request to the recipient's
     * active node. The response only acknowledges the request; the payable
     * invoice arrives through pollInvoiceResponse.
     */
    async requestInvoice(params) {
        if (params.recipient.trim().length === 0) {
            throw new TypeError('requestInvoice: recipient is required');
        }
        if (!Number.isSafeInteger(params.amountUsd) || params.amountUsd <= 0) {
            throw new TypeError('requestInvoice: amountUsd must be a positive integer (whole USD)');
        }
        const body = await this.request('POST', '/metevo/invoice-request', {
            recipient: params.recipient,
            ...(params.assetId !== null ? { asset_id: params.assetId } : {}),
            amount_usd: params.amountUsd,
        });
        return parseInvoiceRequestResult(body);
    }
    /** Polls the relay for the recipient's invoice answer; safe to call
     * repeatedly while the answer is pending. */
    async pollInvoiceResponse(requestId) {
        if (!/^[0-9a-f]{64}$/i.test(requestId)) {
            throw new TypeError('pollInvoiceResponse: requestId must be a 64-hex hash');
        }
        const body = await this.request('POST', '/metevo/invoice-response', {
            request_id: requestId,
        });
        return parseInvoiceRelayResponse(body);
    }
    async request(method, endpoint, payload) {
        const controller = new AbortController();
        let timeoutHandle;
        const timeoutPromise = new Promise((_, reject) => {
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
                    return JSON.parse(text);
                }
                catch (cause) {
                    throw new MetevoLspError(endpoint, response.status, `invalid JSON: ${text.slice(0, 200)}`, cause);
                }
            })();
            // A rejection after the timeout won the race must not surface as an
            // unhandled promise rejection.
            void work.catch(() => undefined);
            return await Promise.race([work, timeoutPromise]);
        }
        catch (cause) {
            if (cause instanceof MetevoLspError) {
                throw cause;
            }
            if (controller.signal.aborted) {
                throw new MetevoLspError(endpoint, 0, 'request timed out', cause);
            }
            throw new MetevoLspError(endpoint, 0, 'request failed', cause);
        }
        finally {
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
function requireFiniteInteger(value, endpoint, field, minimum) {
    const parsed = typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim().length > 0
            ? Number(value)
            : Number.NaN;
    if (!Number.isSafeInteger(parsed) || parsed < minimum) {
        throw new MetevoLspError(endpoint, 200, `response field ${field} is not an integer >= ${minimum}`);
    }
    return parsed;
}
function requireHexHash(value, endpoint, field) {
    const text = typeof value === 'string' ? value : '';
    if (!/^[0-9a-f]{64}$/i.test(text)) {
        throw new MetevoLspError(endpoint, 200, `response field ${field} is not a 64-hex hash`);
    }
    return text.toLowerCase();
}
function requireBolt11Invoice(value, endpoint) {
    const text = typeof value === 'string' ? value : '';
    if (!/^ln[a-z0-9]{6,}/i.test(text)) {
        throw new MetevoLspError(endpoint, 200, 'response field invoice is not a bolt11 string');
    }
    return text;
}
function parseBuyQuote(value) {
    const ENDPOINT = '/metevo/buy';
    if (typeof value !== 'object' || value === null) {
        throw new MetevoLspError(ENDPOINT, 200, 'response is not an object');
    }
    const record = value;
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
function parseClaimResult(value) {
    const ENDPOINT = '/metevo/claim';
    if (typeof value !== 'object' || value === null) {
        throw new MetevoLspError(ENDPOINT, 200, 'response is not an object');
    }
    const record = value;
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
function parseInvoiceRequestResult(value) {
    const ENDPOINT = '/metevo/invoice-request';
    if (typeof value !== 'object' || value === null) {
        throw new MetevoLspError(ENDPOINT, 200, 'response is not an object');
    }
    const record = value;
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
function parseInvoiceRelayResponse(value) {
    const ENDPOINT = '/metevo/invoice-response';
    if (typeof value !== 'object' || value === null) {
        throw new MetevoLspError(ENDPOINT, 200, 'response is not an object');
    }
    const record = value;
    const status = String(record['status'] ?? '');
    if (status === 'pending') {
        return { status: 'pending' };
    }
    if (status === 'delivered') {
        const rawHash = record['payment_hash'];
        return {
            status: 'delivered',
            invoice: requireBolt11Invoice(record['invoice'], ENDPOINT),
            paymentHash: rawHash === undefined || rawHash === null ? null : requireHexHash(rawHash, ENDPOINT, 'payment_hash'),
        };
    }
    throw new MetevoLspError(ENDPOINT, 200, `response status ${status} is not pending or delivered`);
}
