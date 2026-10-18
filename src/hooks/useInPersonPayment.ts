import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ENV } from '../config/env';
import { isKnownContact } from '../services/metevo/contacts';
import {
  DirectRouteHint,
  DirectRoutePlan,
  payOverDirectChannel,
  planPaymentRoute,
} from '../services/metevo/offlineChannel';
import { playTacton } from '../services/metevo/tacton';
import { speakAnnouncement } from '../services/spokenInteraction';
import {
  getLocalLink,
  isLocalLinkNative,
  LocalLink,
  localLinkFetchInvoiceProtocol,
} from '../services/localelink';
import { readLocalLinkCredentials } from '../services/localelink';
import { useKeepScreenOn } from './useKeepScreenOn';
import { useTransferWatcher } from './useTransferWatcher';
import { useWalletSession } from './useWalletSession';

/**
 * In-person payment stages: tap the receiver's tag, join their Wi-Fi
 * Direct group, fetch the invoice over the P2P socket, verify the contact,
 * authorize with biometrics, then settle over the direct channel (when one
 * exists) or through the LSP. stopGroup() runs in a finally block - the
 * hardware is released whatever happened.
 */
export type InPersonStage =
  | 'idle'
  | 'scanning'
  | 'fetching'
  | 'review'
  | 'paying'
  | 'watching'
  | 'settled'
  | 'failed'
  | 'unknown'
  | 'error';

export interface InPersonProposal {
  invoice: string;
  nodePubkey: string | null;
  directHint: DirectRouteHint | null;
  knownContact: boolean | null;
  plan: DirectRoutePlan | null;
}

const NFC_READ_TIMEOUT_MS = 30_000;
const GROUP_JOIN_TIMEOUT_MS = 15_000;
const INVOICE_FETCH_TIMEOUT_MS = 10_000;

export function useInPersonPayment() {
  const { hasUsableChannelWith, connectPeer, submitPayment } = useWalletSession();
  const watcher = useTransferWatcher();
  const [stage, setStage] = useState<InPersonStage>('idle');
  const [proposal, setProposal] = useState<InPersonProposal | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const linkRef = useRef<LocalLink | null>(null);
  const mountedRef = useRef(true);
  const stageRef = useRef<InPersonStage>('idle');

  const isLinkActive = stage === 'scanning' || stage === 'fetching';
  useKeepScreenOn(isLinkActive);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Unmount mid-link (user navigates away): release the hardware.
      void linkRef.current?.stopGroup().catch(() => undefined);
      linkRef.current = null;
    };
  }, []);

  const enterStage = useCallback((next: InPersonStage) => {
    stageRef.current = next;
    if (mountedRef.current) {
      setStage(next);
    }
  }, []);

  const payInPerson = useCallback(async () => {
    if (stageRef.current !== 'idle') {
      return;
    }
    setNote(null);
    enterStage('scanning');
    const link = getLocalLink();
    linkRef.current = link;
    try {
      // 1. Tap: read the receiver's credential tag (native only).
      if (!isLocalLinkNative()) {
        throw new Error(
          'NFC requires the debug APK build with the native local-link module',
        );
      }
      const credentials = await readLocalLinkCredentials(NFC_READ_TIMEOUT_MS);

      // 2. Join the receiver's 2.4 GHz group.
      enterStage('fetching');
      await link.connectToGroup(credentials.ssid, credentials.password, GROUP_JOIN_TIMEOUT_MS);

      // 3. Fetch the invoice (and any direct-route hint) over the socket.
      const responseLine = await link.fetchInvoice({
        host: '192.168.49.1',
        port: ENV.EXPO_PUBLIC_LOCAL_LINK_PORT,
        sessionId: credentials.sessionId,
        timeoutMs: INVOICE_FETCH_TIMEOUT_MS,
      });
      const parsed = localLinkFetchInvoiceProtocol.parseResponse(responseLine);
      if ('error' in parsed) {
        throw new Error(`the receiver rejected the fetch: ${parsed.error}`);
      }
      const directHint: DirectRouteHint | null =
        'direct' in parsed
          ? { nodePubkey: parsed.direct.nodePubkey, ldkPort: parsed.direct.ldkPort }
          : null;
      const invoice = 'direct' in parsed ? parsed.direct.invoice : parsed.invoice;

      // 4. Contact verification: compare the receiver's node id against
      // the saved contacts; unknown contacts stay payable but labelled.
      const nodePubkey = directHint?.nodePubkey ?? null;
      const knownContact =
        nodePubkey !== null ? await isKnownContact(nodePubkey) : null;
      const hasChannel =
        nodePubkey !== null ? await hasUsableChannelWith(nodePubkey) : false;
      const plan = planPaymentRoute({
        directHint,
        hasUsableChannelWithPeer: hasChannel,
        preferDirect: true,
      });

      setProposal({ invoice, nodePubkey, directHint, knownContact, plan });
      enterStage('review');
      speakAnnouncement('Invoice ready. Review and confirm.');
    } catch (cause) {
      console.log(
        '[metevo] in-person fetch failed:',
        cause instanceof Error ? cause.message : 'unknown',
      );
      setNote(cause instanceof Error ? cause.message : 'The local payment could not start.');
      enterStage('error');
      playTacton('error');
    } finally {
      // Mandatory teardown of the local network group and socket server.
      await link.stopGroup().catch(() => undefined);
      linkRef.current = null;
    }
  }, [enterStage, hasUsableChannelWith]);

  const confirm = useCallback(async () => {
    if (proposal === null || stageRef.current !== 'review') {
      return;
    }
    enterStage('paying');
    setNote(null);
    try {
      const { authenticateToAccessSecrets } = await import(
        '../services/metevo/secure-store'
      );
      await authenticateToAccessSecrets('Confirm the in-person payment');
    } catch {
      enterStage('review');
      setNote('Not authorized. Nothing was submitted.');
      return;
    }
    try {
      if (proposal.plan?.route === 'direct' && proposal.directHint !== null) {
        // Signed HTLC updates flow inside the LDK peer session opened
        // across the group socket.
        await payOverDirectChannel(
          {
            connectPeer,
            payInvoice: (invoice) => submitPayment({ invoice }),
          },
          {
            host: '192.168.49.1',
            nodePubkey: proposal.directHint.nodePubkey,
            ldkPort: proposal.directHint.ldkPort,
            invoice: proposal.invoice,
          },
        );
      } else {
        await submitPayment({ invoice: proposal.invoice });
      }
    } catch (cause) {
      console.log(
        '[metevo] in-person payment submission failed:',
        cause instanceof Error ? cause.name : 'unknown',
      );
      // Submission may or may not have reached the node; never guess.
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
  }, [connectPeer, enterStage, proposal, submitPayment, watcher]);

  const cancel = useCallback(() => {
    if (stageRef.current === 'watching' || stageRef.current === 'paying') {
      return; // a submitted payment is never silently discarded
    }
    enterStage('idle');
    setProposal(null);
    setNote(null);
  }, [enterStage]);

  return useMemo(
    () => ({ stage, proposal, note, watcher, payInPerson, confirm, cancel }),
    [stage, proposal, note, watcher, payInPerson, confirm, cancel],
  );
}
