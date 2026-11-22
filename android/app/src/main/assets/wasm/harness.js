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

const DEFAULT_INDEXER_URL = "http://192.168.178.20:3002";
const DEFAULT_NODE_PROXY_URL = "ws://192.168.178.20:3001";

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


const MOBILE_HELPER = getQueryParam("helper", "http://192.168.178.20:3010");

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
  if (online) {
    try { await wallet.refreshValue(online, null, [], false); } catch (_e) { /* busy or nothing */ }
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

// One background provisioning run at a time; never opens a second virtual
// channel (the LSP rejects a second session for a peer pair and never prunes).
let openProvisionPromise = null;

async function provisionChannel(s) {
  const node = s.node;
  const info = await (await helperFetch(`${MOBILE_HELPER}/lspinfo`)).json();

  // Bootstrap funding (once per wallet): the LSP's channel open wants an
  // on-chain-funded counterparty and the sats card wants a non-zero balance.
  // The balance read IS the guard — a funded wallet never re-funds, and the
  // Go cron skips peers with an existing channel so provisioning itself
  // never re-runs for a funded wallet.
  await withWallet(async () => {
    const spendable = (b) =>
      Number((b && b.vanilla && (b.vanilla.spendable ?? b.vanilla.settled)) || 0);
    let bal = null;
    try {
      bal = await s.wallet.getBtcBalanceValue();
    } catch (_e) { /* busy or fresh: treat as unfunded */ }
    if (spendable(bal) >= 100000) return;
    let address = null;
    for (let a = 0; a < 10 && !address; a += 1) {
      try {
        address = await s.wallet.getAddress();
      } catch (_e) { /* busy: retry */ await new Promise((r) => setTimeout(r, 1000)); }
    }
    if (!address) throw new Error("could not get a funding address: wallet busy");
    const fund = await helperFetch(`${MOBILE_HELPER}/fund`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, btc: 0.01 }),
    });
    if (!fund.ok) throw new Error(`fund failed: ${await fund.text()}`);
    // The helper mines 6 confirmations after sending; sync until the wallet
    // sees the sats. Provisioning continues even if this times out — the
    // channel can converge first and the balance lands on a later sync.
    for (let i = 0; i < 60; i += 1) {
      try { await s.wallet.syncOnline(s.online); } catch (_e) { /* retry */ }
      try {
        bal = await s.wallet.getBtcBalanceValue();
      } catch (_e) { /* retry */ }
      if (spendable(bal) > 0) return;
      await new Promise((r) => setTimeout(r, 1000));
    }
  });

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

  // The Go METEVO LSP (port 8080) provisions the channel from its cron within
  // ~30 s of the peer appearing: 500k sats capacity, 250k sats push and the
  // bootstrap USDM asset push land in one virtual channel. The harness must
  // NOT self-open via /lsp/openvirtual: RLN allows one virtual channel session
  // per peer pair, and a sats-only self-open blocks the asset channel forever.
  for (let i = 0; i < 360; i += 1) {
    await pump(node);
    if (i % 6 === 5) {
      // Queued: background provisioning must not overlap a running flow.
      await withWallet(async () => {
        try { await s.wallet.syncOnline(s.online); } catch (_e) { /* ignore */ }
      });
    }
    if (i % 20 === 19) {
      // Keepalive: re-establish the peer session if the relay dropped it.
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
    const channels = JSON.parse(node.listChannelsJson());
    const channel = (channels || []).find(
      (c) => (c.is_usable === true || c.ready === true) && Number(c.inbound_balance_msat || 0) > 0,
    );
    if (channel) {
      post({ step: "channel-ready", channel });
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("the virtual channel never reported inbound liquidity");
}

async function runChannelFlow() {
  const s = window.__sdk;
  const node = s.node;

  setStatus("lsp info");
  const info = await (await helperFetch(`${MOBILE_HELPER}/lspinfo`)).json();
  post({ step: "lspinfo", pubkey: info.pubkey });

  setStatus("fund wallet");
  const fund = await helperFetch(`${MOBILE_HELPER}/fund`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: s.walletAddress, btc: 0.05 }),
  });
  if (!fund.ok) throw new Error(`fund failed: ${await fund.text()}`);
  post({ step: "funded" });

  for (let i = 0; i < 30; i += 1) {
    await pump(node);
    await new Promise((r) => setTimeout(r, 1000));
  }

  setStatus("connect peer");
  await node.connectPeer("127.0.0.1:9802", info.pubkey);
  post({ step: "peer-connected" });

  setStatus("open channel");
  node.openChannelJson(info.pubkey, BigInt(500000), false, undefined, undefined);

  let pending = null;
  for (let i = 0; i < 240; i += 1) {
    await pump(node);
    const list = JSON.parse(node.listPendingFundingRequestsJson());
    if (Array.isArray(list) && list.length > 0) { pending = list[0]; break; }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!pending) throw new Error("no pending funding request");
  post({ step: "pending-funding", pending });

  setStatus("build funding tx");
  const raw = await s.wallet.buildLightningFundingTxJson(
    s.online,
    pending.output_script_hex,
    BigInt(Number(pending.channel_value_satoshis)),
    2n,
  );
  const funding = JSON.parse(raw);
  node.submitFundingTransactionValue({
    temporary_channel_id: pending.temporary_channel_id,
    counterparty_node_id: pending.counterparty_node_id,
    funding_tx_hex: funding.funding_tx_hex,
  });
  post({ step: "funding-submitted", txid: funding.txid });

  setStatus("wait for mempool");
  for (let i = 0; i < 90; i += 1) {
    try {
      const st = await (await helperFetch(`${MOBILE_HELPER}/txstatus?txid=${funding.txid}`)).json();
      if (st.seen) break;
    } catch (_e) {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  setStatus("mine confirmations");
  await helperFetch(`${MOBILE_HELPER}/mine`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ blocks: 12 }),
  });

  let channel = null;
  for (let i = 0; i < 600; i += 1) {
    await pump(node);
    const list = JSON.parse(node.listChannelsJson());
    channel = (list || []).find(
      (c) => String(c.peer_pubkey || "").toLowerCase() === String(info.pubkey).toLowerCase(),
    );
    if (channel && (channel.ready === true || channel.is_usable === true || channel.status === "ready")) break;
    if (i === 120) {
      await helperFetch(`${MOBILE_HELPER}/mine`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blocks: 6 }),
      }).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!channel || !(channel.ready === true || channel.is_usable === true || channel.status === "ready")) {
    throw new Error(`channel not ready: ${JSON.stringify(channel)}`);
  }
  post({ step: "channel-ready", channel });

  setStatus("pay keysend");
  const payment = JSON.parse(node.keysendJson(info.pubkey, 3000000n, undefined, undefined));
  let settled = null;
  for (let i = 0; i < 300; i += 1) {
    await pump(node);
    const list = JSON.parse(node.listPaymentsJson());
    settled = (list || []).find(
      (p) => p.payment_hash === payment.payment_hash && p.status === "succeeded",
    );
    if (settled) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!settled) throw new Error(`payment not settled: ${JSON.stringify(payment)}`);

  setStatus(`CHANNEL+PAY OK ${payment.payment_hash.slice(0, 16)}…`);
  post({ step: "payment-succeeded", payment: settled });
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
        // Fast reply: node + wallet are online here. Channel provisioning
        // runs in the background so the UI never blocks for minutes.
        const quick = await withWallet(async () => {
          const existing = JSON.parse(node.listChannelsJson());
          const existingReady = (existing || []).find((c) => c.is_usable === true);
          if (existingReady) {
            // The persisted channel state can claim usable while the peer
            // session died (app was stopped). Re-establish the LSP session.
            try {
              const info = await (await helperFetch(`${MOBILE_HELPER}/lspinfo`)).json();
              void node.connectPeer("127.0.0.1:9802", info.pubkey).catch(() => {});
            } catch (_e) { /* best effort */ }
            return { ok: true, reused: true, channel: existingReady };
          }
          return { ok: true, channel: null, pendingChannel: true, channels: existing };
        });
        if (quick.pendingChannel && openProvisionPromise === null) {
          openProvisionPromise = provisionChannel(s).finally(() => {
            openProvisionPromise = null;
          });
        }
        reply(quick);
        return;
      }
      case "status": {
        const channels = JSON.parse(node.listChannelsJson());
        const snap = await readWalletSnapshot(s.wallet, s.online);
        // The LSP pushes the bootstrap USDM into the channel's responder
        // side — this node — so RLN reports it as asset_local_amount here
        // (openchannel_push_asset_amount integration test: responder local
        // == push_asset_amount). The channel row is authoritative once it
        // exists.
        const assetChannel = (channels || []).find((c) => c.asset_id != null) || null;
        reply({
          nodePubkey: unwrapPubkey(JSON.parse(node.nodePubkeyJson())),
          btcSpendableSat: snap.btcSpendableSat,
          balanceUsdmBaseUnits: assetChannel
            ? Number(assetChannel.asset_local_amount || 0)
            : snap.usdm ? Number(snap.usdm.settled ?? 0) : null,
          channelReady: (channels || []).some((c) => c.is_usable === true || c.ready === true),
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
          const raw = await s.wallet.listTransfersValue(req.params && req.params.assetId ? req.params.assetId : null);
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
        const callHelper = async (p, b) => {
          const r = await helperFetch(`${MOBILE_HELPER}${p}`, b ? {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(b),
          } : undefined);
          return r.json();
        };
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        // The queue serialises this behind `open`; no busy flag to poll.
        await withWallet(async () => {

        const cachedAsset = localStorage.getItem("metevo.usdm_asset_id");
        if (cachedAsset) {
          try {
            const cached = await s.wallet.getAssetBalanceValue(cachedAsset);
            if (cached && Number(cached.settled || 0) > 0) {
              reply({ ok: true, assetId: cachedAsset, balance: cached, cached: true });
              return;
            }
          } catch (_e) { /* issue fresh */ }
        }

        // Settle the previous run's transfer before issuing fresh: the LSP
        // broadcasts only after our ack and settles only on its own refresh.
        try { await callHelper("/lsp/refresh", {}); } catch (_e) { /* retry below */ }
        try { await callHelper("/mine", { blocks: 2 }); } catch (_e) { /* retry below */ }
        try { await callHelper("/lsp/refresh", {}); } catch (_e) { /* retry below */ }

        // Pull any consignment already waiting on the proxy before sending again.
        try {
          await s.wallet.refreshValue(s.online, null, [], false);
        } catch (_e) { /* nothing pending */ }
        if (cachedAsset) {
          try {
            const pulled = await s.wallet.getAssetBalanceValue(cachedAsset);
            if (pulled && Number(pulled.settled || 0) > 0) {
              reply({ ok: true, assetId: cachedAsset, balance: pulled, pulled: true });
              return;
            }
          } catch (_e) { /* continue */ }
        }

        setStatus("issuing USDm on the LSP");
        const issued = await callHelper("/lsp/issueusdm", {});
        const assetId = issued && issued.asset && issued.asset.asset_id;
        if (!assetId) throw new Error(`LSP issue failed: ${JSON.stringify(issued).slice(0, 240)}`);
        localStorage.setItem("metevo.usdm_asset_id", assetId);

        setStatus("funding device wallet");
        let bal = null;
        const btcSpendable = (b) =>
          Number((b && b.vanilla && (b.vanilla.spendable ?? b.vanilla.settled)) || 0);
        try {
          bal = await s.wallet.getBtcBalanceValue();
        } catch (_e) { /* busy: treat as unfunded and fund below */ }
        if (btcSpendable(bal) < 200000) {
          let address = null;
          for (let a = 0; a < 10 && !address; a += 1) {
            try {
              address = await s.wallet.getAddress();
            } catch (_e) { /* busy: retry */ await sleep(1000); }
          }
          if (!address) throw new Error("could not get a funding address: wallet busy");
          await callHelper("/fund", { address, btc: 0.01 });
          for (let i = 0; i < 90; i += 1) {
            try { await s.wallet.syncOnline(s.online); } catch (_e) { /* retry */ }
            try {
              bal = await s.wallet.getBtcBalanceValue();
            } catch (_e) { /* retry */ }
            if (btcSpendable(bal) > 0) break;
            await sleep(1000);
          }
        }

        setStatus("creating colored UTXOs");
        try {
          const begin = await s.wallet.createUtxosBegin(s.online, false, 4, 20000, 1n, false);
          const signed = s.wallet.signPsbtValue(begin);
          await s.wallet.createUtxosEnd(s.online, signed, false);
          await callHelper("/mine", { blocks: 2 });
          for (let i = 0; i < 30; i += 1) {
            try { await s.wallet.syncOnline(s.online); } catch (_e) { /* retry */ }
            await sleep(1000);
          }
        } catch (e) {
          console.log("[metevo] usdm utxo error", String(e));
          localStorage.setItem("metevo.usdm_utxo_error", String(e));
        }

        setStatus("creating blind receive invoice");
        const proxy = "rpc://192.168.178.20:3005/json-rpc";
        // One whole USDM in base units (precision 8); 100 base units would
        // render as 0.00 USDm on the balance card.
        const usdmUnit = 100000000;
        const attempts = [
          [null, "Any"],
          [null, { Any: {} }],
          [null, { type: "Any" }],
          [null, {}],
          [assetId, [{ amount: usdmUnit }]],
          [assetId, { Fungible: usdmUnit }],
        ];
        let invoiceData = null;
        const attemptErrors = [];
        for (const [asset, assignment] of attempts) {
          try {
            const inv = await s.wallet.blindReceiveValue(asset, assignment, null, [proxy], 1);
            invoiceData = typeof inv === "string" ? JSON.parse(inv) : inv;
            break;
          } catch (e) {
            attemptErrors.push(`${JSON.stringify(assignment)}: ${String(e)}`);
          }
        }
        console.log("[metevo] usdm invoice", JSON.stringify(invoiceData || attemptErrors).slice(0, 400));
        if (!invoiceData) throw new Error(`blindReceive failed: ${attemptErrors.join(" | ").slice(0, 400)}`);
        const recipientId = invoiceData.recipient_id || invoiceData.recipientId || (invoiceData.invoice && invoiceData.invoice.recipient_id);
        if (!recipientId) throw new Error(`no recipient id: ${JSON.stringify(invoiceData).slice(0, 240)}`);

        setStatus("LSP sends USDm on-chain");
        const sent = await callHelper("/lsp/sendrgb", {
          asset_id: assetId,
          amount: usdmUnit,
          recipient_id: recipientId,
          transport_endpoints: [proxy],
        });
        if (sent && sent.error) throw new Error(`sendrgb failed: ${sent.error}`);
        localStorage.setItem("metevo.usdm_send", JSON.stringify(sent).slice(0, 200));

        await callHelper("/mine", { blocks: 6 });
        await callHelper("/lsp/refresh", {});
        let balance = null;
        let refreshErrors = 0;
        for (let i = 0; i < 120; i += 1) {
          try { await node.chainSyncTickValue(); } catch (_e) { /* ignore */ }
          try { node.processNativeRuntimeQueueValue(); } catch (_e) { /* ignore */ }
          try { await s.wallet.syncOnline(s.online); } catch (_e) { /* ignore */ }
          try {
            await s.wallet.refreshValue(s.online, null, [], false);
          } catch (e) {
            if (refreshErrors < 3) {
              console.log("[metevo] rgb refresh error", String(e));
              refreshErrors += 1;
            }
          }
          // The LSP only broadcasts its witness tx after it sees our ack; it
          // checks during its own refresh. Mine so the witness can confirm.
          if (i % 5 === 2) {
            try { await callHelper("/lsp/refresh", {}); } catch (_e) { /* retry */ }
          }
          if (i % 8 === 4) {
            try { await callHelper("/mine", { blocks: 1 }); } catch (_e) { /* retry */ }
          }
          if (i === 0 || i === 30 || i === 60) {
            try {
              const raw = await s.wallet.listTransfersValue(null);
              const list = typeof raw === "string" ? JSON.parse(raw) : raw;
              const brief = (list && list.transfers ? list.transfers : list || []).map(
                (t) => `${t.idx}:${t.kind}:${t.status}`,
              );
              console.log("[metevo] rgb transfers", JSON.stringify(brief).slice(0, 300));
              post({ step: "rgb-transfers", transfers: brief });
            } catch (_e) { /* ignore */ }
          }
          try {
            balance = await s.wallet.getAssetBalanceValue(assetId);
            if (balance && Number(balance.settled || 0) > 0) break;
          } catch (_e) { /* retry */ }
          await sleep(1000);
        }
        setStatus(`usdm balance ${JSON.stringify(balance || null)}`);
        reply({ ok: true, assetId, balance: balance || null, invoice: invoiceData });
        });
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
    let rid;
    let mnemonic;
    const explicitRuntimeId = getQueryParam("runtimeId", "");
    const explicitMnemonic = getQueryParam("mnemonic", "");
    if (explicitRuntimeId && explicitMnemonic) {
      rid = explicitRuntimeId;
      mnemonic = explicitMnemonic;
      localStorage.setItem("rln_wasm_runtime_id", rid);
      localStorage.setItem("rln_wasm_e2e_mnemonic", mnemonic);
    } else if (wantFresh) {
      rid = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
      mnemonic = rgbGenerateKeysValue("regtest").mnemonic;
    } else {
      rid = localStorage.getItem("rln_wasm_runtime_id");
      if (!rid) {
        rid = Math.random().toString(16).slice(2);
        localStorage.setItem("rln_wasm_runtime_id", rid);
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
    node.installAutoPeerManagerHooks();
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

    const pubkey = (JSON.parse(node.nodePubkeyJson()) || {}).pubkey || "?";
    setStatus(`ready · pubkey=${pubkey} · wallet=${walletAddress.slice(0, 18)}…`);
    post({ step: "ready", pubkey });

    if (getQueryParam("flow", "") === "channel") {
      runChannelFlow().catch((e) => {
        setStatus(`channel failed: ${e}`);
        post({ step: "error", error: String(e) });
      });
    }
  } catch (err) {
    window.__sdk = { ready: false, error: String(err) };
    setStatus(`init failed: ${err}`);
    throw err;
  }
})();
