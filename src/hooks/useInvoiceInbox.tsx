import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { findContactByPubkey } from '../services/metevo/contacts';
import {
  MetevoInvoiceInboxEntry,
  MetevoLspError,
} from '../services/metevo/lsp-api';
import { loadRelayClient, relayAvailable } from '../services/metevo/relayClient';

/**
 * The recipient's side of the invoice relay: while the wallet is open, the
 * app polls the LSP for invoice requests addressed to this node, so a payer
 * can ask for an invoice and the recipient decides whether to create it.
 *
 * The request carries no money and no invoice: nothing happens until the
 * recipient accepts and its own node creates the invoice.
 */

export interface InvoiceInboxRequest extends MetevoInvoiceInboxEntry {
  /** Contact name for the requesting node, when the recipient saved it. */
  senderName: string | null;
}

interface InvoiceInboxState {
  /** Oldest unanswered request, or null. */
  pending: InvoiceInboxRequest | null;
  /** Set when the relay cannot be reached; the card shows it as attention. */
  error: string | null;
  accept(invoice: string, paymentHash: string | null): Promise<void>;
  decline(): Promise<void>;
  /** Stops showing the current request (the card's Done). */
  dismiss(): void;
}

const InvoiceInboxContext = createContext<InvoiceInboxState | null>(null);

/** Recipient inbox poll: short enough to feel immediate, cheap on a LAN. */
const INBOX_POLL_INTERVAL_MS = 3_000;

export function InvoiceInboxProvider({
  nodePubkey,
  enabled,
  children,
}: {
  nodePubkey: string | null;
  enabled: boolean;
  children: ReactNode;
}) {
  const [pending, setPending] = useState<InvoiceInboxRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef<Set<string>>(new Set());

  // shortcut: in-app polling only, so a request arrives while the app is
  // open; add expo-notifications and a foreground service when wake-ups are
  // needed in the demo.
  useEffect(() => {
    setPending(null);
    setError(null);
    if (!enabled || nodePubkey === null || !relayAvailable()) {
      return undefined;
    }
    let cancelled = false;

    const tick = async () => {
      // Android throttles background timers; do not spend a request there.
      if (cancelled || AppState.currentState !== 'active') {
        return;
      }
      try {
        const inbox = await (await loadRelayClient()).listInvoiceInbox(nodePubkey);
        if (cancelled) {
          return;
        }
        const next = inbox.find((entry) => !handledRef.current.has(entry.requestId)) ?? null;
        if (next === null) {
          setPending(null);
          setError(null);
          return;
        }
        const sender =
          next.senderPubkey === null ? null : await findContactByPubkey(next.senderPubkey);
        if (cancelled) {
          return;
        }
        setPending((current) =>
          current !== null && current.requestId === next.requestId
            ? current
            : { ...next, senderName: sender?.name ?? null },
        );
        setError(null);
      } catch (cause) {
        if (!cancelled) {
          console.log(
            '[metevo] invoice inbox poll failed:',
            cause instanceof Error ? cause.message : 'unknown',
          );
          setError('Could not reach the payment relay.');
        }
      }
    };

    void tick();
    const timer = setInterval(() => void tick(), INBOX_POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void tick();
      }
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [enabled, nodePubkey]);

  const accept = useCallback(
    async (invoice: string, paymentHash: string | null) => {
      if (pending === null || nodePubkey === null) {
        throw new Error('no pending invoice request');
      }
      await (
        await loadRelayClient()
      ).answerInvoiceRequest({
        requestId: pending.requestId,
        recipientPubkey: nodePubkey,
        invoice,
        paymentHash,
        declined: false,
      });
      handledRef.current.add(pending.requestId);
      setPending(null);
      setError(null);
    },
    [pending, nodePubkey],
  );

  const decline = useCallback(async () => {
    if (pending === null || nodePubkey === null) {
      return;
    }
    await (
      await loadRelayClient()
    ).answerInvoiceRequest({
      requestId: pending.requestId,
      recipientPubkey: nodePubkey,
      invoice: null,
      paymentHash: null,
      declined: true,
    });
    handledRef.current.add(pending.requestId);
    setPending(null);
    setError(null);
  }, [pending, nodePubkey]);

  const dismiss = useCallback(() => {
    if (pending !== null) {
      handledRef.current.add(pending.requestId);
    }
    setPending(null);
  }, [pending]);

  const value = useMemo(
    () => ({ pending, error, accept, decline, dismiss }),
    [pending, error, accept, decline, dismiss],
  );

  return (
    <InvoiceInboxContext.Provider value={value}>{children}</InvoiceInboxContext.Provider>
  );
}

export function useInvoiceInbox(): InvoiceInboxState {
  const state = useContext(InvoiceInboxContext);
  if (state === null) {
    throw new Error('useInvoiceInbox requires InvoiceInboxProvider');
  }
  return state;
}

/** User-facing copy for a failed answer (the card owns the attention state). */
export function relayErrorMessage(cause: unknown): string {
  if (cause instanceof MetevoLspError) {
    if (cause.status === 409) {
      return 'This request was already answered or has expired.';
    }
    if (cause.status === 404) {
      return 'This request is no longer available.';
    }
    if (cause.status === 401 || cause.status === 403) {
      return 'The payment relay rejected this device.';
    }
  }
  return 'The invoice could not be sent. Try again.';
}
