import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  createWalletSessionGateway,
} from '../services/metevo/wallet-gateway';
import type { TransferInfo } from '../services/metevo/transferWatcher';
import { describeWalletError } from '../utils/walletErrors';

/**
 * The app is one fixed flow: it opens straight into the home shell with the
 * English voice agent, and the wallet (EXPO_PUBLIC_WALLET_MODE, the Docker
 * regtest node in remote mode) connects automatically on mount. There is no
 * sign-in, no wallet creation and no onboarding: the node holds the keys,
 * so the phone has nothing to unlock.
 */

/** The session language is fixed: the voice agent runs English models. */
export type UiLanguage = 'english';

export type UiTheme = ThemeMode;

export type NodeConnection = 'online' | 'offline';

export interface WalletSession {
  language: UiLanguage;
  theme: UiTheme;
  errorMessage: string | null;
  /** True from mount until the first wallet open attempt settles. */
  connecting: boolean;
  /** Last known snapshot; kept while the node is offline. */
  wallet: WalletSessionSnapshot | null;
  /** 'offline' after a failed refresh, until the next one succeeds. */
  connection: NodeConnection;
  /** Connects (or reconnects) the wallet; safe to call again after a failure. */
  openWallet(): Promise<void>;
  refreshWallet(): Promise<void>;
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
}

const WalletSessionContext = createContext<WalletSession | null>(null);

export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const gatewayRef = useRef<WalletSessionGateway | null>(null);
  const { theme } = useThemePreference();

  const [connecting, setConnecting] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletSessionSnapshot | null>(null);
  const [connection, setConnection] = useState<NodeConnection>('online');

  const withGateway = useCallback(
    <T,>(run: (gateway: WalletSessionGateway) => Promise<T>): Promise<T> => {
      gatewayRef.current ??= createWalletSessionGateway();
      return run(gatewayRef.current);
    },
    [],
  );

  const openWallet = useCallback(async () => {
    setErrorMessage(null);
    setConnecting(true);
    try {
      const wallets = await withGateway((gateway) => gateway.listWallets());
      // Remote mode always reports its node; the mock runtime starts empty,
      // so a first run creates the demo wallet silently instead of failing.
      const entry =
        wallets[0] ?? (await withGateway((gateway) => gateway.createWallet('Everyday wallet')));
      await withGateway((gateway) => gateway.openWallet(entry.id, () => undefined));
      setWallet(await withGateway((gateway) => gateway.readStatus()));
      setConnection('online');
    } catch (cause) {
      console.log(
        '[metevo] wallet open failed:',
        cause instanceof Error ? cause.name : 'unknown',
      );
      setErrorMessage(describeWalletError(cause));
    } finally {
      setConnecting(false);
    }
  }, [withGateway]);

  // The wallet connects by itself: no sign-in, no wallet picker.
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) {
      return;
    }
    openedRef.current = true;
    void openWallet();
  }, [openWallet]);

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
      language: 'english' as const,
      theme: theme.mode,
      errorMessage,
      connecting,
      wallet,
      connection,
      openWallet,
      refreshWallet,
      submitPayment,
      checkPayment,
      refreshTransfers,
      createUsdmInvoice,
      hasUsableChannelWith,
      connectPeer,
    }),
    [
      theme,
      errorMessage,
      connecting,
      wallet,
      connection,
      openWallet,
      refreshWallet,
      submitPayment,
      checkPayment,
      refreshTransfers,
      createUsdmInvoice,
      hasUsableChannelWith,
      connectPeer,
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
