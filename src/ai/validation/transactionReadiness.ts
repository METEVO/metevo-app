import type { WalletIntentParse } from '../agents/walletIntentAgent';

/**
 * Pre-execution readiness check for SEND_PAYMENT commands, ported from the
 * reference `transaction_validator.py`. This code never executes anything:
 * it only decides whether the parsed proposal is complete enough to be
 * shown for human approval.
 */

/** Currencies the wallet can actually move. */
const SUPPORTED_CURRENCIES = new Set(['USDM', 'BITCOIN_SATOSHI']);

/** Spoken suffix per payment layer for the confirmation sentence. */
const TARGET_LAYER_PHRASES: Record<string, string> = {
  RGB_LN: 'via RGB Lightning',
  BTC_LN: 'via Bitcoin Lightning',
  ONCHAIN: 'on-chain',
};

export interface TransactionReadiness {
  ready: boolean;
  /** Fields the user still has to provide (canonical field names). */
  missingFields: string[];
  /** English confirmation sentence, or the missing-fields request. */
  message: string | null;
}

export function checkTransactionReadiness(parsed: WalletIntentParse): TransactionReadiness {
  if (parsed.intent !== 'SEND_PAYMENT') {
    return { ready: false, missingFields: [], message: null };
  }

  const missingFields: string[] = [];
  const amount = parsed.amount;
  const validAmount =
    amount !== null && Number.isFinite(amount) && amount > 0;

  if (!validAmount) {
    missingFields.push('amount');
  }
  if (parsed.currency === null || !SUPPORTED_CURRENCIES.has(parsed.currency)) {
    missingFields.push('currency');
  }
  if (typeof parsed.recipient !== 'string' || parsed.recipient.trim().length === 0) {
    missingFields.push('recipient');
  }
  // Satoshi amounts must be whole numbers: there is no fractional sat.
  if (validAmount && parsed.currency === 'BITCOIN_SATOSHI' && !Number.isInteger(amount)) {
    missingFields.push('amount');
  }

  const uniqueMissingFields = [...new Set(missingFields)];
  if (uniqueMissingFields.length > 0) {
    return {
      ready: false,
      missingFields: uniqueMissingFields,
      message: `Please provide valid: ${uniqueMissingFields.join(', ')}`,
    };
  }

  const layerPhrase =
    (parsed.target_layer !== null ? TARGET_LAYER_PHRASES[parsed.target_layer] : undefined) ?? '';
  const separator = layerPhrase.length > 0 ? ' ' : '';
  return {
    ready: true,
    missingFields: [],
    message: `Please confirm sending ${amount} ${parsed.currency} to ${parsed.recipient}${separator}${layerPhrase}.`,
  };
}
