/**
 * Simulated USDm <-> BTC swap quotes. Nothing here talks to a node, an LSP
 * or a market: the rate, fee and limits are fixed example values so the
 * swap screens can be built before the real LSP swap contract exists.
 *
 * Amounts are integers in their smallest on-screen unit to avoid float
 * drift: USDm in cents (two decimals, the precision the app displays) and
 * BTC in satoshis.
 */

export type SwapDirection = 'USDM_TO_BTC' | 'BTC_TO_USDM';

export type SwapAsset = 'USDM' | 'BTC';

export const SATS_PER_BTC = 100_000_000;

/** Example rate: 1 USDm = 1,000 sats (1 BTC = 100,000 USDm). Not a market price. */
export const SIMULATED_SATS_PER_USDM = 1_000;

/** Example fee: 1% of the amount sent, taken from the input side. */
export const SIMULATED_FEE_BASIS_POINTS = 100;

export const SIMULATED_QUOTE_TTL_MS = 60_000;

export const SWAP_LIMITS: Record<SwapAsset, { min: number; max: number }> = {
  USDM: { min: 100, max: 100_000 },
  BTC: { min: 1_000, max: 1_000_000 },
};

export interface SwapQuoteRequest {
  direction: SwapDirection;
  /** Cents for USDm, satoshis for BTC. */
  amountIn: number;
  now: number;
}

export interface SwapQuote {
  direction: SwapDirection;
  amountIn: number;
  feeIn: number;
  amountOut: number;
  satsPerUsdm: number;
  createdAt: number;
  expiresAt: number;
}

export type SwapQuoteRejection =
  | 'invalid-amount'
  | 'below-minimum'
  | 'above-maximum';

export type SwapQuoteResult =
  | { ok: true; quote: SwapQuote }
  | { ok: false; reason: SwapQuoteRejection };

export function inputAsset(direction: SwapDirection): SwapAsset {
  return direction === 'USDM_TO_BTC' ? 'USDM' : 'BTC';
}

export function outputAsset(direction: SwapDirection): SwapAsset {
  return direction === 'USDM_TO_BTC' ? 'BTC' : 'USDM';
}

export function reverseDirection(direction: SwapDirection): SwapDirection {
  return direction === 'USDM_TO_BTC' ? 'BTC_TO_USDM' : 'USDM_TO_BTC';
}

export function quoteSwap(request: SwapQuoteRequest): SwapQuoteResult {
  const { direction, amountIn, now } = request;
  if (!Number.isSafeInteger(amountIn) || amountIn <= 0) {
    return { ok: false, reason: 'invalid-amount' };
  }
  const limits = SWAP_LIMITS[inputAsset(direction)];
  if (amountIn < limits.min) {
    return { ok: false, reason: 'below-minimum' };
  }
  if (amountIn > limits.max) {
    return { ok: false, reason: 'above-maximum' };
  }

  const feeIn = Math.ceil((amountIn * SIMULATED_FEE_BASIS_POINTS) / 10_000);
  const netIn = amountIn - feeIn;
  // Rounding always goes down on the output so a quote never promises more
  // than the input pays for.
  const amountOut =
    direction === 'USDM_TO_BTC'
      ? Math.floor((netIn * SIMULATED_SATS_PER_USDM) / 100)
      : Math.floor((netIn * 100) / SIMULATED_SATS_PER_USDM);

  if (amountOut <= 0) {
    return { ok: false, reason: 'below-minimum' };
  }

  return {
    ok: true,
    quote: {
      direction,
      amountIn,
      feeIn,
      amountOut,
      satsPerUsdm: SIMULATED_SATS_PER_USDM,
      createdAt: now,
      expiresAt: now + SIMULATED_QUOTE_TTL_MS,
    },
  };
}

/** How a bitcoin amount is typed: whole sats or BTC with up to 8 decimals. */
export type BtcUnit = 'SATS' | 'BTC';

const DECIMALS = { USDM: 2, SATS: 0, BTC: 8 } as const;

type TypedUnit = keyof typeof DECIMALS;

function typedUnit(asset: SwapAsset, btcUnit: BtcUnit): TypedUnit {
  return asset === 'USDM' ? 'USDM' : btcUnit;
}

/** "12.5" with 2 decimals -> 1250; null when the text is not a plain number
 * or has more decimals than allowed (never rounded). */
function parseFixed(text: string, decimals: number): number | null {
  const normalized = text.trim().replace(',', '.');
  const pattern = decimals === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
  if (!pattern.test(normalized)) {
    return null;
  }
  const [whole, fraction = ''] = normalized.split('.');
  const value = Number(whole) * 10 ** decimals + Number(fraction.padEnd(decimals, '0') || '0');
  return Number.isSafeInteger(value) ? value : null;
}

function formatFixed(value: number, decimals: number): string {
  if (decimals === 0) {
    return String(value);
  }
  const whole = Math.floor(value / 10 ** decimals);
  const fraction = String(value % 10 ** decimals).padStart(decimals, '0');
  return `${whole}.${fraction}`;
}

/**
 * Reads a typed amount into the asset's integer unit: "12.5" USDm -> 1250
 * cents, "5000" sats -> 5000 sats, "0.00005" BTC -> 5000 sats. Returns null
 * instead of rounding when the text has more precision than the unit allows.
 */
export function parseSwapAmount(
  text: string,
  asset: SwapAsset,
  btcUnit: BtcUnit = 'SATS',
): number | null {
  return parseFixed(text, DECIMALS[typedUnit(asset, btcUnit)]);
}

/** The editable text for an amount (cents or sats) in the typed unit. */
export function draftFromAmount(amount: number, asset: SwapAsset, btcUnit: BtcUnit = 'SATS'): string {
  const unit = typedUnit(asset, btcUnit);
  const text = formatFixed(amount, DECIMALS[unit]);
  // BTC drops trailing zeros ("0.00005000" -> "0.00005"); USDm keeps cents.
  return unit === 'BTC' ? text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : text;
}

/** "0.00005 BTC" for display next to a sats amount. */
export function formatSatsAsBtc(sats: number): string {
  return `${draftFromAmount(sats, 'BTC', 'BTC')} BTC`;
}

/**
 * Value of the typed amount on the other side at the example rate, before
 * the fee: used when the pair is reversed so the field keeps a similar
 * value instead of a number that silently changes meaning.
 */
export function convertAtExampleRate(amount: number, from: SwapAsset): number {
  return from === 'USDM'
    ? Math.floor((amount * SIMULATED_SATS_PER_USDM) / 100)
    : Math.floor((amount * 100) / SIMULATED_SATS_PER_USDM);
}

/** The wallet reports USDm in base units with 8 decimals (as on Home). */
const USDM_BASE_UNITS_PER_CENT = 10 ** 6;

export function usdmCentsFromBaseUnits(baseUnits: number): number {
  return Math.floor(baseUnits / USDM_BASE_UNITS_PER_CENT);
}

export function formatSwapAmount(amount: number, asset: SwapAsset): string {
  if (asset === 'USDM') {
    return `${(amount / 100).toFixed(2)} USDm`;
  }
  return `${amount.toLocaleString('en-US')} sats`;
}
