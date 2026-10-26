import { loadModel, transcribe, unloadModel } from '@qvac/sdk';

import { RegistryModelDescriptor } from './engine/modelRegistry';
import { toFilesystemPath } from './localModel';

/**
 * QVAC Whisper transcription, the on-device speech-to-text engine behind
 * the home voice agent. One model sits in memory at a time; the greedy
 * strategy and temperature 0 keep transcripts deterministic for the intent
 * parser.
 */

export type SupportedLanguage = 'en' | 'it' | 'tr' | 'fr' | 'hi';

/** Download progress as reported by the SDK (see the QVAC quickstart). */
export interface ModelDownloadProgress {
  percentage: number;
  downloaded: number;
  total: number;
}

let whisperModelId: string | null = null;
let currentLanguage: SupportedLanguage | null = null;

/**
 * The model source is either a QVAC registry descriptor (the SDK downloads
 * and checksum-verifies the weights on first use) or a local file path
 * (offline sideloading). Registry descriptors carry their engine, so
 * `modelType` must stay omitted for them.
 */
export async function initializeWhisper(
  language: SupportedLanguage,
  modelSource: string | RegistryModelDescriptor,
  onProgress?: (progress: ModelDownloadProgress) => void,
): Promise<void> {
  if (whisperModelId !== null && currentLanguage === language) {
    return;
  }

  if (whisperModelId !== null) {
    await unloadModel({ modelId: whisperModelId });
    whisperModelId = null;
    currentLanguage = null;
  }

  const modelConfig = {
    audio_format: 'f32le' as const,
    strategy: 'greedy' as const,
    language,
    translate: false,
    no_timestamps: true,
    temperature: 0,
  };
  const modelId =
    typeof modelSource === 'string'
      ? await loadModel({ modelSrc: modelSource, modelType: 'whispercpp-transcription', modelConfig, onProgress })
      : await loadModel({ modelSrc: modelSource, modelConfig, onProgress });

  whisperModelId = modelId;
  currentLanguage = language;
}

export async function transcribeAudio(audioFilePath: string): Promise<string> {
  if (whisperModelId === null) {
    throw new Error('Whisper model is not initialized');
  }

  // The QVAC worklet reads audio through plain filesystem paths, not
  // file:// uris; the recorder hands out uris, so strip the scheme here —
  // a literal "file:/..." path fails accessSync with AUDIO_FILE_NOT_FOUND.
  const segments = await transcribe({
    modelId: whisperModelId,
    audioChunk: toFilesystemPath(audioFilePath),
    metadata: true,
  });

  return segments
    .map((segment) => segment.text)
    .join(' ')
    .trim();
}

export async function releaseWhisper(): Promise<void> {
  if (whisperModelId === null) {
    return;
  }

  await unloadModel({ modelId: whisperModelId });

  whisperModelId = null;
  currentLanguage = null;
}
