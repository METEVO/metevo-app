# Balance accounting issue — device acked the RGB consignment but the wallet reports 0 USDM

Date: 2026-11-22 (late session)
Author: implementation session (OpenCode)
Scope: Android on-device RGB-Lightning wallet (RLN as WASM inside a hidden react-native-webview) + LAN helper/LSP on the regtest stack.
Goal of this document: hand a self-contained, evidence-backed analysis of the balance-accounting bug to a fresh reader (Claude) so it can propose a concrete fix.

---

## 1. One-paragraph summary

The LSP issues 20 USDM (2 000 000 000 base units, precision 8) into a blind RGB invoice produced by the phone. The phone **fetches the consignment from the RGB transport proxy and acks it** (proxy log proves `consignment.get` → `ack.post true`), the LSP marks the send `Settled`, and the witness transaction is confirmed on regtest. Despite that, the phone's wallet (`RlnWasmWallet`) reports `getAssetBalanceValue(assetId).settled == 0`, its `listTransfersValue(null)` list is empty, and the app's balance card shows 0.00 USDm. The device's own transfer list briefly shows `ReceiveBlind / WaitingCounterparty` and then loses it. The money is on-chain and the transport worked; the wallet's accounting/indexing drops the receive.

---

## 2. Environment

| Piece | Detail |
|---|---|
| Phone | Pixel 9 (`tokay`), Android 17 build CP3A.261005.005, app `app.metevo.wallet` |
| Transport to phone | `adb connect 192.168.1.249:38339` (port changes per reconnect) |
| LAN host | 192.168.1.147 |
| Helper | `metevo-app/scripts/mobile_helper.py` on :3010 (stdlib http.server) |
| LSP node | `rgb-lightning-node .e2e-regular-rln-datadir2/mobile` on :3101, LDK peer port 9802, regtest, **no** `DEFAULT_VIRTUAL_OPEN_MODE` |
| Esplora | :3002 (wasm-sdk-esplora-1), tip 2746 at capture time |
| RGB transport proxy | :3005 (wasm-sdk-proxy-1, Express, CORS `*`, protocol 0.2) |
| bitcoind | :19445 wallet `bdk-test`, admin:passw |
| Asset | `rgb:DZgCsckL-wpY4~WV-NDRptzz-KtAy9r3-qwylBY9-cgLewQg` (NIA, ticker USDM, precision 8, supply 10 000 000 000 = 100 USDM) |
| WASM SDK | `metevo-app/android/app/src/main/assets/wasm/pkg` (prebuilt `rln_wasm_sdk_bg.wasm`, 23 MB, from the utexo-lsp tree) |
| Go LSP (:8080) | stopped — its cron raced and opened virtual channels |
| Branch | `metevo-app` `feat/on-device-rln`, local commits only (HEAD `ac2b374` plus the doc commit) |

---

## 3. Intended flow (LSP-driven bootstrap)

