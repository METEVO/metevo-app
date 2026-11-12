import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { logContactEvent } from '../services/metevo/contactEvents';
import {
  cancelContactNfcRead,
  ContactNfcError,
  getContactNfcStatus,
  readContactNfcLink,
  startContactNfcSharing,
  stopContactNfcSharing,
  type ContactNfcStatus,
} from '../services/metevo/contactNfc';

/** A single read waits this long before the loop starts a fresh one. */
const READ_WINDOW_MS = 30_000;
/** After a bad tap the phones are usually still touching: without a pause
 * the reader would re-read the same phone about ten times a second. */
const RETRY_PAUSE_MS = 1_500;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** NFC status, refreshed when the user comes back from system Settings. */
function useNfcStatus(): ContactNfcStatus | null {
  const [status, setStatus] = useState<ContactNfcStatus | null>(null);
  useEffect(() => {
    let mounted = true;
    const refresh = () => { void getContactNfcStatus().then((next) => { if (mounted) setStatus(next); }); };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return status;
}

/** Serves `link` over NFC for as long as the calling screen is shown. */
export function useContactNfcShare(link: string): ContactNfcStatus | 'failed' | null {
  const status = useNfcStatus();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (status !== 'ready') return undefined;
    let mounted = true;
    let foreground = AppState.currentState === 'active';
    let generation = 0;
    let pending = Promise.resolve();
    const update = () => {
      const run = ++generation;
      pending = pending.then(async () => {
        await stopContactNfcSharing();
        if (!mounted || !foreground || run !== generation) return;
        await startContactNfcSharing(link);
        if (!mounted || !foreground || run !== generation) {
          await stopContactNfcSharing();
          return;
        }
        logContactEvent('nfc:sharing');
      }).catch(() => { if (mounted && foreground) setFailed(true); });
    };
    update();
    const subscription = AppState.addEventListener('change', (state) => {
      foreground = state === 'active';
      update();
    });
    return () => {
      mounted = false;
      foreground = false;
      subscription.remove();
      update();
    };
  }, [link, status]);
  return failed ? 'failed' : status;
}

export type ContactNfcReadNotice = 'not-metevo' | 'failed' | null;

/**
 * Keeps reader mode on while the receive screen is shown. Each tapped link
 * goes to `onLink`; returning false (not queued) keeps the reader waiting.
 */
export function useContactNfcReader(onLink: (link: string) => boolean) {
  const status = useNfcStatus();
  const [notice, setNotice] = useState<ContactNfcReadNotice>(null);
  const onLinkRef = useRef(onLink);
  onLinkRef.current = onLink;

  const loop = useCallback(async (isActive: () => boolean) => {
    let lastNotice: ContactNfcReadNotice = null;
    while (isActive()) {
      try {
        const link = await readContactNfcLink(READ_WINDOW_MS);
        if (!isActive()) return;
        logContactEvent('nfc:read');
        setNotice(null);
        if (onLinkRef.current(link)) return;
      } catch (cause) {
        if (!isActive()) return;
        const code = cause instanceof ContactNfcError ? cause.code : 'failed';
        if (code === 'cancelled' || code === 'unavailable') return;
        if (code === 'timeout') continue;
        const next = code === 'not-metevo' ? 'not-metevo' : 'failed';
        if (next !== lastNotice) logContactEvent(next === 'not-metevo' ? 'nfc:not-metevo' : 'nfc:failed');
        lastNotice = next;
        setNotice(next);
        await pause(RETRY_PAUSE_MS);
      }
    }
  }, []);

  useEffect(() => {
    if (status !== 'ready') return undefined;
    let active = false;
    let generation = 0;
    const update = (state: string) => {
      active = state === 'active';
      const run = ++generation;
      void cancelContactNfcRead().then(() => {
        if (active && run === generation) void loop(() => active && run === generation);
      }).catch(() => { if (active) setNotice('failed'); });
    };
    update(AppState.currentState);
    const subscription = AppState.addEventListener('change', update);
    return () => {
      subscription.remove();
      update('background');
    };
  }, [loop, status]);

  return { status, notice };
}
