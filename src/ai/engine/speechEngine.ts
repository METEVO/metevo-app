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

// One model slot shared by every announcement: loads, syntheses and
// unload-after-use releases must not interleave, or a release frees the
// model under a running synthesis (empty audio) and two loads collide.
let engineQueue: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = engineQueue.then(task, task);
  engineQueue = run.catch(() => undefined);
  return run;
}

export interface SynthesizedSpeech {
  /** Complete WAV container (header + PCM), ready to write and play. */
  wavBytes: Uint8Array;
  sampleRate: number;
}

/** Synthesize one announcement in the requested language. */
export function synthesizeSpeech(text: string, languageCode: string): Promise<SynthesizedSpeech> {
  return serialized(async () => {
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
  });
}

/** Free the synthesis model (called after use per the env policy). */
export function releaseSpeech(): Promise<void> {
  return serialized(releaseLoadedSpeech);
}

async function releaseLoadedSpeech(): Promise<void> {
  if (loaded === null) {
    return;
  }
  const modelId = loaded.modelId;
  loaded = null;
  await unloadModel({ modelId });
}

/** The worker outlives a JS reload, so it may still hold the model. Model
 * ids are derived from source + config, so the registered id is this very
 * model and language. */
const ALREADY_REGISTERED = /Model with ID "([0-9a-f]+)" is already registered/;

async function loadSpeechModel(load: () => Promise<string>): Promise<string> {
  try {
    return await load();
  } catch (cause) {
    const registeredId = cause instanceof Error ? ALREADY_REGISTERED.exec(cause.message)?.[1] : undefined;
    if (registeredId === undefined) {
      throw cause;
    }
    return registeredId;
  }
}

async function ensureSpeechLoaded(languageCode: string): Promise<string> {
  if (loaded !== null && loaded.languageCode === languageCode) {
    return loaded.modelId;
  }
  if (loaded !== null) {
    await releaseLoadedSpeech();
  }
  const resolved = resolveModelSource(ENV.EXPO_PUBLIC_QVAC_TTS_MODEL, ttsModelPresets);
  const modelConfig = {
    ttsEngine: ENV.EXPO_PUBLIC_QVAC_TTS_ENGINE,
    language: languageCode,
    voice: ENV.EXPO_PUBLIC_QVAC_TTS_VOICE,
  };
  // Registry descriptors carry their engine: modelType must stay omitted.
  const modelId = await loadSpeechModel(() =>
    resolved.kind === 'registry'
      ? loadModel({ modelSrc: resolved.source, modelConfig })
      : loadModel({ modelSrc: resolved.source, modelType: 'tts', modelConfig }),
  );
  loaded = { modelId, languageCode };
  return modelId;
}

/** Only a fallback: the engine reports the rate it actually produced. */
const DEFAULT_SAMPLE_RATE = 44_100;
