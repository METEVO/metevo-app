/**
 * METEVO end-to-end funding flow test: regtest RLN (LSP) <-> WDK RGB Lightning wallet.
 *
 * MODELS the exact flow that runs against the real stack:
 *   1. WDK wallet is created and unlocked (regtest).
 *   2. Wallet connects to the LSP peer; the LSP cron opens the USDm channel.
 *   3. POST /metevo/buy  -> invoice in sats (3000 sats/USD default).
 *   4. Wallet pays the invoice over the channel; we poll for settlement.
 *   5. Wallet creates a RGB receive invoice - blind if it does not yet know
 *      the USDm asset, witness if it does.
 *   6. POST /metevo/claim -> LSP sends USDm to the wallet via sendrgb.
 *   7. Wallet refreshes transfers; USDm balance appears.
 *
 * HOW TO RUN (requires a regtest stack: bitcoind, electrs, proxy, RLN LSP node
 * and the utexo-lsp process; see the utexo-lsp repo .env.example):
 *   cd metevo-app
 *   npm install @utexo/wdk-rgb-lightning @utexo/rgb-lightning-node-nodejs
 *   cp .env.example .env  # fill in METEVO_* and bitcoin regtest values
 *   node --env-file=.env tests/e2e/metevo-funding.e2e.js
 *
 * Without those services running, run `npx jest` instead: the unit tests
 * cover the same call sequence against stubs, and this file is skipped by jest
 * (it is not a *.test.ts file).
 */

const assert = require('assert');

const canRunE2E =
  process.env.METEVO_LSP_URL &&
  process.env.METEVO_LSP_BEARER_TOKEN &&
  process.env.METEVO_WALLET_MNEMONIC &&
  process.env.METEVO_WALLET_PASSWORD;

if (!canRunE2E) {
  console.log('E2E skipped: set METEVO_LSP_URL, METEVO_LSP_BEARER_TOKEN, '
    + 'METEVO_WALLET_MNEMONIC and METEVO_WALLET_PASSWORD in .env to run.');
  process.exit(0);
}

const { MetevoLspClient } = require('../src/services/metevo/lsp-api');
const {
  createMetevoWallet,
  ensureColorableUtxos,
  createUsdmReceiveInvoice,
  findAssetIdByTicker,
  awaitInvoiceSettlement,
  getMetevoWalletStatus,
} = require('../src/services/metevo/wallet');
const { fundMetevoWallet } = require('../src/services/metevo/funding');

const LSP_PEER_PUBKEY = process.env.METEVO_LSP_PEER_PUBKEY; // optional; from LSP /get_info
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForChannel(account, assetId, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await account.sync();
    const channels = await account.listChannels();
    const list = Array.isArray(channels) ? channels : channels?.channels ?? [];
    const ready = list.some(
      (c) => (c.is_usable ?? c.ready) === true && (c.asset_id ?? null) === assetId,
    );
    if (ready) return true;
    process.stdout.write('.');
    await sleep(5_000);
  }
  return false;
}

async function pollUsdmBalance(account, assetId, baseline, timeoutMs = 300_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await account.refreshTransfers({ skip_sync: false, filter: [] });
    const bal = Number(await account.getTokenBalance(assetId));
    if (bal > baseline) return bal;
    process.stdout.write('.');
    await sleep(10_000);
  }
  throw new Error('USDm balance did not increase within timeout');
}

