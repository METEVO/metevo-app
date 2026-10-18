import {
  LLAMA_3_2_1B_INST_Q4_0,
  QWEN3_600M_INST_Q4,
  TTS_EN_SUPERTONIC_Q8_0,
  TTS_MULTILINGUAL_SUPERTONIC3_Q8_0,
  WHISPER_BASE_Q8_0,
  WHISPER_LARGE_V3_TURBO,
  WHISPER_SMALL_Q8_0,
  WHISPER_TINY,
  WHISPER_TINY_Q8_0,
} from '@qvac/sdk';

/**
 * A QVAC registry model descriptor as shipped by the SDK's model registry:
 * a self-describing object (weights location, engine, checksums) the SDK
 * downloads and verifies on first use.
 */
export interface RegistryModelDescriptor {
  readonly src: string;
  readonly name: string;
  readonly engine?: string;
}

/** Where a model's weights come from: the QVAC registry or a local file. */
export type ResolvedModelSource<P extends RegistryModelDescriptor = RegistryModelDescriptor> =
  | { kind: 'registry'; source: P }
  | { kind: 'file'; source: string };

/**
 * Whitelisted QVAC registry presets, addressable from env by name. Env can
 * never inject arbitrary values here: an unknown name that does not look
 * like a local model file is a configuration error, rejected at load.
 */
const LLM_MODEL_PRESETS: Record<string, RegistryModelDescriptor> = {
  QWEN3_600M_INST_Q4,
  LLAMA_3_2_1B_INST_Q4_0,
};

/**
 * Whisper presets for languages without a dedicated model file: the
 * multilingual checkpoints accept the language code at transcription time.
 */
const WHISPER_MODEL_PRESETS: Record<string, RegistryModelDescriptor> = {
  WHISPER_TINY,
  WHISPER_TINY_Q8_0,
  WHISPER_SMALL_Q8_0,
  WHISPER_BASE_Q8_0,
  WHISPER_LARGE_V3_TURBO,
};

const TTS_MODEL_PRESETS: Record<string, RegistryModelDescriptor> = {
  TTS_MULTILINGUAL_SUPERTONIC3_Q8_0,
  TTS_EN_SUPERTONIC_Q8_0,
};

export const llmModelPresets = LLM_MODEL_PRESETS;
export const whisperModelPresets = WHISPER_MODEL_PRESETS;
export const ttsModelPresets = TTS_MODEL_PRESETS;

/**
 * Resolve an env-declared model name. A whitelisted preset name selects the
 * QVAC registry descriptor (first use downloads it); a path-looking value or
 * a model-file extension selects a local file already on the device.
 */
export function resolveModelSource<P extends RegistryModelDescriptor>(
  envName: string,
  presets: Record<string, P>,
): ResolvedModelSource<P> {
  const preset = presets[envName];
  if (preset !== undefined) {
    return { kind: 'registry', source: preset };
  }
  const looksLikeLocalFile =
    envName.includes('/') || envName.includes('\\') || /\.(gguf|bin)$/i.test(envName);
  if (looksLikeLocalFile) {
    return { kind: 'file', source: envName };
  }
  throw new Error(
    `unknown QVAC model "${envName}": use a registry preset (${Object.keys(presets).join(', ')}) or a local model file path`,
  );
}
