import React, { createContext, useContext, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

import { BackAction, BackActionStack } from '../utils/backActionStack';

const BackActionContext = createContext<BackActionStack | null>(null);

interface BackActionProviderProps {
  /** True while a card is open; with no card Android's default Back applies. */
  active: boolean;
  /** Runs when the open card registered no Back action: closes the card. */
  onFallback: BackAction;
  children: React.ReactNode;
}

/**
 * One Back policy for every card: the card's own action when it registered
 * one, otherwise close the card. The Home itself keeps Android's default.
 */
export function BackActionProvider({ active, onFallback, children }: BackActionProviderProps) {
  const stackRef = useRef(new BackActionStack());
  const fallbackRef = useRef(onFallback);
  fallbackRef.current = onFallback;

  useEffect(() => {
    if (!active) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      stackRef.current.handle(() => fallbackRef.current());
      return true;
    });
    return () => subscription.remove();
  }, [active]);

  return (
    <BackActionContext.Provider value={stackRef.current}>{children}</BackActionContext.Provider>
  );
}

/**
 * Registers what Back does on the calling card while it is mounted.
 * `null` leaves the decision to the frame, which closes the card.
 */
export function useBackAction(action: BackAction | null): void {
  const stack = useContext(BackActionContext);
  const actionRef = useRef(action);
  actionRef.current = action;
  const registered = action !== null;

  useEffect(() => {
    if (stack === null || !registered) return undefined;
    const id = stack.push(() => actionRef.current?.());
    return () => stack.remove(id);
  }, [stack, registered]);
}
