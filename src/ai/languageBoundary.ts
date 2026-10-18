import type { UiLanguage } from '../hooks/useWalletSession';
import { ENV } from '../config/env';

/**
 * The language boundary from the reference pipeline: canonical wallet data
 * (amounts, names, enums, addresses) stays unchanged and English is the
 * parsing language; only spoken prose is localized afterwards.
 */

/** ISO 639-1 code of every design language (Whisper, TTS, message lookup). */
const LANGUAGE_CODES: Record<UiLanguage, string> = {
  english: 'en',
  italiano: 'it',
  turkce: 'tr',
  francais: 'fr',
  hindi: 'hi',
  espanol: 'es',
  kiswahili: 'sw',
};

/** Env keys holding the Whisper model name of each design language. */
type WhisperModelEnvKey =
  | 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_ENGLISH'
  | 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_ITALIANO'
  | 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_TURKCE'
  | 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_FRANCAIS'
  | 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_HINDI'
  | 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_ESPANOL'
  | 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_KISWAHILI';

/** Env key holding each language's Whisper model file name. */
const WHISPER_MODEL_ENV_KEYS: Record<UiLanguage, WhisperModelEnvKey> = {
  english: 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_ENGLISH',
  italiano: 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_ITALIANO',
  turkce: 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_TURKCE',
  francais: 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_FRANCAIS',
  hindi: 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_HINDI',
  espanol: 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_ESPANOL',
  kiswahili: 'EXPO_PUBLIC_QVAC_WHISPER_MODEL_KISWAHILI',
};

export function languageCode(language: UiLanguage): string {
  return LANGUAGE_CODES[language];
}

/** The parsing language every command is normalized into before agents run. */
export const PARSING_LANGUAGE_CODE = 'en';

/** Whisper model file name configured for the language (from env). */
export function whisperModelFileName(language: UiLanguage): string {
  return ENV[WHISPER_MODEL_ENV_KEYS[language]];
}

/** Whether the design language has a Whisper model configured. */
export function isLanguageSupported(language: UiLanguage): boolean {
  return language in LANGUAGE_CODES;
}
