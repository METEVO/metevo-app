/** Run in the host terminal: node scripts/test-contacts-phone.cjs [SERIAL]
 * Build/install without removing app data, run the project's Metro, open a
 * contact fixture and collect app-only logs. No automatic contact saving. */
const { spawn, execFileSync } = require('node:child_process');
const { createECDH } = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const readline = require('node:readline/promises');

const root = path.resolve(__dirname, '..');
const appPackage = 'app.metevo.wallet';
const port = 8081;
const logDirectory = path.join(root, '.expo', 'edi-phone-test');
const children = new Set();
let terminal;

if (process.argv.includes('--help')) {
  console.log('Uso: node scripts/test-contacts-phone.cjs [SERIAL]\nCompila e installa senza cancellare dati, avvia Metro e apre un contatto di prova.\nUsa la configurazione wallet esistente; nessuna transazione viene avviata.\nLog locali: .expo/edi-phone-test/');
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
      code === 0 ? resolve() : reject(new Error(`${path.basename(binary)} terminato con codice ${code}.`));
    });
  });
}

function metroStatus() {
  return new Promise((resolve) => {
    const request = http.get(`http://127.0.0.1:${port}/status`, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ body, root: response.headers['x-react-native-project-root'] }));
    });
    request.setTimeout(1500, () => request.destroy());
    request.on('error', () => resolve(null));
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
    throw new Error('Serve un solo telefono autorizzato: sbloccalo e accetta Debug USB, oppure passa il SERIAL come argomento.');
  }
  process.env.ANDROID_SERIAL = serial;
  process.env.ANDROID_HOME ||= sdk;
  process.env.NODE_ENV = 'development';
  process.env.EXPO_NO_TELEMETRY = '1';
  const adbRun = (args) => execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 30000 });
  const deviceShell = (args) => adbRun(['shell', args.map(shellQuote).join(' ')]);
  note(`Telefono selezionato: ${serial}. Configurazione wallet esistente; nessuna modifica a .env.`);
  const abi = deviceShell(['getprop', 'ro.product.cpu.abi']).trim();
  if (!['arm64-v8a', 'x86_64'].includes(abi)) throw new Error(`Architettura non supportata da questo runner: ${abi}.`);

  const worker = path.join(root, 'node_modules', '@qvac', 'sdk', 'dist', 'worker.mobile.bundle.js');
  if (!fs.existsSync(worker)) {
    note('Preparo il worker QVAC con le dipendenze gia installate.');
    await run(process.execPath, ['scripts/bundle-qvac-sdk.mjs', '--no-install']);
  }

  let status = await metroStatus();
  if (status !== null) {
    if (status.body.trim() !== 'packager-status:running' || !status.root || decodeURI(status.root) !== root) {
      throw new Error(`La porta ${port} appartiene a un altro processo/progetto. Chiudilo dal suo terminale e riprova.`);
    }
    note('Riutilizzo Metro di questo progetto. Se hai cambiato .env, riavvialo prima della prova.');
  } else {
    const metroLog = fs.openSync(path.join(logDirectory, 'metro.log'), 'w');
    const metro = spawn(path.join(root, 'node_modules', '.bin', 'expo'), ['start', '--dev-client', '--localhost', '--port', String(port), '--clear'], {
      cwd: root, env: { ...process.env, CI: '1' }, stdio: ['ignore', metroLog, metroLog],
    });
    fs.closeSync(metroLog);
    children.add(metro);
    let metroError;
    metro.once('error', (error) => { metroError = error; });
    for (let attempt = 0; attempt < 120; attempt++) {
      if (metroError || metro.exitCode !== null) throw metroError || new Error('Metro si e fermato. Vedi metro.log.');
      status = await metroStatus();
      if (status?.body.trim() === 'packager-status:running') break;
      await delay(1000);
    }
    if (status?.body.trim() !== 'packager-status:running') throw new Error('Metro non e pronto. Vedi metro.log.');
    note('Metro pronto.');
  }

  adbRun(['reverse', `tcp:${port}`, `tcp:${port}`]);
  note('Compilo e installo il debug APK. I dati dell app vengono conservati.');
  note('Se Android segnala una firma diversa, non disinstallare per aggirare l errore: conserva i dati e riporta il messaggio.');
  await run(path.join(root, 'android', 'gradlew'), ['-p', path.join(root, 'android'), ':app:assembleDebug', `-PreactNativeArchitectures=${abi}`, '--console=plain']);
  await run(adb, ['-s', serial, 'install', '-r', path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')]);
  const developmentUrl = `metevo://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`;
  note(deviceShell(['am', 'start', '-W', '-n', `${appPackage}/.MainActivity`, '-a', 'android.intent.action.VIEW', '-d', developmentUrl]).trim());

  terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  await terminal.question('Sul telefono attendi la Home; se richiesto completa lo sblocco biometrico. Premi INVIO quando e pronta. ');
  const pid = deviceShell(['pidof', '-s', appPackage]).trim();
  if (!/^\d+$/.test(pid)) throw new Error('L app non risulta in esecuzione. Controlla il telefono e session.log.');
  const appLog = fs.openSync(path.join(logDirectory, 'app.log'), 'w');
  const logcat = spawn(adb, ['-s', serial, 'logcat', '--pid', pid, '-v', 'time'], { stdio: ['ignore', appLog, appLog] });
  fs.closeSync(appLog);
  children.add(logcat);
  logcat.once('error', (error) => note(`Raccolta log non disponibile: ${error.message}`));

  const fixture = createECDH('secp256k1');
  const node = fixture.generateKeys('hex', 'compressed');
  const name = `Edi test ${Date.now().toString().slice(-6)}`;
  const url = `metevo://contact?v=1&name=${encodeURIComponent(name)}&node=${node}`;
  const open = (link) => note(deviceShell(['am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', link, appPackage]).trim());
  note(`Contatto fittizio: ${name}. Solo prova di importazione, non un nodo destinatario reale.`);
  fs.writeFileSync(path.join(logDirectory, 'test-link.txt'), url + '\n');
  open(url);
  note('Prova Cancel, poi riapri e prova Add contact. Dopo Done, riapri per verificare Contact already saved.');
  while (true) {
    const answer = (await terminal.question('INVIO = riapri contatto; i = link versione invalida; q = termina e ferma il Metro avviato qui: ')).trim().toLowerCase();
    if (answer === 'q') break;
    if (answer !== '' && answer !== 'i') continue;
    await delay(2100);
    open(answer === 'i' ? url.replace('v=1', 'v=2') : url);
  }
  note(`Log pronti in ${logDirectory}.`);
}

main().catch((error) => { note(`Prova interrotta: ${error.message}`); process.exitCode = 1; }).finally(cleanup);
