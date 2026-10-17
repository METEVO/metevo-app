import { MetevoLspClient, MetevoBuyQuote, MetevoClaimResult } from './lsp-api.js';
import { createUsdmReceiveInvoice, ensureColorableUtxos, MetevoWallet } from './wallet.js';

export interface FundOptions {
  usdAmount: number;
  usdmAssetId: string | null;
  pollIntervalMs?: number;
  paymentTimeoutMs?: number;
  onProgress?: (step: string) => void;
}

export interface FundResult {
  quote: MetevoBuyQuote;
  claimed: MetevoClaimResult;
  invoiceKind: 'blind' | 'witness';
}

const DEFAULT_PAYMENT_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

export async function awaitInvoiceSettlement(
  account: MetevoWallet['account'],
  paymentHash: string,
  options: { timeoutMs?: number; pollIntervalMs?: number; onProgress?: (step: string) => void } = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PAYMENT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await account.sync();
    const payments = (await account.listPayments()) as any;
    const list = Array.isArray(payments) ? payments : payments?.payments ?? [];
    const match = list.find((p: any) => {
      const hash = String(p?.payment_hash ?? p?.paymentHash ?? '').toLowerCase();
      return hash === paymentHash.toLowerCase();
    });
    const status = String(match?.status ?? 'Pending');
    options.onProgress?.(`payment status: ${status}`);
    if (status === 'Succeeded') {
      const preimage = String(match?.payment_preimage ?? match?.paymentPreimage ?? '');
      return preimage;
    }
    if (status === 'Failed') {
      throw new Error(`payment ${paymentHash} failed`);
    }
    await sleep(pollIntervalMs);
  }
  throw new Error(`payment ${paymentHash} did not settle within ${timeoutMs}ms`);
}

export async function fundMetevoWallet(
  wallet: MetevoWallet,
  lsp: MetevoLspClient,
  options: FundOptions,
): Promise<FundResult> {
  const { onProgress } = options;

  onProgress?.('quoting buy');
  const quote = await lsp.buy(options.usdAmount);
  if (options.usdmAssetId !== null && quote.assetId !== options.usdmAssetId) {
    throw new Error(
      `LSP quoted asset ${quote.assetId} but the wallet expects ${options.usdmAssetId}`,
    );
  }
  onProgress?.(`paying invoice for ${quote.sats} sats`);
  await wallet.account.sendPayment({ invoice: quote.invoice });

  onProgress?.('waiting for payment settlement');
  const preimage = await awaitInvoiceSettlement(wallet.account, quote.paymentHash, {
    timeoutMs: options.paymentTimeoutMs,
    pollIntervalMs: options.pollIntervalMs,
    onProgress,
  });

  onProgress?.('preparing receive invoice');
  await ensureColorableUtxos(wallet.account);
  const receive = await createUsdmReceiveInvoice(wallet.account, {
    assetId: options.usdmAssetId,
    amountBaseUnits: options.usdmAssetId !== null ? quote.assetAmount : null,
  });
  onProgress?.(`claiming with ${receive.kind} invoice`);

  const claimed = await lsp.claim({
    paymentHash: quote.paymentHash,
    rgbInvoice: receive.invoice,
    paymentPreimage: preimage.length > 0 ? preimage : null,
  });
  if (claimed.status !== 'delivered') {
    throw new Error(
      `claim reached status ${claimed.status}${claimed.reason ? `: ${claimed.reason}` : ''}`,
    );
  }
  return { quote, claimed, invoiceKind: receive.kind };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
