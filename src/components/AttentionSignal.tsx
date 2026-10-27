import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface AttentionSignal {
  active: boolean;
  setActive: (active: boolean) => void;
}

const AttentionContext = createContext<AttentionSignal | null>(null);

/**
 * Lets the task card tell the shell that it shows an error, so the voice
 * button switches to its attention cue (ERR-03) wherever the error comes
 * from: the node, the wallet session or the card's own flow.
 */
export function AttentionSignalProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const value = useMemo(() => ({ active, setActive }), [active]);
  return <AttentionContext.Provider value={value}>{children}</AttentionContext.Provider>;
}

/** The shell's view: true while any child card reports an error. */
export function useAttentionActive(): boolean {
  return useContext(AttentionContext)?.active ?? false;
}

/** A card reports its error state; the signal clears when it unmounts. */
export function useAttentionSignal(active: boolean): void {
  const setActive = useContext(AttentionContext)?.setActive;
  useEffect(() => {
    if (setActive === undefined) {
      return undefined;
    }
    setActive(active);
    return () => {
      if (active) {
        setActive(false);
      }
    };
  }, [active, setActive]);
}
