import { useCallback, useEffect, useRef, useState } from 'react';

import {
  prepareOnDeviceVoice,
  understandOnDevice,
} from '../ai/onDeviceVoice';
import { IntentId } from '../types/intents';
import {
  announceForAccessibility,
  speakEnglish,
} from '../utils/speaker';
import { archiveRecording } from '../utils/recordingArchive';
import {
  intentActionFromInstruction,
  VoiceIntentAction,
} from '../utils/voiceIntentMapping';

export type VoiceAgentStatus = 'loading-models' | 'ready' | 'understanding' | 'failed';

const NOT_UNDERSTOOD = 'I did not understand. Please say it again.';

export interface VoiceAgentAction {
  cardId: IntentId;
  payload: unknown;
}

/**
 * The home voice agent (English, on-device QVAC). The English Whisper and
 * Qwen models load right when the home shell mounts, so the first spoken
 * command needs no wait. Each recording gets a generation number: a newer
 * recording or leaving the screen makes older results land nowhere.
 */
export function useVoiceAgent(onAction: (action: VoiceAgentAction) => void) {
  const [status, setStatus] = useState<VoiceAgentStatus>('loading-models');
  const [message, setMessage] = useState<string | null>('Loading the voice models…');
  const generation = useRef(0);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  useEffect(() => {
    let cancelled = false;
    void prepareOnDeviceVoice((status) => {
      if (cancelled) return;
      setMessage(status);
    }).then(
      () => {
        if (cancelled) return;
        setStatus('ready');
        setMessage(null);
        console.log('[metevo] voice agent ready (English models loaded)');
      },
      (cause: unknown) => {
        if (cancelled) return;
        console.warn('[metevo] voice model load failed:', cause);
        setStatus('failed');
        setMessage(
          cause instanceof Error ? cause.message : 'The voice models failed to load.',
        );
      },
    );
    return () => {
      cancelled = true;
      generation.current++;
    };
  }, []);

  const fail = useCallback((sentence: string) => {
    setStatus('failed');
    setMessage(sentence);
    announceForAccessibility(sentence);
  }, []);

  const handleRecording = useCallback((recordingUri: string | null) => {
    if (recordingUri === null) {
      console.log('[metevo] recording failed, nothing to understand');
      return;
    }
    void archiveRecording(recordingUri);
    const current = ++generation.current;
    console.log('[metevo] understanding recording:', recordingUri);
    setStatus('understanding');
    setMessage('Understanding…');
    void understandOnDevice(recordingUri).then(
      ({ transcript, instruction }) => {
        if (current !== generation.current) return;
        const action = intentActionFromInstruction(instruction, transcript);
        console.log('[metevo] voice instruction:', JSON.stringify(instruction));
        if (action === null) {
          fail(NOT_UNDERSTOOD);
          return;
        }
        setStatus('ready');
        setMessage(null);
        speakEnglish(action.announcement);
        announceForAccessibility(action.announcement);
        onActionRef.current({ cardId: action.cardId, payload: action.payload });
      },
      (cause: unknown) => {
        if (current !== generation.current) return;
        console.warn('[metevo] voice understanding failed:', cause);
        fail(cause instanceof Error ? cause.message : NOT_UNDERSTOOD);
      },
    );
  }, [fail]);

  return { status, message, ready: status === 'ready', handleRecording };
}
