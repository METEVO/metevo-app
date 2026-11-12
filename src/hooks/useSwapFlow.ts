import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { ENV } from '../config/env';
import { SwapFlow, SwapFlowStart } from '../services/swap/swapFlow';
import { purchaseRuntime } from '../services/swap/purchaseRuntime';
import { announceForAccessibility, speakEnglish } from '../utils/speaker';
import { useWalletSession } from './useWalletSession';

export function useSwapFlow(start: SwapFlowStart) {
  const session = useWalletSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const node = session.wallet?.nodePubkey ?? '';
  const flow = useMemo(() => {
    let runtime: ReturnType<typeof purchaseRuntime> | undefined;
    const getRuntime = () => { runtime ??= purchaseRuntime(() => sessionRef.current, node); return runtime; };
    return new SwapFlow({
      enabled: () => ENV.EXPO_PUBLIC_REAL_USDM_PURCHASE && ENV.EXPO_PUBLIC_WALLET_MODE !== 'mock' && !!node,
      expectedAssetId: () => sessionRef.current.wallet?.usdmAssetId ?? null,
      ledger: () => getRuntime().ledger,
      purchase: {
        buy: (amount) => getRuntime().ports.buy(amount), claim: (params) => getRuntime().ports.claim(params),
        decodeInvoice: (invoice) => getRuntime().ports.decodeInvoice(invoice),
        payInvoice: (invoice) => getRuntime().ports.payInvoice(invoice),
        checkPayment: (hash) => getRuntime().ports.checkPayment(hash),
        createRgbReceiveInvoice: (asset, amount) => getRuntime().ports.createRgbReceiveInvoice(asset, amount),
        verifyDelivery: (recipient, asset, amount) => getRuntime().ports.verifyDelivery(recipient, asset, amount),
        now: Date.now, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      },
      async authorize(reason) {
        const { hasDeviceLock, authenticateToAccessSecrets } = await import('../services/metevo/secure-store');
        if (await hasDeviceLock().catch(() => true)) await authenticateToAccessSecrets(reason);
      },
      announce(text) { speakEnglish(text); announceForAccessibility(text); }, now: Date.now,
    }, start);
  }, [node, start]);
  const state = useSyncExternalStore(flow.subscribe, flow.getState);
  useEffect(() => { if (node && ENV.EXPO_PUBLIC_WALLET_MODE !== 'mock') void flow.restore(); return () => flow.dispose(); }, [flow, node]);
  return { flow, state, enabled: ENV.EXPO_PUBLIC_REAL_USDM_PURCHASE && ENV.EXPO_PUBLIC_WALLET_MODE !== 'mock' && !!node };
}
