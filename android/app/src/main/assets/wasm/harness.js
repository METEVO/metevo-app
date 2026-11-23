// Minimal browser entry used by E2E and manual DevTools driving.
//
// Goals:
//   - construct the SDK once (RlnWasmNode + RlnWasmWallet),
//   - bring the BDK wallet online against the regtest indexer,
//   - expose everything on `window.__sdk`,
//   - do *not* drive any flow (open/fund/pay) here — caller owns the flow.
//
// Wallet model:
//   - `?freshRuntime=1` → fresh runtime id AND fresh mnemonic (fully isolated per run).
//   - `?runtimeId=...&mnemonic=...` → explicit stable identity for restart-style tests.
//   - default → stable runtime id + mnemonic across reloads in the same tab.

import init, {
  RlnWasmSdk,
  RlnWasmNode,
  RlnWasmWallet,
  rgbGenerateKeysValue,
  rgbRestoreKeysValue,
} from "./pkg/rln_wasm_sdk.js";

const DEFAULT_INDEXER_URL = "http://192.168.1.147:3002";
const DEFAULT_NODE_PROXY_URL = "ws://192.168.1.147:3001";

function getQueryParam(name, fallback) {
  try {
    const u = new URL(window.location.href);
    const v = u.searchParams.get(name);
    return v && v.length > 0 ? v : fallback;
  } catch (_e) {
    return fallback;
  }
}

function setStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}

function buildWalletData(keys, runtimeId) {
  return {
    data_dir: `/tmp/rln_wasm_e2e_${runtimeId}`,
    bitcoin_network: "Regtest",
    database_type: "Sqlite",
    max_allocations_per_utxo: 5,
    account_xpub_vanilla: keys.account_xpub_vanilla,
    account_xpub_colored: keys.account_xpub_colored,
    mnemonic: keys.mnemonic,
    master_fingerprint: keys.master_fingerprint,
    vanilla_keychain: null,
    supported_schemas: ["Nia"],
  };
}


const MOBILE_HELPER = getQueryParam("helper", "http://192.168.1.147:3010");

function post(payload) {
  try {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  } catch (_e) {
    /* ignore */
  }
}

async function pump(node) {
  try { await node.chainSyncTickValue(); } catch (_e) { /* ignore */ }
  try { node.processNativeRuntimeQueueValue(); } catch (_e) { /* ignore */ }
}

// --- diagnostics -----------------------------------------------------------
// Every line is its own logcat entry. The WebView console is dropped in a
// release build (react-native-webview ignores console in non-debug builds), so
// lines travel over postMessage and the RN bridge logs them. logcat truncates
// near 4 KB, so an oversized payload is split into indexed lines
// (`wallet-diag:before:balances:0`), never truncated.
const DIAG_PREFIX = "[metevo-diag]";
const DIAG_MAX_BYTES = 3400;
const DIAG_CHUNK_CHARS = 600;

function diagBytes(text) {
  try { return new TextEncoder().encode(text).length; } catch (_e) { return text.length; }
}

/** Emits one labelled payload, splitting it if it would exceed the limit. */
function diagPost(label, text) {
  if (diagBytes(`${DIAG_PREFIX} ${label} ${text}`) <= DIAG_MAX_BYTES) {
    post({ step: "diag", line: `${DIAG_PREFIX} ${label} ${text}` });
    return;
  }
  for (let at = 0, part = 0; at < text.length; at += DIAG_CHUNK_CHARS, part += 1) {
    post({
      step: "diag",
      // Never emit a raw JSON fragment: each part is a complete JSON object.
      line: `${DIAG_PREFIX} ${label}:${part} ${JSON.stringify({
        part,
        value: text.slice(at, at + DIAG_CHUNK_CHARS),
      })}`,
    });
  }
}

/** One JSON value per line, descended into field by field until it fits. */
function diagField(label, value, depth = 0) {
  if (depth > 6) {
    post({
      step: "diag",
      line: `${DIAG_PREFIX} ${label} ${JSON.stringify({ truncated: true })}`,
    });
    return;
  }
  let json;
  try {
    json = JSON.stringify(value);
    if (json === undefined) json = JSON.stringify({ unserializable: String(value) });
  } catch (e) {
    json = JSON.stringify({ unserializable: String(e) });
  }
  const whole = `${DIAG_PREFIX} ${label} ${json}`;
  if (diagBytes(whole) <= DIAG_MAX_BYTES) {
    post({ step: "diag", line: whole });
    return;
  }
  if (Array.isArray(value) && value.length > 0) {
    let chunk = [];
    let part = 0;
    const flush = () => {
      if (chunk.length === 0) return;
      const current = chunk;
      chunk = [];
      try {
        // A single oversized element is descended into, never re-packed into
        // another one-element array (that recursed forever).
        if (current.length === 1) diagField(`${label}:${part}`, current[0], depth + 1);
        else diagField(`${label}:${part}`, current, depth + 1);
      } catch (_e) {
        /* one element must not discard its siblings */
      }
      part += 1;
    };
    for (const item of value) {
      chunk.push(item);
      let fits;
      try {
        fits = diagBytes(
          `${DIAG_PREFIX} ${label}:${part} ${JSON.stringify(chunk)}`,
        ) <= DIAG_MAX_BYTES;
      } catch (_e) {
        fits = false;
      }
      if (!fits) {
        chunk.pop();
        flush();
        chunk = [item];
      }
    }
    flush();
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      try {
        diagField(`${label}:${key}`, inner, depth + 1);
      } catch (_e) {
        /* one field must not discard its siblings */
      }
    }
    return;
  }
  diagPost(label, json);
}

/** One JSON object per line; too-big objects split per field, arrays per item. */
function diag(tag, payload) {
  try {
    diagField(tag, payload);
  } catch (_e) {
    /* diagnostics must never break a wallet call */
  }
}

