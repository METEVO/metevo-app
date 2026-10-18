import { useCallback, useState } from 'react';

import type { UiLanguage } from '../hooks/useWalletSession';
import { processRecording } from '../ai/voicePipeline';
import type { VoiceOutcome } from '../ai/voicePipelineCore';
import { speakAnnouncement } from '../services/spokenInteraction';

/**
 * React binding for the on-device voice pipeline: a finished recording
 * goes in, the structured outcome (card id + spoken message) comes out and
 * the message is announced through the TTS seam. The hook owns no parsing
 * logic itself - everything decision-shaped lives in `src/ai`.
 */

export type VoicePipelinePhase = 'idle' | 'processing' | 'done' | 'error';

export interface UseVoicePipelineValue {
  phase: VoicePipelinePhase;
  /** Latest structured outcome, null until the first command completes. */
  outcome: VoiceOutcome | null;
  run(recordingUri: string | null): void;
  reset(): void;
}

export function useVoicePipeline(language: UiLanguage | null): UseVoicePipelineValue {
  const [phase, setPhase] = useState<VoicePipelinePhase>('idle');
  const [outcome, setOutcome] = useState<VoiceOutcome | null>(null);

  const run = useCallback(
    (recordingUri: string | null) => {
      if (recordingUri === null) {
        return;
      }
      void runPipeline(recordingUri, language, setPhase, setOutcome);
    },
    [language],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setOutcome(null);
  }, []);

  return { phase, outcome, run, reset };
}

async function runPipeline(
  recordingUri: string,
  language: UiLanguage | null,
  setPhase: (phase: VoicePipelinePhase) => void,
  setOutcome: (outcome: VoiceOutcome | null) => void,
): Promise<void> {
  setPhase('processing');
  try {
    const result = await processRecording(recordingUri, language ?? 'english');
    setOutcome(result);
    setPhase(result.status === 'error' ? 'error' : 'done');
    speakAnnouncement(result.spokenMessage, language ?? 'english');
  } catch (error) {
    console.warn('[metevo] voice pipeline failed:', error);
    setPhase('error');
  }
}
