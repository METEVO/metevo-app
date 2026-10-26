import { Directory, File, Paths } from 'expo-file-system';

import { ENV } from '../config/env';
import {
  RegistryModelDescriptor,
  resolveModelSource,
  whisperModelPresets,
} from './engine/modelRegistry';
import { initializeQwen, parseWalletInstruction, WalletInstruction } from './qwen';
import {
  initializeWhisper,
  transcribeAudio,
  ModelDownloadProgress,
} from './whisper';

/**
 * On-device voice understanding: the English Whisper model plus Qwen turn a
 * finished recording into a wallet instruction. Both models resolve from
 * the QVAC model registry and download on device with checksum
 * verification (the SDK's common way); a local model file path is still
 * accepted through the env for offline sideloading.
 */

/** QVAC opens model and audio files through plain filesystem paths, not file:// uris. */
function toFilesystemPath(uri: string): string {
  return decodeURI(uri.replace(/^file:\/\//, ''));
}

/** Resolves a sideloaded local model file to its device path, or null when
 * the file was never provisioned under <documents>/models/whisper. */
function localWhisperModelPath(fileName: string): string | null {
  const folder = new Directory(Paths.document, 'models', 'whisper');
  const file = new File(folder, fileName);
  return file.exists ? toFilesystemPath(file.uri) : null;
}

function formatProgress(progress: ModelDownloadProgress): string {
  const mb = (n: number) => (n / 1e6).toFixed(1);
  return `Downloading the voice model ${progress.percentage.toFixed(0)}% (${mb(progress.downloaded)}/${mb(progress.total)} MB)…`;
}

/** Loads the English Whisper model and Qwen. Registry sources download on
 * first use and are cached by the SDK, so later calls are cheap. */
export async function prepareOnDeviceVoice(
  onProgress?: (status: string) => void,
): Promise<void> {
  const resolved = resolveModelSource(
    ENV.EXPO_PUBLIC_QVAC_WHISPER_MODEL_ENGLISH,
    whisperModelPresets,
  );
  let whisperSource: string | RegistryModelDescriptor = resolved.source;
  if (resolved.kind === 'file') {
    const devicePath = localWhisperModelPath(resolved.source);
    if (devicePath === null) {
      throw new Error(
        `Voice model ${ENV.EXPO_PUBLIC_QVAC_WHISPER_MODEL_ENGLISH} is missing under <documents>/models/whisper on this phone.`,
      );
    }
    whisperSource = devicePath;
  }
  const downloadProgress =
    onProgress === undefined ? undefined : (p: ModelDownloadProgress) => onProgress(formatProgress(p));

  await initializeWhisper('en', whisperSource, downloadProgress);
  await initializeQwen(downloadProgress);
}

export async function understandOnDevice(
  recordingUri: string,
): Promise<{ transcript: string; instruction: WalletInstruction }> {
  const transcript = await transcribeAudio(toFilesystemPath(recordingUri));
  console.log('[metevo] transcript:', transcript);
  if (!transcript) {
    throw new Error('I did not hear any words.');
  }
  const instruction = await parseWalletInstruction(transcript);
  return { transcript, instruction };
}
