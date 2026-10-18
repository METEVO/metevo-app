import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Playback for synthesized announcements: the QVAC TTS engine returns
 * headerless PCM, `wav.ts` wraps it into a WAV container, and this module
 * writes it into the cache and plays it through expo-audio. Playback is
 * fire-and-forget by design (the seam returns immediately); only one
 * announcement player is alive at a time.
 */

const speechDirectory = new Directory(Paths.cache, 'speech');

let currentPlayer: AudioPlayer | null = null;

export async function playWavBytes(wavBytes: Uint8Array): Promise<void> {
  if (!speechDirectory.exists) {
    speechDirectory.create({ intermediates: true });
  }
  const file = new File(speechDirectory, `metevo-announcement-${Date.now()}.wav`);
  file.write(wavBytes);

  currentPlayer?.remove();
  currentPlayer = createAudioPlayer(file.uri);
  currentPlayer.play();
}
