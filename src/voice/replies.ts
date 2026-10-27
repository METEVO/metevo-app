import { IntentId } from '../types/intents';

/**
 * Spoken replies (design phase 5). Replies are templates keyed by the
 * intent and the executor result — only open-ended conversation would use
 * generated text, and the home agent does not do that. Everything that
 * reaches a speech engine passes through `sanitizeForSpeech`.
 */

const REPLY_TEMPLATES: Record<IntentId, string> = {
  'send-usdm': 'Opening the payment. Review the details and confirm.',
  'send-btc': 'Opening the bitcoin payment. Review the details and confirm.',
  'create-usdm-invoice': 'Opening your payment request.',
  'read-transactions': 'Reading your recent transactions.',
  'read-spending-overview': 'Reading your spending summary.',
  'read-balance': 'Reading your balances.',
  contacts: 'Opening your contacts.',
  'invoice-request': 'Opening the invoice request.',
};

const NOT_UNDERSTOOD = 'I did not understand. Please say it again, or type it.';

/** Markdown, emoji and URLs have no spoken form; drop them before TTS. */
const SPEECH_NOISE = [
  /https?:\/\/\S+/g, // URLs
  /[*_#~`]+/g, // markdown emphasis and fences
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, // emoji and symbols
];

export function sanitizeForSpeech(text: string): string {
  let clean = text;
  for (const pattern of SPEECH_NOISE) {
    clean = clean.replace(pattern, ' ');
  }
  return clean.replace(/\s+/g, ' ').trim();
}

/** The spoken reply for an intent card about to open. */
export function replyForIntent(cardId: IntentId): string {
  return sanitizeForSpeech(REPLY_TEMPLATES[cardId] ?? NOT_UNDERSTOOD);
}

/** The spoken reply when nothing was understood. */
export function replyForUnclear(): string {
  return NOT_UNDERSTOOD;
}

/** The spoken reply when the voice pipeline itself failed. */
export function replyForError(error: string): string {
  return sanitizeForSpeech(error);
}

/** Number formatting for speech: digits with grouping; the system TTS
 * reads grouped numbers naturally ("99,678,917" → ninety-nine million...). */
const spokenNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** The spoken balance reply, composed from the live wallet values. */
export function replyForBalances(
  balances: { usdm: number | null; sats: number | null } | null,
): string {
  if (balances === null) {
    return 'Your wallet is not connected yet, so I cannot read the balances.';
  }
  const parts: string[] = [];
  if (balances.usdm !== null && Number.isFinite(balances.usdm)) {
    parts.push(`${spokenNumber.format(balances.usdm)} dollars`);
  }
  if (balances.sats !== null && Number.isFinite(balances.sats)) {
    parts.push(`${spokenNumber.format(balances.sats)} sats`);
  }
  if (parts.length === 0) {
    return 'Your wallet is not connected yet, so I cannot read the balances.';
  }
  return sanitizeForSpeech(`You have ${parts.join(' and ')}.`);
}
