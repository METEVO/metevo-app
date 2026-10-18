/**
 * Copies the language-scoped Whisper models (models/whisper/*.bin, gitignored)
 * into the app sandbox at files/models/whisper/, the directory modelManager.ts
 * reads.
 *
 * Usage:
 *   [ADB=/path/to/adb] [ANDROID_SERIAL=<serial>] node scripts/push-whisper-models.cjs [source-dir]
 *
 * Idempotent: a file already on the device with the same size is skipped.
 * Requires a debuggable build (run-as).
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_PACKAGE = 'app.metevo.wallet';
const DEVICE_DIR = 'files/models/whisper';
const STAGING_DIR = '/data/local/tmp';
const adbBinary = process.env.ADB ?? 'adb';
const sourceDir = path.resolve(process.argv[2] ?? path.join(__dirname, '..', 'models', 'whisper'));

function adb(args, stderr = 'inherit') {
  return execFileSync(adbBinary, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', stderr] }).trim();
}

function deviceFileSize(fileName) {
  try {
    return Number(
      adb(['shell', 'run-as', APP_PACKAGE, 'stat', '-c', '%s', `${DEVICE_DIR}/${fileName}`], 'ignore'),
    );
  } catch {
    return -1;
  }
}

const models = fs.existsSync(sourceDir)
  ? fs.readdirSync(sourceDir).filter((name) => name.endsWith('.bin'))
  : [];
if (models.length === 0) {
  console.error(`No .bin models in ${sourceDir}.`);
  process.exit(1);
}

adb(['shell', 'run-as', APP_PACKAGE, 'mkdir', '-p', DEVICE_DIR]);
for (const fileName of models) {
  const localSize = fs.statSync(path.join(sourceDir, fileName)).size;
  if (deviceFileSize(fileName) === localSize) {
    console.log(`= ${fileName} already installed`);
    continue;
  }
  const staged = `${STAGING_DIR}/${fileName}`;
  console.log(`> ${fileName} (${Math.round(localSize / 1e6)} MB)`);
  execFileSync(adbBinary, ['push', path.join(sourceDir, fileName), staged], { stdio: 'inherit' });
  try {
    adb(['shell', 'run-as', APP_PACKAGE, 'cp', staged, `${DEVICE_DIR}/${fileName}`]);
  } finally {
    adb(['shell', 'rm', '-f', staged]);
  }
}
console.log(`Whisper models installed in ${APP_PACKAGE}:${DEVICE_DIR}.`);
