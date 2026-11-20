import {
  VoiceStatusInput,
  answerDisplayMs,
  voiceStatusLine,
} from '../../src/voice/statusLine';

const quiet: VoiceStatusInput = {
  busy: false,
  progress: null,
  reply: null,
  turnError: null,
  sttError: null,
  llmError: null,
};
const QWEN_FAILURE = "Failed to load model: CANNOT_LOAD: Cannot load addon 'linked:libqvac__fabric.0.19.0.so'";

describe('voiceStatusLine', () => {
  it('never paints a successful answer red when the language model is missing', () => {
    const line = voiceStatusLine({ ...quiet, reply: 'You have 0 dollars and 0 sats.', llmError: QWEN_FAILURE });

    expect(line).toEqual({ message: 'You have 0 dollars and 0 sats.', isError: false });
  });

  it('stays quiet about a missing language model', () => {
    const line = voiceStatusLine({ ...quiet, llmError: QWEN_FAILURE });

    expect(line).toEqual({ message: null, isError: false });
  });

  it('shows a failed turn as an error', () => {
    const line = voiceStatusLine({ ...quiet, turnError: 'I did not catch that.', llmError: QWEN_FAILURE });

    expect(line).toEqual({ message: 'I did not catch that.', isError: true });
  });

  it('shows a speech-to-text failure as an error: voice cannot work at all', () => {
    const line = voiceStatusLine({ ...quiet, sttError: 'The stt model is not on this phone yet.' });

    expect(line.isError).toBe(true);
  });

  it('shows progress while a turn is running, even after a failure', () => {
    const line = voiceStatusLine({ ...quiet, busy: true, progress: 'Transcribing…', turnError: 'old failure' });

    expect(line).toEqual({ message: 'Transcribing…', isError: false });
  });
});

describe('answerDisplayMs', () => {
  it('keeps a short answer readable for four seconds', () => {
    expect(answerDisplayMs('You have 0 dollars and 0 sats.')).toBe(4_000);
  });

  it('gives a long answer more time', () => {
    expect(answerDisplayMs('x'.repeat(100))).toBe(8_000);
  });
});
