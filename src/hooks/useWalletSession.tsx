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
  StoredWalletMeta,
  SubmittedPayment,
  WalletSessionGateway,
  WalletSessionSnapshot,
  WalletSetupStep,
  createWalletSessionGateway,
} from '../services/metevo/wallet-gateway';
import type { TransferInfo } from '../services/metevo/transferWatcher';
import { speakAnnouncement } from '../services/spokenInteraction';
import { describeWalletError } from '../utils/walletErrors';

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

export type NodeConnection = 'online' | 'offline';

export interface WalletSession {
  phase: SessionPhase;
  language: UiLanguage | null;
  theme: UiTheme;
  setupStep: WalletSetupStep;
  progressMessage: string | null;
  errorMessage: string | null;
  /** Last known snapshot; kept while the node is offline. */
  wallet: WalletSessionSnapshot | null;
  /** 'offline' after a failed refresh, until the next one succeeds. */
  connection: NodeConnection;
  /** The named wallets stored on this device (refreshed on the wallet phase). */
  wallets: StoredWalletMeta[];
  /** The wallet picked in the selector; null until chosen. */
  selectedWalletId: string | null;
  continueOpening(): void;
  chooseLanguage(language: UiLanguage): void;
  continueLanguage(): void;
  chooseTheme(theme: UiTheme): void;
  continueTheme(): void;
  createWallet(name: string): Promise<void>;
  chooseWallet(id: string): void;
  requestSignIn(): void;
  openWallet(): Promise<void>;
  refreshWallet(): Promise<void>;
  /** Whether this device already holds a stored wallet seed. */
  hasStoredWallet(): Promise<boolean>;
  /** Submit the current proposal exactly once (design payment.confirm). */
  submitPayment(proposal: PaymentProposal): Promise<SubmittedPayment>;
  /** Query an existing payment; never creates a replacement (payment.check). */
  checkPayment(paymentHash: string): Promise<PaymentNetworkStatus>;
  /** Advance the transfer state machine; polled by the settlement watcher. */
  refreshTransfers(): Promise<TransferInfo[]>;
  /** Creates the receiver's USDm invoice (blind when the amount is null). */
  createUsdmInvoice(
    amountBaseUnits: number | null,
  ): Promise<{ invoice: string; paymentHash: string | null }>;
  /** Whether a usable channel exists with this peer (direct route). */
  hasUsableChannelWith(peerPubkey: string): Promise<boolean>;
  /** Opens the LDK peer session (pubkey@host:port) for a direct payment. */
  connectPeer(peerUri: string): Promise<void>;
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
  const [connection, setConnection] = useState<NodeConnection>('online');
  const [wallets, setWallets] = useState<StoredWalletMeta[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

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

  const createWallet = useCallback(
    async (name: string) => {
      setErrorMessage(null);
      setSetupStep('creating-secret');
      try {
        const entry = await withGateway((gateway) => gateway.createWallet(name));
        setSelectedWalletId(entry.id);
        setWallets(await withGateway((gateway) => gateway.listWallets()));
        setSetupStep('idle');
        setPhase('wallet');
      } catch (cause) {
        console.log(
          '[metevo] wallet setup failed:',
          cause instanceof Error ? cause.name : 'unknown',
        );
        setSetupStep('idle');
        setErrorMessage(describeWalletError(cause));
      }
    },
    [withGateway],
  );

  const requestSignIn = useCallback(() => {
    void withGateway((gateway) => gateway.listWallets()).then((list) =>
      setWallets(list),
    );
    setPhase('wallet');
  }, [withGateway]);

  const chooseWallet = useCallback((id: string) => setSelectedWalletId(id), []);

  const openWallet = useCallback(async () => {
    setErrorMessage(null);
    try {
      await withGateway((gateway) =>
        gateway.openWallet(selectedWalletId ?? '', (step, message) => {
          setSetupStep(step);
          setProgressMessage(message);
        }),
      );
      setWallet(await withGateway((gateway) => gateway.readStatus()));
      setConnection('online');
      setPhase('home');
    } catch (cause) {
      console.log(
        '[metevo] wallet open failed:',
        cause instanceof Error ? cause.name : 'unknown',
      );
      setSetupStep('idle');
      setErrorMessage(describeWalletError(cause));
    }
  }, [selectedWalletId, withGateway]);

  const refreshWallet = useCallback(async () => {
    try {
      setWallet(await withGateway((gateway) => gateway.readStatus()));
      setConnection('online');
    } catch (cause) {
      console.log(
        '[metevo] wallet refresh failed:',
        cause instanceof Error ? cause.name : 'unknown',
      );
      setConnection('offline');
    }
  }, [withGateway]);

  const hasStoredWallet = useCallback(
    () => withGateway((gateway) => gateway.hasStoredWallet()),
    [withGateway],
  );

  const reopenPhase = useCallback((target: SessionPhase) => {
    setPhase(target);
    if (target === 'wallet') {
      void withGateway((gateway) => gateway.listWallets()).then((list) =>
        setWallets(list),
      );
    }
  }, [withGateway]);

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

  const refreshTransfers = useCallback(
    () => withGateway((gateway) => gateway.refreshTransfers()),
    [withGateway],
  );

  const createUsdmInvoice = useCallback(
    (amountBaseUnits: number | null) =>
      withGateway((gateway) => gateway.createUsdmInvoice(amountBaseUnits)),
    [withGateway],
  );

  const hasUsableChannelWith = useCallback(
    (peerPubkey: string) =>
      withGateway((gateway) => gateway.hasUsableChannelWith(peerPubkey)),
    [withGateway],
  );

  const connectPeer = useCallback(
    (peerUri: string) => withGateway((gateway) => gateway.connectPeer(peerUri)),
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
      connection,
      wallets,
      selectedWalletId,
      continueOpening,
      chooseLanguage,
      continueLanguage,
      chooseTheme,
      continueTheme,
      createWallet,
      chooseWallet,
      requestSignIn,
      openWallet,
      refreshWallet,
      hasStoredWallet,
      submitPayment,
      checkPayment,
      refreshTransfers,
      createUsdmInvoice,
      hasUsableChannelWith,
      connectPeer,
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
      connection,
      wallets,
      selectedWalletId,
      continueOpening,
      chooseLanguage,
      continueLanguage,
      chooseTheme,
      continueTheme,
      createWallet,
      chooseWallet,
      requestSignIn,
      openWallet,
      refreshWallet,
      hasStoredWallet,
      submitPayment,
      checkPayment,
      refreshTransfers,
      createUsdmInvoice,
      hasUsableChannelWith,
      connectPeer,
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
