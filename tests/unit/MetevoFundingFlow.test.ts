import { fundMetevoWallet } from '../../src/services/metevo/funding';
import { MetevoLspClient } from '../../src/services/metevo/lsp-api';

jest.mock('@utexo/wdk-rgb-lightning', () => ({
  __esModule: true,
  default: jest.fn(),
}));

type FundingAccount = Record<string, jest.Mock>;

const FUNDING_PREIMAGE = 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';

const FUNDING_QUOTE = {
  payment_hash: 'a24672c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
  invoice: 'lnbcrt300000n1...',
  amount_msat: 300_000_000,
  sats: 300_000,
  usd_amount: 100,
  asset_id: 'rgb:usdm-contract-id',
  asset_amount: 10_000_000_000,
  sats_per_usd: 3000,
  expires_at: 1_787_164_542,
};

const FUNDING_QUOTE_EXPECTED = {
  paymentHash: FUNDING_QUOTE.payment_hash,
  invoice: FUNDING_QUOTE.invoice,
  amountMsat: 300_000_000,
  sats: 300_000,
  usdAmount: 100,
  assetId: 'rgb:usdm-contract-id',
  assetAmount: 10_000_000_000,
  satsPerUsd: 3000,
  expiresAt: 1_787_164_542,
};

const FUNDING_CLAIM = {
  payment_hash: FUNDING_QUOTE.payment_hash,
  asset_id: 'rgb:usdm-contract-id',
  asset_amount: 10_000_000_000,
  status: 'delivered',
};

function fundingSettledPayment(
  paymentHash: string,
  overrides: { omitPreimage?: boolean } = {},
): Record<string, unknown> {
  return {
    payment_hash: paymentHash,
    inbound: true,
    status: 'Succeeded',
    ...(overrides.omitPreimage ? {} : { payment_preimage: FUNDING_PREIMAGE }),
  };
}

function fundingJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function makeLsp(quoteResponse: unknown, claimResponse: unknown): MetevoLspClient {
  return new MetevoLspClient({
    baseUrl: 'http://127.0.0.1:8080',
    bearerToken: 'test-token',
    fetchImpl: jest
      .fn()
      .mockResolvedValueOnce(fundingJsonResponse(200, quoteResponse))
      .mockResolvedValueOnce(fundingJsonResponse(200, claimResponse)),
  });
}

function makeWalletWithAccount(): { wallet: any; account: FundingAccount } {
  const account = jest.fn() as unknown as FundingAccount;
  const manager = { getAccount: jest.fn().mockResolvedValue(account), dispose: jest.fn() };
  return { wallet: { manager, account }, account };
}

function stubWallet(account: FundingAccount): any {
  account.listPayments = jest
    .fn()
    .mockResolvedValue({ payments: [fundingSettledPayment(FUNDING_QUOTE.payment_hash)] });
  account.sync = jest.fn().mockResolvedValue(undefined);
  account.createUtxos = jest.fn().mockResolvedValue(undefined);
  account.createRgbInvoice = jest.fn().mockResolvedValue({ invoice: 'rgb1witness...' });
  account.sendPayment = jest.fn().mockResolvedValue({ payment_hash: 'sent', status: 'Pending' });
  return { manager: { getAccount: jest.fn().mockResolvedValue(account), dispose: jest.fn() }, account };
}

