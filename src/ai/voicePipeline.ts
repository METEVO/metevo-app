import type { UiLanguage } from '../hooks/useWalletSession';
import { runAgent } from './agentRunner';
import { VoiceAgent } from './agents/VoiceAgent';
import { languageCode } from './languageBoundary';
import { initializeTranscription, transcribeAudio } from './engine/transcriptionEngine';
import { resolveWhisperModel } from './modelManager';
import {
  processVoiceCommand,
  type VoiceOutcome,
  type VoicePipelineEngines,
} from './voicePipelineCore';

/**
 * Real-device wiring of the voice pipeline: the language-scoped Whisper
 * model from the device model manager and the WalletIntent agent through
 * the shared LLM engine.
 */

async function transcribeOnDevice(
  recordingUri: string,
  language: UiLanguage,
): Promise<string> {
  await initializeTranscription(resolveWhisperModel(language), languageCode(language));
  return transcribeAudio(recordingUri);
}

const deviceEngines: VoicePipelineEngines = {
  transcribe: transcribeOnDevice,
  runWalletIntent: (transcript) => runAgent(VoiceAgent.WalletIntent, transcript),
};

/** The production pipeline used by the app (test builds inject fakes). */
export function processRecording(
  recordingUri: string,
  language: UiLanguage,
): Promise<VoiceOutcome> {
  return processVoiceCommand(deviceEngines, recordingUri, language);
}
