import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ENV } from '../config/env';
import {
  InvoiceRelay,
  createLspInvoiceRelay,
  createMockInvoiceRelay,
} from '../services/metevo/invoiceRelay';
import { MetevoLspClient } from '../services/metevo/lsp-api';
import { PaymentVoiceIntent } from '../services/metevo/paymentIntent';
import { playTacton } from '../services/metevo/tacton';
import { speakAnnouncement } from '../services/spokenInteraction';
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
}

/** Relay answer polling: the recipient node needs a moment to answer. */
const RELAY_POLL_INTERVAL_MS = 1_500;
const RELAY_ANSWER_TIMEOUT_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function usePaymentFlow() {
  const { submitPayment } = useWalletSession();
  const watcher = useTransferWatcher();
  const [stage, setStage] = useState<PaymentFlowStage>('idle');
  const [proposal, setProposal] = useState<PaymentFlowProposal | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const relayRef = useRef<InvoiceRelay | null>(null);
  const mountedRef = useRef(true);
  const stageRef = useRef<PaymentFlowStage>('idle');

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
    const { loadDeviceWalletConfig } = await import(
      '../services/metevo/deviceConfig'
    );
    const device = await loadDeviceWalletConfig();
    relayRef.current = createLspInvoiceRelay(
      new MetevoLspClient({
        baseUrl: device.lspApiUrl,
        bearerToken: device.lspBearerToken,
      }),
    );
    return relayRef.current;
  }, []);

  const start = useCallback(
    async (intent: PaymentVoiceIntent) => {
      enterStage('requesting');
      setNote(null);
      try {
        const relay = await ensureRelay();
        const request = await relay.requestInvoice({
          recipient: intent.recipient,
          assetId: null,
          amountUsd: intent.amount,
        });
        const deadline = Date.now() + RELAY_ANSWER_TIMEOUT_MS;
        while (Date.now() < deadline) {
          const answer = await relay.pollResponse(request.requestId);
          if (answer.status === 'delivered') {
            setProposal({
              recipient: intent.recipient,
              asset: intent.asset,
              amount: intent.amount,
              invoice: answer.invoice,
              requestId: request.requestId,
            });
            enterStage('review');
            speakAnnouncement('Invoice ready. Review and confirm.');
            return;
          }
          await sleep(RELAY_POLL_INTERVAL_MS);
        }
        enterStage('error');
        setNote('The recipient did not answer in time. Try again.');
        playTacton('error');
      } catch (cause) {
        console.log(
          '[metevo] invoice relay failed:',
          cause instanceof Error ? cause.message : 'unknown',
        );
        enterStage('error');
        setNote('The invoice request failed. Try again.');
        playTacton('error');
      }
    },
    [ensureRelay, enterStage],
  );

  const confirm = useCallback(async () => {
    if (proposal === null || stageRef.current !== 'review') {
      return;
    }
    enterStage('authorizing');
    setNote(null);
    try {
      // Design payment.confirm: the biometric prompt names this exact
      // payment; DEVICE_CREDENTIAL is the enrolled fallback.
      const { authenticateToAccessSecrets } = await import(
        '../services/metevo/secure-store'
      );
      await authenticateToAccessSecrets(
        `Confirm sending ${proposal.amount} ${proposal.asset} to ${proposal.recipient}`,
      );
    } catch {
      // Cancelled or failed authorization: nothing was submitted, review
      // stays reachable.
      enterStage('review');
      setNote('Not authorized. Nothing was submitted.');
      return;
    }
    enterStage('submitting');
    try {
      await submitPayment({ invoice: proposal.invoice });
    } catch (cause) {
      console.log(
        '[metevo] payment submission failed:',
        cause instanceof Error ? cause.name : 'unknown',
      );
      // Submission may or may not have reached the node; the honest stage
      // is unknown - never an automatic resend.
      enterStage('unknown');
      return;
    }
    enterStage('watching');
    const result = await watcher.watch();
    if (result.status === 'settled') {
      enterStage('settled');
    } else if (result.status === 'failed') {
      enterStage('failed');
    } else {
      enterStage('unknown');
    }
  }, [enterStage, proposal, submitPayment, watcher]);

  const cancel = useCallback(() => {
    if (stageRef.current === 'watching' || stageRef.current === 'submitting') {
      // A submitted payment is never silently discarded; the watcher keeps
      // running and its outcome still reports through the watcher phase.
      return;
    }
    enterStage('idle');
    setProposal(null);
    setNote(null);
  }, [enterStage]);

  return useMemo(
    () => ({ stage, proposal, note, watcher, start, confirm, cancel }),
    [stage, proposal, note, watcher, start, confirm, cancel],
  );
}
