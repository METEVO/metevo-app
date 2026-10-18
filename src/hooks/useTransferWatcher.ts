import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ENV } from '../config/env';
import { playTacton } from '../services/metevo/tacton';
import {
  TransferInfo,
  TransferWatchResult,
  watchTransfersToTerminal,
} from '../services/metevo/transferWatcher';
import { speakAnnouncement } from '../services/spokenInteraction';
import { useWalletSession } from './useWalletSession';

/** UI-facing watch phases (idle and watching are not network statuses). */
export type TransferWatchPhase =
  | 'idle'
  | 'watching'
  | 'settled'
  | 'failed'
  | 'unknown';

const VOICE_BY_OUTCOME: Record<'settled' | 'failed' | 'unknown', string> = {
  settled: 'Payment settled',
  failed: 'The payment failed',
  unknown: 'The payment is still not confirmed. Check it again later.',
};

const TACTON_BY_OUTCOME: Record<
  'settled' | 'failed' | 'unknown',
  'success' | 'error' | 'attention'
> = {
  settled: 'success',
  failed: 'error',
  unknown: 'attention',
};

/**
 * Watches the WDK transfer state machine to a terminal outcome and wires
 * the result to Tacton haptics and the voice seam. One watch at a time:
 * a second call while watching returns the in-flight watch instead of
 * starting a competing loop over the same node.
 */
export function useTransferWatcher() {
  const { refreshTransfers } = useWalletSession();
  const [phase, setPhase] = useState<TransferWatchPhase>('idle');
  const [transfer, setTransfer] = useState<TransferInfo | null>(null);
  const mountedRef = useRef(true);
  const cancelledRef = useRef(false);
  const watchRef = useRef<Promise<TransferWatchResult> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const watch = useCallback(
    (options: { transferId?: string } = {}): Promise<TransferWatchResult> => {
      if (watchRef.current !== null) {
        return watchRef.current;
      }
      cancelledRef.current = false;
      setPhase('watching');
      playTacton('attention');
      const run = watchTransfersToTerminal({
        refresh: refreshTransfers,
        intervalMs: ENV.EXPO_PUBLIC_TRANSFER_POLL_INTERVAL_MS,
        timeoutMs: ENV.EXPO_PUBLIC_TRANSFER_SETTLE_TIMEOUT_MS,
        transferId: options.transferId,
        shouldStop: () => mountedRef.current === false || cancelledRef.current,
      })
        .then((result) => {
          // The watcher only resolves on terminal outcomes; 'pending' is
          // defensively folded into unknown instead of guessed as success.
          const outcome =
            result.status === 'settled' || result.status === 'failed'
              ? result.status
              : 'unknown';
          if (mountedRef.current) {
            setPhase(outcome);
            setTransfer(result.transfer);
          }
          // Terminal outcomes always give haptic + spoken feedback, even
          // when the surface unmounted mid-watch. A user cancellation
          // stays silent: the caller chose to stop listening.
          if (!cancelledRef.current) {
            playTacton(TACTON_BY_OUTCOME[outcome]);
            speakAnnouncement(VOICE_BY_OUTCOME[outcome]);
          }
          return result;
        })
        .finally(() => {
          watchRef.current = null;
        });
      watchRef.current = run;
      return run;
    },
    [refreshTransfers],
  );

  /** Cancels the running watch; its promise resolves unknown and stays
   * silent (no haptic/voice feedback for a user-driven stop). */
  const stopWatching = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  return useMemo(
    () => ({ phase, transfer, watch, stopWatching }),
    [phase, transfer, watch, stopWatching],
  );
}
