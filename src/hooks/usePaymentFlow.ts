import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ENV } from '../config/env';
import {
  InvoiceRelay,
  createLspInvoiceRelay,
  createMockInvoiceRelay,
} from '../services/metevo/invoiceRelay';
import { findContactByName, isValidNodePubkey } from '../services/metevo/contacts';
import { PaymentValidationError } from '../services/metevo/paymentGuard';
import { ReviewedPayment } from '../services/metevo/wallet-gateway';
import { loadRelayClient } from '../services/metevo/relayClient';
import { PaymentVoiceIntent } from '../services/metevo/paymentIntent';
import { SubmittedPayment } from '../services/metevo/wallet-gateway';
import {
  NOT_AUTHORIZED_NOTE,
  lowBalanceWarning,
  paymentMessage,
  type PaymentMessageContext,
} from '../services/metevo/paymentMessages';
import { playTacton } from '../services/metevo/tacton';
import { announceForAccessibility, speakEnglish } from '../utils/speaker';
import { useTransferWatcher } from './useTransferWatcher';
import { useWalletSession } from './useWalletSession';

/**
 * Remote (LSP-relayed) payment flow stages: the intent becomes a relayed
 * invoice request, the user reviews and authorizes it with a biometric
 * prompt (device-credential fallback), the payment is submitted exactly
 * once, and the transfer watcher owns the settlement outcome.
 */
export type PaymentFlowStage =
  | 'idle'
  | 'requesting'
  | 'review'
  | 'authorizing'
  | 'submitting'
  | 'watching'
  | 'settled'
  | 'failed'
  | 'unknown'
  | 'error';

export interface PaymentFlowProposal {
  recipient: string;
  asset: string;
  amount: number;
  invoice: string;
  requestId: string;
  /** What the user reviewed; the gateway refuses a mismatching invoice. */
  expected: ReviewedPayment;
}

/** Relay answer polling: the recipient has up to 90 s to confirm the
 * request and create the invoice on their own node. */
const RELAY_POLL_INTERVAL_MS = 1_500;
const RELAY_ANSWER_TIMEOUT_MS = 90_000;

/** USDm has 8 decimals: 20 USDm = 2_000_000_000 base units. */
const USDM_BASE_UNITS_PER_USD = 10 ** 8;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The spoken name never leaves the phone: the relay only accepts a node
 * pubkey, and the contact book is the only name -> node mapping. Mock mode
 * has no server, so the label stays local.
 */
async function resolveRecipientPubkey(recipient: string): Promise<string | null> {
  if (ENV.EXPO_PUBLIC_WALLET_MODE === 'mock') {
    return recipient.trim();
  }
  const contact = await findContactByName(recipient);
  if (contact === null || !isValidNodePubkey(contact.nodePubkey)) {
    return null;
  }
  return contact.nodePubkey;
}

