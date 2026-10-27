import { z } from 'zod';

/**
 * Typed client for the rgb-lightning-node REST API (openapi.yaml of the
 * node build the regtest stack runs). Only the endpoints the wallet uses
 * are modelled; responses are validated because they cross the network.
 */

/** The node answered with an error body ({ error, code, name }). */
export class RlnApiError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
    readonly errorName: string,
  ) {
    super(`${endpoint} failed: ${errorName} (http ${status})`);
    this.name = 'RlnApiError';
  }
}

/** No answer at all: network down, wrong URL, timeout, or a malformed body. */
export class RlnUnreachableError extends Error {
  constructor(readonly endpoint: string, reason: string) {
    super(`${endpoint} unreachable: ${reason}`);
    this.name = 'RlnUnreachableError';
  }
}

const nodeInfoSchema = z
  .object({
    pubkey: z.string(),
    num_usable_channels: z.number().int(),
    rgb_htlc_min_msat: z.number().int(),
  })
  .passthrough();

const btcBalanceSchema = z.object({
  vanilla: z.object({ settled: z.number(), future: z.number(), spendable: z.number() }),
  colored: z.object({ settled: z.number(), future: z.number(), spendable: z.number() }),
});

const assetBalanceSchema = z.object({
  settled: z.number(),
  future: z.number(),
  spendable: z.number(),
  offchain_outbound: z.number(),
  offchain_inbound: z.number(),
});

const assetSummarySchema = z.object({ asset_id: z.string(), ticker: z.string() }).passthrough();

const listAssetsSchema = z.object({
  nia: z.array(assetSummarySchema).nullable(),
  ifa: z.array(assetSummarySchema).nullable().optional(),
});

const channelSchema = z
  .object({
    channel_id: z.string(),
    peer_pubkey: z.string(),
    is_usable: z.boolean(),
    asset_id: z.string().nullable().optional(),
    asset_local_amount: z.number().nullable().optional(),
  })
  .passthrough();

const paymentSchema = z
  .object({
    payment_hash: z.string(),
    payment_type: z.string(),
    status: z.string(),
    asset_id: z.string().nullable().optional(),
    asset_amount: z.number().nullable().optional(),
    created_at: z.number(),
  })
  .passthrough();

const transferSchema = z
  .object({
    idx: z.number().int(),
    status: z.string(),
    kind: z.string(),
    assignments: z.array(z.object({ type: z.string(), value: z.number().optional() }).passthrough()),
  })
  .passthrough();

const errorBodySchema = z.object({ name: z.string() }).passthrough();

export type RlnNodeInfo = z.infer<typeof nodeInfoSchema>;
export type RlnBtcBalance = z.infer<typeof btcBalanceSchema>;
export type RlnAssetBalance = z.infer<typeof assetBalanceSchema>;
export type RlnChannel = z.infer<typeof channelSchema>;
export type RlnPayment = z.infer<typeof paymentSchema>;
export type RlnTransfer = z.infer<typeof transferSchema>;

export interface RlnLnInvoiceRequest {
  amtMsat: number;
  expirySec: number;
  assetId: string | null;
  assetAmount: number | null;
}

export interface RlnRestClientConfig {
  baseUrl: string;
  timeoutMs: number;
  bearerToken?: string | null;
  fetchImpl?: typeof fetch;
}

export interface RlnDecodedInvoice {
  paymentHash: string;
  payeePubkey: string | null;
  amountMsat: number | null;
  assetId: string | null;
  assetAmount: number | null;
}

export interface RlnRestClient {
  nodeInfo(): Promise<RlnNodeInfo>;
  btcBalance(skipSync: boolean): Promise<RlnBtcBalance>;
  assetBalance(assetId: string): Promise<RlnAssetBalance>;
  findNiaAssetIdByTicker(ticker: string): Promise<string | null>;
  listChannels(): Promise<RlnChannel[]>;
  listPayments(): Promise<RlnPayment[]>;
  createLnInvoice(request: RlnLnInvoiceRequest): Promise<string>;
  decodeLnInvoice(invoice: string): Promise<RlnDecodedInvoice>;
  decodeLnInvoicePaymentHash(invoice: string): Promise<string>;
  sendPayment(invoice: string): Promise<{ paymentHash: string | null; status: string }>;
  connectPeer(peerUri: string): Promise<void>;
  refreshTransfers(): Promise<void>;
  listTransfers(assetId: string): Promise<RlnTransfer[]>;
}