(async () => {
  const lsp = new MetevoLspClient({
    baseUrl: process.env.METEVO_LSP_URL,
    bearerToken: process.env.METEVO_LSP_BEARER_TOKEN,
    // regtest LSP is typically plain http on loopback; explicit override
    ...(process.env.METEVO_ALLOW_HTTP === '1' ? {} : {}),
  });

  // --- Step 0: LSP must already have issued USDm (POST /metevo/bootstrap by operator)
  const wallet = await createMetevoWallet(process.env.METEVO_WALLET_MNEMONIC, {
    network: 'regtest',
    dataDir: process.env.METEVO_DATA_DIR || './data_metevo_test',
    lspBaseUrl: process.env.METEVO_LSP_URL,
    lspBearerToken: process.env.METEVO_LSP_BEARER_TOKEN,
    bitcoindRpcHost: process.env.BITCOIND_RPC_HOST || '127.0.0.1',
    bitcoindRpcPort: parseInt(process.env.BITCOIND_RPC_PORT || '18443', 10),
    bitcoindRpcUsername: process.env.BITCOIND_RPC_USERNAME || 'user',
    bitcoindRpcPassword: process.env.BITCOIND_RPC_PASSWORD || 'password',
    indexerUrl: process.env.INDEXER_URL || 'tcp://127.0.0.1:50001',
    proxyEndpoint: process.env.PROXY_ENDPOINT || 'rpc://127.0.0.1:3000/json-rpc',
  });
  const { account } = wallet;

  try {
    // --- Step 1: wallet status and asset awareness
    const statusBefore = await getMetevoWalletStatus(account, null);
    assert.ok(statusBefore.pubkey, 'wallet pubkey missing');
    console.log('\n[1] Wallet unlocked. pubkey:', statusBefore.pubkey);

    const usdmAssetId = await findAssetIdByTicker(account, 'USDm');
    console.log('[1] Wallet aware of USDm asset?', usdmAssetId ?? 'NO (blind invoices will be used)');

    // --- Step 2: connect to the LSP peer and wait for the USDm channel
    if (LSP_PEER_PUBKEY) {
      await account.connectPeer(LSP_PEER_PUBKEY);
      console.log('[2] Connected to LSP peer. Waiting for USDm channel (LSP cron opens it)...');
      const ready = await waitForChannel(account, usdmAssetId);
      assert.ok(ready, 'USDm channel did not become usable before timeout');
      console.log('[2] USDm channel usable.');
    } else {
      console.log('[2] METEVO_LSP_PEER_PUBKEY not set - assuming channel already open (LSP cron).');
      if (usdmAssetId) {
        const ready = await waitForChannel(account, usdmAssetId);
        if (!ready) console.log('[2] WARNING: no usable USDm channel yet; continuing anyway.');
      }
    }

    // --- Step 3-4: buy $100, pay the invoice, wait for settlement
    const baselineUsdm = usdmAssetId ? Number(await account.getTokenBalance(usdmAssetId)) : 0;
    const result = await fundMetevoWallet(wallet, lsp, {
      usdAmount: 100,
      usdmAssetId,
      onProgress: (s) => console.log('   ...', s),
    });
    assert.strictEqual(result.quote.usdAmount, 100);
    assert.strictEqual(result.quote.sats, 300_000, 'quote should be 3000 sats per USD');
    assert.strictEqual(result.claimed.status, 'delivered');
    console.log(`[4] Bought $100 for ${result.quote.sats} sats; claim delivered via ${result.invoiceKind} invoice.`);
    // --- Step 5: USDm arrives (blind receive settles only after the wallet refreshes)
    if (usdmAssetId) {
      const finalUsdm = await pollUsdmBalance(account, usdmAssetId, baselineUsdm);
      console.log(`[5] USDm balance: ${baselineUsdm} -> ${finalUsdm} base units.`);
    } else {
      console.log('[5] Wallet was blind to USDm; after this first transfer it should appear in listAssets on next sync. '
        + 'Re-run the script to exercise the witness-invoice path.');
    }

    const statusAfter = await getMetevoWalletStatus(account, usdmAssetId);
    console.log('[6] Final status:', JSON.stringify(statusAfter));
    console.log('\nE2E funding flow PASSED');
  } finally {
    const { shutdownMetevoWallet } = require('../src/services/metevo/wallet');
    await shutdownMetevoWallet(wallet);
  }
})().catch((err) => {
  console.error('\nE2E funding flow FAILED:', err.message);
  process.exit(1);
});
