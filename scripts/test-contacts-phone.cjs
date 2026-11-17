/** Run in the host terminal: node scripts/test-contacts-phone.cjs [SERIAL]
 * Build/install without removing app data, run the project's Metro, open a
 * contact fixture and collect app-only logs. No automatic contact saving. */
const { spawn, execFileSync } = require('node:child_process');
const { createECDH } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { chooseMetroPort, readMetroStatus, isProjectMetro } = require('./lib/phone-test-metro.cjs');

const root = path.resolve(__dirname, '..');
const appPackage = 'app.metevo.wallet';
let port;
const LOG_DIRECTORY_NAME = 'contact-phone-test';
const logDirectory = path.join(root, '.expo', LOG_DIRECTORY_NAME);
const children = new Set();
let terminal;

if (process.argv.includes('--help')) {
  console.log([
    'Usage: node scripts/test-contacts-phone.cjs [SERIAL]',
    'Builds and installs without clearing app data, starts Metro and opens a test contact.',
    'Picks a free port starting at 8081; METEVO_METRO_PORT changes the first port.',
    'Uses the existing wallet configuration; no transaction is started.',
    `Local logs: .expo/${LOG_DIRECTORY_NAME}/`,
  ].join('\n'));
  process.exit(0);
}

process.chdir(root);
fs.mkdirSync(logDirectory, { recursive: true });
const sessionLog = fs.createWriteStream(path.join(logDirectory, 'session.log'), { flags: 'w' });
function note(message) { console.log(message); sessionLog.write(`${message}\n`); }
function cleanup() {
  terminal?.close();
  for (const child of children) child.kill('SIGTERM');
  sessionLog.end();
}
process.once('SIGINT', () => { cleanup(); process.exit(130); });
process.once('SIGTERM', () => { cleanup(); process.exit(143); });

function run(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd: root, env: process.env, stdio: ['inherit', 'pipe', 'pipe'] });
    children.add(child);
    child.stdout.on('data', (chunk) => { process.stdout.write(chunk); sessionLog.write(chunk); });
    child.stderr.on('data', (chunk) => { process.stderr.write(chunk); sessionLog.write(chunk); });
    child.once('error', reject);
    child.once('close', (code) => {
      children.delete(child);
      code === 0 ? resolve() : reject(new Error(`${path.basename(binary)} exited with code ${code}.`));
    });
  });
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shellQuote = (value) => `'${value.replace(/'/g, "'\\''")}'`;

