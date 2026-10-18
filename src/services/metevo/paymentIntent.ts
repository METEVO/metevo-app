import { z } from 'zod';

/**
 * Voice-to-payment intent contract.
 *
 * The on-device QVAC model is prompted for strict JSON; everything it may
 * return is parsed through this schema and a failure degrades safely to
 * null (the manual path), never to a guessed payment. The model output is
 * untrusted input: amounts and recipients are re-validated here before
 * any invoice request exists.
 */

export interface PaymentVoiceIntent {
  action: 'pay';
  /** Uppercased asset ticker (e.g. "USDM"). */
  asset: string;
  /** Whole display units (whole USD for USDm); fractional amounts are
   * rejected because the spoken flow rounds, never truncates silently. */
  amount: number;
  /** Contact label / lightning address of the recipient. */
  recipient: string;
}

const ASSET_TICKER_PATTERN = /^[a-z]{2,8}$/i;
/** The spoken flow is for everyday amounts; the cap guards against a
 * hallucinated number reaching the confirmation card. */
const MAX_AMOUNT = 1_000_000;
const MAX_RECIPIENT_LENGTH = 120;

const paymentIntentSchema = z
  .object({
    action: z.literal('pay'),
    asset: z.string().regex(ASSET_TICKER_PATTERN).transform((value) => value.toUpperCase()),
    amount: z.number().int().min(1).max(MAX_AMOUNT),
    recipient: z.string().trim().min(1).max(MAX_RECIPIENT_LENGTH),
  })
  .strict();

/**
 * Parses the voice model output (a JSON string or an already-object shape)
 * into a payment intent. Returns null for anything that does not validate:
 * callers must fall back to the manual path instead of retrying blind.
 */
export function parseVoicePaymentIntent(raw: unknown): PaymentVoiceIntent | null {
  let candidate: unknown = raw;
  if (typeof raw === 'string') {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const parsed = paymentIntentSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