1. Phone registers/logs in; the node is seeded from the mnemonic in secure-store; wallet + LDK come up inside the WebView.
2. Phone ensures a witness UTXO (helper `/fund`, 0.01 BTC-ish) and colorable UTXOs (`createUtxosBegin/End`), because rgb-lib needs an allocation to issue a blind invoice.
3. Phone calls `wallet.blindReceiveValue(null, "Any", null, [rpc://192.168.1.147:3005/json-rpc], 1)` → `recipient_id`.
4. Phone `POST /lsp/bootstrap {peer_pubkey_and_opt_addr, recipient_id, transport_endpoints, ticker:"USDM", deliver:true, channel:false}`.
5. Helper ensures the USDM asset (`/listassets`, `/assetbalance`, optionally `/issueassetnia`), ensures colored BTC (`/btcbalance`, `/createutxos`), and (when `channel:true`) opens an RGB channel. With `channel:false` it delivers on-chain only.
6. Helper `POST /sendrgb` (recipient_map with `assignment: {type:"Fungible", value: 2000000000}` and the phone's transport endpoints), then loops `POST /refreshtransfers` + `POST /listtransfers` + `mine` until a transfer shows `Settled` (reference `refreshUntilTransferSettled`).
7. Phone refreshes its wallet (`refreshValue`), polls `getAssetBalanceValue`, and the status reply reports `balanceUsdmBaseUnits`.

Code touchpoints:

- `metevo-app/android/app/src/main/assets/wasm/harness.js`
  - `buildWalletData` line 40 (`data_dir: /tmp/rln_wasm_e2e_<runtimeId>`, `supported_schemas:["Nia"]`)
  - `readWalletSnapshot` line 93 (refresh + `getBtcBalanceValue` + `getAssetBalanceValue(localStorage "metevo.usdm_asset_id")`)
  - `blindRecipientId` line 139 (witness UTXO, colorable UTXO, blind invoice)
  - `provisionChannel` line 204 (peer wait, invoice, `/lsp/bootstrap`, 10-min poll, asset-id adoption, self-heal re-post every 60 ticks)
  - `case "status"` line 396 (diagnostics: `channels`, `assets`, `transfers`, `runtimeEvents`)
  - `case "issueusdm"` line 542
  - init lines 800–828: `chainSyncStartValue(esplora, 5000)`, `setEnableVirtualChannelsV0(true)`, `preloadPersistentRuntimeState()`, `autoDriveStartValue(400)`
- `metevo-app/scripts/mobile_helper.py`
  - `prepare_usdm_asset` line 105, `refresh_until_settled` line 194, `send_rgb` line 220, `delivery_key` line 286, `_handle_bootstrap` line 382, `deliver` line 453.

---

## 4. Evidence

### 4.1 Device status line (`[metevo] wasm ping ok`, latest)

```json
{
  "nodePubkey": "022eb78084ae1ca27719d73747ef321cb8272bd87b4f6608622d9ae485a3fca35e",
  "btcSpendableSat": 79845,
  "balanceUsdmBaseUnits": 0,
  "channelReady": false,
  "provisionError": null,
  "pendingFunding": [],
  "channels": [],
  "assets": [{"id":"rgb:DZgCsckL-wpY","ticker":"USDM","supply":10000000000}],
  "transfers": []
}
```

Earlier in the same session, ~15 s apart:

```
t30s  transfers = [{"idx":1,"kind":"ReceiveBlind","status":"WaitingCounterparty"}]
t45s  transfers = []
```

So the wallet **did** create the receive transfer, then lost it, while keeping the asset in `listAssets`.

### 4.2 LSP side

`POST :3101/assetbalance {asset_id}`:

```json
{"settled":4000000000,"future":4000000000,"spendable":4000000000,"offchain_outbound":2000000000,"offchain_inbound":0}
```

`POST :3101/listtransfers {asset_id}`:

```
idx 10 Send Settled            value 2000000000  txid 01b7eca46a0ecaf705fe2c22d2ca913a8210087dc1b0cd26641e5273dff12c1e
idx  9 Send Settled (earlier proof, 2e9)
idx  8 Send Settled (earlier proof, 2e9)
idx  7 Issuance Settled
```

Transfer 10 `transport_endpoints`:

```json
[{"endpoint":"http://192.168.1.147:3005/json-rpc","transport_type":"JsonRpc","used":true}]
```

### 4.3 Transport proxy log (`docker logs wasm-sdk-proxy-1`) — the decisive proof

```
22:48:05.592 consignment.get  <recipient_id: bcrt:utxob:Z8LEN...>  Mozilla/5.0 (Linux; Android 17; Pixel 9 ...) 
22:48:05.598 err <code: -400, message: Consignment file not found>
22:48:05.754 consignment.post <recipient_id: bcrt:utxob:Z8LEN..., txid: 242d0d10746aa0e6...>   res <true>
22:48:08.255 consignment.get  <recipient_id: bcrt:utxob:Z8LEN...>  res <consignment: UkdCAFRGUgABAQDq..., txid: 242d0d10746aa0e6...>
22:48:08.441 ack.post         <recipient_id: bcrt:utxob:Z8LEN..., ack: true>  res <true>
```

The phone (Android UA) fetched the consignment and **posted an ack**. Later re-posts by the LSP were rejected:

```
22:48:46 / 23:49:27 / 23:50:08  consignment.post <same recipient>  err <-101, Cannot change uploaded file>
```

Those re-posts come from the helper's retry/self-heal re-using the same `recipient_id` (delivery key is `asset|peer|recipient`). They are harmless but noisy.

### 4.4 Chain

```
GET :3002/tx/01b7eca4.../status
{"confirmed":true,"block_height":2435,"block_hash":"1ad0e58a...","block_time":1795387161}
GET :3002/blocks/tip/height -> 2746
```

Witness tx confirmed ≈310 blocks before tip. Confirmation depth is not the problem.

### 4.5 Peer transport instability (same status `runtimeEvents`)

```
seq5  peer_hook_disconnected  "peer manager socket disconnected"
seq6  peer_hook_error         "peer_manager.read_event failed"
seq8  peer_hook_error         "peer transport is disconnected"
... (repeats every ~30 s)
```

`channels: []` correlates with this: the LSP opened an RGB channel to this peer twice (`7c56a825…` and later) and the phone never registered it, so LDK is not seeing inbound peer bytes reliably. This is a **separate** bug from the balance, but it may share a root cause (peer/socket layer) and it prevents checking `asset_local_amount` per channel.

---

## 5. What is already ruled out

1. **Transport reachability.** Phone → proxy works; consignment fetched; ack posted (4.3). CORS on :3005 is `Access-Control-Allow-Origin: *` and OPTIONS returns 204.
2. **LSP inventory / spendable.** `spendable: 4e9 ≥ 2e9`; the send did go through (`Send Settled`).
3. **Witness tx.** Confirmed at height 2435, `confirmed:true` (4.4).
4. **SDK API mismatch.** Our prebuilt SDK and the reference `wasm-flow-testing` SDK expose the same method names (checked by diffing `.d.ts` exports; ours has 4 extra).
5. **`installAutoPeerManagerHooks()`.** Removing it changed nothing (device still never registered an inbound channel).
6. **Virtual channel mode.** RLN 3101 runs without `DEFAULT_VIRTUAL_OPEN_MODE`; the helper sends no `virtual_open_mode`; the LSP channel rows show `virtual_open_mode: null`.
7. **Asset id drift.** `listAssets` on the device returns the same asset id that `localStorage["metevo.usdm_asset_id"]` holds (prefix `rgb:DZgCsckL-wpY`), so `getAssetBalanceValue` is querying the right asset.

---

## 6. Hypotheses (ranked) and how to test each

### H1 (most likely) — the rgb-lib wallet DB is not durable, so the receive record is lost

`buildWalletData` uses `data_dir: /tmp/rln_wasm_e2e_<runtimeId>` **inside the WASM filesystem**. Unless the SDK mirrors that SQLite DB into IndexedDB/VSS, the wallet loses transfers on any reload or restore. The SDK docs say: “Local browser persistence … the RGB KV store (per-channel RgbInfo, payment/transfer info, consignments)” is mirrored **only when `configureVssBackup`/replication is enabled**. The harness never calls `configureVssBackup` and never persists the wallet DB.

Test:
- Log `sdk.backupInfo()` and `wallet.backupInfo()` in the status reply.
- Add a diagnostic that returns `wallet.listTransfersValue(assetId)` and `wallet.listUnspentsValue(true)` after a fresh `refreshValue`.
- Check whether the `ReceiveBlind` disappears **before** any app restart (it did: t30 → t45 in one session, so this is not only a reload issue — see H2/H3).

### H2 — `listTransfersValue(null)` hides/consumes `ReceiveBlind` after the ack

rgb-lib may delete or hide a blind-receive transfer once the consignment is consumed and the assignment is settled. If so, `transfers: []` is expected and the balance should still be > 0 — which it is not, so this alone does not explain 0. Still, the diagnostic should call `listTransfersValue(assetId)` and `listTransfersValue(null)` and compare.

### H3 — `refreshValue(online, null, [], false)` with `skip_sync=false` evicts the assignment transiently

The reference test (`e2e-test-wasm.js`, lines 571–575) explicitly warns that keeping an Esplora re-sync loop while broadcasting RGB txs makes confirmed funding txs look *evicted/unconfirmed* and can force-close channels. Our harness calls `refreshValue(... skip_sync=false)` from `readWalletSnapshot` on **every 5 s status poll** and from the provisioning loop every ~3 s. A rescan started while the assignment tx was still pending can leave the wallet thinking the witness is unconfirmed, and the balance stays 0.

Test: stop the status polling refresh (call `refreshValue(online, assetId, [], true)` = `skip_sync:true` in status, and do one explicit `skip_sync:false` refresh only right after the bootstrap returns), then read `getAssetBalanceValue` once. Also call `wallet.listUnspentsVanillaValue(online, 0, false)` and check whether the assignment UTXO is `settled`.

### H4 — the assignment UTXO is not owned by the wallet keychain

The blind invoice is created from the wallet's colored keychain; the LSP's `sendrgb` uses the `recipient_id`. If the device's colored xpub changed (wallet re-created from a different `rgbRestoreKeysValue("regtest", mnemonic)` output, or `max_allocations_per_utxo` changed), the assignment would be unspendable and invisible.

Test: log `wallet.getAddress()` colored/vanilla, the wallet data `account_xpub_colored` prefix, and `wallet.listUnspentsValue(true)` right after the consignment ack.

### H5 — the node's chain-sync tip is stale for the **wallet**, not for LDK

The status shows `btcSpendableSat: 79845`, which comes from `getBtcBalanceValue()` — so the wallet does see confirmed on-chain sats. But those sats were funded earlier, so the wallet may be behind tip without being obvious.

Test: add `node.chainSyncStatusValue()` to the status reply (the SDK exposes it) and `wallet.listUnspentsVanillaValue(online, 1, false).tip`.

### H6 — two asset records (old chain) with the same prefix

Earlier regtest runs issued other USDM assets. `localStorage` holds one id; `listAssets` shows one id. Compare the full strings (the `~` character matters), not the 16-char prefix we log.

---

## 7. Diagnostics to add (drop-in code)

Inside `case "status"` (harness.js:396), after the existing `withWallet` snapshot:

```js
let sync = null, unspents = null, transfersForAsset = null, backup = null;
try { sync = node.chainSyncStatusValue(); } catch (_e) {}
try {
  unspents = await withWallet(() => s.wallet.listUnspentsValue(true));
} catch (_e) { unspents = String(_e); }
if (assetId) {
  try { transfersForAsset = await withWallet(() => s.wallet.listTransfersValue(assetId)); } catch (_e) {}
}
try { backup = s.wallet.backupInfo(); } catch (_e) {}

reply({ ..., sync, unspents, transfersForAsset, backup });
```

Log them with `post({step:"wallet-diag", sync, unspents, transfersForAsset, backup})` so they also land in logcat with the full (non-truncated) payload.

Also add a one-shot `wallet-diag` dispatch method so it can be triggered without waiting for the 5 s poll:

```js
case "diag": {
  const out = {
    sync: node.chainSyncStatusValue(),
    transfers: await withWallet(() => s.wallet.listTransfersValue(null)),
    transfersAsset: await withWallet(() => s.wallet.listTransfersValue(localStorage.getItem("metevo.usdm_asset_id"))),
    unspents: await withWallet(() => s.wallet.listUnspentsValue(true)),
    unspentsVanilla: await withWallet(() => s.wallet.listUnspentsVanillaValue(s.online, 0, false)),
    asset: await withWallet(() => s.wallet.getAssetBalanceValue(localStorage.getItem("metevo.usdm_asset_id"))),
    backup: s.wallet.backupInfo(),
  };
  reply(out);
  return;
}
```

---

## 8. Candidate fixes (in order of cost)

1. **Make the status refresh non-destructive.** In `readWalletSnapshot`, use `refreshValue(online, assetId, [], /*skip_sync*/ true)` and keep exactly one `skip_sync:false` refresh right after the bootstrap reply. This follows the reference warning about Esplora re-sync during RGB transfers.
2. **Persist the wallet.** Call `sdk.configureVssBackup(...)`/`wallet.configureVssBackup(...)` (or the local IndexedDB backup path the SDK exposes) so `data_dir` survives a WebView reload; otherwise every app restart loses the receive record.
3. **Settle-aware polling instead of blind refresh.** In the helper, after `sendrgb`, return the transfer `txid`; on the phone, wait for `GET esplora /tx/<txid>/status` to report `confirmed` (≥1) before calling `getAssetBalanceValue`. Then read the balance. Currently the phone may read while the witness is unconfirmed.
4. **Use the transfer list as the settlement signal.** `wallet.listTransfersValue(assetId)` — wait for a `Receive`/`ReceiveBlind` entry with `status: "Settled"` before showing the balance.
5. **Avoid re-using the same blind invoice across retries.** Delivery caching by `(asset, peer, recipient)` plus the helper retry path re-posts to a consumed recipient (`Cannot change uploaded file`). Generate a fresh invoice on the self-heal path, or skip delivery when the cached key already succeeded (success is cached; the retries are for failures only — verify the 200 path is not re-entering `sendrgb`).
6. **Keep the channel path separate.** The inbound `OpenChannel` never reaches device LDK (`channels: []`, `peer transport is disconnected`). This is independent; the balance fix must not depend on the channel.

---

## 9. Reproduction (exact)

```bash
# 1. stack
bash /home/aballarini/metevo-hack/.scratch/ue1_restart.sh          # helper 3010
curl -s http://127.0.0.1:3010/lspinfo                              # {"pubkey":"03b5e0..."}
# 2. install the APK built with
#    EXPO_PUBLIC_WASM_HELPER_URL=http://192.168.1.147:3010 (and indexer/proxy URLs)
adb connect 192.168.1.249:<port>; adb -s <serial> install -r --no-streaming app-release.apk
adb -s <serial> shell am force-stop app.metevo.wallet; adb -s <serial> shell am start -n app.metevo.wallet/.MainActivity
# 3. register or fingerprint-login, then watch:
adb -s <serial> logcat | grep 'wasm ping ok'
# 4. LSP side
curl -s -X POST -H 'content-type: application/json' -d '{"asset_id":"rgb:DZgCsckL-wpY4~WV-NDRptzz-KtAy9r3-qwylBY9-cgLewQg"}' http://127.0.0.1:3101/assetbalance
docker logs --tail 40 wasm-sdk-proxy-1
curl -s http://127.0.0.1:3002/tx/<witness-txid>/status
```

Expected (buggy) outcome: proxy shows `consignment.get` + `ack.post true`; LSP shows `Send Settled`; device shows `balanceUsdmBaseUnits: 0`, `transfers: []`, `assets` containing the USDM id.

---

## 10. Open questions for the analyst

1. Does `RlnWasmWallet.refreshValue(online, assetId, [], false)` re-scan the chain and treat a *pending-to-confirmed* assignment as evicted (reference warning at `e2e-test-wasm.js:571-575`)?
2. Is the rgb-lib SQLite DB in `/tmp/rln_wasm_e2e_<rid>` persisted at all, or must the app call a backup/restore API? `sdk.preloadPersistentRuntimeState()` only restores the **LDK** runtime state (channels/keys), not the rgb-lib transfer DB.
3. Does `getAssetBalanceValue` return `settled: 0` while the transfer is `WaitingCounterparty` even if the ack was posted? I.e. does the receiver's ack only mean “consignment fetched”, with balance moving only after the sender's witness tx is seen by the **receiver's wallet** rescan?
4. Is `listTransfersValue(null)` supposed to include `ReceiveBlind` after consumption? If not, `transfers: []` is normal and the balance is the only real signal.
5. Does the phone's rgb-lib need `wallet.processPendingRgbTransactions()` (called only from the `rgbWork` timer) plus an explicit `skip_sync:false` refresh after the witness confirms?

---

## 11. Raw artifacts kept

- Helper log: `/tmp/mobile_helper.out`
- RLN LSP LDK log: `/home/aballarini/rgb-lightning-node/.e2e-regular-rln-datadir2/mobile/.ldk/logs/logs.txt`
- Proxy log: `docker logs wasm-sdk-proxy-1`
- Delivery cache: `/tmp/metevo_bootstrap_deliveries.json`
- APK (current build with diagnostics): `metevo-app/android/app/build/outputs/apk/release/app-release.apk`
- Commits: `4bab381`, `ec209cf`, `07ab923`, `d4a932f`, `4630e5b`, `ca84ce6`, `ac2b374` on `feat/on-device-rln` (local, not pushed)
