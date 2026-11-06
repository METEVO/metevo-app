import {
  SIMULATED_QUOTE_TTL_MS,
  formatSwapAmount,
  parseSwapAmount,
  quoteSwap,
  convertAtExampleRate,
  draftFromAmount,
  formatSatsAsBtc,
  reverseDirection,
  usdmCentsFromBaseUnits,
} from '../../src/services/swap/swapQuote';
import { createSimulatedSwapService } from '../../src/services/swap/swapService';

const NOW = 1_700_000_000_000;

describe('simulated swap quote', () => {
  test('USDm to BTC: 1% fee on the input, output rounded down to whole sats', () => {
    const result = quoteSwap({ direction: 'USDM_TO_BTC', amountIn: 1_000, now: NOW });
    expect(result).toEqual({
      ok: true,
      quote: {
        direction: 'USDM_TO_BTC',
        amountIn: 1_000,
        feeIn: 10,
        amountOut: 9_900,
        satsPerUsdm: 1_000,
        createdAt: NOW,
        expiresAt: NOW + SIMULATED_QUOTE_TTL_MS,
      },
    });
  });

  test('BTC to USDm: output in whole cents, never rounded up', () => {
    const result = quoteSwap({ direction: 'BTC_TO_USDM', amountIn: 12_345, now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quote.feeIn).toBe(124);
    // (12,345 - 124) sats / 1,000 sats per USDm = 12.221 USDm -> 1,222 cents
    expect(result.quote.amountOut).toBe(1_222);
    expect(Number.isInteger(result.quote.amountOut)).toBe(true);
  });

  test.each([
    [0, 'invalid-amount'],
    [-5, 'invalid-amount'],
    [1.5, 'invalid-amount'],
    [99, 'below-minimum'],
    [100_001, 'above-maximum'],
  ])('rejects %p cents as %s', (amountIn, reason) => {
    expect(quoteSwap({ direction: 'USDM_TO_BTC', amountIn, now: NOW })).toEqual({
      ok: false,
      reason,
    });
  });

  test('converts wallet USDm base units (8 decimals) to whole cents, rounding down', () => {
    expect(usdmCentsFromBaseUnits(2_000_000_000)).toBe(2_000);
    expect(usdmCentsFromBaseUnits(1_999_999)).toBe(1);
  });

  test('reversing twice returns the original direction', () => {
    expect(reverseDirection(reverseDirection('USDM_TO_BTC'))).toBe('USDM_TO_BTC');
  });
});

describe('typed swap amounts', () => {
  test('USDm accepts up to two decimals and a comma separator', () => {
    expect(parseSwapAmount('12.5', 'USDM')).toBe(1_250);
    expect(parseSwapAmount('12,05', 'USDM')).toBe(1_205);
    expect(parseSwapAmount('7', 'USDM')).toBe(700);
  });

  test('extra precision is refused instead of rounded', () => {
    expect(parseSwapAmount('1.005', 'USDM')).toBeNull();
    expect(parseSwapAmount('10.5', 'BTC')).toBeNull();
    expect(parseSwapAmount('abc', 'USDM')).toBeNull();
    expect(parseSwapAmount('', 'BTC')).toBeNull();
  });

  test('BTC accepts up to 8 decimals and becomes whole sats', () => {
    expect(parseSwapAmount('0.00005', 'BTC', 'BTC')).toBe(5_000);
    expect(parseSwapAmount('1', 'BTC', 'BTC')).toBe(100_000_000);
    expect(parseSwapAmount('0.000000001', 'BTC', 'BTC')).toBeNull();
  });

  test('amounts become editable text in the chosen unit', () => {
    expect(draftFromAmount(1_250, 'USDM')).toBe('12.50');
    expect(draftFromAmount(5_000, 'BTC', 'SATS')).toBe('5000');
    expect(draftFromAmount(5_000, 'BTC', 'BTC')).toBe('0.00005');
    expect(draftFromAmount(1_000_000_000, 'BTC', 'BTC')).toBe('10');
    expect(draftFromAmount(0, 'BTC', 'BTC')).toBe('0');
    expect(formatSatsAsBtc(9_900)).toBe('0.000099 BTC');
  });

  test('the example rate converts both ways, rounding down', () => {
    expect(convertAtExampleRate(1_000, 'USDM')).toBe(10_000);
    expect(convertAtExampleRate(10_999, 'BTC')).toBe(1_099);
  });

  test('formats cents and sats for display', () => {
    expect(formatSwapAmount(1_250, 'USDM')).toBe('12.50 USDm');
    expect(formatSwapAmount(9_900, 'BTC')).toBe('9,900 sats');
  });
});

describe('simulated swap service', () => {
  const quote = () => {
    const result = quoteSwap({ direction: 'USDM_TO_BTC', amountIn: 500, now: NOW });
    if (!result.ok) throw new Error('expected a quote');
    return result.quote;
  };

  test('completes a valid quote and says it is a simulation', async () => {
    const service = createSimulatedSwapService({ delayMs: 0 });
    expect(service.simulated).toBe(true);
    await expect(service.execute(quote(), NOW + 1)).resolves.toEqual({
      status: 'completed',
      quote: quote(),
    });
  });

  test('refuses an expired quote', async () => {
    const service = createSimulatedSwapService({ delayMs: 0 });
    await expect(service.execute(quote(), NOW + SIMULATED_QUOTE_TTL_MS)).resolves.toEqual({
      status: 'failed',
      reason: 'quote-expired',
    });
  });

  test('can be forced to fail', async () => {
    const service = createSimulatedSwapService({ delayMs: 0, fail: true });
    await expect(service.execute(quote(), NOW)).resolves.toEqual({
      status: 'failed',
      reason: 'simulated-failure',
    });
  });
});
