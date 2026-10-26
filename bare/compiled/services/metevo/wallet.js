import WalletManagerRgbLightning from '@utexo/wdk-rgb-lightning';
// Payment-boundary guards live in their own runtime-agnostic module (the
// React Native app bundle imports them without pulling the WDK binding in).
import { assertPayableInvoice, getPaymentStatus, PaymentValidationError, } from './paymentGuard';
export { assertPayableInvoice, getPaymentStatus, PaymentValidationError, };
const DEFAULT_USDM_TICKER = 'USDM';
export async function createMetevoWallet(mnemonic, config) {
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
export async function getMetevoWalletStatus(account, usdmAssetId) {
    const info = (await account.getNodeInfo());
    const balance = (await account.getBalanceDetails(false));
    let usdmBaseUnits = null;
    let usdmChannelReady = false;
    if (usdmAssetId) {
        usdmBaseUnits = Number(await account.getTokenBalance(usdmAssetId));
        const channels = (await account.listChannels());
        const list = Array.isArray(channels) ? channels : channels?.channels ?? [];
        usdmChannelReady = list.some((c) => c?.peer_pubkey && (c.is_usable ?? c.ready) === true &&
            (c.asset_id ?? null) === usdmAssetId);
    }
    return {
        pubkey: info?.pubkey ?? null,
        btcSpendableSat: Number(balance?.vanilla?.spendable ?? 0),
        usdmBaseUnits,
        usdmChannelReady,
        unlocked: true,
    };
}
export async function ensureColorableUtxos(account, options = {}) {
    const num = options.num ?? 2;
    const sizeSat = options.sizeSat ?? 30050;
    const feeRate = options.feeRate ?? 2;
    try {
        await account.createUtxos({ up_to: true, num, size: sizeSat, fee_rate: feeRate, skip_sync: false });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('Allocations already available') || message.includes('AllocationsAlreadyAvailable')) {
            return;
        }
        throw error;
    }
}
export async function createUsdmReceiveInvoice(account, options) {
    const aware = options.assetId !== null;
    const request = {
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
    const response = (await account.createRgbInvoice(request));
    const invoice = response?.invoice ?? response?.recipient_id;
    if (typeof invoice !== 'string' || invoice.length === 0) {
        throw new Error('createRgbInvoice returned no invoice');
    }
    return { invoice, kind: aware ? 'witness' : 'blind' };
}
/**
 * Advance the node's RGB transfer state machine and report the current
 * transfer list for the asset. The node requires periodic refreshTransfers
 * calls to progress pending transfers (incoming and outgoing); the
 * settlement watcher polls this until a transfer is Settled/Failed.
 *
 * Transfer entries come back untyped from the binding; only the verified
 * fields are mapped, unknown shapes are skipped instead of guessed.
 */
export async function refreshWalletTransfers(account, assetId) {
    // skip_sync=false keeps the node honest about on-chain state before it
    // settles transfers; filter=[] refreshes every pending transfer.
    await account.refreshTransfers({ skip_sync: false, filter: [] });
    if (assetId === null) {
        return [];
    }
    const response = (await account.listTransfers(assetId));
    const list = Array.isArray(response)
        ? response
        : response?.transfers;
    if (!Array.isArray(list)) {
        return [];
    }
    const mapped = [];
    for (const entry of list) {
        if (typeof entry !== 'object' || entry === null) {
            continue;
        }
        const record = entry;
        const transferId = String(record.transfer_id ?? record.transferId ?? record.txid ?? '');
        if (transferId.length === 0) {
            continue;
        }
        const amountRaw = record.receive_amount ?? record.amount ?? null;
        mapped.push({
            transferId,
            kind: String(record.kind ?? ''),
            status: String(record.status ?? ''),
            amount: typeof amountRaw === 'number' && Number.isFinite(amountRaw)
                ? amountRaw
                : null,
        });
    }
    return mapped;
}
/**
 * Creates the receiver's USDm Lightning invoice (the payer pays it over
 * the LSP channel or a direct one). With an amount the invoice pins the
 * asset amount (and lets the node derive the msat demand); without one it
 * stays amount-free (blind receive). Uses the verified camelCase request
 * shape { expirySec, assetId?, assetAmount? } of the WDK account.
 */
export async function createUsdmLightningInvoice(account, usdmAssetId, amountBaseUnits) {
    const response = (await account.createLightningInvoice({
        expirySec: 3600,
        ...(usdmAssetId !== null ? { assetId: usdmAssetId } : {}),
        ...(amountBaseUnits !== null ? { assetAmount: amountBaseUnits } : {}),
    }));
    const invoice = String(response?.invoice ?? '');
    if (invoice.length === 0) {
        throw new Error('createLightningInvoice returned no invoice');
    }
    const paymentHash = String(response?.payment_hash ?? response?.paymentHash ?? '');
    return {
        invoice,
        paymentHash: paymentHash.length > 0 ? paymentHash : null,
    };
}
/**
 * Whether this node has a usable channel with exactly this peer (the
 * direct-route condition for in-person payments over the local link).
 */
export async function hasUsableChannelWith(account, peerPubkey) {
    const channels = (await account.listChannels());
    const list = Array.isArray(channels) ? channels : channels?.channels ?? [];
    const target = peerPubkey.toLowerCase();
    return list.some((c) => String(c?.peer_pubkey ?? '').toLowerCase() === target &&
        (c.is_usable ?? c.ready) === true);
}
export async function findAssetIdByTicker(account, ticker = DEFAULT_USDM_TICKER) {
    const assets = (await account.listAssets(['Ifa', 'Nia']));
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
export async function shutdownMetevoWallet(wallet) {
    try {
        await wallet.account.shutdown();
    }
    finally {
        wallet.manager.dispose();
    }
}
