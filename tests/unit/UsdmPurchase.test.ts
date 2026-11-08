import { MetevoBuyQuote, MetevoClaimResult, MetevoLspError } from '../../src/services/metevo/lsp-api';
import { PaymentNetworkStatus } from '../../src/services/metevo/wallet-gateway';
import {
  UsdmPurchaseLedger,
  UsdmPurchasePorts,
  UsdmPurchaseQuote,
  UsdmPurchaseTiming,
  UsdmQuoteError,
  completeUsdmPurchase,
  quoteUsdmPurchase,
} from '../../src/services/swap/usdmPurchase';

jest.mock('expo-secure-store', () => ({}));

const ASSET = 'rgb:usdm-asset';
const HASH = 'ab'.repeat(32);
const TIMING: UsdmPurchaseTiming = {
  settlePollMs: 1_000,
  settleTimeoutMs: 5_000,
  claimAttempts: 3,
  claimRetryMs: 1_000,
};

function lspQuote(overrides: Partial<MetevoBuyQuote> = {}): MetevoBuyQuote {
  return {
    paymentHash: HASH,
    invoice: 'lnbcrt-test-invoice',
    amountMsat: 60_000_000,
    sats: 60_000,
    usdAmount: 20,
    assetId: ASSET,
    assetAmount: 20 * 10 ** 8,
    satsPerUsd: 3_000,
    expiresAt: 1_000,
    ...overrides,
  };
}

function confirmedQuote(overrides: Partial<UsdmPurchaseQuote> = {}): UsdmPurchaseQuote {
  return {
    paymentHash: HASH,
    invoice: 'lnbcrt-test-invoice',
    sats: 60_000,
    usdAmount: 20,
    assetId: ASSET,
    assetAmount: 20 * 10 ** 8,
    satsPerUsd: 3_000,
    expiresAt: 1_000_000,
    ...overrides,
  };
}

function delivered(): MetevoClaimResult {
  return { paymentHash: HASH, assetId: ASSET, assetAmount: 20 * 10 ** 8, status: 'delivered' };
}

function setup(options: {
  settlements?: PaymentNetworkStatus[];
  claims?: Array<MetevoClaimResult | Error>;
} = {}) {
  let clock = 0;
  const settlements = [...(options.settlements ?? ['settled'])];
  const claims = [...(options.claims ?? [delivered()])];
  const ports = {
    buy: jest.fn(async (usdAmount: number) => lspQuote({ usdAmount, assetAmount: usdAmount * 10 ** 8 })),
    claim: jest.fn(async () => {
      const next = claims.length > 1 ? claims.shift()! : claims[0];
      if (next instanceof Error) throw next;
      return next;
    }),
    payInvoice: jest.fn(async () => ({ paymentHash: HASH })),
    checkPayment: jest.fn(async () => (settlements.length > 1 ? settlements.shift()! : settlements[0])),
    createRgbReceiveInvoice: jest.fn(async () => 'rgb:invoice-1'),
    now: () => clock,
    sleep: jest.fn(async (ms: number) => {
      clock += ms;
    }),
  } satisfies UsdmPurchasePorts;
  return { ports, ledger: new UsdmPurchaseLedger(), advance: (ms: number) => (clock += ms) };
}

describe('USDm purchase quote', () => {
  test('asks the LSP for whole USD and converts the expiry to milliseconds', async () => {
    const { ports } = setup();
    const quote = await quoteUsdmPurchase(ports, 20, ASSET);
    expect(ports.buy).toHaveBeenCalledWith(20);
    expect(quote.expiresAt).toBe(1_000_000);
    expect(quote.sats).toBe(60_000);
  });

  test.each([0, -1, 1.5, Number.NaN])('refuses %p before calling the LSP', async (amount) => {
    const { ports } = setup();
    await expect(quoteUsdmPurchase(ports, amount, ASSET)).rejects.toThrow(UsdmQuoteError);
    expect(ports.buy).not.toHaveBeenCalled();
  });

  test('refuses a quote for another asset or another amount', async () => {
    const { ports } = setup();
    ports.buy.mockResolvedValueOnce(lspQuote({ assetId: 'rgb:other' }));
    await expect(quoteUsdmPurchase(ports, 20, ASSET)).rejects.toThrow('different asset');
    ports.buy.mockResolvedValueOnce(lspQuote({ assetAmount: 19 * 10 ** 8 }));
    await expect(quoteUsdmPurchase(ports, 20, ASSET)).rejects.toThrow('does not match');
  });
});

