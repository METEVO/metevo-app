export type VoiceLanguage = 'en' | 'tr' | 'it';

export function validatedLanguage(value: unknown): VoiceLanguage | null {
  return value === 'en' || value === 'tr' || value === 'it' ? value : null;
}

let conversationLanguage: VoiceLanguage | null = null;

export function setConversationLanguage(language: VoiceLanguage): void {
  conversationLanguage = language;
}

export function getConversationLanguage(): VoiceLanguage | null {
  return conversationLanguage;
}

export function languageFromCommand(text: string): VoiceLanguage | null {
  const words = text.toLowerCase().normalize('NFC').match(/[\p{L}]+/gu) ?? [];
  const markers: Record<VoiceLanguage, string[]> = {
    tr: ['yolla', 'gönder', 'gonder', 'bakiyem', 'bakiyemi', 'bakiyeyi', 'öde'],
    en: ['send', 'balance', 'pay', 'receive', 'transactions'],
    it: ['invia', 'manda', 'saldo', 'paga', 'ricevi'],
  };
  const matches = (Object.keys(markers) as VoiceLanguage[])
    .filter(language => words.some(word => markers[language].includes(word)));
  return matches.length === 1 ? matches[0] : null;
}
