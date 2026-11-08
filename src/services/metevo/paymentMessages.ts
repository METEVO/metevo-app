import type { PaymentFlowStage } from '../../hooks/usePaymentFlow';

export interface PaymentMessageContext {
  recipient: string;
  /** Whole USDm. */
  amount: number;
  /** A payment hash is known, so "Check status" can ask about it. */
  canCheckStatus?: boolean;
  /** Read after the review line when the balance looks too low. */
  balanceWarning?: string | null;
}

export interface PaymentMessage {
  /** Short line shown on the card. */
  title: string;
  /** Sentence read out loud when the stage starts; null keeps quiet. */
  spoken: string | null;
}

/**
 * One wording per payment stage, shared by the card and the voice, so what
 * is written and what is heard never disagree. Sentences stay short for
 * people who read little.
 */
export function paymentMessage(
  stage: PaymentFlowStage,
  { recipient, amount, canCheckStatus = false, balanceWarning = null }: PaymentMessageContext,
): PaymentMessage {
  const money = `${amount} dollars`;
  switch (stage) {
    case 'requesting':
      return {
        title: `Waiting for ${recipient} to accept`,
        spoken: `Waiting for ${recipient} to accept. Ask ${recipient} to open METEVO.`,
      };
    case 'review':
      return {
        title: `Send ${amount} USDm to ${recipient}?`,
        spoken: [
          `${recipient} accepted. Check the amount: ${money}.`,
          balanceWarning,
          'Then confirm.',
        ]
          .filter(Boolean)
          .join(' '),
      };
    case 'authorizing':
      return {
        title: 'Confirm with your fingerprint',
        spoken: 'Confirm with your fingerprint.',
      };
    case 'submitting':
      return { title: 'Sending…', spoken: 'Sending the money.' };
    case 'watching':
      return {
        title: 'Waiting for the network',
        spoken: 'Sent. Waiting for the network to confirm.',
      };
    case 'settled':
      return {
        title: 'Money sent',
        spoken: `Done. ${recipient} received ${money}.`,
      };
    case 'failed':
      return {
        title: 'The payment failed',
        spoken: 'The payment failed. No money left your wallet.',
      };
    case 'unknown':
      return {
        title: 'We are not sure it was sent',
        spoken: canCheckStatus
          ? 'We are not sure the payment was sent. Do not pay again. Tap Check status.'
          : 'We are not sure the payment was sent. Do not pay again before checking your history.',
      };
    case 'error':
      return { title: 'The payment could not start', spoken: null };
    case 'idle':
      return { title: '', spoken: null };
  }
}

const USDM_BASE_UNITS_PER_CENT = 10 ** 6;

/**
 * Warns without blocking: the shown balance can lag behind the node, so a
 * payment above it is still allowed and the node has the final word.
 */
export function lowBalanceWarning(
  amount: number,
  balanceUsdmBaseUnits: number | null,
): string | null {
  if (balanceUsdmBaseUnits === null) {
    return null;
  }
  const balanceCents = Math.floor(balanceUsdmBaseUnits / USDM_BASE_UNITS_PER_CENT);
  if (amount * 100 <= balanceCents) {
    return null;
  }
  return `Your balance is ${(balanceCents / 100).toFixed(2)} USDm, less than this payment. It may fail.`;
}

export const NOT_AUTHORIZED_NOTE = 'Not confirmed. Nothing was sent.';

/** Upper bound for a typed amount, same as the spoken flow. */
export const MAX_TAP_AMOUNT = 1_000_000;

/**
 * Typed USDm amount: whole numbers only until the relay accepts decimals
 * (`amount_usd` is an integer on the LSP). "12.50" is refused, never rounded.
 */
export function parseWholeUsdm(text: string): number | null {
  const normalized = text.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount >= 1 && amount <= MAX_TAP_AMOUNT
    ? amount
    : null;
}
