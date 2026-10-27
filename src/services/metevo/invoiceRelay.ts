import {
  MetevoInvoiceRelayResponse,
  MetevoInvoiceRequestResult,
  MetevoLspClient,
} from './lsp-api';

/**
 * Invoice relay seam: who answers a payment intent with a payable invoice.
 *
 * - LSP relay (real): the LSP forwards the request to the recipient's
 *   active node, which responds with a wallet.createInvoice payload.
 * - Mock relay (Expo Go demos): an in-process stand-in "recipient node"
   creates the invoice on first poll, so the whole remote flow runs
 *   without the LSP server.
 */
export interface InvoiceRelay {
  requestInvoice(params: {
    /** Node pubkey of the contact receiving the request. */
    recipientPubkey: string;
    /** The payer's own node pubkey, so the recipient can name the request. */
    senderPubkey: string | null;
    assetId: string | null;
    amountUsd: number;
  }): Promise<MetevoInvoiceRequestResult>;
  pollResponse(requestId: string): Promise<MetevoInvoiceRelayResponse>;
}

/** Deterministic id for mock requests (hex so the contract shape holds);
 * the caller mixes a sequence number into the seed for uniqueness. */
function mockRequestId(seed: string): string {
  let counter = 0;
  for (let index = 0; index < seed.length; index += 1) {
    counter = counter * 31 + seed.charCodeAt(index);
  }
  let hash = '';
  while (hash.length < 64) {
    counter = Math.imul(counter, 1_103_515_245) + 12_345;
    hash += (counter >>> 0).toString(16).padStart(8, '0');
  }
  return hash.slice(0, 64);
}

export function createLspInvoiceRelay(client: MetevoLspClient): InvoiceRelay {
  return {
    async requestInvoice(params) {
      return client.requestInvoice(params);
    },
    async pollResponse(requestId) {
      return client.pollInvoiceResponse(requestId);
    },
  };
}

export interface MockInvoiceRelayOptions {
  /** Stands in for the recipient node's wallet.createInvoice call. */
  createInvoice: (params: { recipient: string; amountUsd: number }) => Promise<string>;
}

export function createMockInvoiceRelay(options: MockInvoiceRelayOptions): InvoiceRelay {
  interface MockRequest {
    params: { recipient: string; amountUsd: number };
    invoice: string | null;
    paymentHash: string | null;
  }
  const requests = new Map<string, MockRequest>();
  let sequence = 0;

  return {
    async requestInvoice(params) {
      sequence += 1;
      const requestId = mockRequestId(`${params.recipientPubkey}:${sequence}`);
      requests.set(requestId, {
        params: {
          recipient: params.recipientPubkey,
          amountUsd: params.amountUsd,
        },
        invoice: null,
        paymentHash: null,
      });
      return { requestId, expiresAt: Date.now() + 3_600_000 };
    },
    async pollResponse(requestId) {
      const request = requests.get(requestId);
      if (request === undefined) {
        throw new Error('mock relay: unknown invoice request');
      }
      // First poll simulates the recipient node creating the invoice; the
      // LSP relay answers pending once, then the created answer is stable.
      if (request.invoice === null) {
        request.invoice = await options.createInvoice({
          recipient: request.params.recipient,
          amountUsd: request.params.amountUsd,
        });
        request.paymentHash = mockRequestId(request.invoice).slice(0, 64);
        return { status: 'pending' };
      }
      return {
        status: 'delivered',
        invoice: request.invoice,
        paymentHash: request.paymentHash,
      };
    },
  };
}