function parseValue(raw) {
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

function diagAssetRows(parsed) {
  return [...((parsed && parsed.nia) || []), ...((parsed && parsed.ifa) || [])];
}

function diagTransferRows(parsed) {
  const rows = (parsed && parsed.transfers) || parsed || [];
  return (Array.isArray(rows) ? rows : []).map((t) => ({
    idx: t.idx ?? null,
    kind: t.kind ?? null,
    status: t.status ?? null,
    value: (t.requested_assignment && t.requested_assignment.value) ?? t.amount ?? null,
  }));
}

function diagHighestIdx(rows) {
  return rows.reduce((top, t) => (typeof t.idx === "number" && t.idx > top ? t.idx : top), -1);
}

/**
 * The wallet's own view of balances and transfers. Must run inside
 * withWallet: rgb-lib panics on overlapping calls.
 */
async function walletDiagSnapshot(phase) {
  const s = window.__sdk;
  const stored = localStorage.getItem("metevo.usdm_asset_id");
  const assets = [];
  try {
    for (const a of diagAssetRows(parseValue(await s.wallet.listAssetsValue(["Nia", "Ifa"])))) {
      assets.push({
        id: String(a.asset_id || ""),
        ticker: a.ticker ?? null,
        supply: a.issued_supply ?? null,
      });
    }
  } catch (_e) { /* busy */ }

  const ids = [];
  if (stored) ids.push(stored);
  for (const a of assets) if (a.id && ids.indexOf(a.id) === -1) ids.push(a.id);

  const balances = [];
  for (const id of ids) {
    const row = { id, settled: null, future: null, spendable: null, balance: null };
    try {
      const bal = parseValue(await s.wallet.getAssetBalanceValue(id)) || {};
      row.balance = bal;
      row.settled = bal.settled ?? null;
      row.future = bal.future ?? null;
      row.spendable = bal.spendable ?? null;
    } catch (e) {
      row.balance = String(e);
    }
    balances.push(row);
  }

  const transfersByAsset = [];
  for (const id of ids) {
    const row = { id, highestIdx: null, transfers: [] };
    try {
      row.transfers = diagTransferRows(parseValue(await s.wallet.listTransfersValue(id)));
      row.highestIdx = diagHighestIdx(row.transfers);
    } catch (e) {
      row.transfers = String(e);
    }
    transfersByAsset.push(row);
  }

  let transfersAll = null;
  try {
    const rows = diagTransferRows(parseValue(await s.wallet.listTransfersValue(null)));
    transfersAll = { count: rows.length, highestIdx: diagHighestIdx(rows), rows };
  } catch (e) {
    transfersAll = String(e);
  }

  return { phase: phase ?? null, storedAssetId: stored, assets, balances, transfersAll, transfersByAsset };
}

/**
 * Launch identity and what the wallet actually holds. Emitted once the wallet
 * is online and again after the first completed chain-sync tick.
 */
async function emitLaunchState(trigger) {
  try {
    const s = window.__sdk;
    if (!s || !s.ready) return;
    const state = {
      trigger,
      runtimeId: s.runtimeId,
      runtimeIdSource,
      dataDir: s.dataDir,
      ...(coldLaunch ? { coldLaunch: true } : { reload: true }),
    };
    await withWallet(async () => {
      try {
        state.assets = diagAssetRows(parseValue(await s.wallet.listAssetsValue(["Nia", "Ifa"]))).map(
          (a) => ({ id: String(a.asset_id || ""), ticker: a.ticker ?? null }),
        );
      } catch (e) {
        state.assets = String(e);
      }
      try {
        const rows = diagTransferRows(parseValue(await s.wallet.listTransfersValue(null)));
        state.transfersAll = { count: rows.length, highestIdx: diagHighestIdx(rows), rows };
      } catch (e) {
        state.transfersAll = String(e);
      }
      state.transfersByAsset = [];
      for (const a of Array.isArray(state.assets) ? state.assets : []) {
        if (!a.id) continue;
        const row = { id: a.id, highestIdx: null, transfers: [] };
        try {
          row.transfers = diagTransferRows(parseValue(await s.wallet.listTransfersValue(a.id)));
          row.highestIdx = diagHighestIdx(row.transfers);
        } catch (e) {
          row.transfers = String(e);
        }
        state.transfersByAsset.push(row);
      }
    });
    diag("launch-state", state);
  } catch (_e) {
    /* diagnostics only */
  }
}

/** diag-full: snapshot, one real refresh, snapshot again. */
async function runDiagFull() {
  try {
    await withWallet(async () => diag("wallet-diag:before", await walletDiagSnapshot("before")));
  } catch (e) {
    diag("wallet-diag:before:error", String(e));
  }
  try {
    const s = window.__sdk;
    await withWallet(() => s.wallet.refreshValue(s.online, null, [], false));
  } catch (e) {
    diag("wallet-diag:refresh-error", String(e));
  }
  try {
    await withWallet(async () => diag("wallet-diag:after", await walletDiagSnapshot("after")));
  } catch (e) {
    diag("wallet-diag:after:error", String(e));
  }
}

// rgb-lib's wasm wallet holds a RefCell<Wallet>: overlapping calls panic the
// instance and every later call fails with "Error" (UTEXO rgb-lib-wasm #86,
// closed as by-design). One promise chain per wallet serialises everything.
let walletChain = Promise.resolve();
function withWallet(fn) {
  const run = walletChain.then(fn, fn);
  walletChain = run.catch(() => {});
  return run;
}

// Last successful wallet reads; the status poll falls back to these while a
// long flow (issueusdm, channel provisioning) holds the wallet.
let lastBtcSat = 0;
let lastUsdm = null;

function unwrapPubkey(info) {
  if (typeof info === "string") return info;
  return (info && info.pubkey) || null;
}

async function readWalletSnapshot(wallet, online) {
  // Settle pending RGB transfers when the wallet is idle; a long flow holds
  // the wallet and this throws "busy", which the callers treat as a miss.
  // skip_sync=true on the polling path: an Esplora rescan while an RGB
  // transfer is confirming makes the assignment look evicted
  // (e2e-test-wasm.js:571-575). The diagnostic path does one real sync.
  if (online) {
    try { await wallet.refreshValue(online, null, [], true); } catch (_e) { /* busy or nothing */ }
  }
  try {
    const bal = await wallet.getBtcBalanceValue();
    // BtcBalance = {vanilla:{settled,spendable}, colored:{...}}; colored sats
    // are pinned by allocations, so only vanilla is practically spendable.
    lastBtcSat = Number(
      (bal && bal.vanilla && (bal.vanilla.spendable ?? bal.vanilla.settled)) || 0,
    );
  } catch (_e) { /* keep last */ }
  const storedAsset = localStorage.getItem("metevo.usdm_asset_id");
  if (storedAsset) {
    try {
      const raw = await wallet.getAssetBalanceValue(storedAsset);
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed) lastUsdm = parsed;
    } catch (_e) { /* keep last */ }
  }
  return { btcSpendableSat: lastBtcSat, usdm: lastUsdm };
}

