import * as SecureStore from 'expo-secure-store';

/**
 * The user's "Audio on / Audio off" choice for spoken output. Haptics and
 * screen-reader announcements are not affected: they are separate
 * channels the user controls in the system settings.
 */

const AUDIO_PREFERENCE_KEY = 'metevo.audio.enabled';

type AudioListener = (enabled: boolean) => void;

let audioEnabled = true;
let loaded: Promise<void> | null = null;
const listeners = new Set<AudioListener>();

function notify(): void {
  listeners.forEach((listener) => listener(audioEnabled));
}

/** Reads the saved choice once; until then audio stays on. */
export function loadAudioPreference(): Promise<void> {
  loaded ??= SecureStore.getItemAsync(AUDIO_PREFERENCE_KEY)
    .then((saved) => {
      if (saved === 'false') {
        audioEnabled = false;
        notify();
      }
    })
    .catch((cause) => {
      console.warn(
        '[metevo] audio preference unreadable:',
        cause instanceof Error ? cause.message : 'unknown',
      );
    });
  return loaded;
}

export function isAudioEnabled(): boolean {
  return audioEnabled;
}

export function setAudioEnabled(enabled: boolean): void {
  if (enabled === audioEnabled) {
    return;
  }
  audioEnabled = enabled;
  notify();
  void SecureStore.setItemAsync(AUDIO_PREFERENCE_KEY, String(enabled)).catch((cause) => {
    console.warn(
      '[metevo] audio preference not saved:',
      cause instanceof Error ? cause.message : 'unknown',
    );
  });
}

export function subscribeAudioPreference(listener: AudioListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
