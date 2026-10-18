import { useEffect } from 'react';

import { getLocalLink } from '../services/localelink';

/**
 * Holds the screen on while the local-link flow runs (the receiver waits
 * for the payer's tap; a dimmed screen would kill the NFC field and the
 * P2P group). Clears the flag on disable/unmount - the clear runs even
 * when the enable failed, so the flag can never stick.
 */
export function useKeepScreenOn(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const link = getLocalLink();
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        void link.setKeepScreenOn(false).catch(() => undefined);
      }
    };
    void link.setKeepScreenOn(true).catch(() => undefined);
    return release;
  }, [enabled]);
}