describe('fundMetevoWallet', () => {
  it('pays the quoted invoice and claims with the wallet invoice', async () => {
    const { wallet, account } = makeWalletWithAccount();
    stubWallet(account);
    const lsp = makeLsp(FUNDING_QUOTE, FUNDING_CLAIM);

    const result = await fundMetevoWallet(wallet, lsp, { usdAmount: 100, usdmAssetId: 'rgb:usdm-contract-id' });

    expect(result.quote).toEqual(FUNDING_QUOTE_EXPECTED);
    expect(result.invoiceKind).toBe('witness');
    expect(account.sendPayment).toHaveBeenCalledWith({ invoice: FUNDING_QUOTE.invoice });
    const [claimUrl, init] = (lsp as any).fetchImpl.mock.calls[1];
    expect(claimUrl).toBe('http://127.0.0.1:8080/metevo/claim');
    expect(JSON.parse(String(init.body))).toEqual({
      payment_hash: FUNDING_QUOTE.payment_hash,
      rgb_invoice: 'rgb1witness...',
      payment_preimage: FUNDING_PREIMAGE,
    });
  });

  it('claims without a preimage when the payment record does not expose one', async () => {
    const { wallet, account } = makeWalletWithAccount();
    stubWallet(account);
    account.listPayments = jest
      .fn()
      .mockResolvedValue({
        payments: [fundingSettledPayment(FUNDING_QUOTE.payment_hash, { omitPreimage: true })],
      });
    const lsp = makeLsp(FUNDING_QUOTE, FUNDING_CLAIM);

    const result = await fundMetevoWallet(wallet, lsp, { usdAmount: 100, usdmAssetId: 'rgb:usdm-contract-id' });

    expect(result.invoiceKind).toBe('witness');
    const [, init] = (lsp as any).fetchImpl.mock.calls[1];
    expect(JSON.parse(String(init.body))).toEqual({
      payment_hash: FUNDING_QUOTE.payment_hash,
      rgb_invoice: 'rgb1witness...',
    });
  });

  it('claims with a blind invoice when the wallet does not know the asset yet', async () => {
    const { wallet, account } = makeWalletWithAccount();
    stubWallet(account);
    account.createRgbInvoice = jest.fn().mockResolvedValue({ invoice: 'rgb1blind...' });
    const lsp = makeLsp(FUNDING_QUOTE, FUNDING_CLAIM);

    const result = await fundMetevoWallet(wallet, lsp, { usdAmount: 100, usdmAssetId: null });

    expect(result.invoiceKind).toBe('blind');
    expect(account.createRgbInvoice).toHaveBeenCalledWith({
      min_confirmations: 1,
      witness: false,
      duration_seconds: 3600,
    });
  });

  it('claims with a witness invoice when the wallet already knows the asset', async () => {
    const { wallet, account } = makeWalletWithAccount();
    stubWallet(account);
    const lsp = makeLsp(FUNDING_QUOTE, FUNDING_CLAIM);

    const result = await fundMetevoWallet(wallet, lsp, { usdAmount: 100, usdmAssetId: 'rgb:usdm-contract-id' });

    expect(result.invoiceKind).toBe('witness');
    expect(account.createRgbInvoice).toHaveBeenCalledWith({
      min_confirmations: 1,
      witness: true,
      duration_seconds: 3600,
      asset_id: 'rgb:usdm-contract-id',
      assignment_kind: 'Fungible',
      assignment_amount: 10_000_000_000,
    });
  });

  it('refuses a quote whose asset differs from the asset the wallet expects', async () => {
    const { wallet, account } = makeWalletWithAccount();
    stubWallet(account);
    const lsp = makeLsp(FUNDING_QUOTE, FUNDING_CLAIM);

    await expect(
      fundMetevoWallet(wallet, lsp, { usdAmount: 100, usdmAssetId: 'rgb:other-asset' }),
    ).rejects.toThrow('LSP quoted asset rgb:usdm-contract-id but the wallet expects rgb:other-asset');
    expect(account.sendPayment).not.toHaveBeenCalled();
  });

  it('propagates a failed payment instead of claiming', async () => {
    const { wallet, account } = makeWalletWithAccount();
    account.sync = jest.fn().mockResolvedValue(undefined);
    account.listPayments = jest.fn().mockResolvedValue({ payments: [] });
    account.createUtxos = jest.fn();
    account.createRgbInvoice = jest.fn();
    account.sendPayment = jest.fn().mockResolvedValue({ payment_hash: 'sent', status: 'Pending' });
    const lsp = makeLsp(FUNDING_QUOTE, FUNDING_CLAIM);

    await expect(
      fundMetevoWallet(wallet, lsp, {
        usdAmount: 100,
        usdmAssetId: 'rgb:usdm-contract-id',
        paymentTimeoutMs: 100,
      }),
    ).rejects.toThrow('did not settle');
    expect(account.createRgbInvoice).not.toHaveBeenCalled();
    expect((lsp as any).fetchImpl).toHaveBeenCalledTimes(1);
  });
});
