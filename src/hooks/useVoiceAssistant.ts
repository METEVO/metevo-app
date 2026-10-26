import { useCallback, useEffect, useRef, useState } from 'react';

import { RuntimeSnapshot, voiceRuntime } from '../ai/qvacRuntime';
import { transcribeAudio } from '../ai/whisper';
import { parseWalletInstruction } from '../ai/qwen';
import { cleanTranscript } from '../voice/stt';
import { understandTranscript } from '../voice/intents';
import {
  OrchestratorPorts,
  VoiceOrchestrator,
  VoicePhase,
  VoiceSnapshot,
} from '../voice/orchestrator';
import { VoiceIntentAction } from '../utils/voiceIntentMapping';
import { speakEnglish, stopSpeaking } from '../utils/speaker';
import { useAudioRecorder } from './useAudioRecorder';

/**
 * The React seam for the voice orchestrator (design phase 7). It owns the
 * recorder hook and the runtime subscription and exposes exactly what the
 * screen renders: the phase, the transcript, the reply and the error, plus
 * the hold-button handlers. Screens render from this hook and never call
 * the SDK.
 */
export function useVoiceAssistant(
  onAction: (action: VoiceIntentAction) => void,
  /** Debug seam: called for every finished clip (the SAF archive copy). */
  onRecordingFinished?: (uri: string | null) => void,
  options?: {
    /** Live wallet balances, read at reply time for balance answers. */
    getBalances?: () => { usdm: number | null; sats: number | null } | null;
  },
): {
  phase: VoicePhase;
  transcript: string | null;
  reply: string | null;
  error: string | null;
  message: string | null;
  messageIsError: boolean;
  recording: boolean;
  lastClipUri: string | null;
  runtime: RuntimeSnapshot;
  onPressIn: () => void;
  onPressOut: () => void;
} {
  const [snapshot, setSnapshot] = useState<VoiceSnapshot>({
    phase: 'idle',
    transcript: null,
    reply: null,
    error: null,
  });
  const [runtimeState, setRuntimeState] = useState<RuntimeSnapshot>(
    voiceRuntime.snapshot(),
  );

  // The recorder reports the finished clip here; the orchestrator's stop
  // port awaits it through a deferred so the turn continues seamlessly.
  const clipDeferred = useRef<((uri: string | null) => void) | null>(null);
  const [lastClipUri, setLastClipUri] = useState<string | null>(null);
  const onRecordingFinishedRef = useRef(onRecordingFinished);
  onRecordingFinishedRef.current = onRecordingFinished;
  const getBalancesRef = useRef(options?.getBalances);
  getBalancesRef.current = options?.getBalances;
  const onClip = useCallback(
    (uri: string | null) => {
      const resolve = clipDeferred.current;
      clipDeferred.current = null;
      setLastClipUri(uri);
      resolve?.(uri);
      onRecordingFinishedRef.current?.(uri);
    },
    [],
  );

  const recorder = useAudioRecorder(onClip);

  const portsRef = useRef<OrchestratorPorts | null>(null);
  const orchestratorRef = useRef<VoiceOrchestrator | null>(null);
  if (orchestratorRef.current === null) {
    orchestratorRef.current = new VoiceOrchestrator({
      startRecording: async () => {
        await portsRef.current?.startRecording();
      },
      stopRecording: async () => {
        return (await portsRef.current?.stopRecording()) ?? null;
      },
      cancelRecording: () => {
        void portsRef.current?.cancelRecording();
      },
      prepareStt: () => voiceRuntime.ensure('stt'),
      prepareLlm: () => voiceRuntime.ensure('llm'),
      transcribe: async (uri) => cleanTranscript(await transcribeAudio(uri)),
      understand: (transcript) =>
        understandTranscript(transcript, { llmParse: parseWalletInstruction }),
      execute: (action) => onAction(action),
      describeBalances: () => portsRef.current?.describeBalances?.() ?? null,
      speak: (text) => speakEnglish(text),
      stopSpeaking: () => stopSpeaking(),
      isRecording: () => recorder.isRecording(),
    });
  }

  // The ports close over per-render values (recorder state, the latest
  // onAction); rebinding them on every render keeps the orchestrator's
  // view fresh without effect churn.
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const ports: OrchestratorPorts = {
    startRecording: async () => {
      await recorder.start();
    },
    stopRecording: () => {
      return new Promise<string | null>((resolve) => {
        clipDeferred.current = resolve;
        void recorder.stop();
      });
    },
    cancelRecording: () => {
      void recorder.stop();
    },
    prepareStt: () => voiceRuntime.ensure('stt'),
    prepareLlm: () => voiceRuntime.ensure('llm'),
    transcribe: async (uri) => cleanTranscript(await transcribeAudio(uri)),
    understand: (transcript) =>
      understandTranscript(transcript, { llmParse: parseWalletInstruction }),
    execute: (action) => onActionRef.current(action),
    describeBalances: () => getBalancesRef.current?.() ?? null,
    speak: (text) => speakEnglish(text),
    stopSpeaking: () => stopSpeaking(),
    isRecording: () => recorder.isRecording(),
  };
  portsRef.current = ports;
  orchestratorRef.current.attachPorts(ports);

  useEffect(() => {
    const offVoice = orchestratorRef.current?.subscribe(setSnapshot);
    const offRuntime = voiceRuntime.subscribe(setRuntimeState);
    return () => {
      offVoice?.();
      offRuntime();
    };
  }, []);

  const press = useCallback(() => {
    void orchestratorRef.current?.press();
  }, []);
  const release = useCallback(() => {
    orchestratorRef.current?.release();
  }, []);

  /** The voice line the home shell renders: replies, failures, and the
   * runtime's provisioning progress, whichever is most current. */
  const runtimeError = runtimeState.errors.stt ?? runtimeState.errors.llm ?? null;
  const runtimeBusy =
    runtimeState.statuses.stt === 'downloading' ||
    runtimeState.statuses.stt === 'loading' ||
    runtimeState.statuses.llm === 'downloading' ||
    runtimeState.statuses.llm === 'loading';
  const message =
    snapshot.reply ??
    snapshot.error ??
    runtimeError ??
    (runtimeBusy ? runtimeState.statusMessage ?? 'Loading the voice models…' : null) ??
    (snapshot.phase === 'transcribing' ? 'Transcribing…' : null) ??
    (snapshot.phase === 'understanding' ? 'Understanding…' : null);
  const messageIsError =
    snapshot.error !== null || runtimeError !== null || snapshot.phase === 'error';

  return {
    phase: snapshot.phase,
    transcript: snapshot.transcript,
    reply: snapshot.reply,
    error: snapshot.error,
    message,
    messageIsError,
    recording: recorder.phase === 'recording',
    lastClipUri,
    runtime: runtimeState,
    onPressIn: press,
    onPressOut: release,
  };
}
