/**
 * Provisions the remote node bearer token (EXPO_PUBLIC_WALLET_MODE=remote,
 * node started with --root-public-key) into the app's internal storage.
 *
 * Usage:
 *   RLN_NODE_BEARER_TOKEN=<biscuit> [ANDROID_SERIAL=<serial>] node scripts/push-remote-node-token.cjs
 *
 * The token is read from the environment (never argv, so it does not land
 * in shell history or `ps`) and streamed over stdin straight into the app
 * sandbox, without a copy in /data/local/tmp. Requires a debuggable build.
 */
const { execFileSync } = require('child_process');

const APP_PACKAGE = 'app.metevo.wallet';
const DEVICE_FILE = 'files/metevo-remote-node.json';
const adbBinary = process.env.ADB ?? 'adb';

const bearerToken = (process.env.RLN_NODE_BEARER_TOKEN ?? '').trim();
if (bearerToken.length === 0) {
  console.error('Set RLN_NODE_BEARER_TOKEN to the biscuit token minted for this phone.');
  process.exit(1);
}

execFileSync(adbBinary, ['shell', 'run-as', APP_PACKAGE, 'mkdir', '-p', 'files'], { stdio: 'inherit' });
execFileSync(adbBinary, ['shell', 'run-as', APP_PACKAGE, 'sh', '-c', `'umask 077; cat > ${DEVICE_FILE}'`], {
  input: JSON.stringify({ bearerToken }),
  stdio: ['pipe', 'inherit', 'inherit'],
});

console.log(`Bearer token provisioned into ${APP_PACKAGE}. Relaunch METEVO, then open the wallet.`);
