import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder as useExpoAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { ENV } from '../config/env';
import { RecordingPhase } from '../types/recording';

/** Native recorder options shape, inferred so we do not depend on expo-audio
 * re-exporting the RecordingOptions type. */
type RecorderOptions = Parameters<typeof useExpoAudioRecorder>[0];

/**
 * Voice-command preset: AAC audio in an .m4a container instead of the
 * LOW_QUALITY preset's Android 3gp/AMR - m4a plays everywhere (file
 * managers, PC) and is the natural input format for the phase-2 voice
 * pipeline. Mono 44.1 kHz at 64 kbps is ample for short spoken commands.
 * Metering stays enabled: it feeds the visualizer and the silence timer.
 */
const VOICE_COMMAND_PRESET: RecorderOptions = {
  ...RecordingPresets.LOW_QUALITY,
  isMeteringEnabled: true,
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    extension: '.m4a',
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
};

/** Readable alias: amplitude at or above this dB counts as speech. */
const isSpeechLevel = (levelDb: number): boolean =>
  levelDb >= ENV.EXPO_PUBLIC_RECORDING_SILENCE_THRESHOLD_DB;

export interface UseAudioRecorderValue {
  phase: RecordingPhase;
  /** Latest mic level in dB (-160..0), or null while idle. */
  currentLevelDb: number | null;
  /** Synchronous phase check backed by the ref: the `phase` state lags one
   * render, but the voice turn needs recording truth at press time. */
  isRecording: () => boolean;
  /** Resolves once the mic is actually recording (permission, audio mode
   * and prepare all done) — the voice turn awaits it before trusting the
   * recording state. */
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Recording state machine for the TALK button (Step 3.4).
 *
 * - One tap starts, the next tap stops.
 * - While recording, EXPO_PUBLIC_RECORDING_ALLOW_AUTO_STOP (env) enables the
 *   silence detection: after EXPO_PUBLIC_RECORDING_SILENCE_TIMEOUT_MS
 *   (env, default 3s) without speech, the recording stops itself.
 * - Mic levels arrive via expo-audio's metering poll (interval also
 *   env-driven) and feed both the silence timer and the visualizer.
 * - Every stop path funnels through a single guarded transition, so the
 *   manual stop and the silence timer can never race into a double stop.
 *
 * Deliberately out of scope (foundation): playback, transcription, intent
 * recognition. The hook ends at the onRecordingComplete seam.
 */
export function useAudioRecorder(
  onComplete: (recordingUri: string | null) => void,
): UseAudioRecorderValue {
  const [phase, setPhase] = useState<RecordingPhase>('idle');

  // Mutable state-machine memory lives in refs to avoid stale closures.
  const phaseRef = useRef<RecordingPhase>('idle');
  const stoppingRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechAtRef = useRef<number | null>(null);
  const meteringWarnedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const stopRecordingRef = useRef<() => void>(() => undefined);

  onCompleteRef.current = onComplete;

  /** Single place where the phase changes: state and ref together. */
  const transitionTo = useCallback((next: RecordingPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const recorder = useExpoAudioRecorder(VOICE_COMMAND_PRESET);
  const recorderState = useAudioRecorderState(recorder, ENV.EXPO_PUBLIC_RECORDING_METER_POLL_MS);

  /** The one guarded stop transition: first caller wins, late timers no-op. */
  const stopRecording = useCallback(async () => {
    if (stoppingRef.current || phaseRef.current !== 'recording') {
      return;
    }
    stoppingRef.current = true;
    clearSilenceTimer();
    transitionTo('processing');
    try {
      await recorder.stop();
      transitionTo('idle');
      onCompleteRef.current(recorder.uri ?? null);
    } catch {
      transitionTo('idle');
      onCompleteRef.current(null);
    } finally {
      stoppingRef.current = false;
    }
  }, [recorder, clearSilenceTimer, transitionTo]);

  // Kept in a ref so the metering-driven silence timer below always calls
  // the latest transition, without effect re-subscription churn.
  stopRecordingRef.current = () => {
    void stopRecording();
  };

  const startRecording = useCallback(async () => {
    if (phaseRef.current !== 'idle') {
      return;
    }
    stoppingRef.current = false;

    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      // TODO(phase 2): surface a spoken "microphone is off" hint.
      return;
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();

    lastSpeechAtRef.current = null;
    meteringWarnedRef.current = false;
    transitionTo('recording');
  }, [recorder, transitionTo]);

  // Silence detection, driven by expo-audio's metering poll: speech
  // restarts the window; the first silent sample counts exactly one
  // (full-or-partial) window and further silent samples must not re-arm it.
  useEffect(() => {
    if (phase !== 'recording' || !ENV.EXPO_PUBLIC_RECORDING_ALLOW_AUTO_STOP) {
      return;
    }
    const levelDb = recorderState.metering;
    if (typeof levelDb !== 'number') {
      if (!meteringWarnedRef.current) {
        meteringWarnedRef.current = true;
        // TODO(debug): temporary diagnostics for the missing-metering
        // investigation on device - remove once metering flows again.
        console.warn(
          '[metevo][debug] recorder status while recording:',
          JSON.stringify({
            canRecord: recorderState.canRecord,
            isRecording: recorderState.isRecording,
            durationMillis: recorderState.durationMillis,
            hasMetering: typeof recorderState.metering === 'number',
            url: recorderState.url,
          }),
        );
      }
      return;
    }
    if (isSpeechLevel(levelDb)) {
      lastSpeechAtRef.current = Date.now();
      clearSilenceTimer();
      return;
    }
    if (silenceTimerRef.current !== null) {
      return;
    }
    const lastSpeechAt = lastSpeechAtRef.current;
    const elapsedSinceSpeech = lastSpeechAt === null ? 0 : Date.now() - lastSpeechAt;
    const remainingMs = Math.max(
      ENV.EXPO_PUBLIC_RECORDING_SILENCE_TIMEOUT_MS - elapsedSinceSpeech,
      0,
    );
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      stopRecordingRef.current();
    }, remainingMs);
  }, [recorderState.metering, phase, clearSilenceTimer]);

  // Leaving the recording phase invalidates any pending silence window.
  useEffect(() => {
    if (phase !== 'recording') {
      clearSilenceTimer();
    }
  }, [phase, clearSilenceTimer]);

  // ...and unmounting does too.
  useEffect(() => clearSilenceTimer, [clearSilenceTimer]);

  const start = useCallback(() => startRecording(), [startRecording]);

  const stop = useCallback(() => {
    void stopRecording();
  }, [stopRecording]);

  const isRecording = useCallback(() => phaseRef.current === 'recording', []);

  return { phase, currentLevelDb: recorderState.metering ?? null, isRecording, start, stop };
}
