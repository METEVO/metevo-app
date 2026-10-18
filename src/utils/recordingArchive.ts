import * as FileSystem from 'expo-file-system/legacy';

/**
 * Recording archive (debug/foundation phase).
 *
 * Recordings are created inside the app sandbox (Expo Go's private cache),
 * which no file manager can reach. Android's Storage Access Framework
 * solves this without any storage permissions: the user picks a folder
 * once (e.g. Downloads/METEVO), we remember it in a tiny pointer file
 * inside our own sandbox, and every finished recording is copied there.
 * Files in the picked folder are visible to any file manager and
 * pullable over USB (adb pull).
 *
 * TODO(phase 2): the voice pipeline will consume recordings by uri directly;
 * archiving likely becomes an explicit "keep this one" action, not a copy.
 */

/** Pointer file (inside our own sandbox) remembering the chosen folder. */
const DIRECTORY_POINTER_FILE = 'metevo-archive-dir.txt';

const pointerFileUri = (): string => `${FileSystem.documentDirectory}${DIRECTORY_POINTER_FILE}`;

/** The SAF directory uri chosen by the user, or null when none was chosen. */
export async function getArchiveDirectoryUri(): Promise<string | null> {
  try {
    const content = await FileSystem.readAsStringAsync(pointerFileUri());
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    // Pointer file not written yet.
    return null;
  }
}

/**
 * Opens the system folder picker. The picked folder is remembered across
 * sessions. Returns the chosen uri, or null when the user cancelled.
 */
export async function chooseArchiveDirectory(): Promise<string | null> {
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    return null;
  }
  await FileSystem.writeAsStringAsync(pointerFileUri(), permissions.directoryUri);
  return permissions.directoryUri;
}

/**
 * Copies a finished recording into the chosen archive folder as
 * metevo-recording-<timestamp>.m4a. Returns the archived file uri, or null
 * when no folder is chosen yet or the copy fails.
 */
export async function archiveRecording(recordingUri: string): Promise<string | null> {
  const directoryUri = await getArchiveDirectoryUri();
  if (!directoryUri) {
    return null;
  }
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivedUri = await FileSystem.StorageAccessFramework.createFileAsync(
      directoryUri,
      'audio/mp4',
      `metevo-recording-${timestamp}.m4a`,
    );
    await FileSystem.copyAsync({ from: recordingUri, to: archivedUri });
    return archivedUri;
  } catch (error) {
    console.warn('[metevo] archiving the recording failed:', error);
    return null;
  }
}
