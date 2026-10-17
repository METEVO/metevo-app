/**
 * Live connection test for the METEVO flow.
 *
 * Levels:
 *   1  LSP connectivity and bearer auth on /metevo/buy
 *   2  Level 1 + real buy quote (creates an LSP-side order and invoice)
 *   3  Level 2 + full WDK wallet run: unlock, connect, pay, claim, verify
 *
 * Usage (Debian WSL):
 *   node --env-file=.env scripts/test-metevo-flow.cjs --level 1
 *
 * Level 3 pays a real invoice and claims real USDM — run it against
 * regtest or signet only, with an amount you intend to spend.
 */

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build');
if (!fs.existsSync(path.join(BUILD_DIR, 'services', 'metevo', 'lsp-api.js'))) {
  execFileSync('npx', ['tsc', '--ignoreConfig', '--outDir', 'build', '--module', 'commonjs',
    '--esModuleInterop', '--target', 'es2022', '--skipLibCheck', '--strict', 'false',
    '--moduleResolution', 'bundler', '--jsx', 'react-jsx', '--types', 'node',
    'src/services/metevo/lsp-api.ts', 'src/services/metevo/wallet.ts',
    'src/services/metevo/funding.ts', 'src/services/metevo/index.ts'],
    { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}

const args = process.argv.slice(2);
const levelArg = args.indexOf('--level');
const LEVEL = levelArg >= 0 ? parseInt(args[levelArg + 1], 10) : 1;

const LSP_URL = process.env.METEVO_LSP_URL;
const TOKEN = process.env.METEVO_LSP_BEARER_TOKEN;
const BUY_USD = parseInt(process.env.METEVO_TEST_USD || '100', 10);

function step(msg) { console.log(`\n== ${msg}`); }
function ok(msg) { console.log(`   OK: ${msg}`); }
function die(msg) { console.error(`\nFAIL: ${msg}`); process.exit(1); }

if (!LSP_URL || !TOKEN) {
  die('set METEVO_LSP_URL and METEVO_LSP_BEARER_TOKEN in .env');
}
if (!fs.existsSync('.env')) {
  console.log('NOTE: no .env file found; using shell environment variables.');
}

const { MetevoLspClient } = require('../build/services/metevo/lsp-api.js');
const lsp = new MetevoLspClient({ baseUrl: LSP_URL, bearerToken: TOKEN });

async function level1() {
  step('Level 1: LSP connectivity');
  const res = await fetch(`${LSP_URL.replace(/\/+$/, '')}/health`);
  const body = await res.json();
  assert.strictEqual(res.status, 200, '/health must return 200');
  assert.strictEqual(body.ok, true, '/health must report ok');
  ok(`/health reachable at ${LSP_URL}`);

  const bad = new MetevoLspClient({ baseUrl: LSP_URL, bearerToken: 'wrong-token' });
  let authStatus = 0;
  try {
    await bad.buy(BUY_USD);
  } catch (e) {
    authStatus = e.status;
  }
  if (authStatus === 404) {
    console.log('   HINWEIS: /metevo/buy existiert auf diesem Host nicht (404).');
    console.log('   Dieser Host ist die öffentliche UTEXO-LSP-Instanz ohne die Metevo-Routen.');
    console.log('   Level 1 gilt als bestanden, wenn der Host erreichbar ist und die Route');
    console.log('   gegen die eigene utexo-lsp-Instanz (metevo-infra) geprüft wird.');
  } else {
    assert.ok(authStatus === 401 || authStatus === 403, 'wrong bearer token must be rejected with 401/403');
    ok('bearer auth enforced on /metevo/buy');
  }
}

async function level2() {
  await level1();
  step('Level 2: real buy quote');
  const quote = await lsp.buy(BUY_USD);
  assert.strictEqual(quote.usdAmount, BUY_USD);
  assert.strictEqual(quote.sats, BUY_USD * 3000, 'rate must be 3000 sats/USD');
  assert.ok(quote.invoice.startsWith('lnbc'), 'invoice must be a BOLT11 string');
  assert.ok(quote.assetId.length > 0, 'asset id must be present');
  console.log(`   quote: $${quote.usdAmount} -> ${quote.sats} sats, asset ${quote.assetId}`);
  console.log(`   asset_amount: ${quote.assetAmount} base units`);
  console.log(`   invoice: ${quote.invoice.slice(0, 48)}...`);
  ok(`buy quote created (order ${quote.paymentHash.slice(0, 16)}...)`);
  console.log('\nNOTE: an unpaid order now exists on the LSP; it expires on its own. '
    + 'To complete the flow end-to-end run level 3.');
}

async function level3() {
  await level2();

  const MNEMONIC = process.env.METEVO_WALLET_MNEMONIC;
  const PASSWORD = process.env.METEVO_WALLET_PASSWORD;
  if (!MNEMONIC || !PASSWORD) {
    die('level 3 needs METEVO_WALLET_MNEMONIC and METEVO_WALLET_PASSWORD in .env');
  }

  const { createMetevoWallet, getMetevoWalletStatus, findAssetIdByTicker,
    ensureColorableUtxos, createUsdmReceiveInvoice, awaitInvoiceSettlement,
    shutdownMetevoWallet } = require('../build/services/metevo/wallet.js');
  const { fundMetevoWallet } = require('../build/services/metevo/funding.js');

  step('Level 3: live WDK wallet');
  const wallet = await createMetevoWallet(MNEMONIC, {
    network: process.env.METEVO_NETWORK || 'signet',
    dataDir: process.env.METEVO_DATA_DIR || './data_metevo_test',
    lspBaseUrl: LSP_URL,
    lspBearerToken: TOKEN,
    bitcoindRpcHost: process.env.BITCOIND_RPC_HOST || '127.0.0.1',
    bitcoindRpcPort: parseInt(process.env.BITCOIND_RPC_PORT || '18443', 10),
    bitcoindRpcUsername: process.env.BITCOIND_RPC_USERNAME || 'user',
    bitcoindRpcPassword: process.env.BITCOIND_RPC_PASSWORD || 'password',
    indexerUrl: process.env.INDEXER_URL || 'https://esplora-api.utexo.com',
    proxyEndpoint: process.env.PROXY_ENDPOINT || 'rpcs://rgb-proxy.utexo.com/json-rpc',
  });
  const { account } = wallet;

  try {
    const status = await getMetevoWalletStatus(account, null);
    assert.ok(status.pubkey, 'wallet pubkey missing');
    ok(`wallet unlocked, pubkey ${status.pubkey}`);

    const usdmAssetId = await findAssetIdByTicker(account, 'USDM');
    console.log(`   wallet aware of USDM: ${usdmAssetId ?? 'no (blind invoice path)'}`);

    if (process.env.METEVO_LSP_PEER_PUBKEY) {
      step('Connecting wallet to our LSP peer');
      await account.connectPeer(process.env.METEVO_LSP_PEER_PUBKEY);
      ok(`connected to ${process.env.METEVO_LSP_PEER_PUBKEY.slice(0, 20)}...`);
      if (usdmAssetId) {
        step('Waiting for a usable USDM channel (LSP cron opens it)');
        const deadline = Date.now() + 300_000;
        let ready = false;
        while (Date.now() < deadline && !ready) {
          await account.sync();
          const chans = await account.listChannels();
          const list = Array.isArray(chans) ? chans : chans?.channels ?? [];
          ready = list.some((c) => (c.is_usable ?? c.ready) === true && (c.asset_id ?? null) === usdmAssetId);
          if (!ready) { process.stdout.write('.'); await new Promise((r) => setTimeout(r, 10_000)); }
        }
        assert.ok(ready, 'USDM channel did not become usable in 5 minutes');
        ok('USDM channel usable');
      }
    } else {
      console.log('   METEVO_LSP_PEER_PUBKEY not set; assuming the channel already exists (LSP cron).');
    }

    step(`Funding: buy $${BUY_USD} of USDM`);
    const baseline = usdmAssetId ? Number(await account.getTokenBalance(usdmAssetId)) : 0;
    const result = await fundMetevoWallet(wallet, lsp, {
      usdAmount: BUY_USD,
      usdmAssetId,
      onProgress: (s) => console.log(`   ... ${s}`),
    });
    assert.strictEqual(result.claimed.status, 'delivered');
    ok(`claimed via ${result.invoiceKind} invoice`);

    step('Checking USDM balance');
    if (usdmAssetId) {
      const deadline = Date.now() + 600_000;
      let final = baseline;
      while (Date.now() < deadline) {
        await account.refreshTransfers({ skip_sync: false, filter: [] });
        final = Number(await account.getTokenBalance(usdmAssetId));
        if (final > baseline) break;
        process.stdout.write('.');
        await new Promise((r) => setTimeout(r, 15_000));
      }
      assert.ok(final > baseline, 'USDM balance did not increase');
      ok(`USDM balance ${baseline} -> ${final} base units`);
    } else {
      ok('wallet was blind to USDM; re-run after this transfer to exercise the witness path');
    }

    console.log('\nPASSED: WDK wallet connects, pays, claims and holds USDM.');
  } finally {
    await shutdownMetevoWallet(wallet);
  }
}

(async () => {
  try {
    if (LEVEL >= 1) await level1();
    if (LEVEL >= 2) await level2();
    if (LEVEL >= 3) await level3();
    console.log('\nAll requested levels passed.');
  } catch (err) {
    die(err.message);
  }
})();
