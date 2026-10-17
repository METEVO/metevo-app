import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ThemeMode, useThemePreference } from '../design/ThemeContext';
import {
  PaymentNetworkStatus,
  PaymentProposal,
  SubmittedPayment,
  WalletSessionGateway,
  WalletSessionSnapshot,
  WalletSetupStep,
  createWalletSessionGateway,
} from '../services/metevo/wallet-gateway';
import { speakAnnouncement } from '../services/spokenInteraction';

/**
 * Phases of the single METEVO flow, in the design's order: opening screen,
 * language and theme onboarding, account setup, wallet selection, then the
 * fixed home shell. There is no router by design; the phase alone decides
 * what the app renders.
 */
export type SessionPhase =
  | 'opening'
  | 'language'
  | 'theme'
  | 'account'
  | 'wallet'
  | 'home';

/** The seven design languages, in their listed order. */
export type UiLanguage =
  | 'english'
  | 'italiano'
  | 'turkce'
  | 'francais'
  | 'hindi'
  | 'espanol'
  | 'kiswahili';

export type UiTheme = ThemeMode;

export interface WalletSession {
  phase: SessionPhase;
  language: UiLanguage | null;
  theme: UiTheme;
  setupStep: WalletSetupStep;
  progressMessage: string | null;
  errorMessage: string | null;
  wallet: WalletSessionSnapshot | null;
  continueOpening(): void;
  chooseLanguage(language: UiLanguage): void;
  continueLanguage(): void;
  chooseTheme(theme: UiTheme): void;
  continueTheme(): void;
  createWallet(): Promise<void>;
  requestSignIn(): void;
  openWallet(): Promise<void>;
  refreshWallet(): Promise<void>;
  /** Submit the current proposal exactly once (design payment.confirm). */
  submitPayment(proposal: PaymentProposal): Promise<SubmittedPayment>;
  /** Query an existing payment; never creates a replacement (payment.check). */
  checkPayment(paymentHash: string): Promise<PaymentNetworkStatus>;
  /** Back navigation to a fixed earlier phase (account -> theme, etc.). */
  reopenPhase(phase: SessionPhase): void;
}

const WalletSessionContext = createContext<WalletSession | null>(null);

/**
 * Owns the wallet journey from the opening screen to the connected home
 * shell. Wallet work is delegated to the session gateway, so the same
 * state machine runs the mock (Expo Go demos) and the real WDK node
 * (debug APK with EXPO_PUBLIC_WALLET_MODE=wdk). The provider makes the
 * session reachable from task cards without prop drilling.
 */
export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const gatewayRef = useRef<WalletSessionGateway | null>(null);
  const { theme, setThemeMode } = useThemePreference();

  const [phase, setPhase] = useState<SessionPhase>('opening');
  const [language, setLanguage] = useState<UiLanguage | null>(null);
  const [setupStep, setSetupStep] = useState<WalletSetupStep>('idle');
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletSessionSnapshot | null>(null);

  const withGateway = useCallback(
    <T,>(run: (gateway: WalletSessionGateway) => Promise<T>): Promise<T> => {
      gatewayRef.current ??= createWalletSessionGateway();
      return run(gatewayRef.current);
    },
    [],
  );

  const continueOpening = useCallback(() => setPhase('language'), []);

  const chooseLanguage = useCallback((selected: UiLanguage) => {
    setLanguage(selected);
    speakAnnouncement(`${selected} selected`);
  }, []);

  const continueLanguage = useCallback(() => {
    setPhase((current) =>
      current === 'language' && language !== null ? 'theme' : current,
    );
  }, [language]);

  const chooseTheme = useCallback(
    (selected: UiTheme) => setThemeMode(selected),
    [setThemeMode],
  );

  const continueTheme = useCallback(() => setPhase('account'), []);

  const createWallet = useCallback(async () => {
    setErrorMessage(null);
    setSetupStep('creating-secret');
    try {
      await withGateway((gateway) => gateway.createWallet());
      setSetupStep('idle');
      setPhase('wallet');
    } catch (cause) {
      setSetupStep('idle');
      setErrorMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }, [withGateway]);

  const requestSignIn = useCallback(() => setPhase('wallet'), []);

  const openWallet = useCallback(async () => {
    setErrorMessage(null);
    try {
      await withGateway((gateway) =>
        gateway.openWallet((step, message) => {
          setSetupStep(step);
          setProgressMessage(message);
        }),
      );
      setWallet(await withGateway((gateway) => gateway.readStatus()));
      setPhase('home');
    } catch (cause) {
      setSetupStep('idle');
      setErrorMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }, [withGateway]);

  const refreshWallet = useCallback(async () => {
    setWallet(await withGateway((gateway) => gateway.readStatus()));
  }, [withGateway]);

  const reopenPhase = useCallback((target: SessionPhase) => setPhase(target), []);

  const submitPayment = useCallback(
    (proposal: PaymentProposal) =>
      withGateway((gateway) => gateway.submitPayment(proposal)),
    [withGateway],
  );

  const checkPayment = useCallback(
    (paymentHash: string) =>
      withGateway((gateway) => gateway.checkPayment(paymentHash)),
    [withGateway],
  );

  const session = useMemo(
    () => ({
      phase,
      language,
      theme: theme.mode,
      setupStep,
      progressMessage,
      errorMessage,
      wallet,
      continueOpening,
      chooseLanguage,
      continueLanguage,
      chooseTheme,
      continueTheme,
      createWallet,
      requestSignIn,
      openWallet,
      refreshWallet,
      submitPayment,
      checkPayment,
      reopenPhase,
    }),
    [
      phase,
      language,
      theme,
      setupStep,
      progressMessage,
      errorMessage,
      wallet,
      continueOpening,
      chooseLanguage,
      continueLanguage,
      chooseTheme,
      continueTheme,
      createWallet,
      requestSignIn,
      openWallet,
      refreshWallet,
      submitPayment,
      checkPayment,
      reopenPhase,
    ],
  );

  return (
    <WalletSessionContext.Provider value={session}>
      {children}
    </WalletSessionContext.Provider>
  );
}

/** The app's single wallet session (provider-scoped). */
export function useWalletSession(): WalletSession {
  const session = useContext(WalletSessionContext);
  if (session === null) {
    throw new Error('useWalletSession requires WalletSessionProvider');
  }
  return session;
}