describe('USDm purchase completion', () => {
  test('pays the confirmed invoice once, then claims the USDm', async () => {
    const { ports, ledger } = setup();
    const outcome = await completeUsdmPurchase(ports, ledger, confirmedQuote(), TIMING);

    expect(outcome).toEqual({ status: 'delivered', assetAmount: 20 * 10 ** 8 });
    expect(ports.payInvoice).toHaveBeenCalledTimes(1);
    expect(ports.payInvoice).toHaveBeenCalledWith('lnbcrt-test-invoice');
    expect(ports.createRgbReceiveInvoice).toHaveBeenCalledWith(ASSET, 20 * 10 ** 8);
    expect(ports.claim).toHaveBeenCalledWith({ paymentHash: HASH, rgbInvoice: 'rgb:invoice-1' });
  });

  test('never pays an expired quote', async () => {
    const { ports, ledger, advance } = setup();
    advance(1_000_000);
    const outcome = await completeUsdmPurchase(ports, ledger, confirmedQuote(), TIMING);
    expect(outcome).toEqual({ status: 'quote-expired' });
    expect(ports.payInvoice).not.toHaveBeenCalled();
  });

  test('a double tap pays once', async () => {
    const { ports, ledger } = setup();
    const quote = confirmedQuote();
    const [first, second] = await Promise.all([
      completeUsdmPurchase(ports, ledger, quote, TIMING),
      completeUsdmPurchase(ports, ledger, quote, TIMING),
    ]);
    expect(ports.payInvoice).toHaveBeenCalledTimes(1);
    expect(first.status).toBe('delivered');
    expect(second.status).not.toBe('payment-failed');
  });

  test('a failed payment frees the order for a new quote', async () => {
    const { ports, ledger } = setup({ settlements: ['failed'] });
    const outcome = await completeUsdmPurchase(ports, ledger, confirmedQuote(), TIMING);
    expect(outcome).toEqual({ status: 'payment-failed' });
    expect(ports.claim).not.toHaveBeenCalled();
    expect(ledger.get(HASH)).toBeUndefined();
  });

  test('a slow settlement stays pending and resumes without paying again', async () => {
    const { ports, ledger } = setup({ settlements: ['pending'] });
    const quote = confirmedQuote();
    expect(await completeUsdmPurchase(ports, ledger, quote, TIMING)).toEqual({
      status: 'payment-pending',
    });

    ports.checkPayment.mockResolvedValue('settled');
    const resumed = await completeUsdmPurchase(ports, ledger, quote, TIMING);
    expect(resumed.status).toBe('delivered');
    expect(ports.payInvoice).toHaveBeenCalledTimes(1);
  });

  test('a 409 claim is retried with the same hash and RGB invoice', async () => {
    const busy = new MetevoLspError('/metevo/claim', 409, 'already being delivered');
    const { ports, ledger } = setup({ claims: [busy, delivered()] });
    const outcome = await completeUsdmPurchase(ports, ledger, confirmedQuote(), TIMING);

    expect(outcome.status).toBe('delivered');
    expect(ports.claim).toHaveBeenCalledTimes(2);
    expect(ports.createRgbReceiveInvoice).toHaveBeenCalledTimes(1);
    expect(ports.claim.mock.calls[1]).toEqual(ports.claim.mock.calls[0]);
  });

  test('an unreachable LSP leaves the paid order to resume, with no new payment', async () => {
    const down = new MetevoLspError('/metevo/claim', 502, 'node failure');
    const { ports, ledger } = setup({ claims: [down] });
    const quote = confirmedQuote();
    expect(await completeUsdmPurchase(ports, ledger, quote, TIMING)).toEqual({
      status: 'claim-pending',
      reason: 'unreachable',
    });
    expect(ports.claim).toHaveBeenCalledTimes(TIMING.claimAttempts);

    ports.claim.mockResolvedValue(delivered());
    expect((await completeUsdmPurchase(ports, ledger, quote, TIMING)).status).toBe('delivered');
    expect(ports.payInvoice).toHaveBeenCalledTimes(1);
    expect(ports.createRgbReceiveInvoice).toHaveBeenCalledTimes(1);
  });

  test('a 401 claim stops at once with a distinct reason', async () => {
    const denied = new MetevoLspError('/metevo/claim', 401, 'bad token');
    const { ports, ledger } = setup({ claims: [denied] });
    expect(await completeUsdmPurchase(ports, ledger, confirmedQuote(), TIMING)).toEqual({
      status: 'claim-pending',
      reason: 'unauthorized',
    });
    expect(ports.claim).toHaveBeenCalledTimes(1);
  });

  test('a delivered order answers from the ledger without touching the network', async () => {
    const { ports, ledger } = setup();
    const quote = confirmedQuote();
    await completeUsdmPurchase(ports, ledger, quote, TIMING);
    jest.clearAllMocks();
    expect((await completeUsdmPurchase(ports, ledger, quote, TIMING)).status).toBe('delivered');
    expect(ports.payInvoice).not.toHaveBeenCalled();
    expect(ports.claim).not.toHaveBeenCalled();
  });
});