export function createRlnRestClient(config: RlnRestClientConfig): RlnRestClient {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;

  async function call<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    schema: z.ZodType<T>,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          Accept: 'application/json',
          // The node rejects POSTs without this header even for empty bodies.
          ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
          ...(config.bearerToken ? { Authorization: `Bearer ${config.bearerToken}` } : {}),
        },
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
        signal: controller.signal,
      });
    } catch {
      throw new RlnUnreachableError(endpoint, controller.signal.aborted ? 'timed out' : 'network error');
    } finally {
      clearTimeout(timer);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new RlnUnreachableError(endpoint, `non-JSON response (http ${response.status})`);
    }
    if (!response.ok) {
      const errorBody = errorBodySchema.safeParse(json);
      throw new RlnApiError(endpoint, response.status, errorBody.success ? errorBody.data.name : 'Unknown');
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new RlnUnreachableError(endpoint, 'unexpected response shape');
    }
    return parsed.data;
  }

  const anyBody = z.unknown();

  async function decodeInvoice(invoice: string): Promise<RlnDecodedInvoice> {
    const decoded = await call(
      'POST',
      '/decodelninvoice',
      z
        .object({
          payment_hash: z.string(),
          payee_pubkey: z.string().nullable().optional(),
          amt_msat: z.number().int().nullable().optional(),
          asset_id: z.string().nullable().optional(),
          asset_amount: z.number().int().nullable().optional(),
        })
        .passthrough(),
      { invoice },
    );
    return {
      paymentHash: decoded.payment_hash,
      payeePubkey: decoded.payee_pubkey ?? null,
      amountMsat: decoded.amt_msat ?? null,
      assetId: decoded.asset_id ?? null,
      assetAmount: decoded.asset_amount ?? null,
    };
  }

  return {
    nodeInfo: () => call('GET', '/nodeinfo', nodeInfoSchema),

    btcBalance: (skipSync) =>
      call('POST', '/btcbalance', btcBalanceSchema, { skip_sync: skipSync }),

    assetBalance: (assetId) =>
      call('POST', '/assetbalance', assetBalanceSchema, { asset_id: assetId }),

    async findNiaAssetIdByTicker(ticker) {
      const assets = await call('POST', '/listassets', listAssetsSchema, {
        filter_asset_schemas: ['Nia'],
      });
      const wanted = ticker.toLowerCase();
      return assets.nia?.find((asset) => asset.ticker.toLowerCase() === wanted)?.asset_id ?? null;
    },

    async listChannels() {
      return (await call('GET', '/listchannels', z.object({ channels: z.array(channelSchema) }))).channels;
    },

    async listPayments() {
      return (await call('GET', '/listpayments', z.object({ payments: z.array(paymentSchema) }))).payments;
    },

    async createLnInvoice(request) {
      const response = await call('POST', '/lninvoice', z.object({ invoice: z.string().min(1) }), {
        amt_msat: request.amtMsat,
        expiry_sec: request.expirySec,
        asset_id: request.assetId,
        asset_amount: request.assetAmount,
      });
      return response.invoice;
    },

    async decodeLnInvoice(invoice) {
      return decodeInvoice(invoice);
    },

    async decodeLnInvoicePaymentHash(invoice) {
      return (await decodeInvoice(invoice)).paymentHash;
    },

    async sendPayment(invoice) {
      const sent = await call(
        'POST',
        '/sendpayment',
        z.object({ payment_hash: z.string().nullable().optional(), status: z.string() }).passthrough(),
        { invoice },
      );
      return { paymentHash: sent.payment_hash ?? null, status: sent.status };
    },

    async connectPeer(peerUri) {
      await call('POST', '/connectpeer', anyBody, { peer_pubkey_and_addr: peerUri });
    },

    async refreshTransfers() {
      await call('POST', '/refreshtransfers', anyBody, { filter: [], skip_sync: false });
    },

    async listTransfers(assetId) {
      // The node's AssetFilter is a serde enum discriminated by `type`; the
      // Id variant carries the asset in `value` (openapi.yaml: AssetFilterId).
      const response = await call('POST', '/listtransfers', z.object({ transfers: z.array(transferSchema) }), {
        asset_filter: { type: 'Id', value: assetId },
      });
      return response.transfers;
    },
  };
}
