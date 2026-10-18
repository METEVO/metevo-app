import { completion, loadModel, unloadModel, VERBOSITY } from '@qvac/sdk';

import { ENV } from '../../config/env';
import { llmModelPresets, resolveModelSource } from './modelRegistry';

/**
 * Single LLM engine behind every voice agent. Agents never touch the SDK:
 * they hand their prompt and JSON schema to `completeJson` through the
 * agent runner, which keeps key-free inference code in one place.
 */

let llmModelId: string | null = null;
let loadPromise: Promise<string> | null = null;

/** Load the env-selected LLM once; concurrent callers share one load. */
export async function ensureLlmLoaded(): Promise<string> {
  if (llmModelId !== null) {
    return llmModelId;
  }
  loadPromise ??= (async () => {
    const resolved = resolveModelSource(ENV.EXPO_PUBLIC_QVAC_LLM_MODEL, llmModelPresets);
    const modelConfig = {
      ctx_size: 2048,
      verbosity: VERBOSITY.ERROR,
    };
    // Registry descriptors carry their engine: modelType must stay omitted.
    const modelId =
      resolved.kind === 'registry'
        ? await loadModel({ modelSrc: resolved.source, modelConfig })
        : await loadModel({ modelSrc: resolved.source, modelType: 'llm', modelConfig });
    llmModelId = modelId;
    return modelId;
  })();
  try {
    return await loadPromise;
  } catch (error) {
    // A failed load must not poison the shared promise: allow a retry.
    loadPromise = null;
    llmModelId = null;
    throw error;
  }
}

export interface JsonCompletionRequest {
  /** Agent system prompt (from the agent registry). */
  systemPrompt: string;
  /** The user's instruction or reply. */
  userText: string;
  /** JSON schema the model must answer with (from the agent registry). */
  responseSchema: Record<string, unknown>;
  /** Stable schema name for the response format envelope. */
  schemaName: string;
}

/** Run one schema-constrained completion and return the raw answer text. */
export async function completeJson(request: JsonCompletionRequest): Promise<string> {
  const modelId = await ensureLlmLoaded();
  const run = completion({
    modelId,
    history: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userText },
    ],
    stream: false,
    responseFormat: {
      type: 'json_schema',
      json_schema: {
        name: request.schemaName,
        schema: request.responseSchema,
      },
    },
  });
  const result = await withCompletionTimeout(run.final);
  return result.contentText;
}

/** Bounded wait: a hung completion fails safely instead of blocking the UI. */
async function withCompletionTimeout<T>(pending: Promise<T>): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error('LLM completion timed out')),
      ENV.EXPO_PUBLIC_QVAC_LLM_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([pending, timeout]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/** Free the model's memory (used on teardown, not between commands). */
export async function releaseLlm(): Promise<void> {
  if (llmModelId === null) {
    return;
  }
  const modelId = llmModelId;
  llmModelId = null;
  loadPromise = null;
  await unloadModel({ modelId });
}
