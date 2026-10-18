import type { WalletIntentParse, WalletTargetLayer } from '../agents/walletIntentAgent';

/**
 * Deterministic validation of the WalletIntent agent's answer, ported from
 * the reference `intent_parser.py`. The model proposes; this code decides.
 * Every rule here re-derives facts from the user's own words, so a
 * hallucinated parameter can never survive into the wallet flow.
 */

export class IntentValidationError extends Error {
  constructor(readonly code: 'unsupported-currency' | 'direction-conflict' | 'non-positive-number') {
    super(code);
    this.name = 'IntentValidationError';
  }
}

const NULLABLE_FIELDS = [
  'amount',
  'currency',
  'recipient',
  'timeframe',
  'limit',
  'purpose',
  'target_layer',
] as const;

/** Spoken layer names normalized to the wallet's enum values. */
const TARGET_LAYER_ALIASES: Record<string, WalletTargetLayer> = {
  'RGB LIGHTNING': 'RGB_LN',
  'BITCOIN LIGHTNING': 'BTC_LN',
  'BTC LIGHTNING': 'BTC_LN',
  'ON-CHAIN': 'ONCHAIN',
  'ON CHAIN': 'ONCHAIN',
};

/** Currencies METEVO does not support; naming one aborts the command. */
const REJECTED_CURRENCY_PATTERN = /\b(usdt|tether)\b|\b(eur|euro|euros)\b/u;

/** Dollar wording (including "$ 50") maps to the USDm stablecoin. */
const USDM_CURRENCY_PATTERN = /\b(usdm|usd|dollar|dollars|dolar|buck|bucks)\b|(?<![a-z])\$\s*\d/u;

/** Satoshi wording maps to bitcoin minor units. */
const SATOSHI_CURRENCY_PATTERN = /\b(satoshi|satoshis|sat|sats)\b/u;

/** A transaction count is not a timeframe ("last 5" + limit 5). */
const COUNT_AS_TIMEFRAME_PATTERNS = (limit: number): RegExp[] => {
  const count = String(limit);
  return [
    new RegExp(`^${count}$`, 'u'),
    new RegExp(`^last ${count}$`, 'u'),
    new RegExp(`^latest ${count}$`, 'u'),
    new RegExp(`^most recent ${count}$`, 'u'),
  ];
};

/** Send wording at the start of a command contradicts RECEIVE_PAYMENT. */
const SEND_DIRECTION_PATTERNS = [
  /^(?:please\s+)?send\b/u,
  /^(?:please\s+)?pay\b/u,
  /^(?:please\s+)?transfer\b/u,
];

/** Receive wording at the start of a command contradicts SEND_PAYMENT. */
const RECEIVE_DIRECTION_PATTERNS = [
  /^(?:please\s+)?request\b/u,
  /^(?:please\s+)?receive\b/u,
  /^(?:please\s+)?generate a payment request\b/u,
  /^(?:please\s+)?create a payment request\b/u,
];

/**
 * Validate and normalize a parsed intent against the user's own words.
 * Returns a new parse; the input is never mutated.
 */
export function validateWalletIntent(
  parsed: WalletIntentParse,
  sourceText: string,
): WalletIntentParse {
  const result = normalizeNullStrings(parsed);
  result.target_layer = normalizeTargetLayer(result.target_layer);
  result.currency = deriveCurrency(sourceText);
  result.timeframe = dropCountAsTimeframe(result.timeframe, result.limit);
  assertPositiveNumbers(result);
  result.purpose = keepEchoedPurpose(result.purpose, sourceText);
  result.target_layer = keepMentionedLayer(result.target_layer, sourceText);
  assertPaymentDirection(result, sourceText);
  return result;
}

function normalizeNullStrings(parsed: WalletIntentParse): WalletIntentParse {
  const result = { ...parsed };
  for (const field of NULLABLE_FIELDS) {
    const value = result[field];
    if (typeof value === 'string' && value.trim().toLowerCase() === 'null') {
      result[field] = null as never;
    }
  }
  return result;
}

function normalizeTargetLayer(layer: WalletTargetLayer): WalletTargetLayer {
  if (typeof layer !== 'string') {
    return layer;
  }
  return TARGET_LAYER_ALIASES[layer.trim().toUpperCase()] ?? layer;
}

/**
 * The currency always comes from the user's words, never from the model:
 * unsupported money aborts, dollar wording means USDm, sat wording means
 * bitcoin minor units, anything else stays null.
 */
function deriveCurrency(sourceText: string): string | null {
  const text = sourceText.toLowerCase();
  if (REJECTED_CURRENCY_PATTERN.test(text)) {
    throw new IntentValidationError('unsupported-currency');
  }
  if (USDM_CURRENCY_PATTERN.test(text)) {
    return 'USDM';
  }
  if (SATOSHI_CURRENCY_PATTERN.test(text)) {
    return 'BITCOIN_SATOSHI';
  }
  return null;
}

function dropCountAsTimeframe(timeframe: string | null, limit: number | null): string | null {
  if (typeof timeframe !== 'string' || limit === null) {
    return timeframe;
  }
  const normalized = timeframe.trim().toLowerCase();
  return COUNT_AS_TIMEFRAME_PATTERNS(limit).some((pattern) => pattern.test(normalized))
    ? null
    : timeframe;
}

function assertPositiveNumbers(parsed: WalletIntentParse): void {
  if (parsed.amount !== null && parsed.amount <= 0) {
    throw new IntentValidationError('non-positive-number');
  }
  if (parsed.limit !== null && parsed.limit <= 0) {
    throw new IntentValidationError('non-positive-number');
  }
}

/** A purpose must be echoed by the user's words, never invented. */
function keepEchoedPurpose(purpose: string | null, sourceText: string): string | null {
  if (purpose === null || typeof purpose !== 'string') {
    return null;
  }
  return sourceText.toLowerCase().includes(purpose.toLowerCase()) ? purpose : null;
}

/** A payment layer only counts when the user actually named it. */
function keepMentionedLayer(layer: WalletTargetLayer, sourceText: string): WalletTargetLayer {
  const text = sourceText.toLowerCase();
  const mentionsLayer = /\blightning\b/u.test(text) || /\bon[\s-]?chain\b/u.test(text);
  return mentionsLayer ? layer : null;
}

function assertPaymentDirection(parsed: WalletIntentParse, sourceText: string): void {
  const text = sourceText.trim().toLowerCase();
  if (parsed.intent === 'RECEIVE_PAYMENT' && matchesAny(SEND_DIRECTION_PATTERNS, text)) {
    throw new IntentValidationError('direction-conflict');
  }
  if (parsed.intent === 'SEND_PAYMENT' && matchesAny(RECEIVE_DIRECTION_PATTERNS, text)) {
    throw new IntentValidationError('direction-conflict');
  }
}

function matchesAny(patterns: RegExp[], text: string): boolean {
  return patterns.some((pattern) => pattern.test(text));
}