export function usePaymentFlow() {
  const { submitPayment, checkPayment, wallet } = useWalletSession();
  const watcher = useTransferWatcher();
  const [stage, setStage] = useState<PaymentFlowStage>('idle');
  const [proposal, setProposal] = useState<PaymentFlowProposal | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const relayRef = useRef<InvoiceRelay | null>(null);
  const mountedRef = useRef(true);
  const stageRef = useRef<PaymentFlowStage>('idle');
  const [balanceWarning, setBalanceWarning] = useState<string | null>(null);
  const contextRef = useRef<PaymentMessageContext>({
    recipient: '',
    amount: 0,
    canCheckStatus: false,
  });
  /** The submitted payment's hash: "Check status" asks about this payment
   * only, it never sends a new one. */
  const paymentHashRef = useRef<string | null>(null);
  /** Bumped by cancel: a request loop from an abandoned attempt stops and
   * never reopens an old proposal. */
  const requestRunRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const enterStage = useCallback((next: PaymentFlowStage) => {
    stageRef.current = next;
    if (mountedRef.current) {
      setStage(next);
    }
    const spoken = paymentMessage(next, contextRef.current).spoken;
    if (spoken !== null && mountedRef.current) {
      speakEnglish(spoken);
      announceForAccessibility(spoken);
    }
  }, []);

  /** The flow cannot go on: shown and read out loud, nothing was paid. */
  const failWith = useCallback(
    (note: string) => {
      enterStage('error');
      setNote(note);
      playTacton('error');
      speakEnglish(note);
      announceForAccessibility(note);
    },
    [enterStage],
  );

  /** Back to review without repeating its spoken line: only the reason is read. */
  const backToReview = useCallback((note: string) => {
    stageRef.current = 'review';
    if (mountedRef.current) {
      setStage('review');
      setNote(note);
    }
    playTacton('error');
    speakEnglish(note);
    announceForAccessibility(note);
  }, []);

  const ensureRelay = useCallback(async (): Promise<InvoiceRelay> => {
    if (relayRef.current !== null) {
      return relayRef.current;
    }
    if (ENV.EXPO_PUBLIC_WALLET_MODE === 'mock') {
      // The in-process stand-in plays the recipient's node: it answers a
      // demo invoice on the first poll without any LSP server.
      relayRef.current = createMockInvoiceRelay({
        createInvoice: async ({ recipient, amountUsd }) =>
          `lntb1metevomock${amountUsd}usdmto${recipient.length}charsdemo`,
      });
      return relayRef.current;
    }
    relayRef.current = createLspInvoiceRelay(await loadRelayClient());
    return relayRef.current;
  }, []);

  const start = useCallback(
    async (intent: PaymentVoiceIntent) => {
      contextRef.current = {
        recipient: intent.recipient,
        amount: intent.amount,
        canCheckStatus: false,
      };
      setBalanceWarning(null);
      paymentHashRef.current = null;
      const run = ++requestRunRef.current;
      const abandoned = () => run !== requestRunRef.current || !mountedRef.current;
      enterStage('requesting');
      setNote(null);
      try {
        const recipientPubkey = await resolveRecipientPubkey(intent.recipient);
        if (abandoned()) return;
        if (recipientPubkey === null) {
          failWith(
            `No contact named ${intent.recipient}. Add their node pubkey in Contacts first.`,
          );
          return;
        }
        const relay = await ensureRelay();
        const request = await relay.requestInvoice({
          recipientPubkey,
          senderPubkey: wallet?.nodePubkey ?? null,
          assetId: null,
          amountUsd: intent.amount,
        });
        if (abandoned()) return;
        const deadline = Date.now() + RELAY_ANSWER_TIMEOUT_MS;
        while (Date.now() < deadline) {
          const answer = await relay.pollResponse(request.requestId);
          if (abandoned()) return;
          if (answer.status === 'delivered') {
            setProposal({
              recipient: intent.recipient,
              asset: intent.asset,
              amount: intent.amount,
              invoice: answer.invoice,
              requestId: request.requestId,
              expected: {
                // In mock mode the "recipient" is a label, not a node.
                payeePubkey:
                  ENV.EXPO_PUBLIC_WALLET_MODE === 'mock'
                    ? null
                    : recipientPubkey,
                assetAmountBaseUnits: intent.amount * USDM_BASE_UNITS_PER_USD,
              },
            });
            const warning = lowBalanceWarning(
              intent.amount,
              wallet?.balanceUsdmBaseUnits ?? null,
            );
            contextRef.current = { ...contextRef.current, balanceWarning: warning };
            setBalanceWarning(warning);
            enterStage('review');
            return;
          }
          if (answer.status === 'declined') {
            failWith(`${intent.recipient} declined the request.`);
            return;
          }
          if (answer.status === 'expired') {
            failWith('The request expired before the invoice arrived.');
            return;
          }
          await sleep(RELAY_POLL_INTERVAL_MS);
          if (abandoned()) return;
        }
        failWith('The recipient did not answer in time. Try again.');
      } catch (cause) {
        if (abandoned()) return;
        console.log(
          '[metevo] invoice relay failed:',
          cause instanceof Error ? cause.message : 'unknown',
        );
        failWith('The invoice request failed. Try again.');
      }
    },
    [ensureRelay, enterStage, failWith, wallet?.nodePubkey, wallet?.balanceUsdmBaseUnits],
  );

  const confirm = useCallback(async () => {
    if (proposal === null || stageRef.current !== 'review') {
      return;
    }
    const { authenticateToAccessSecrets, hasDeviceLock } = await import(
      '../services/metevo/secure-store'
    );
    setNote(null);
    // A device without any screen lock cannot show the prompt: the tap on
    // "Confirm payment" is the user's confirmation there.
    const deviceLocked = await hasDeviceLock().catch(() => true);
    if (deviceLocked) {
      enterStage('authorizing');
      try {
        // Design payment.confirm: the biometric prompt names this exact
        // payment; DEVICE_CREDENTIAL is the enrolled fallback.
        await authenticateToAccessSecrets(
          `Confirm sending ${proposal.amount} ${proposal.asset} to ${proposal.recipient}`,
        );
      } catch {
        // Cancelled or failed authorization: nothing was submitted, review
        // stays reachable.
        backToReview(NOT_AUTHORIZED_NOTE);
        return;
      }
    }
    enterStage('submitting');
    let submitted: SubmittedPayment;
    try {
      submitted = await submitPayment({
        invoice: proposal.invoice,
        expected: proposal.expected,
      });
    } catch (cause) {
      console.log(
        '[metevo] payment submission failed:',
        cause instanceof Error ? cause.name : 'unknown',
      );
      if (cause instanceof PaymentValidationError) {
        // The node refused the invoice before sending anything.
        failWith('The invoice does not match what you reviewed. Nothing was paid.');
        return;
      }
      // Submission may or may not have reached the node; the honest stage
      // is unknown - never an automatic resend.
      enterStage('unknown');
      return;
    }
    // A Lightning payment never appears in the on-chain transfer list, so
    // watch its payment hash; the transfer watcher is for on-chain sends.
    if (submitted.paymentHash === null) {
      // No hash to follow: never fall back to the on-chain watcher, which
      // could report an unrelated transfer as this payment.
      enterStage('unknown');
      return;
    }
    paymentHashRef.current = submitted.paymentHash;
    contextRef.current = { ...contextRef.current, canCheckStatus: true };
    enterStage('watching');
    const result = await watcher.watchPayment(submitted.paymentHash);
    if (result.status === 'settled') {
      enterStage('settled');
    } else if (result.status === 'failed') {
      enterStage('failed');
    } else {
      enterStage('unknown');
    }
  }, [backToReview, enterStage, failWith, proposal, submitPayment, watcher]);

  /** Asks the node about the already-submitted payment; never resends. */
  const checkStatus = useCallback(async () => {
    const hash = paymentHashRef.current;
    if (stageRef.current !== 'unknown' || hash === null) {
      return;
    }
    setNote(null);
    try {
      const status = await checkPayment(hash);
      if (status === 'settled' || status === 'failed') {
        enterStage(status);
        return;
      }
    } catch {
      // The node is unreachable: the outcome is still unknown.
    }
    setNote('Still not confirmed. Do not pay again. Check again in a minute.');
  }, [checkPayment, enterStage]);

  const cancel = useCallback(() => {
    if (stageRef.current === 'watching' || stageRef.current === 'submitting') {
      // A submitted payment is never silently discarded; the watcher keeps
      // running and its outcome still reports through the watcher phase.
      return;
    }
    requestRunRef.current += 1;
    enterStage('idle');
    setProposal(null);
    setNote(null);
  }, [enterStage]);

  return useMemo(
    () => ({
      stage,
      proposal,
      note,
      balanceWarning,
      watcher,
      start,
      confirm,
      cancel,
      checkStatus,
      canCheckStatus: stage === 'unknown' && paymentHashRef.current !== null,
    }),
    [stage, proposal, note, balanceWarning, watcher, start, confirm, cancel, checkStatus],
  );
}
