import { loadModel, transcribe, unloadModel } from '@qvac/sdk';

import { ENV } from '../../config/env';
import type { WhisperModelResolution } from '../modelManager';

/**
 * Whisper STT engine, language-scoped. One model sits in memory at a time;
 * switching languages unloads the previous one (the reference behaviour),
 * which also keeps memory flat on 16 GB-class devices.
 */

let transcriptionModelId: string | null = null;
let loadedLanguageCode: string | null = null;

/**
 * Load the model for a language. The model comes from the language-scoped
 * env names resolved by `src/ai/modelManager.ts`: a whitelisted registry
 * preset (downloaded on first use) or a provisioned device file.
 */
export async function initializeTranscription(
  resolution: WhisperModelResolution,
  languageCode: string,
): Promise<void> {
  if (transcriptionModelId !== null && loadedLanguageCode === languageCode) {
    return;
  }
  if (transcriptionModelId !== null) {
    await releaseTranscription();
  }

  const modelConfig = {
    audio_format: 'f32le' as const,
    strategy: 'greedy' as const,
    language: languageCode,
    // The language boundary: non-English speech becomes English text here,
    // so parsing always runs on the canonical language.
    translate:
      languageCode !== 'en' && ENV.EXPO_PUBLIC_QVAC_WHISPER_TRANSLATE_TO_ENGLISH,
    no_timestamps: true,
    temperature: 0,
  };
  // Registry descriptors carry their engine: modelType must stay omitted.
  transcriptionModelId =
    resolution.kind === 'registry'
      ? await loadModel({ modelSrc: resolution.source, modelConfig })
      : await loadModel({
          modelSrc: resolution.path,
          modelType: 'whispercpp-transcription',
          modelConfig,
        });
  loadedLanguageCode = languageCode;
}

/** Transcribe a finished recording into one text string. */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  if (transcriptionModelId === null) {
    throw new Error('Transcription model is not initialized');
  }
  const segments = await transcribe({
    modelId: transcriptionModelId,
    audioChunk: audioFilePath,
    metadata: true,
  });
  return segments
    .map((segment) => segment.text)
    .join(' ')
    .trim();
}

export async function releaseTranscription(): Promise<void> {
  if (transcriptionModelId === null) {
    return;
  }
  const modelId = transcriptionModelId;
  transcriptionModelId = null;
  loadedLanguageCode = null;
  await unloadModel({ modelId });
}
