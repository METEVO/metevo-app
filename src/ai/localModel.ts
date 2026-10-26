import { Directory, File, Paths } from 'expo-file-system';

/**
 * QVAC opens model and audio files through plain filesystem paths, not
 * file:// uris.
 */
export function toFilesystemPath(uri: string): string {
  return decodeURI(uri.replace(/^file:\/\//, ''));
}

/**
 * Resolves a sideloaded model file under <documents>/models/<engine>/, or
 * null when the file was never provisioned on this phone. The folder keeps
 * models off the QVAC registry: the registry hub is not reachable from
 * every demo network, and a sideloaded file loads with no network at all.
 */
export function localModelPath(engineFolder: string, fileName: string): string | null {
  const folder = new Directory(Paths.document, 'models', engineFolder);
  const file = new File(folder, fileName);
  if (!file.exists) {
    // Provisioning diagnostics: show where the app looks vs where adb pushed.
    console.warn(
      `[metevo] local model missing: ${fileName} — looked in ${toFilesystemPath(file.uri)}; document=${toFilesystemPath(Paths.document.uri)}`,
    );
    return null;
  }
  return toFilesystemPath(file.uri);
}