// One background provisioning run at a time; the LSP performs the whole RGB
// bootstrap (asset, colorable UTXOs, channel open, asset push).
let openProvisionPromise = null;
// Last provisioning failure, surfaced in the status reply/Home attention card.
let provisionError = null;
// Tick counter for the throttled wallet diagnostics.
let statusTick = 0;
// Last runtime-event summary emitted on its own [metevo-diag] line.
let lastRuntimeDiag = null;
// Launch identity, filled in by main() before the first diagnostic.
let runtimeIdSource = null;
let coldLaunch = true;

// Safe helper call for the provisioning loop (never throws).
async function callHelperSafe(path, body) {
  const r = await helperFetch(`${MOBILE_HELPER}${path}`, body ? {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  } : undefined);
  return r.json();
}

// RGB consignment transport: same LAN host as the helper, proxy port 3005.
const RGB_PROXY = `rpc://${new URL(MOBILE_HELPER).hostname}:3005/json-rpc`;

// Device side of reference flow4: one blind RGB invoice, then POST
// /lsp/bootstrap. The LSP issues/funds/opens and delivers the asset.
async function blindRecipientId(s, node) {
  try { await node.connectPeer("127.0.0.1:9802", (await (await helperFetch(`${MOBILE_HELPER}/lspinfo`)).json()).pubkey); } catch (_e) { /* already connected */ }
  // rgb-lib needs one on-chain UTXO to witness a blind receive invoice; a
  // freshly registered wallet has none, and the LSP provisions the channel,
  // not the device wallet, so ask the helper for the seed UTXO.
  await withWallet(async () => {
    const spendable = (b) => Number((b && b.vanilla && (b.vanilla.spendable ?? b.vanilla.settled)) || 0);
    let bal = null;
    try { bal = await s.wallet.getBtcBalanceValue(); } catch (_e) { /* fresh: unfunded */ }
    if (spendable(bal) >= 20000) return;
    let address = null;
    for (let a = 0; a < 10 && !address; a += 1) {
      try { address = await s.wallet.getAddress(); } catch (_e) { await new Promise((r) => setTimeout(r, 1000)); }
    }
    if (!address) throw new Error("could not get a funding address: wallet busy");
    setStatus("witness UTXO");
    const fund = await helperFetch(`${MOBILE_HELPER}/fund`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, btc: 0.0005 }),
    });
    if (!fund.ok) throw new Error(`fund failed: ${await fund.text()}`);
    for (let i = 0; i < 90; i += 1) {
      try { await s.wallet.syncOnline(s.online); } catch (_e) { /* retry */ }
      try { bal = await s.wallet.getBtcBalanceValue(); } catch (_e) { /* retry */ }
      if (spendable(bal) >= 20000) return;
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("the witness UTXO never appeared on the device wallet");
  });
  return withWallet(async () => {
    setStatus("blind RGB invoice");
    const makeInvoice = async () => {
      const inv = await s.wallet.blindReceiveValue(null, "Any", null, [RGB_PROXY], 1);
      const data = typeof inv === "string" ? JSON.parse(inv) : inv;
      const recipientId = data.recipient_id || data.recipientId || (data.invoice && data.invoice.recipient_id);
      if (!recipientId) throw new Error(`no recipient id: ${JSON.stringify(data).slice(0, 240)}`);
      return recipientId;
    };
    try {
      return await makeInvoice();
    } catch (e) {
      // rgb-lib wants a colorable UTXO (an allocation) to witness the
      // invoice; the funded seed UTXO is not allocated until we ask.
      if (!/allocation/i.test(String(e))) throw e;
      setStatus("colorable UTXO");
      const begin = await s.wallet.createUtxosBegin(s.online, false, 1, 20000, 1n, false);
      const signed = s.wallet.signPsbtValue(begin);
      await s.wallet.createUtxosEnd(s.online, signed, false);
      try {
        await helperFetch(`${MOBILE_HELPER}/mine`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ blocks: 2 }),
        });
      } catch (_e) { /* retry sync below */ }
      for (let i = 0; i < 30; i += 1) {
        try { await s.wallet.syncOnline(s.online); } catch (_e) { /* retry */ }
        await new Promise((r) => setTimeout(r, 1000));
      }
      return makeInvoice();
    }
  });
}

