/**
 * Direct (offline) channel payment over the local link.
 *
 * When both devices are on the receiver's Wi-Fi Direct group, a payment
 * between two peers sharing a channel does not need the LSP: the payer
 * establishes the LDK peer session with the receiver across the group
 * (connectPeer over the 192.168.49.x socket) and pays the invoice - the
 * signed HTLC state updates then flow INSIDE that encrypted peer session.
 * This module never serializes commitment/HTLC messages itself; it wires
 * the node's own machinery to the direct link.
 */

export type PaymentRoute = 'direct' | 'lsp';

export interface DirectRouteHint {
  nodePubkey: string;
  ldkPort: number;
}

export interface DirectRoutePlan {
  route: PaymentRoute;
  /** Human-readable reason for the confirmation card / voice feedback. */
  reason: string;
}

/**
 * Route decision for an in-person payment: the direct channel wins when
 * the receiver advertised a peer listener AND this node has a usable
 * channel with exactly that peer. Everything else routes through the LSP.
 */
export function planPaymentRoute(params: {
  directHint: DirectRouteHint | null;
  hasUsableChannelWithPeer: boolean;
  preferDirect: boolean;
}): DirectRoutePlan {
  if (!params.preferDirect) {
    return { route: 'lsp', reason: 'Remote payment: routed through the LSP.' };
  }
  if (params.directHint === null) {
    return {
      route: 'lsp',
      reason: 'The receiver serves no direct route; trying the LSP.',
    };
  }
  if (!params.hasUsableChannelWithPeer) {
    return {
      route: 'lsp',
      reason: 'No direct channel with this contact yet; trying the LSP.',
    };
  }
  return {
    route: 'direct',
    reason: 'Settles over your direct channel - no LSP needed.',
  };
}

export interface DirectPaymentOps {
  /** Opens the LDK peer session (pubkey@host:port). */
  connectPeer(peerUri: string): Promise<void>;
  /** Pays a bolt11 invoice on the connected session. */
  payInvoice(invoice: string): Promise<{ paymentHash: string | null }>;
}

/**
 * Pays an invoice over the direct channel: peer session first (the HTLC
 * exchange needs it), then the payment. A connect failure propagates
 * BEFORE any payment attempt - nothing was submitted and nothing is
 * resent.
 */
export async function payOverDirectChannel(
  ops: DirectPaymentOps,
  params: { host: string; nodePubkey: string; ldkPort: number; invoice: string },
): Promise<{ paymentHash: string | null }> {
  await ops.connectPeer(`${params.nodePubkey}@${params.host}:${params.ldkPort}`);
  return ops.payInvoice(params.invoice);
}
