import { IntentId } from '../types/intents';
import { WalletInstruction } from '../ai/qwen';

/**
 * Wallet instruction -> the intent card shown on Home. `null` means "not
 * understood". The recipient stays the spoken name: the payment card and
 * the payment flow re-validate it, so no destination ever comes from the
 * model.
 */

export interface VoiceIntentAction {
  cardId: IntentId;
  /** Structured payload handed to the card (a payable intent for sends). */
  payload: unknown;
  /** Short English sentence spoken while the card opens. */
  announcement: string;
  transcript: string;
}

const BTC_CURRENCY_PATTERN = /sat|btc|bitcoin/i;

/** Whole positive amounts only: the spoken flow rounds, never truncates. */
function payableAmount(amount: number | null): amount is number {
  return (
    amount !== null &&
    Number.isFinite(amount) &&
    Number.isInteger(amount) &&
    amount > 0
  );
}

export function intentActionFromInstruction(
  instruction: WalletInstruction,
  transcript: string,
): VoiceIntentAction | null {
  switch (instruction.intent) {
    case 'SEND_PAYMENT': {
      const asset =
        instruction.currency !== null && BTC_CURRENCY_PATTERN.test(instruction.currency)
          ? 'BITCOIN_SATOSHI'
          : 'USDM';
      const payable =
        payableAmount(instruction.amount) &&
        instruction.recipient !== null &&
        instruction.recipient.trim().length > 0;
      const payload = payable
        ? {
            action: 'pay' as const,
            asset,
            amount: instruction.amount,
            recipient: instruction.recipient!.trim(),
          }
        : null;
      return {
        cardId: asset === 'BITCOIN_SATOSHI' ? 'send-btc' : 'send-usdm',
        payload,
        announcement:
          payload !== null
            ? `Preparing to send ${instruction.amount} ${asset} to ${instruction.recipient!.trim()}. Review and confirm.`
            : 'Opening the payment preview. Add the missing details to continue.',
        transcript,
      };
    }
    case 'RECEIVE_PAYMENT':
      return {
        cardId: 'create-usdm-invoice',
        payload: { amountUsd: instruction.amount },
        announcement:
          instruction.amount !== null
            ? `Creating a payment request for ${instruction.amount} dollars.`
            : 'Opening your payment request.',
        transcript,
      };
    case 'CHECK_BALANCE':
      return {
        cardId: 'read-balance',
        payload: null,
        announcement: 'Reading your balances.',
        transcript,
      };
    case 'GET_TRANSACTION_HISTORY':
      return {
        cardId: 'read-transactions',
        payload: null,
        announcement: 'Reading your transactions.',
        transcript,
      };
    case 'GET_SPENDING_SUMMARY':
      return {
        cardId: 'read-spending-overview',
        payload: null,
        announcement: 'Reading your spending summary.',
        transcript,
      };
    default:
      return null;
  }
}