async function provisionChannel(s) {
  const node = s.node;
  provisionError = null;
  const info = await (await helperFetch(`${MOBILE_HELPER}/lspinfo`)).json();

  await node.connectPeer("127.0.0.1:9802", info.pubkey).catch(() => {});

  const liveInfo = JSON.parse(node.nodePubkeyJson());
  const livePubkey = typeof liveInfo === "string" ? liveInfo : liveInfo.pubkey;
  let seen = false;
  for (let i = 0; i < 120; i += 1) {
    await pump(node);
    try {
      const peers = await (await helperFetch(`${MOBILE_HELPER}/lsp/peers`)).json();
      seen = (peers.peers || []).some(
        (p) => String(p.pubkey || "").toLowerCase() === String(livePubkey).toLowerCase(),
      );
      if (seen) break;
    } catch (_e) { /* retry */ }
    if (i % 20 === 19) {
      void node.connectPeer("127.0.0.1:9802", info.pubkey).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!seen) throw new Error("the LSP never listed this node as a peer");

  // Reference flow4: the device only creates a blind RGB invoice. Everything
  // else — USDM issuance, colorable UTXOs, the RGB channel, the sats/asset
  // push — happens on the LSP.
  const recipientId = await blindRecipientId(s, node);
  post({ step: "blind-invoice", recipientId });

  let assetId = localStorage.getItem("metevo.usdm_asset_id");
  // Deliver the asset again only when this wallet has no settled USDM (fresh
  // install or reset wallet DB); a retry with balance already present skips it.
  let deliver = true;
  if (assetId) {
    try {
      const raw = await withWallet(() => s.wallet.getAssetBalanceValue(assetId));
      const cached = typeof raw === "string" ? JSON.parse(raw) : raw;
      deliver = !(cached && Number(cached.settled || 0) > 0);
    } catch (_e) { deliver = true; }
  }
  try {
    setStatus("LSP bootstrap");
    const boot = await callHelperSafe("/lsp/bootstrap", {
      peer_pubkey_and_opt_addr: `${livePubkey}@127.0.0.1:9802`,
      recipient_id: recipientId,
      transport_endpoints: [RGB_PROXY],
      // The LSP opens the RGB channel too, but the phone cannot yet complete
      // an inbound channel handshake; deliver on-chain now (same asset, same
      // blind invoice) so the USDm balance lands.
      channel: false,
      ticker: "USDM",
      asset_id: assetId || null,
      deliver,
    });
    if (boot && boot.ok !== false && boot.asset_id) {
      assetId = boot.asset_id;
      localStorage.setItem("metevo.usdm_asset_id", assetId);
    }
    post({
      step: "bootstrap",
      ok: !(boot && boot.error),
      assetId: boot && boot.asset_id,
      temporaryChannelId: boot && boot.temporary_channel_id,
      channelStatus: boot && boot.channel && boot.channel.status,
      error: boot && boot.error,
    });
  } catch (e) {
    // A bridge timeout is not a failure: the LSP keeps opening the channel.
    // The poll below is the real success signal.
    post({ step: "bootstrap-pending", error: String(e) });
  }

  // Reference waitForChannelToBeUsable: chainSyncTick + driveRgbFundingWork
  // every tick; mine every 3rd tick; wallet sync/refresh every few ticks.
  const deadline = Date.now() + 10 * 60 * 1000;
  for (let i = 0; Date.now() < deadline; i += 1) {
    await pump(node);
    await withWallet(async () => {
      try { await node.driveRgbFundingWork(); } catch (_e) { /* ignore */ }
    });
    if (i % 3 === 2) {
      try { await callHelperSafe("/mine", { blocks: 1 }); } catch (_e) { /* ignore */ }
    }
    if (i % 6 === 5) {
      await withWallet(async () => {
        try { await s.wallet.syncOnline(s.online); } catch (_e) { /* ignore */ }
        try { await s.wallet.refreshValue(s.online, null, [], false); } catch (_e) { /* ignore */ }
      });
    }
    if (i % 40 === 39) {
      try {
        const peers = await (await helperFetch(`${MOBILE_HELPER}/lsp/peers`)).json();
        const stillThere = (peers.peers || []).some(
          (p) => String(p.pubkey || "").toLowerCase() === String(livePubkey).toLowerCase(),
        );
        if (!stillThere) {
          void node.connectPeer("127.0.0.1:9802", info.pubkey).catch(() => {});
        }
      } catch (_e) { /* retry */ }
    }
    // Self-heal a bootstrap that returned 502 (channel still Opening): the
    // helper's reuse path opens nothing new and delivers once it is Opened.
    if (i > 0 && i % 60 === 0) {
      try {
        await callHelperSafe("/lsp/bootstrap", {
          peer_pubkey_and_opt_addr: `${livePubkey}@127.0.0.1:9802`,
          recipient_id: recipientId,
          transport_endpoints: [RGB_PROXY],
          channel: false,
          ticker: "USDM",
          asset_id: assetId || null,
          deliver: true,
        });
      } catch (_e) { /* next tick */ }
    }
    const channels = JSON.parse(node.listChannelsJson());
    const peerChannels = (channels || []).filter(
      (c) => String(c.peer_pubkey || "").toLowerCase() === String(info.pubkey || "").toLowerCase(),
    );
    // Prefer the channel row's asset id whenever it differs: the local id can
    // be missing (bridge timeout) or stale from another regtest chain.
    const assetRow = peerChannels.find((c) => c.asset_id);
    if (assetRow && assetRow.asset_id !== assetId) {
      assetId = assetRow.asset_id;
      localStorage.setItem("metevo.usdm_asset_id", assetId);
    }
    const channel = peerChannels.find((c) => c.is_usable === true);
    if (channel) {
      provisionError = null;
      post({ step: "channel-ready", channel, assetId });
      return;
    }
    if (assetId) {
      let balance = null;
      try {
        const raw = await withWallet(() => s.wallet.getAssetBalanceValue(assetId));
        balance = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (_e) { /* busy or not settled yet */ }
      // settled === 0 (or no balance yet) is a miss, keep polling.
      if (balance && Number(balance.settled || 0) > 0) {
        provisionError = null;
        post({ step: "channel-ready", channel: null, assetId, balance });
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  provisionError = "the LSP bootstrap never produced a usable channel";
  throw new Error(provisionError);
}

window.__metevoDispatch = async (raw) => {
  const req = typeof raw === "string" ? JSON.parse(raw) : raw;
  const s = window.__sdk;
  const reply = (result, error) =>
    window.ReactNativeWebView &&
    window.ReactNativeWebView.postMessage(JSON.stringify({ id: req.id, result, error }));
  try {
    if (req.method === "hasWallet") {
      reply(Boolean(localStorage.getItem("rln_wasm_e2e_mnemonic")));
      return;
    }
    if (!s || !s.ready) throw new Error("the on-device node is not ready yet");
    const node = s.node;
    switch (req.method) {
      case "create":
        reply({ ok: true, pubkey: JSON.parse(node.nodePubkeyJson()).pubkey });
        return;
      case "open": {
        // Provisioning always runs: a reset wallet DB must receive the asset
        // again, and the bootstrap decides whether on-chain delivery is needed.
        // The reply stays fast; provisioning continues in the background.
        const existing = JSON.parse(node.listChannelsJson());
        if (openProvisionPromise === null) {
          openProvisionPromise = provisionChannel(s)
            .catch((e) => {
              provisionError = e && e.message ? e.message : String(e);
              post({ step: "error", error: provisionError });
              setStatus(`provisioning failed: ${provisionError}`);
            })
            .finally(() => {
              openProvisionPromise = null;
            });
        }
        reply({ ok: true, channel: null, pendingChannel: true, channels: existing });
        return;
      }
      case "status": {
        const channels = JSON.parse(node.listChannelsJson());
        const snap = await withWallet(() => readWalletSnapshot(s.wallet, s.online));
        // Drive the RGB funding work on every status tick — this is what
        // processes the inbound virtual-channel open/funding on the device
        // (reference e2e-test-wasm-wdk.js waitForChannelToBeUsable does
        // chainSyncTick + driveRgbFundingWork each tick).
        await withWallet(async () => {
          try { await node.driveRgbFundingWork(); } catch (_e) { /* ignore */ }
        });
        try { node.processNativeRuntimeQueueValue(); } catch (_e) { /* ignore */ }
        // The LSP pushes the bootstrap USDM into the channel's responder
        // side — this node — so RLN reports it as asset_local_amount here
        // (openchannel_push_asset_amount integration test: responder local
        // == push_asset_amount). The channel row is authoritative once it
        // exists.
        const assetChannel = (channels || []).find((c) => c.asset_id != null) || null;
        // Diagnostic: what the device's rgb-lib actually holds (assets and
        // transfer states), so a missing delivery is visible off-device.
        let assets = null;
        let assetRows = [];
        let transfers = null;
        try {
          const rawAssets = await withWallet(() => s.wallet.listAssetsValue(["Nia", "Ifa"]));
          const parsed = typeof rawAssets === "string" ? JSON.parse(rawAssets) : rawAssets;
          assetRows = [...((parsed && parsed.nia) || []), ...((parsed && parsed.ifa) || [])];
          assets = assetRows.map((a) => ({ id: String(a.asset_id || "").slice(0, 16), ticker: a.ticker, supply: a.issued_supply }));
        } catch (_e) { /* busy */ }
        // Asset-id drift: the LSP issued several USDM assets over successive
        // attempts, so localStorage can point at an id this wallet no longer
        // holds. Query every listed USDM asset and adopt the one with a balance.
        let usdmBalance = null;
        try {
          for (const row of assetRows) {
            if (String(row.ticker || "").toUpperCase() !== "USDM") continue;
            const id = String(row.asset_id || "");
            if (!id) continue;
            let bal = null;
            try { bal = await withWallet(() => s.wallet.getAssetBalanceValue(id)); } catch (_e) { continue; }
            if (bal && Number(bal.settled || 0) > 0) {
              usdmBalance = bal;
              if (localStorage.getItem("metevo.usdm_asset_id") !== id) {
                localStorage.setItem("metevo.usdm_asset_id", id);
                post({ step: "asset-adopted", assetId: id, settled: bal.settled });
              }
              break;
            }
          }
        } catch (_e) { /* busy */ }
        try {
          const rawTransfers = await withWallet(() => s.wallet.listTransfersValue(null));
          const parsed = typeof rawTransfers === "string" ? JSON.parse(rawTransfers) : rawTransfers;
          const rows = (parsed && parsed.transfers) || parsed || [];
          transfers = rows.slice(-6).map((t) => ({
            idx: t.idx, kind: t.kind, status: t.status,
            value: t.requested_assignment && t.requested_assignment.value,
          }));
        } catch (_e) { /* busy */ }
        // The LSP now funds the channel (push_msat) and holds the asset side;
        // there is no device-side pending funding request any more.
        const pendingFunding = [];
        // Runtime events stay out of the 5 s ping: they overflow one logcat
        // entry, so they get their own line and only when they changed.
        try {
          const parsed = parseValue(node.listRuntimeEventsJson());
          const events = (parsed && parsed.events) || parsed || [];
          const rows = (Array.isArray(events) ? events : []).slice(-6).map((e) => ({
            seq: e.seq ?? e.idx ?? null,
            sources: e.sources ?? e.source ?? null,
            kind: e.event_kind ?? e.kind ?? null,
            status: e.status ?? null,
            applied: e.applied ?? null,
            error: e.error ?? null,
          }));
          const summary = JSON.stringify(rows);
          if (summary !== lastRuntimeDiag) {
            lastRuntimeDiag = summary;
            diag("runtime-events", { count: Array.isArray(events) ? events.length : null, rows });
          }
        } catch (_e) { /* ignore */ }
        // Over lightning this node's local asset amount is 0 until it receives
        // an RGB payment, so fall back to the on-chain delivered balance.
        const channelAssetAmount = assetChannel
          ? Number(assetChannel.asset_local_amount || 0)
          : 0;
        // Balance-accounting diagnostics (docs/superpowers/2026-11-22-balance-accounting-issue.md).
        // Probe cadence is unchanged (every 12th tick, offset 5) and the probe
        // still does one real (skip_sync=false) refresh before reading.
        statusTick += 1;
        if (statusTick % 12 === 5) {
          try {
            const stored = localStorage.getItem("metevo.usdm_asset_id");
            if (stored) {
              try { await withWallet(() => s.wallet.refreshValue(s.online, stored, [], false)); } catch (_e) { /* busy */ }
            }
            let sync = null;
            try { sync = node.chainSyncStatusValue(); } catch (e) { sync = String(e); }
            let unspents = null;
            try { unspents = await withWallet(() => s.wallet.listUnspentsValue(true)); } catch (e) { unspents = String(e); }
            let backup = null;
            try { backup = s.wallet.backupInfo(); } catch (e) { backup = String(e); }
            const snapshot = await withWallet(() => walletDiagSnapshot(null));
            diag("wallet-diag", { sync, backup, unspents, ...snapshot });
          } catch (_e) { /* diagnostics must never break the status reply */ }
        }
        reply({
          nodePubkey: unwrapPubkey(JSON.parse(node.nodePubkeyJson())),
          btcSpendableSat: snap.btcSpendableSat,
          balanceUsdmBaseUnits: channelAssetAmount > 0
            ? channelAssetAmount
            : usdmBalance ? Number(usdmBalance.settled ?? 0)
              : snap.usdm ? Number(snap.usdm.settled ?? 0) : (assetChannel ? 0 : null),
          // "Ready" for the UI = the gift is accounted for, or an LDK channel is
          // usable. With the LSP-driven on-chain delivery there is no channel on
          // the phone, so a channel-only check would leave the app on
          // "Opening your USDm channel…" forever.
          channelReady: (channels || []).some((c) => c.is_usable === true || c.ready === true)
            || channelAssetAmount > 0
            || Number((usdmBalance && usdmBalance.settled) || (snap.usdm && snap.usdm.settled) || 0) > 0,
          provisionError,
          pendingFunding,
          channels: (channels || []).map((c) => ({
            id: String(c.channel_id || "").slice(0, 12),
            peer: String(c.peer_pubkey || "").slice(0, 12),
            status: c.status || null,
            asset: c.asset_id ? String(c.asset_id).slice(0, 16) : null,
            local: c.asset_local_amount ?? null,
            usable: c.is_usable === true,
          })),
          assets,
          transfers,
        });
        return;
      }
      case "send": {
        const payment = JSON.parse(node.sendPaymentLiveJson(req.params.invoice));
        reply({ paymentHash: payment.payment_hash ?? null });
        return;
      }
      case "check": {
        let status = "unknown";
        try {
          const raw = await node.livePaymentValue(req.params.paymentHash);
          const pay = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (pay && pay.status === "succeeded") status = "settled";
          else if (pay && pay.status === "failed") status = "failed";
          else if (pay) status = "pending";
        } catch (_e) {
          const payments = JSON.parse(node.listPaymentsJson());
          const match = (payments || []).find((p) => p.payment_hash === req.params.paymentHash);
          if (match) {
            status = match.status === "succeeded" ? "settled"
              : match.status === "failed" ? "failed" : "pending";
          }
        }
        reply(status);
        return;
      }
      case "decode":
        reply(JSON.parse(node.decodeLnInvoiceJson(req.params.invoice)));
        return;
      case "invoice": {
        const amount = req.params.amountBaseUnits;
        const msat = amount === null ? null : BigInt(Math.max(1, Math.round(Number(amount) / 100)));
        const invoice = await node.createLnInvoiceLiveValue(msat, 3600, null, null);
        const data = typeof invoice === "string" ? JSON.parse(invoice) : invoice;
        reply({ invoice: data.invoice ?? data, paymentHash: data.payment_hash ?? null });
        return;
      }
      case "transfers": {
        // Debug: dump the device rgb-lib transfer states (handoff R5).
        let list = null;
        try {
          const raw = await withWallet(() => s.wallet.listTransfersValue(req.params && req.params.assetId ? req.params.assetId : null));
          list = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch (_e) {
          list = `error: ${String(_e)}`;
        }
        reply(list);
        return;
      }
      case "hasChannel": {
        const channels = JSON.parse(node.listChannelsJson());
        const peer = String(req.params.peerPubkey || "").toLowerCase();
        reply(
          (channels || []).some(
            (c) =>
              String(c.peer_pubkey || "").toLowerCase() === peer &&
              (c.is_usable === true || c.ready === true),
          ),
        );
        return;
      }
      case "connect": {
        const uri = String(req.params.peerUri || "");
        const at = uri.indexOf("@");
        if (at === -1) throw new Error("peer URI must be pubkey@host:port");
        await node.connectPeer(uri.slice(at + 1), uri.slice(0, at));
        reply({ ok: true });
        return;
      }
      case "shutdown":
        try { node.persistLdkRuntimeState(); } catch (_e) { /* best-effort */ }
        reply({ ok: true });
        return;
      case "issueusdm": {
        // No device-side RGB provisioning: one blind invoice, one LSP
        // bootstrap (reference flow4 — the LSP issues, allocates, opens the
        // RGB channel and delivers the asset to this recipient id).
        const info = await (await helperFetch(`${MOBILE_HELPER}/lspinfo`)).json();
        await node.connectPeer("127.0.0.1:9802", info.pubkey).catch(() => {});
        const liveInfo = JSON.parse(node.nodePubkeyJson());
        const livePubkey = typeof liveInfo === "string" ? liveInfo : liveInfo.pubkey;

        const recipientId = await blindRecipientId(s, node);

        let assetId = localStorage.getItem("metevo.usdm_asset_id");
        try {
          setStatus("LSP bootstrap");
          const boot = await callHelperSafe("/lsp/bootstrap", {
            peer_pubkey_and_opt_addr: `${livePubkey}@127.0.0.1:9802`,
            recipient_id: recipientId,
            transport_endpoints: [RGB_PROXY],
            channel: false,
            ticker: "USDM",
            asset_id: localStorage.getItem("metevo.usdm_asset_id"),
            deliver: true,
          });
          if (boot && boot.error) throw new Error(`LSP bootstrap failed: ${boot.error}`);
          if (boot && boot.ok !== false && boot.asset_id) {
            assetId = boot.asset_id;
            localStorage.setItem("metevo.usdm_asset_id", assetId);
          }
        } catch (e) {
          // A 60 s bridge timeout (or a 502 while RLN finishes) must not end
          // the flow: the balance poll below is the real result.
          post({ step: "bootstrap-pending", error: String(e) });
        }
        if (!assetId) {
          const rows = JSON.parse(node.listChannelsJson()) || [];
          const row = rows.find(
            (c) => c.asset_id && String(c.peer_pubkey || "").toLowerCase() === String(info.pubkey || "").toLowerCase(),
          );
          if (row) {
            assetId = row.asset_id;
            localStorage.setItem("metevo.usdm_asset_id", assetId);
          }
        }
        if (!assetId) throw new Error("LSP bootstrap returned no asset id");

        setStatus("waiting for USDm");
        let balance = null;
        for (let i = 0; i < 120; i += 1) {
          await withWallet(async () => {
            try { await node.driveRgbFundingWork(); } catch (_e) { /* ignore */ }
          });
          try {
            balance = await withWallet(async () => {
              try { await s.wallet.refreshValue(s.online, null, [], false); } catch (_e) { /* not ready */ }
              const raw = await s.wallet.getAssetBalanceValue(assetId);
              return typeof raw === "string" ? JSON.parse(raw) : raw;
            });
          } catch (_e) { /* busy: retry */ }
          if (balance && Number(balance.settled || 0) > 0) break;
          if (i % 5 === 4) {
            try { await callHelperSafe("/mine", { blocks: 1 }); } catch (_e) { /* ignore */ }
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
        setStatus(`usdm balance ${JSON.stringify(balance || null)}`);
        reply({ ok: true, assetId, balance: balance || null });
        return;
      }
      case "selftest": {
        const result = await withWallet(async () => {
          // Self-heal: the gateway peer session can die while the app is
          // stopped and nothing reconnects it on its own.
          try {
            const rawPeers = await node.listPeersValue();
            const peers = typeof rawPeers === "string" ? JSON.parse(rawPeers) : rawPeers;
            if (!Array.isArray(peers) || peers.length === 0) {
              const info = await (await helperFetch(`${MOBILE_HELPER}/lspinfo`)).json();
              await node.connectPeer("127.0.0.1:9802", info.pubkey);
              for (let w = 0; w < 20; w += 1) {
                await pump(node);
                const chans = JSON.parse(node.listChannelsJson());
                if ((chans || []).some((c) => c.is_usable === true)) break;
                await new Promise((r) => setTimeout(r, 500));
              }
            }
          } catch (_e) { /* fall through to the normal flow */ }

          const usable = JSON.parse(node.listChannelsJson());
          if (!(usable || []).some((c) => c.is_usable === true)) {
            throw new Error("no usable channel yet");
          }

          const info = await (await helperFetch(`${MOBILE_HELPER}/lspinfo`)).json();
          const liveInfo = JSON.parse(node.nodePubkeyJson());
          const livePubkey = typeof liveInfo === "string" ? liveInfo : liveInfo.pubkey;

          // Outbound: device -> LSP keysend; must actually reach "succeeded".
          // Live model: a real keysend is accounted by the ChannelManager, the
          // parity ledger never records it (handoff L4).
          const sent = JSON.parse(node.keysendLiveJson(info.pubkey, 3000000n, undefined, undefined));
          const readLivePayments = async () => {
            const raw = await node.livePaymentsValue();
            const list = typeof raw === "string" ? JSON.parse(raw) : raw;
            return Array.isArray(list) ? list : [];
          };
          let sentOk = false;
          for (let i = 0; i < 240; i += 1) {
            await pump(node);
            try {
              const match = (await readLivePayments()).find(
                (p) => p.payment_hash === sent.payment_hash && p.status === "succeeded",
              );
              if (match) { sentOk = true; break; }
              const failed = (await readLivePayments()).find(
                (p) => p.payment_hash === sent.payment_hash && p.status === "failed",
              );
              if (failed) break;
            } catch (_e) { /* retry */ }
            await new Promise((r) => setTimeout(r, 500));
          }

          // Inbound: LSP -> device keysend; wait for the device to see it settled.
          let receivedOk = false;
          let receivedHash = null;
          if (sentOk) {
            const resp = await helperFetch(`${MOBILE_HELPER}/lsp/keysend`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ dest_pubkey: livePubkey, amt_msat: 3000000 }),
            });
            if (resp.ok) {
              const payload = await resp.json();
              receivedHash = payload.payment_hash ?? null;
            }
            for (let i = 0; i < 240; i += 1) {
              await pump(node);
              try {
                const match = (await readLivePayments()).find(
                  (p) =>
                    p.status === "succeeded" &&
                    p.payment_hash !== sent.payment_hash &&
                    (receivedHash === null || p.payment_hash === receivedHash),
                );
                if (match) { receivedOk = true; receivedHash = match.payment_hash; break; }
              } catch (_e) { /* retry */ }
              await new Promise((r) => setTimeout(r, 500));
            }
          }

          return { ok: sentOk && receivedOk, sentOk, sent: sent.payment_hash, receivedOk, received: receivedHash };
        });
        reply(result);
        return;
      }
      case "diagFull": {
        // Long-press on the balance card. Reply at once and run the probes on
        // the wallet chain: a diag failure must never reach the app flow.
        reply({ ok: true });
        void runDiagFull();
        return;
      }
      default:
        throw new Error(`unsupported method ${req.method}`);
    }
  } catch (error) {
    reply(undefined, String(error));
  }
};


// LAN helper calls go through the RN bridge: file:// pages cannot fetch
// cross-origin, and React Native's fetch has no such restriction.
let helperSeq = 0;
const helperPending = new Map();
window.__metevoHelperResult = (d) => {
  try {
    if (d && d.id && helperPending.has(d.id)) {
      const resolve = helperPending.get(d.id);
      helperPending.delete(d.id);
      resolve(d.result);
    }
  } catch (_e) { /* ignore */ }
};

async function helperFetch(url, opts) {
  return new Promise((resolve, reject) => {
    const id = Date.now() * 1000 + (++helperSeq);
    helperPending.set(id, (result) => {
      resolve({
        ok: !result.error,
        status: result.status ?? (result.error ? 400 : 200),
        text: () => Promise.resolve(JSON.stringify(result)),
        json: () => Promise.resolve(result),
      });
    });
    window.ReactNativeWebView &&
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ helper: url.replace(MOBILE_HELPER, ""), id, body: opts && opts.body ? JSON.parse(opts.body) : null }),
      );
    setTimeout(() => {
      if (helperPending.has(id)) {
        helperPending.delete(id);
        reject(new Error("helper fetch timed out"));
      }
    }, 60_000);
  });
}

(async function main() {
  try {
    setStatus("wasm init");
    const wasmBytes = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "./pkg/rln_wasm_sdk_bg.wasm");
      xhr.responseType = "arraybuffer";
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error("could not read the wasm bundle"));
      xhr.send();
    });
    await init(wasmBytes);
    setStatus("wasm ready");

    const wantFresh = getQueryParam("freshRuntime", "") === "1";
    // Cold launch vs WebView reload: the marker survives a reload of the page
    // but not a new app session.
    try {
      coldLaunch = sessionStorage.getItem("metevo.launch.marker") === null;
      sessionStorage.setItem("metevo.launch.marker", new Date().toISOString());
    } catch (_e) { /* storage disabled: report a cold launch */ }
    let rid;
    let mnemonic;
    const explicitRuntimeId = getQueryParam("runtimeId", "");
    const explicitMnemonic = getQueryParam("mnemonic", "");
    if (explicitRuntimeId && explicitMnemonic) {
      rid = explicitRuntimeId;
      mnemonic = explicitMnemonic;
      localStorage.setItem("rln_wasm_runtime_id", rid);
      localStorage.setItem("rln_wasm_e2e_mnemonic", mnemonic);
      runtimeIdSource = "explicit";
    } else if (wantFresh) {
      rid = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
      mnemonic = rgbGenerateKeysValue("regtest").mnemonic;
      runtimeIdSource = "fresh";
    } else {
      rid = localStorage.getItem("rln_wasm_runtime_id");
      if (!rid) {
        rid = Math.random().toString(16).slice(2);
        localStorage.setItem("rln_wasm_runtime_id", rid);
        runtimeIdSource = "generated";
      } else {
        runtimeIdSource = "localStorage";
      }
      mnemonic = localStorage.getItem("rln_wasm_e2e_mnemonic");
      if (!mnemonic) {
        mnemonic = rgbGenerateKeysValue("regtest").mnemonic;
        localStorage.setItem("rln_wasm_e2e_mnemonic", mnemonic);
      }
    }

    const sdk = new RlnWasmSdk();
    const password = "rln-wasm-e2e";
    await sdk.initValue(password, mnemonic);
    await sdk.unlock(JSON.stringify({ password })); setStatus("sdk unlocked");

    const baseProxyUrl = getQueryParam("nodeProxyUrl", DEFAULT_NODE_PROXY_URL);
    const indexerUrl = getQueryParam("indexerUrl", DEFAULT_INDEXER_URL);
    const nodeProxyUrl = baseProxyUrl.split("#runtime:")[0];

    const node = RlnWasmNode.newWithNodeRuntimeId(nodeProxyUrl, rid, "Regtest");
    // No installAutoPeerManagerHooks(): the reference flows never install it,
    // and it intercepts inbound peer payloads before LDK sees channel messages
    // (the device never answered the LSP's OpenChannel with it installed).
    node.chainSyncStartValue(indexerUrl, 5000);
    try {
      node.reconnectManagerStartValue();
    } catch (_e) {
      /* optional */
    }

    const keys = rgbRestoreKeysValue("regtest", mnemonic);
    const walletData = buildWalletData(keys, rid);
    const wallet = await RlnWasmWallet.create(JSON.stringify(walletData));
    const online = await wallet.goOnlineValue(true, indexerUrl); setStatus("wallet online");

    try {
      node.setEnableVirtualChannelsV0(true);
    } catch (_e) {
      /* older SDK */
    }
    if (typeof node.attachWallet === "function") {
      try { node.attachWallet(wallet); } catch (_e) { /* optional */ }
    }

    // Handoff L6: the SDK's own driver replaces the hand-rolled pump
    // (chain sync -> live LDK -> event drain -> channel reconcile).
    try {
      await sdk.preloadPersistentRuntimeState();
    } catch (_e) { /* optional */ }
    let autoDriveOn = false;
    try {
      node.autoDriveStartValue(400);
      autoDriveOn = true;
    } catch (_e) { /* older SDK: flows keep their manual pumps */ }
    post({ step: "auto-drive", autoDriveOn });

    // RGB-specific work the LN tick does not cover (handoff L6). Queued on
    // the wallet chain so it never overlaps a running flow.
    const rgbWork = () => {
      withWallet(async () => {
        try { await node.processPendingRgbTransactions(); } catch (_e) { /* ignore */ }
        try { await node.driveRgbFundingWork(); } catch (_e) { /* ignore */ }
      });
    };
    rgbWork();
    const rgbTimer = setInterval(rgbWork, 4000);

    const walletAddress = wallet.getAddress();

    Object.freeze(
      Object.assign((window.__sdk = {}), {
        node,
        wallet,
        online,
        walletAddress,
        mnemonic,
        runtimeId: rid,
        dataDir: walletData.data_dir,
        nodeProxyUrl,
        indexerUrl,
        ready: true,
        version: 1,
      })
    );

    const flushLdkState = () => {
      try {
        node.persistLdkRuntimeState();
      } catch (_e) {
        /* best-effort */
      }
    };
    window.addEventListener("pagehide", flushLdkState);
    window.addEventListener("beforeunload", flushLdkState);

    // A force-stop never fires pagehide/beforeunload, so the freshly
    // generated node keys must hit the persistent store now, not on page
    // exit — otherwise the next boot preloads nothing and the pubkey
    // rotates (preloadPersistentRuntimeState runs earlier, above).
    flushLdkState();
    // The keys are generated lazily once chain sync starts, so the boot
    // flush can still be too early; keep flushing until the state sticks.
    const flushTimer = setInterval(flushLdkState, 15000);
    window.addEventListener("pagehide", () => clearInterval(flushTimer));

    const pubkey = (JSON.parse(node.nodePubkeyJson()) || {}).pubkey || "?";
    setStatus(`ready · pubkey=${pubkey} · wallet=${walletAddress.slice(0, 18)}…`);
    post({ step: "ready", pubkey });

    // Diagnostics: wallet identity/state now that it is online, then again
    // after the first completed chain-sync tick. Never blocks or fails boot.
    void emitLaunchState("init");
    void (async () => {
      try { await node.chainSyncTickValue(); } catch (_e) { /* offline: keep going */ }
      void emitLaunchState("first-sync");
    })();

  } catch (err) {
    window.__sdk = { ready: false, error: String(err) };
    setStatus(`init failed: ${err}`);
    throw err;
  }
})();
