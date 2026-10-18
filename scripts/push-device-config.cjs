/**
 * Provisions the wdk-mode wallet configuration on a connected device.
 *
 * Usage:
 *   1. Copy scripts/device-wallet-config.example.json to
 *      scripts/device-wallet-config.json (gitignored) and fill in the
 *      regtest values.
 *   2. node scripts/push-device-config.cjs [path-to-config.json]
 *
 * Requires: adb on PATH, USB or wireless debugging connected, and the
 * debug APK installed (run-as works only for debuggable builds).
 * The values travel to the device's internal app storage only - they are
 * never embedded in the APK bundle.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_PACKAGE = 'app.metevo.wallet';
const DEVICE_FILE_NAME = 'metevo-wallet-config.json';
const REMOTE_TMP_PATH = `/data/local/tmp/${DEVICE_FILE_NAME}`;

/** ADB override: set ADB=/path/to/adb when platform-tools is not on PATH. */
const adbBinary = process.env.ADB ?? 'adb';

const sourcePath = path.resolve(
  process.argv[2] ?? path.join(__dirname, 'device-wallet-config.json'),
);

if (!fs.existsSync(sourcePath)) {
  console.error(
    `No config file at ${sourcePath}.\n` +
      'Copy scripts/device-wallet-config.example.json to scripts/device-wallet-config.json and fill in the regtest values first.',
  );
  process.exit(1);
}

try {
  JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
} catch (cause) {
  console.error(`Config file is not valid JSON: ${cause.message}`);
  process.exit(1);
}

execFileSync(adbBinary, ['push', sourcePath, REMOTE_TMP_PATH], { stdio: 'inherit' });
execFileSync(adbBinary, ['shell', 'run-as', APP_PACKAGE, 'mkdir', '-p', 'files'], {
  stdio: 'inherit',
});
execFileSync(
  adbBinary,
  [
    'shell',
    'run-as',
    APP_PACKAGE,
    'cp',
    REMOTE_TMP_PATH,
    `files/${DEVICE_FILE_NAME}`,
  ],
  { stdio: 'inherit' },
);

console.log(
  `Config provisioned into ${APP_PACKAGE} internal storage.\n` +
    'Fully close and relaunch METEVO on the device, then open the wallet.',
);
