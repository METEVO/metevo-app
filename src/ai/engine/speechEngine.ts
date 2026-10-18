import { loadModel, textToSpeech, unloadModel } from '@qvac/sdk';

import { ENV } from '../../config/env';
import { resolveModelSource, ttsModelPresets } from './modelRegistry';
import { encodeWav } from './wav';

/**
 * QVAC speech synthesis (Supertonic multilingual GGUF by default). The
 * synthesized language is a load-time property, so a language change swaps
 * the model; with EXPO_PUBLIC_QVAC_TTS_UNLOAD_AFTER_USE the model is freed
 * after every announcement so the wallet + LLM keep their memory budget.
 */

interface LoadedSpeech {
  modelId: string;
  languageCode: string;
}

let loaded: LoadedSpeech | null = null;

export interface SynthesizedSpeech {
  /** Complete WAV container (header + PCM), ready to write and play. */
  wavBytes: Uint8Array;
  sampleRate: number;
}

/** Synthesize one announcement in the requested language. */
export async function synthesizeSpeech(
  text: string,
  languageCode: string,
): Promise<SynthesizedSpeech> {
  const modelId = await ensureSpeechLoaded(languageCode);
  const result = textToSpeech({
    modelId,
    text,
    inputType: 'text',
    stream: false,
  });
  const pcmSamples = await result.buffer;
  const sampleRate = (await result.sampleRate) ?? DEFAULT_SAMPLE_RATE;
  if (pcmSamples.length === 0) {
    throw new Error('speech synthesis produced no audio');
  }
  return { wavBytes: encodeWav(pcmSamples, sampleRate), sampleRate };
}

/** Free the synthesis model (called after use per the env policy). */
export async function releaseSpeech(): Promise<void> {
  if (loaded === null) {
    return;
  }
  const modelId = loaded.modelId;
  loaded = null;
  await unloadModel({ modelId });
}

async function ensureSpeechLoaded(languageCode: string): Promise<string> {
  if (loaded !== null && loaded.languageCode === languageCode) {
    return loaded.modelId;
  }
  if (loaded !== null) {
    await releaseSpeech();
  }
  const resolved = resolveModelSource(ENV.EXPO_PUBLIC_QVAC_TTS_MODEL, ttsModelPresets);
  const modelConfig = {
    ttsEngine: ENV.EXPO_PUBLIC_QVAC_TTS_ENGINE,
    language: languageCode,
    voice: ENV.EXPO_PUBLIC_QVAC_TTS_VOICE,
  };
  // Registry descriptors carry their engine: modelType must stay omitted.
  const modelId =
    resolved.kind === 'registry'
      ? await loadModel({ modelSrc: resolved.source, modelConfig })
      : await loadModel({ modelSrc: resolved.source, modelType: 'tts', modelConfig });
  loaded = { modelId, languageCode };
  return modelId;
}

/** Only a fallback: the engine reports the rate it actually produced. */
const DEFAULT_SAMPLE_RATE = 44_100;
