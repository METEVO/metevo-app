import { Directory, File, Paths } from 'expo-file-system';

import { UiLanguage } from '../hooks/useWalletSession';
import { whisperModelFileName } from './languageBoundary';
import {
  whisperModelPresets,
  type RegistryModelDescriptor,
  resolveModelSource,
} from './engine/modelRegistry';

/**
 * Device-side model resolution for the language-scoped Whisper models.
 * The per-language names come from the env schema; a name may select a
 * whitelisted registry preset (downloaded by the SDK on first use) or a
 * model file provisioned under the app's documents directory, which
 * survives restarts (nothing valuable lives in a temp directory).
 */

const modelsDirectory = new Directory(Paths.document, 'models', 'whisper');

export type WhisperModelResolution =
  | { kind: 'registry'; source: RegistryModelDescriptor }
  | { kind: 'file'; path: string };

/** Resolve the Whisper model for a language: registry preset or device file. */
export function resolveWhisperModel(language: UiLanguage): WhisperModelResolution {
  const resolved = resolveModelSource(whisperModelFileName(language), whisperModelPresets);
  if (resolved.kind === 'registry') {
    return resolved;
  }
  const file = new File(modelsDirectory, resolved.source);
  if (!file.exists) {
    throw new Error(
      `Whisper model "${resolved.source}" for ${language} is not installed (expected under models/whisper)`,
    );
  }
  return { kind: 'file', path: file.uri };
}

export function ensureWhisperModelDirectory(): void {
  if (!modelsDirectory.exists) {
    modelsDirectory.create({ intermediates: true });
  }
}
