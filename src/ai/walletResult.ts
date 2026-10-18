import type { IntentId } from '../types/intents';
import type {
  WalletIntentName,
  WalletIntentParse,
  WalletTargetLayer,
} from './agents/walletIntentAgent';

/**
 * The canonical wallet JSON format, ported from the reference
 * `response_adapter.py`: one stable shape every consumer (cards, payment
 * guard, audit log) reads, regardless of which agent produced it.
 */

/** Currencies that survive into the wallet format. */
const WALLET_CURRENCIES = new Set(['USDM', 'BITCOIN_SATOSHI']);

/** Spoken time expressions mapped onto structured periods. */
const TIMEFRAME_PERIODS: Record<string, string> = {
  'last week': 'last_week',
  'last month': 'last_month',
  today: 'today',
  'last monday': 'last_monday',
};

export interface WalletTimeframe {
  period: string | null;
  start_date: null;
  end_date: null;
}

export interface WalletCommandParameters {
  recipient: string | null;
  amount: number | null;
  currency: 'USDM' | 'BITCOIN_SATOSHI' | null;
  target_layer: WalletTargetLayer;
  timeframe: WalletTimeframe;
  limit: number | null;
}

export interface WalletCommandResult {
  intent: WalletIntentName;
  parameters: WalletCommandParameters;
  purpose: string | null;
  /** English canonical sentence (audit log); spoken prose is localized separately. */
  message: string;
}

/** Convert a validated parser answer into the wallet JSON format. */
export function adaptWalletResult(parsed: WalletIntentParse): WalletCommandResult {
  return {
    intent: parsed.intent,
    parameters: {
      recipient: parsed.recipient,
      amount: parsed.amount,
      currency: normalizeCurrency(parsed.currency),
      target_layer: parsed.target_layer,
      timeframe: {
        period: structuredPeriod(parsed.timeframe),
        start_date: null,
        end_date: null,
      },
      limit: parsed.limit,
    },
    purpose: parsed.purpose,
    message: '',
  };
}

function normalizeCurrency(currency: string | null): WalletCommandParameters['currency'] {
  return currency !== null && WALLET_CURRENCIES.has(currency)
    ? (currency as WalletCommandParameters['currency'])
    : null;
}

function structuredPeriod(timeframe: string | null): string | null {
  if (typeof timeframe !== 'string') {
    return null;
  }
  return TIMEFRAME_PERIODS[timeframe.toLowerCase()] ?? null;
}

/**
 * Which DynamicFrame card renders the outcome. Money movement only opens a
 * card when the currency is known; anything ambiguous stays unrendered and
 * is explained through the spoken message instead.
 */
export function intentToCardId(result: WalletCommandResult): IntentId | null {
  switch (result.intent) {
    case 'SEND_PAYMENT':
      if (result.parameters.currency === 'USDM') {
        return 'send-usdm';
      }
      if (result.parameters.currency === 'BITCOIN_SATOSHI') {
        return 'send-btc';
      }
      return null;
    case 'RECEIVE_PAYMENT':
      return 'create-usdm-invoice';
    case 'CHECK_BALANCE':
      return 'read-balance';
    case 'GET_SPENDING_SUMMARY':
      return 'read-spending-overview';
    case 'GET_TRANSACTION_HISTORY':
      return 'read-transactions';
    default:
      return null;
  }
}
