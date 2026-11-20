/** How long an answer stays under the microphone: long enough to read it,
 * short enough that it never reads as the state of a later screen. */
export function answerDisplayMs(text: string): number {
  return Math.max(4_000, text.length * 80);
}

export interface VoiceStatusInput {
  /** A turn is transcribing, understanding or acting. */
  busy: boolean;
  /** The progress text for the current turn or model loading. */
  progress: string | null;
  /** The spoken answer of the last turn. */
  reply: string | null;
  /** The failure of the last turn. */
  turnError: string | null;
  /** Speech-to-text could not start: voice cannot be used at all. */
  sttError: string | null;
  /** The language model could not start: the fixed phrases still work, so
   * the line stays quiet instead of showing a standing warning. */
  llmError: string | null;
}

export interface VoiceStatusLine {
  message: string | null;
  isError: boolean;
}

/**
 * The line under the microphone shows only what is happening now: the
 * running turn, or its answer for a few seconds. It is red only when that
 * text is itself a failure; a missing language model never paints an answer
 * red and never shows up as a standing message.
 */
export function voiceStatusLine(input: VoiceStatusInput): VoiceStatusLine {
  if (input.busy) return { message: input.progress, isError: false };
  if (input.reply !== null) return { message: input.reply, isError: false };
  if (input.turnError !== null) return { message: input.turnError, isError: true };
  if (input.sttError !== null) return { message: input.sttError, isError: true };
  return { message: input.progress, isError: false };
}
