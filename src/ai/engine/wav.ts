/**
 * Wrap raw signed 16-bit PCM samples into a WAV container byte array, the
 * format `expo-audio` players accept from a file. The QVAC TTS engines
 * return headerless mono PCM plus the sample rate they actually produced,
 * so the header is written from that reported rate, never assumed.
 */
export function encodeWav(pcmSamples: number[], sampleRate: number): Uint8Array {
  const bytesPerSample = 2;
  const dataSize = pcmSamples.length * bytesPerSample;
  const wav = new Uint8Array(WAV_HEADER_SIZE + dataSize);
  const view = new DataView(wav.buffer);

  writeAscii(wav, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(wav, 8, 'WAVE');
  writeAscii(wav, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, PCM_FORMAT, true);
  view.setUint16(22, MONO_CHANNEL_COUNT, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, PCM_BIT_DEPTH, true);
  writeAscii(wav, 36, 'data');
  view.setUint32(40, dataSize, true);

  pcmSamples.forEach((sample, index) => {
    view.setInt16(WAV_HEADER_SIZE + index * bytesPerSample, sample, true);
  });

  return wav;
}

const WAV_HEADER_SIZE = 44;
const PCM_FORMAT = 1;
const MONO_CHANNEL_COUNT = 1;
const PCM_BIT_DEPTH = 16;

function writeAscii(target: Uint8Array, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    target[offset + index] = text.charCodeAt(index);
  }
}
