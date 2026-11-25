import { VoiceLanguage } from './language';
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
  profile: 'Opening your profile.',
  'invoice-request': 'Opening the invoice request.',
};

const LOCALIZED: Record<'tr' | 'it', Record<IntentId, string>> = {
  tr: {
    'send-usdm': 'Ödemeyi açıyorum. Bilgileri kontrol edip onayla.',
    'send-btc': 'Bitcoin ödemesini açıyorum. Bilgileri kontrol edip onayla.',
    'create-usdm-invoice': 'Ödeme talebini açıyorum.',
    'read-transactions': 'Son işlemlerini gösteriyorum.',
    'read-spending-overview': 'Harcama özetini gösteriyorum.',
    'read-balance': 'Bakiyelerini okuyorum.',
    contacts: 'Kişilerini açıyorum.', profile: 'Profilini açıyorum.',
    'invoice-request': 'Ödeme talebini açıyorum.',
  },
  it: {
    'send-usdm': 'Apro il pagamento. Controlla i dettagli e conferma.',
    'send-btc': 'Apro il pagamento in bitcoin. Controlla i dettagli e conferma.',
    'create-usdm-invoice': 'Apro la richiesta di pagamento.',
    'read-transactions': 'Mostro le transazioni recenti.',
    'read-spending-overview': 'Mostro il riepilogo delle spese.',
    'read-balance': 'Leggo i tuoi saldi.',
    contacts: 'Apro i contatti.', profile: 'Apro il profilo.',
    'invoice-request': 'Apro la richiesta di pagamento.',
  },
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
export function replyForIntent(cardId: IntentId, language: VoiceLanguage = 'en'): string {
  return sanitizeForSpeech((language === 'en' ? REPLY_TEMPLATES : LOCALIZED[language])[cardId] ?? replyForUnclear(language));
}

/** The spoken reply when nothing was understood. */
export function replyForUnclear(language: VoiceLanguage = 'en'): string {
  if (language === 'tr') return 'Anlayamadım. Lütfen tekrar söyle veya yaz.';
  if (language === 'it') return 'Non ho capito. Ripeti oppure scrivi.';
  return NOT_UNDERSTOOD;
}

/** The spoken reply when the voice pipeline itself failed. */
export function replyForError(error: string, language: VoiceLanguage = 'en'): string {
  if (language === 'tr') return 'Sesli komut işlenemedi. Lütfen tekrar dene.';
  if (language === 'it') return 'Non riesco a elaborare il comando vocale. Riprova.';
  return sanitizeForSpeech(error);
}

/** Number formatting for speech: digits with grouping; the system TTS
 * reads grouped numbers naturally ("99,678,917" → ninety-nine million...). */
const DISCONNECTED: Record<VoiceLanguage, string> = {
  en: 'Your wallet is not connected yet, so I cannot read the balances.',
  tr: 'Cüzdanın henüz bağlı değil, bu yüzden bakiyelerini okuyamıyorum.',
  it: 'Il portafoglio non è ancora connesso, quindi non posso leggere i saldi.',
};

/** The spoken balance reply, composed from the live wallet values. */
export function replyForBalances(
  balances: { usdm: number | null; sats: number | null } | null,
  language: VoiceLanguage = 'en',
): string {
  const spokenNumber = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });
  if (balances === null) {
    return DISCONNECTED[language];
  }
  const parts: string[] = [];
  if (balances.usdm !== null && Number.isFinite(balances.usdm)) {
    parts.push(`${spokenNumber.format(balances.usdm)} ${language === 'tr' ? 'dolar' : language === 'it' ? 'dollari' : 'dollars'}`);
  }
  if (balances.sats !== null && Number.isFinite(balances.sats)) {
    parts.push(`${spokenNumber.format(balances.sats)} sats`);
  }
  if (parts.length === 0) {
    return DISCONNECTED[language];
  }
  if (language === 'tr') return sanitizeForSpeech(`Bakiyen ${parts.join(' ve ')}.`);
  if (language === 'it') return sanitizeForSpeech(`Hai ${parts.join(' e ')}.`);
  return sanitizeForSpeech(`You have ${parts.join(' and ')}.`);
}
