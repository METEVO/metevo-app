import { AccessibilityInfo } from 'react-native';

import { isAudioEnabled } from '../services/audioPreference';

/**
 * Spoken replies for the home voice agent (port of the reference
 * `nativeSpeaker`): the device's matching system voice through expo-speech.
 * Speech is an enhancement — every failure degrades to silence with a log,
 * the on-screen text stays the source of truth.
 */

let generation = 0;
let speech: typeof import('expo-speech') | undefined;

export function speakLocalized(text: string, language = 'en'): void {
  const trimmed = text.trim();
  if (trimmed.length === 0 || !isAudioEnabled()) {
    return;
  }
  const current = ++generation;
  void (async () => {
    try {
      speech ??= await import('expo-speech');
      speech.stop();
      const voices = await speech.getAvailableVoicesAsync();
      if (current !== generation) {
        return;
      }
      const voice = voices.find((candidate) =>
        candidate.language.toLowerCase().split('-')[0] === language,
      );
      if (voice === undefined) {
        throw new Error(`no ${language} system voice is installed`);
      }
      if (__DEV__) console.info('[metevo] voice-language playback', { requested: language, voice: voice.language });
      speech.speak(trimmed, {
        language: voice.language,
        voice: voice.identifier,
        onError: (error) => console.warn('[metevo] speech failed:', error),
      });
    } catch (cause) {
      console.warn(
        '[metevo] speech unavailable:',
        cause instanceof Error ? cause.message : 'unknown',
      );
    }
  })();
}

/** Stops the current system-voice playback (the barge-in path). Safe to
 * call when nothing is speaking. */
export function stopSpeaking(): void {
  generation += 1; // a later speakEnglish must still win over this stop
  void (async () => {
    try {
      speech ??= await import('expo-speech');
      speech.stop();
    } catch {
      // Nothing to stop if the module never loaded.
    }
  })();
}

/** Surfaces the same sentence to screen readers (TalkBack/VoiceOver). */
export function announceForAccessibility(text: string): void {
  if (text.trim().length > 0) {
    AccessibilityInfo.announceForAccessibility(text);
  }
}

export function speakEnglish(text: string): void {
  speakLocalized(text, 'en');
}
