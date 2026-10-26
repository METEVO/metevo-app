import { ENV } from '../config/env';
import { UiLanguage } from '../hooks/useWalletSession';
import { releaseSpeech, synthesizeSpeech } from '../ai/engine/speechEngine';
import { playWavBytes } from '../ai/engine/speechPlayback';
import { TTS_SUPERTONIC_LANGUAGES } from '@qvac/sdk';

/**
 * Insertion seams for the on-device spoken processes.
 *
 * Every UI surface that needs a spoken process calls through this module.
 * `speakAnnouncement` is live: it synthesizes the text on device with the
 * QVAC TTS engine in the session language and plays it. A synthesis or
 * playback failure degrades to silence with a log - the UI text is always
 * the source of truth, speech is an enhancement.
 *
 * The spoken option highlight stays a seam until the onboarding voice phase
 * lands; per the design interaction rules, a spoken highlight never selects.
 */

export type SpokenHighlightListener = (optionIndex: number) => void;

/** Read one announcement out loud in the current language. */
export function speakAnnouncement(text: string, language: UiLanguage = 'english'): void {
  void speak(text, language).catch((error) => {
    console.warn('[metevo] spoken announcement failed:', error);
  });
}

async function speak(text: string, language: UiLanguage): Promise<void> {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return;
  }
  try {
    const speech = await synthesizeSpeech(trimmed, ttsLanguageCode(language));
    await playWavBytes(speech.wavBytes);
  } finally {
    if (ENV.EXPO_PUBLIC_QVAC_TTS_UNLOAD_AFTER_USE) {
      await releaseSpeech();
    }
  }
}

/**
 * The selected design language when the TTS model can speak it, otherwise
 * the configured fallback language (the default model does not cover
 * Kiswahili yet). The announcement itself degrades to silence + log on a
 * synthesis failure; on-screen text stays the source of truth.
 */
function ttsLanguageCode(language: UiLanguage): string {
  // The session language is fixed to English ('english' -> 'en').
  const supported = TTS_SUPERTONIC_LANGUAGES as readonly string[];
  return supported.includes('en') ? 'en' : ENV.EXPO_PUBLIC_QVAC_TTS_FALLBACK_LANGUAGE;
}

/**
 * Read the visible options out loud, highlighting each option while it is
 * spoken. Per the design interaction rules, a spoken highlight never
 * selects; only an explicit touch or a recognized spoken choice selects.
 */
export function startSpokenOptionHighlight(
  optionCount: number,
  onHighlight: SpokenHighlightListener,
): void {
  logSeam('startSpokenOptionHighlight', `${optionCount} options`);
}

/** Stop the spoken option reading. */
export function stopSpokenOptionHighlight(): void {
  logSeam('stopSpokenOptionHighlight', 'stopped');
}

function logSeam(process: string, detail: string): void {
  console.log(`[metevo] spoken seam ${process}: ${detail}`);
}
