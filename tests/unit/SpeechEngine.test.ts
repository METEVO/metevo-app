const mockSdk = {
  loadModel: jest.fn(),
  unloadModel: jest.fn(),
  textToSpeech: jest.fn(),
};

jest.mock('@qvac/sdk', () => mockSdk, { virtual: true });
jest.mock('../../src/ai/engine/modelRegistry', () => ({
  ttsModelPresets: {},
  resolveModelSource: () => ({ kind: 'registry', source: { name: 'tts-preset' } }),
}));

import { releaseSpeech, synthesizeSpeech } from '../../src/ai/engine/speechEngine';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('QVAC speech engine', () => {
  beforeEach(async () => {
    await releaseSpeech();
    jest.clearAllMocks();
    mockSdk.unloadModel.mockResolvedValue(undefined);
    mockSdk.textToSpeech.mockReturnValue({
      buffer: Promise.resolve([0.1, -0.1, 0.2]),
      sampleRate: Promise.resolve(24_000),
    });
  });

  test('concurrent announcements load the model once', async () => {
    mockSdk.loadModel.mockResolvedValue('tts-model');

    await Promise.all([synthesizeSpeech('one', 'en'), synthesizeSpeech('two', 'en')]);

    expect(mockSdk.loadModel).toHaveBeenCalledTimes(1);
    expect(mockSdk.textToSpeech).toHaveBeenCalledTimes(2);
  });

  test('a release waits for the synthesis that is still running', async () => {
    mockSdk.loadModel.mockResolvedValue('tts-model');
    const audio = deferred<number[]>();
    mockSdk.textToSpeech.mockReturnValueOnce({ buffer: audio.promise, sampleRate: Promise.resolve(24_000) });

    const speaking = synthesizeSpeech('long announcement', 'en');
    const releasing = releaseSpeech();
    await Promise.resolve();
    expect(mockSdk.unloadModel).not.toHaveBeenCalled();

    audio.resolve([0.3, 0.2]);
    await expect(speaking).resolves.toMatchObject({ sampleRate: 24_000 });
    await releasing;
    expect(mockSdk.unloadModel).toHaveBeenCalledWith({ modelId: 'tts-model' });
  });

  test('reuses the model the worker kept across a JS reload', async () => {
    mockSdk.loadModel.mockRejectedValue(
      new Error('Failed to load model: Model with ID "3edc5a508cb1289d" is already registered'),
    );

    await synthesizeSpeech('hello', 'en');

    expect(mockSdk.textToSpeech).toHaveBeenCalledWith(expect.objectContaining({ modelId: '3edc5a508cb1289d' }));
  });

  test('other load failures still surface', async () => {
    mockSdk.loadModel.mockRejectedValue(new Error('CANNOT_LOAD: addon missing'));

    await expect(synthesizeSpeech('hello', 'en')).rejects.toThrow('CANNOT_LOAD');
  });

  test('a failed announcement does not block the next one', async () => {
    mockSdk.loadModel.mockRejectedValueOnce(new Error('transient')).mockResolvedValue('tts-model');

    await expect(synthesizeSpeech('first', 'en')).rejects.toThrow('transient');
    await expect(synthesizeSpeech('second', 'en')).resolves.toMatchObject({ sampleRate: 24_000 });
  });
});