async function main() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(process.env.HOME || '', 'Android', 'Sdk');
  const adb = process.env.ADB || (fs.existsSync(path.join(sdk, 'platform-tools', 'adb')) ? path.join(sdk, 'platform-tools', 'adb') : 'adb');
  const devices = execFileSync(adb, ['devices', '-l'], { encoding: 'utf8', timeout: 15000 });
  note(devices.trim());
  const authorized = devices.split(/\r?\n/).filter((line) => /^\S+\s+device\b/.test(line)).map((line) => line.split(/\s+/)[0]);
  const serial = process.argv[2] || process.env.ANDROID_SERIAL || (authorized.length === 1 ? authorized[0] : null);
  if (!serial || !authorized.includes(serial)) {
    throw new Error('Exactly one authorized phone is required: unlock it and accept USB debugging, or pass the SERIAL as an argument.');
  }
  process.env.ANDROID_SERIAL = serial;
  process.env.ANDROID_HOME ||= sdk;
  process.env.NODE_ENV = 'development';
  process.env.EXPO_NO_TELEMETRY = '1';
  const adbRun = (args) => execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 30000 });
  const deviceShell = (args) => adbRun(['shell', args.map(shellQuote).join(' ')]);
  note(`Selected phone: ${serial}. Existing wallet configuration; .env is not modified.`);
  const abi = deviceShell(['getprop', 'ro.product.cpu.abi']).trim();
  if (!['arm64-v8a', 'x86_64'].includes(abi)) throw new Error(`Architecture not supported by this runner: ${abi}.`);

  const worker = path.join(root, 'node_modules', '@qvac', 'sdk', 'dist', 'worker.mobile.bundle.js');
  if (!fs.existsSync(worker)) {
    note('Bundling the QVAC worker with the dependencies already installed.');
    await run(process.execPath, ['scripts/bundle-qvac-sdk.mjs', '--no-install']);
  }

  const choice = await chooseMetroPort({
    root,
    firstPort: Number(process.env.METEVO_METRO_PORT || 8081),
    onBusy: (busyPort) => note(`Port ${busyPort} is busy or runs an unidentified Metro: trying the next one.`),
  });
  port = choice.port;
  note(`Selected Metro port: ${port}.`);
  if (choice.reuse) {
    note('Reusing this project\'s Metro. If .env changed, restart it before testing.');
  } else {
    const metroLog = fs.openSync(path.join(logDirectory, 'metro.log'), 'w');
    const metro = spawn(path.join(root, 'node_modules', '.bin', 'expo'), ['start', '--dev-client', '--localhost', '--port', String(port), '--clear'], {
      cwd: root, env: { ...process.env, CI: '1' }, stdio: ['ignore', metroLog, metroLog],
    });
    fs.closeSync(metroLog);
    children.add(metro);
    let metroError;
    metro.once('error', (error) => { metroError = error; });
    let status;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (metroError || metro.exitCode !== null) throw metroError || new Error('Metro stopped. See metro.log.');
      status = await readMetroStatus(port);
      if (isProjectMetro(status, root)) break;
      await delay(1000);
    }
    if (!isProjectMetro(status, root)) throw new Error('Metro is not ready for this project. See metro.log.');
    note('Metro is ready.');
  }

  adbRun(['reverse', `tcp:${port}`, `tcp:${port}`]);
  note('Building and installing the debug APK. App data is kept.');
  note('If Android reports a different signature, do not uninstall to get around it: keep the data and report the message.');
  await run(path.join(root, 'android', 'gradlew'), ['-p', path.join(root, 'android'), ':app:assembleDebug', `-PreactNativeArchitectures=${abi}`, '--console=plain']);
  await run(adb, ['-s', serial, 'install', '-r', path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')]);
  const developmentUrl = `metevo://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`;
  note(deviceShell(['am', 'start', '-W', '-n', `${appPackage}/.MainActivity`, '-a', 'android.intent.action.VIEW', '-d', developmentUrl]).trim());

  terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  await terminal.question('On the phone, wait for Home; complete the biometric unlock if asked. Press ENTER when it is ready. ');
  const pid = deviceShell(['pidof', '-s', appPackage]).trim();
  if (!/^\d+$/.test(pid)) throw new Error('The app is not running. Check the phone and session.log.');
  const appLog = fs.openSync(path.join(logDirectory, 'app.log'), 'w');
  const logcat = spawn(adb, ['-s', serial, 'logcat', '--pid', pid, '-v', 'time'], { stdio: ['ignore', appLog, appLog] });
  fs.closeSync(appLog);
  children.add(logcat);
  logcat.once('error', (error) => note(`Log collection unavailable: ${error.message}`));

  const fixture = createECDH('secp256k1');
  const node = fixture.generateKeys('hex', 'compressed');
  const name = `Contact test ${Date.now().toString().slice(-6)}`;
  const url = `metevo://contact?v=1&name=${encodeURIComponent(name)}&node=${node}`;
  const open = (link) => note(deviceShell(['am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', link, appPackage]).trim());
  note(`Test contact: ${name}. Import test only, not a real recipient node.`);
  fs.writeFileSync(path.join(logDirectory, 'test-link.txt'), url + '\n');
  open(url);
  note('Try Cancel, then reopen and try Add contact. After Done, reopen to check Contact already saved.');
  while (true) {
    const answer = (await terminal.question('ENTER = reopen contact; i = invalid version link; q = quit and stop the Metro started here: ')).trim().toLowerCase();
    if (answer === 'q') break;
    if (answer !== '' && answer !== 'i') continue;
    await delay(2100);
    open(answer === 'i' ? url.replace('v=1', 'v=2') : url);
  }
  note(`Logs ready in ${logDirectory}.`);
}

main().catch((error) => { note(`Test aborted: ${error.message}`); process.exitCode = 1; }).finally(cleanup);
