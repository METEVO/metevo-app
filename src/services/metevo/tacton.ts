/**
 * Tacton haptic feedback seam.
 *
 * Mirrors spokenInteraction.ts: every surface that needs haptic feedback
 * calls through this module, so the platform vibration backend is wired in
 * exactly one place. Patterns are fixed so success/error are
 * distinguishable without looking at the screen.
 *
 * Tests and Node tooling inject a recorder (or leave the vibrator unset):
 * the default platform backend resolves lazily and never under Jest.
 */

export type TactonKind = 'success' | 'error' | 'attention';

/**
 * Fixed haptic vocabularies (ms; 0 = start immediately):
 * - success: two short confirmations
 * - error: three long pulses
 * - attention: one long pulse (watch started / needs user action)
 */
export const TACTON_PATTERNS: Record<TactonKind, number[]> = {
  success: [0, 40, 60, 40],
  error: [0, 120, 80, 120, 80, 120],
  attention: [0, 250],
};

export interface TactonVibrator {
  vibrate(pattern: number[]): void;
}

let vibrator: TactonVibrator | null = null;

/** Installs the platform vibrator (React Native Vibration) or clears it. */
export function setTactonVibrator(next: TactonVibrator | null): void {
  vibrator = next;
}

function defaultVibrator(): TactonVibrator | null {
  try {
    // Lazy require: react-native resolves only inside the app bundle; test
    // and Node environments expose a stub without a Vibration API.
    const { Vibration } = require('react-native') as {
      Vibration?: { vibrate(pattern: number[]): void };
    };
    if (Vibration && typeof Vibration.vibrate === 'function') {
      return { vibrate: (pattern) => Vibration.vibrate(pattern) };
    }
    return null;
  } catch {
    return null;
  }
}

/** Plays the pattern for the given feedback kind; safe no-op when the
 * runtime has no vibration backend. */
export function playTacton(kind: TactonKind): void {
  const pattern = TACTON_PATTERNS[kind];
  console.log(`[metevo] tacton ${kind}: ${pattern.join('-')}ms`);
  const backend = vibrator ?? defaultVibrator();
  backend?.vibrate(pattern);
}
