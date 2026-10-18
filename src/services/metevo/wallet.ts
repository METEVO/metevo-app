import WalletManagerRgbLightning from '@utexo/wdk-rgb-lightning';

// Payment-boundary guards live in their own runtime-agnostic module (the
// React Native app bundle imports them without pulling the WDK binding in).
import {
  assertPayableInvoice,
  getPaymentStatus,
  MetevoPaymentStatus,
  PaymentValidationError,
} from './paymentGuard';

export {
  assertPayableInvoice,
  getPaymentStatus,
  MetevoPaymentStatus,
  PaymentValidationError,
};

export interface MetevoWalletConfig {
  network: 'regtest' | 'testnet' | 'signet' | 'mainnet';
  dataDir: string;
  ldkPeerListeningPort?: number;
  daemonListeningPort?: number;
  lspBaseUrl?: string;
  lspBearerToken?: string;
  bitcoindRpcHost: string;
  bitcoindRpcPort: number;
  bitcoindRpcUsername: string;
  bitcoindRpcPassword: string;
  indexerUrl: string;
  proxyEndpoint: string;
}

export interface MetevoWallet {
  manager: WalletManagerRgbLightning;
  account: import('@utexo/wdk-rgb-lightning').WalletAccountRgbLightning;
}

export interface MetevoWalletStatus {
  pubkey: string | null;
  btcSpendableSat: number;
  usdmBaseUnits: number | null;
  usdmChannelReady: boolean;
  unlocked: boolean;
}

const DEFAULT_USDM_TICKER = 'USDM';

export async function createMetevoWallet(
  mnemonic: string,
  config: MetevoWalletConfig,
): Promise<MetevoWallet> {
  const manager = new WalletManagerRgbLightning(mnemonic, {
    network: config.network,
    dataDir: config.dataDir,
    ldkPeerListeningPort: config.ldkPeerListeningPort,
    daemonListeningPort: config.daemonListeningPort,
    ...(config.lspBaseUrl ? { lspBaseUrl: config.lspBaseUrl } : {}),
    ...(config.lspBearerToken ? { lspBearerToken: config.lspBearerToken } : {}),
  });

  const account = await manager.getAccount(0);

  await account.unlock({
    ldk_chain_sync: {
      mode: 'BlockSync',
      config: {
        bitcoind_rpc_username: config.bitcoindRpcUsername,
        bitcoind_rpc_password: config.bitcoindRpcPassword,
        bitcoind_rpc_host: config.bitcoindRpcHost,
        bitcoind_rpc_port: config.bitcoindRpcPort,
      },
    },
    indexer_url: config.indexerUrl,
    proxy_endpoint: config.proxyEndpoint,
    announce_addresses: [],
    announce_alias: 'metevo-wallet',
  });

  return { manager, account };
}

export async function getMetevoWalletStatus(
  account: MetevoWallet['account'],
  usdmAssetId: string | null,
): Promise<MetevoWalletStatus> {
  const info = (await account.getNodeInfo()) as any;
  const balance = (await account.getBalanceDetails(false)) as any;

  let usdmBaseUnits: number | null = null;
  let usdmChannelReady = false;
  if (usdmAssetId) {
    usdmBaseUnits = Number(await account.getTokenBalance(usdmAssetId));
    const channels = (await account.listChannels()) as any;
    const list = Array.isArray(channels) ? channels : channels?.channels ?? [];
    usdmChannelReady = list.some(
      (c: any) => c?.peer_pubkey && (c.is_usable ?? c.ready) === true &&
        (c.asset_id ?? null) === usdmAssetId,
    );
  }

  return {
    pubkey: info?.pubkey ?? null,
    btcSpendableSat: Number(balance?.vanilla?.spendable ?? 0),
    usdmBaseUnits,
    usdmChannelReady,
    unlocked: true,
  };
}

export async function ensureColorableUtxos(
  account: MetevoWallet['account'],
  options: { num?: number; sizeSat?: number; feeRate?: number } = {},
): Promise<void> {
  const num = options.num ?? 2;
  const sizeSat = options.sizeSat ?? 30050;
  const feeRate = options.feeRate ?? 2;
  try {
    await account.createUtxos({ up_to: true, num, size: sizeSat, fee_rate: feeRate, skip_sync: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Allocations already available') || message.includes('AllocationsAlreadyAvailable')) {
      return;
    }
    throw error;
  }
}

export async function createUsdmReceiveInvoice(
  account: MetevoWallet['account'],
  options: { assetId: string | null; amountBaseUnits: number | null; durationSeconds?: number },
): Promise<{ invoice: string; kind: 'blind' | 'witness' }> {
  const aware = options.assetId !== null;
  const request: Record<string, unknown> = {
    min_confirmations: 1,
    witness: aware,
    duration_seconds: options.durationSeconds ?? 3600,
  };
  if (aware) {
    request.asset_id = options.assetId;
    if (options.amountBaseUnits !== null) {
      request.assignment_kind = 'Fungible';
      request.assignment_amount = options.amountBaseUnits;
    }
  }
  const response = (await account.createRgbInvoice(request)) as any;
  const invoice = response?.invoice ?? response?.recipient_id;
  if (typeof invoice !== 'string' || invoice.length === 0) {
    throw new Error('createRgbInvoice returned no invoice');
  }
  return { invoice, kind: aware ? 'witness' : 'blind' };
}

export async function findAssetIdByTicker(
  account: MetevoWallet['account'],
  ticker: string = DEFAULT_USDM_TICKER,
): Promise<string | null> {
  const assets = (await account.listAssets(['Ifa', 'Nia'])) as any;
  const groups = [assets?.ifa ?? [], assets?.nia ?? []];
  for (const group of groups) {
    for (const asset of group) {
      if (String(asset?.ticker ?? '').toLowerCase() === ticker.toLowerCase()) {
        return asset.asset_id;
      }
    }
  }
  return null;
}

export async function shutdownMetevoWallet(wallet: MetevoWallet): Promise<void> {
  try {
    await wallet.account.shutdown();
  } finally {
    wallet.manager.dispose();
  }
}
