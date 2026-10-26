import { intentActionFromInstruction, VoiceIntentAction } from '../utils/voiceIntentMapping';
import { Parsed } from './intents';
import { replyForBalances, replyForError, replyForIntent, replyForUnclear, sanitizeForSpeech } from './replies';

/**
 * The one owner of a voice turn (design phase 7): a press-to-talk state
 * machine that runs capture -> transcription -> understanding -> execution
 * -> reply. UI components render from its snapshots and never call the
 * SDK. Every turn carries an id: a newer press (barge-in) makes the
 * results of the interrupted turn land nowhere.
 */

export type VoicePhase =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'understanding'
  | 'confirming'
  | 'acting'
  | 'speaking'
  | 'error';

export interface VoiceSnapshot {
  phase: VoicePhase;
  transcript: string | null;
  reply: string | null;
  error: string | null;
}

export interface OrchestratorPorts {
  /** Starts the recorder; resolves once the mic is actually running. */
  startRecording: () => Promise<void>;
  /** Stops the recorder; resolves with the clip uri (null = failed). */
  stopRecording: () => Promise<string | null>;
  /** Best-effort recorder stop used when a turn is cancelled. */
  cancelRecording: () => void;
  /** Loads the STT model if needed (single-flight in the runtime). */
  prepareStt: () => Promise<void>;
  /** Loads the LLM model if needed (single-flight in the runtime). */
  prepareLlm: () => Promise<void>;
  /** Transcribes a finished clip, filters and normalizes it. */
  transcribe: (uri: string) => Promise<string | null>;
  /** Tiered intent understanding over a cleaned transcript. */
  understand: (transcript: string) => Promise<Parsed>;
  /** Hands a resolved intent to the app (the intent-card flow confirms). */
  execute: (action: VoiceIntentAction) => void;
  /** The live wallet balances for read replies (null = wallet closed). */
  describeBalances?: () => { usdm: number | null; sats: number | null } | null;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isRecording: () => boolean;
}

/** Phases a barge-in press may interrupt. Confirmations live on screen and
 * are never voice-cancelled. */
const INTERRUPTIBLE: ReadonlySet<VoicePhase> = new Set([
  'transcribing',
  'understanding',
  'speaking',
]);

export class VoiceOrchestrator {
  private phase: VoicePhase = 'idle';
  private turnId = 0;
  private starting = false;
  private releaseQueued = false;
  private snapshot: VoiceSnapshot = {
    phase: 'idle',
    transcript: null,
    reply: null,
    error: null,
  };
  private listeners = new Set<(snapshot: VoiceSnapshot) => void>();
  private ports: OrchestratorPorts;

  constructor(ports: OrchestratorPorts) {
    this.ports = ports;
  }

  /** Rebinds the ports (the hook refreshes closures on every render). */
  attachPorts(ports: OrchestratorPorts): void {
    this.ports = ports;
  }

  subscribe(listener: (snapshot: VoiceSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  /** Hold started: barge-in when busy, otherwise begin capture. */
  async press(): Promise<void> {
    this.ports.stopSpeaking();
    if (this.phase === 'recording' || this.starting) {
      return;
    }
    if (INTERRUPTIBLE.has(this.phase)) {
      this.turnId += 1; // barge-in: the interrupted turn lands nowhere
    }
    this.starting = true;
    this.toPhase('recording');
    try {
      await this.ports.startRecording();
    } catch (cause) {
      this.fail('The microphone could not start.', cause);
      return;
    } finally {
      this.starting = false;
    }
    if (!this.ports.isRecording()) {
      this.fail('The microphone is off. Allow microphone access and try again.');
      return;
    }
    if (this.releaseQueued) {
      this.releaseQueued = false;
      await this.finishTurn();
    }
  }

  /** Hold released: run the turn with the captured clip. */
  release(): void {
    if (this.starting) {
      this.releaseQueued = true;
      return;
    }
    if (this.phase !== 'recording') {
      return;
    }
    void this.finishTurn();
  }

  /** Cancels the current turn without starting a new one. */
  cancel(): void {
    if (this.phase === 'recording' || this.starting) {
      this.ports.cancelRecording();
    }
    this.ports.stopSpeaking();
    this.turnId += 1;
    this.toPhase('idle');
  }

  private async finishTurn(): Promise<void> {
    const turn = this.turnId;
    const alive = () => this.turnId === turn;

    try {
      this.toPhase('transcribing');
      await this.ports.prepareStt();
      if (!alive()) return;

      const uri = await this.ports.stopRecording();
      if (!alive()) return;
      if (uri === null) {
        this.fail('The recording failed. Try again.');
        return;
      }

      const transcript = await this.ports.transcribe(uri);
      if (!alive()) return;
      if (transcript === null) {
        this.settle(replyForUnclear());
        return;
      }
      this.setSnapshot({ transcript });

      this.toPhase('understanding');
      await this.ports.prepareLlm();
      if (!alive()) return;

      const parsed = await this.ports.understand(transcript);
      if (!alive()) return;
      if (parsed.kind === 'unclear') {
        this.settle(replyForUnclear());
        return;
      }

      const action = intentActionFromInstruction(parsed.instruction, transcript);
      if (action === null) {
        this.settle(replyForUnclear());
        return;
      }

      this.toPhase('acting');
      this.ports.execute(action);
      // A balance read announces the actual values, not just the template
      // line — the reply is composed from the executor result.
      const spoken =
        action.cardId === 'read-balance'
          ? replyForBalances(this.ports.describeBalances?.() ?? null)
          : replyForIntent(action.cardId);
      this.settle(spoken);
    } catch (cause) {
      if (!alive()) return;
      this.fail(
        cause instanceof Error ? cause.message : 'The voice command failed.',
        cause,
      );
    }
  }

  /** Announces the turn's reply and rests. */
  private settle(reply: string): void {
    this.toPhase('speaking');
    this.setSnapshot({ reply });
    this.ports.speak(reply);
    this.scheduleIdle(reply.length);
  }

  private fail(message: string, cause?: unknown): void {
    if (cause !== undefined) {
      console.warn('[metevo] voice turn failed:', message, cause);
    }
    this.toPhase('error');
    this.setSnapshot({ error: message });
    this.ports.speak(sanitizeForSpeech(message));
    this.scheduleIdle(message.length);
  }

  /** The phase returns to idle once the reply has plausibly finished; the
   * audio itself keeps playing and the next press barges in regardless. */
  private scheduleIdle(replyLength: number): void {
    const estimatedMs = Math.max(1200, replyLength * 60);
    setTimeout(() => {
      if (this.phase === 'speaking' || this.phase === 'error') {
        this.toPhase('idle');
      }
    }, estimatedMs);
  }

  private toPhase(phase: VoicePhase): void {
    this.phase = phase;
    this.setSnapshot({});
  }

  private setSnapshot(patch: Partial<VoiceSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
