import { MIN_HOLD_MS, OrchestratorPorts, VoiceOrchestrator } from '../../src/voice/orchestrator';

function setup() {
  let clock = 0;
  let recording = false;
  const spoken: string[] = [];
  const ports: OrchestratorPorts = {
    startRecording: jest.fn(async () => {
      recording = true;
    }),
    stopRecording: jest.fn(async () => {
      recording = false;
      return 'file:///clip.m4a';
    }),
    cancelRecording: jest.fn(() => {
      recording = false;
    }),
    prepareStt: jest.fn(async () => undefined),
    prepareLlm: jest.fn(async () => undefined),
    transcribe: jest.fn(async () => "what's my balance"),
    understand: jest.fn(async () => ({
      kind: 'intent' as const,
      source: 'rule' as const,
      instruction: {
        intent: 'CHECK_BALANCE' as const,
        amount: null,
        currency: null,
        recipient: null,
        timeframe: null,
        limit: null,
        purpose: null,
        target_layer: null,
      },
    })),
    execute: jest.fn(),
    speak: (text) => spoken.push(text),
    stopSpeaking: jest.fn(),
    isRecording: () => recording,
    now: () => clock,
  };
  const orchestrator = new VoiceOrchestrator(ports);
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  return {
    orchestrator,
    ports,
    spoken,
    flush,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe('voice orchestrator press length', () => {
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['setImmediate'] }));
  afterEach(() => jest.useRealTimers());

  test('a tap is dropped with a hint and never reaches transcription', async () => {
    const { orchestrator, ports, spoken, flush, advance } = setup();
    await orchestrator.press();
    advance(MIN_HOLD_MS - 1);
    orchestrator.release();
    await flush();

    expect(ports.cancelRecording).toHaveBeenCalledTimes(1);
    expect(ports.transcribe).not.toHaveBeenCalled();
    expect(spoken).toEqual(['Hold the button while you speak, then let go.']);
  });

  test('a release queued while the mic is still starting is checked too', async () => {
    const { orchestrator, ports, spoken, flush, advance } = setup();
    const pressing = orchestrator.press();
    advance(100);
    orchestrator.release();
    await pressing;
    await flush();

    expect(ports.transcribe).not.toHaveBeenCalled();
    expect(spoken).toEqual(['Hold the button while you speak, then let go.']);
  });

  test('a real hold runs the whole turn', async () => {
    const { orchestrator, ports, flush, advance } = setup();
    await orchestrator.press();
    advance(MIN_HOLD_MS);
    orchestrator.release();
    await flush();

    expect(ports.cancelRecording).not.toHaveBeenCalled();
    expect(ports.transcribe).toHaveBeenCalledWith('file:///clip.m4a');
    expect(ports.execute).toHaveBeenCalledWith(expect.objectContaining({ cardId: 'read-balance' }));
  });

  test('a release left by a failed mic start does not cut the next hold', async () => {
    const { orchestrator, ports, flush, advance } = setup();
    (ports.startRecording as jest.Mock).mockRejectedValueOnce(new Error('permission denied'));
    const failingPress = orchestrator.press();
    advance(100);
    orchestrator.release();
    await failingPress;
    await flush();

    advance(1000);
    await orchestrator.press();
    advance(MIN_HOLD_MS);
    orchestrator.release();
    await flush();

    expect(ports.transcribe).toHaveBeenCalledWith('file:///clip.m4a');
  });
});
