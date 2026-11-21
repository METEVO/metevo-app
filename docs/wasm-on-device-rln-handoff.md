# On-device RGB Lightning node in a React Native WebView — handoff prompt

Purpose: this file is a self-contained brief you can paste into a fresh chat. It records the
architecture, every failure met while implementing it, the root cause we proved for each,
the upstream status (known issue / by design / our bug), and the concrete fix.

Written 2026-11-20 on branch `feat/on-device-rln`. All statements marked **VERIFIED** were
observed in logs or read from the installed sources; **UNVERIFIED** means suspected.

---

## Kickoff prompt (paste this into the new chat)

> We run the RGB Lightning Node (RLN) on an Android phone, entirely on-device, as WebAssembly
> inside a hidden `react-native-webview`, exposed to the app through the existing
> `WalletSessionGateway`. There is no remote wallet node and no adb/Metro at runtime; a LAN
> computer runs the LSP, the WebSocket↔TCP gateway, Esplora and the RGB proxy.
>
> Current state: the wallet opens and reports `channelReady: true`, a virtual channel from the
> LSP exists, and USDM is issued on the LSP. The last blocker is RGB asset delivery: the LSP
> transfer sits in `WaitingCounterparty` and the device balance never settles. The immediate
> work is in "Priority list" below.
>
> Read `docs/wasm-on-device-rln-handoff.md` (this file) before changing anything. Treat the
> "Issue catalogue" as authoritative: several items are upstream behaviour, not bugs, and the
> proposed fixes are the ones the upstream projects document.
>
> Non-negotiable constraints: node must stay on the phone; must be able to pay peers directly
> over channels (not only through the LSP); UI must stay usable and the WebView invisible.
>
> Please (1) confirm the current state by running the verification protocol, (2) execute the
> priority list in order, (3) report each step with logcat evidence, and (4) do not add
> architecture beyond what the priority list requires.

---

## 1. Goal and constraints

- Run a self-custodial RGB/Lightning wallet on the phone. The node, the RGB wallet and the
  seed handling stay on the device.
- Accept payments directly to the node over Lightning channels, not only via the LSP.
- No USB, no adb reverse, no Metro at runtime. The phone talks to the LAN over Wi-Fi only.
- The WebView that hosts the node must be invisible and must not block the UI.

Rejected alternatives (already investigated, do not revisit without new evidence):

- `@utexo/rgb-sdk-rn`: RGB over L1 only, no LDK node.
- Bare addon (`rgb-lightning-node-bare`): blocked by `bare-kit` `linked:` module resolution in
  the release build (crash documented in `docs/known-issues/wallet-bare-android-crash.md`).
- Native RLN `.so` in a foreground service: the durable answer, but out of scope for the demo
  window. See Issue W4.

---

## 2. Architecture as built

```
Android phone
  METEVO RN app
    App.tsx ── wasm mode branch
      WasmWebViewHost.tsx        hidden 1x1 WebView, ping + selftest effects
        wasm/:harness.js         ES module page: loads rln_wasm_sdk, RPC dispatch
        wasm/rln_wasm_sdk_bg.wasm  23 MB, wasm-pack --target web
      WalletSessionProvider      unchanged app code path
        wasmGateway.ts           WalletSessionGateway adapter
          wasmBridge.ts          RN <-> WebView RPC (injectJavaScript + postMessage)
              │
              └── LAN: http://192.168.178.20:3010  (mobile helper, plain HTTP)
                     ├── LSP 127.0.0.1:3101  (native RLN, --enable-virtual-channels-v0)
                     │     └── LDK peer port 9802
                     ├── wasm-proxy-gateway 3001  (WebSocket -> TCP, for LDK + Esplora)
                     ├── Esplora 3002
                     ├── RGB proxy 3005 -> container :3000, JSON-RPC at /json-rpc
                     └── bitcoind RPC 19445 (wallet bdk-test)
```

Key files:

| File | Role |
|---|---|
| `src/services/metevo/wasmBridge.ts` | RPC queue, per-method timeouts, helper proxy |
| `src/services/metevo/wasmGateway.ts` | `WalletSessionGateway` adapter |
| `src/components/WasmWebViewHost.tsx` | hidden WebView mount, ping, one-shot USDM trigger |
| `android/app/src/main/assets/wasm/harness.js` | node + wallet + RPC + helper flows |
| `android/app/src/main/assets/wasm/rln_wasm_sdk_bg.wasm` | wasm-pack output |
| `src/config/schema.ts`, `src/config/env.ts` | `wasm` wallet mode |
| `android/app/src/main/java/app/metevo/wallet/MainActivity.kt` | `FLAG_KEEP_SCREEN_ON` |

Build command that works (Node 22 must be on PATH, otherwise `createExpoConfig` fails with
`parseEnv is not a function`):

```bash
export PATH=/home/aballarini/.nvm/versions/node/v22.23.3/bin:/usr/local/bin:/usr/bin:/bin
cd metevo-app/android
export ANDROID_HOME=/home/aballarini/Android/Sdk
EXPO_PUBLIC_WALLET_MODE=wasm EXPO_PUBLIC_WASM_PING=1 EXPO_PUBLIC_WASM_ISSUE=1 \
  ./gradlew :app:assembleRelease --no-daemon
```

Install (wireless adb; the port changes on every Wireless-debugging toggle):

```bash
adb connect 192.168.178.21:<port>      # or: adb mdns services
adb install -r --no-streaming android/app/build/outputs/apk/release/app-release.apk
```

---

## 3. Verified state at handoff

**2026-11-20 evening update: the R5 blocker is RESOLVED.** A full `issueusdm` run settles:
device log shows `[metevo] usdm issued` with `{"settled":100,"future":100,"spendable":100}`,
and the LSP's transfers 4/5/6 are all `Settled`. The commit with the fix is `ad7074b`
(feat/on-device-rln). What made it work (all device-side, in `harness.js`):

1. `withWallet` promise queue around `open`/`issueusdm`/`selftest` — the old
   `__metevoOpenBusy` flag was deleted; concurrent `status` polls now fall back to
   last-known balances while a flow holds the wallet.
2. `open` replies immediately (reused channel or `pendingChannel`) and provisions the
   virtual channel in the background; the UI never blocks.
3. The settlement loop now drives BOTH sides: periodic `/lsp/refresh` (the LSP only polls
   `ack.get` — and only broadcasts its witness tx — during its own refresh) and `/mine 1`
   so the witness confirms.
4. Flow-start cleanup `/lsp/refresh` → `/mine 2` → `/lsp/refresh` settles whatever the
   previous run left behind and frees the LSP change UTXO before issuing fresh.
5. `readWalletSnapshot` (the status poll) also attempts `refreshValue`; an idle session
   therefore settles on its own.

Old text kept for context:

Works **VERIFIED** in logcat and endpoint responses:

- WebView boots, loads 23 MB wasm from `file:///android_asset`, node starts.
- RN ↔ WASM RPC round trip: `wasm ping ok`, ~25–40 ms.
- Node connects to the LSP through the gateway and the LSP opens a trusted virtual channel:
  `virtual_open_mode: trusted_no_broadcast`, `ready: true`, `inbound_balance_msat: 250000000`
  on the LSP, `channelReady: true` in the device status.
- LSP funded and issuing: `POST /issueassetnia` returns
  `rgb:XqfNs5tL-tqOAD1j-thP6c4s-5B03Gsn-7pZqbn8-3aSi2Ns`, ticker `USDM`, supply `100000000`
  (cached in `/tmp/metevo_usdm_asset.json` so retries reuse the same asset).
- Device wallet funds itself (`/fund` 0.01 BTC), mines, creates colored UTXOs, and builds a
  blind-receive invoice with `asset_id = null`, assignment `"Any"`, endpoint
  `rpc://192.168.178.20:3005/json-rpc`. `POST /lsp/sendrgb` returns 200 and the LSP marks the
  endpoint `used: true`.

Last observed failure (blocker at handoff):

```
/lsp/sendrgb 200
LSP: transfer idx 2 status WaitingCounterparty, change_utxo <txid>:1
LSP: assetbalance settled 100000000, future 99999900, spendable 0
device: balance null after 120 s
```

Diagnosis: the consignment was delivered to the proxy but the device never fetched it, because
`sync` does not move RGB transfers — `refresh` does. A `refreshValue(s.online, null, [], false)`
call was added to `harness.js` (before reissuing, and in the settlement loop) but the rebuild
was interrupted; that patch is in the working tree and must be built and tested first.

---

## 4. Issue catalogue

Each entry: symptom → cause → status → fix. "Upstream" means the behaviour is documented
behaviour of the dependency, not our bug.

### W1. `fetch()` from the bundled harness to the LAN fails with `TypeError: Failed to fetch`

- Cause: the page origin is `file:///android_asset/...`, which is an opaque `null` origin for
  CORS. `allowUniversalAccessFromFileURLs` relaxes XMLHttpRequest only; Chromium does not
  extend that to the Fetch API. Cleartext policy can add a second failure
  (`net::ERR_CLEARTEXT_NOT_PERMITTED`).
- Status: fixed by moving every LAN call out of the page.
- Fix: the harness posts `{helper: path, id, body}` to RN; `wasmBridge.handleWasmMessage`
  performs `fetch` in React Native (no CORS) and returns the JSON to the page.
- Upstream: [Chromium CORS and WebView](https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/cors-and-webview-api.md);
  asset loading should use `WebViewAssetLoader`
  ([docs](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)).
  No maintained RN wrapper exists; it needs a native `shouldInterceptRequest`.
- Leftover: if the page is ever served from `https://appassets.androidplatform.net`, add
  `mixedContentMode="always"` for cleartext LAN peers.

### W2. Every helper reply dropped; `open` hung 60 s then failed

- Cause: `harness.js` posts `{helper, id, body}` but the bridge read `message.helperId`.
- Status: fixed (`const id = message.id`).
- Lesson: the symptom was identical to "helper down" (`Failed to fetch`); the helper access log
  was the discriminator (request logged, no follow-up call).

### W3. `ref.postMessage()` never reached the page

- Cause: on Android `react-native-webview` dispatches the `MessageEvent` on `document`, on iOS
  on `window`. A `window.addEventListener('message')` handler does not fire for a
  document-targeted event (capture phase would).
- Status: fixed by using `injectJavaScript(...)` for native→page, the proven path.
- Upstream: [RNCWebViewManager.kt](https://github.com/reactnativecommunity/react-native-webview/blob/master/packages/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManager.kt),
  [issue #2980](https://github.com/reactnativecommunity/react-native-webview/issues/2980).
- Note: `window.ReactNativeWebView` exists only when the `onMessage` prop is set.

### W4. Node stalls whenever the app is backgrounded

- Symptom: peer connection never completes, helper replies are lost, `open` fails, while the
  app sits behind WhatsApp or on the lock screen. `dumpsys window` showed
  `mCurrentFocus=com.whatsapp`.
- Cause: Android 14 freezes cached app processes ~10 s after backgrounding; WebView throttles
  hidden-page timers (~1/s, then ~1/min); Doze suspends network without an exemption.
- Status: mitigated, not solved. `FLAG_KEEP_SCREEN_ON` added in `MainActivity.onCreate`.
  The demo must keep METEVO foregrounded and unlocked.
- Durable fix: native foreground service owning the node (Android 14 requires
  `foregroundServiceType`; Android 15 caps `dataSync` at 6 h/24 h — use `specialUse`), or move
  the node out of the WebView (native `.so` via c-ffi/UniFFI, or Wasmtime/WAMR in the service).
- Upstream: [cached apps freezer](https://source.android.com/docs/core/perf/cached-apps-freezer),
  [timer throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88),
  [Doze](https://developer.android.com/training/monitoring-device-state/doze-standby),
  [FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types).

### W5. APK is 318 MB

- Cause: not the wasm. 23 MB wasm is ~7%. The size is dominated by native `.so` files
  (`libqvac-ggml-vulkan.so` ~98 MB, `librgb_lightning_node.so` ~70 MB, `libbare-kit.so` ~62 MB)
  in the universal APK's `lib/` folders.
- Status: open, low priority for the demo.
- Fix: ABI splits or an AAB (`splits` is ignored for AAB; Play generates per-ABI), R8 +
  `shrinkResources`, `wasm-opt -Oz --strip-debug`, `[profile.release] opt-level="z"/"s"`,
  `lto`, `codegen-units=1`, `strip="symbols"`.
- Do **not** add `noCompress "wasm"`: it inflates the APK and is only needed for
  `AssetManager.openFd()`; `instantiate(arrayBuffer)` does not need it.

### R1. `blindReceive` fails with `Asset with id rgb:... not found`

- Cause: rgb-lib validates the asset only when `asset_id` is `Some`; a fresh wallet has no
  contract for an asset issued elsewhere.
- Status: fixed.
- Fix: issue with `asset_id = null` and assignment `"Any"`; the contract is imported when the
  transfer is accepted. Pinning the id before first receipt needs `saveNewAsset`, which is
  master-only in the UTEXO wasm fork and absent from npm `1.0.0-beta.4`.
- Upstream: [UTEXO rgb-lib-wasm #135](https://github.com/UTEXO-Protocol/rgb-lib-wasm/issues/135),
  [PR #145](https://github.com/UTEXO-Protocol/rgb-lib-wasm/pull/145),
  [UXTEO RN SDK docs](https://docs.utexo.com/sdk/react-native-sdk).

### R2. Assignment shape rejected: `invalid type: map, expected unit`

- Cause: serde external tagging. Unit variants are bare strings; newtype variants are
  single-key objects.
- Status: fixed.
- Correct shapes: `"Any"`, `"NonFungible"`, `{Fungible: 100}` (BigInt above 2^53),
  `{InflationRight: 100}`. `{"Any":{}}` and `{type:"Any"}` are invalid.
- Same rule for `TransferStatus`, `RefreshFilter.status`, `AssetSchema`, `BitcoinNetwork`.

### R3. Transport endpoint rejected twice

- Symptom 1: `http://host:3005` → `Transport type is not supported`.
- Symptom 2: `rpc://host:3005` → `Invalid transport endpoints: no valid transport endpoints`.
- Cause: rgb-lib accepts only JSON-RPC transports (`rpc`/`rpcs`) and rewrites them to
  `http(s)://host`; it then probes `POST <base_url>` with JSON-RPC `server.info` and requires
  `protocol_version == "0.2"`. The proxy mounts only `POST /json-rpc`, so the root probe 404s
  and the endpoint is marked unusable. `blindReceive` parses but does not probe, which is why
  the invoice was created and only `sendrgb` failed.
- Status: fixed. Endpoint must be `rpc://<host>:<port>/json-rpc`.
- Version trap: rgb-lib 0.3 requires proxy protocol `0.2` (rgb-proxy-server 0.2.x/0.3.x).
  Proxy 0.4+/master speaks protocol `1.0` and is rejected the same way.
- Upstream: `rgb-invoicing` `parse.rs` (`TRANSPORT_HOST_SEP = "://"`), rgb-lib
  `objects.rs` `TransportEndpoint::try_from`, `utils.rs` `check_proxy`,
  [rgb-proxy-server](https://github.com/RGB-Tools/rgb-proxy-server).

### R4. `RGB wallet is busy with another operation; retry shortly`

- Cause: the wasm wallet holds a `RefCell<Wallet>`; overlapping calls panic (borrow_mut held
  across await). Our `open` provisioning ran `syncOnline` while the USDM flow ran
  `blindReceive`.
- Status: partially fixed. A `window.__metevoOpenBusy` flag serialises the USDM flow behind
  `open`; this is a flag, not a queue, and other call sites are still unguarded.
- Fix: one promise chain per wallet, used by every call:

```js
let chain = Promise.resolve();
export function withWallet(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}
```

- Upstream: [UTEXO rgb-lib-wasm #86](https://github.com/UTEXO-Protocol/rgb-lib-wasm/issues/86)
  (closed as by-design), [#83](https://github.com/UTEXO-Protocol/rgb-lib-wasm/issues/83).

### R5. Consignment never reaches the device; sender stuck `WaitingCounterparty`

- Cause: `sync` is BDK/indexer only. RGB consignments move on `refresh`/`refreshTransfers`,
  which polls the recipient's stored transport endpoints, fetches the consignment, validates
  it, and posts an ack. The sender only broadcasts after that ack (`used: true` on the
  sender's row only proves the POST succeeded).
- Status: **FIXED and VERIFIED 2026-11-20** (commit `ad7074b`). Verified with the proxy log:
  LSP `consignment.post` → device `consignment.get` (Pixel 9 WebView user agent) → device
  `ack.post ack:true` within 150 ms, then LSP refresh → broadcast, mine, both sides `Settled`.
- The complete sequence that must happen (each step waits for the previous one):
  device `blindReceive` → LSP `sendrgb` (posts consignment) → device `refreshValue` (fetch +
  validate + ack) → **LSP `refreshtransfers`** (sees ack, broadcasts witness tx) → mine →
  **LSP `refreshtransfers` again** (settles its own transfer) + device `refreshValue`
  (waits confirmations, settles). Skipping any refresh stalls the chain silently.
- Also required: the recipient must still hold the batch transfer created by its own
  `blindReceive`; a `pm clear` before refresh loses the polling record.
- Upstream: [UTEXO rgb-lib-wasm #140](https://github.com/UTEXO-Protocol/rgb-lib-wasm/issues/140)
  (proxy failures look like "nothing yet").

### R6. `Not enough assets`, `spendable: 0`, `future: 99999900`

- Cause: RLN gates sends on `spendable`, and `spendable = settled - unspendable`; a pending
  outgoing batch transfer locks the colored UTXO that holds the change. This is by design,
  not a lost balance.
- Status: open; it resolves itself once R5 completes.
- Recovery order: `listTransfers(assetId)` → if `WaitingConfirmations`, mine + `refresh`;
  if `WaitingCounterparty`, fix the recipient (R5) — mining cannot help because the tx was
  never broadcast; after the invoice expires, `failTransfers` then `deleteTransfers` frees the
  allocations.
- Upstream: [rgb-lightning-node #65](https://github.com/RGB-Tools/rgb-lightning-node/issues/65).

### L1. WASM has no raw TCP; `connectPeer("127.0.0.1:9802")`

- Status: works, with a caveat that must be documented.
- Behaviour: the SDK builds `<proxy>/v1/<host_slug>/<port>` (`127.0.0.1` → `127_0_0_1`), so the
  address is resolved **on the gateway host**; 9802 must be reachable there. Remote peers need
  `WASM_PROXY_ALLOW_PUBLIC_TARGETS=true` plus `WASM_PROXY_TARGET_ALLOWLIST`.
- Also: `connectPeer` resolving means the transport is up, not that the peer is connected.
  Verify with `listPeersValue()`; the peer gate in `harness.js` already does.
- Upstream: RLN `bindings/wasm-sdk/ARCHITECTURE.md`,
  [wasm-proxy-gateway](https://github.com/UTEXO-Protocol/rgb-lightning-node/tree/dev/tools/wasm-proxy-gateway),
  [ldk-node #902](https://github.com/lightningdevkit/ldk-node/issues/902) (no upstream ldk-node
  wasm support).

### L2. `400 virtual channel session already exists for this peer pair`

- Status: upstream behaviour, handled with a workaround.
- Cause: the LSP rejects any second session for a peer pair and **never prunes** the session
  store (`VIRTUAL_CHANNEL_SESSIONS_KEY`, add/update only, `Abandoned` is terminal).
- Current handling: treat the 400 as "channel exists, reconnect" and reply OK; never retry the
  open. The client should check `listChannelsJson()` for
  `virtual_open_mode === "trusted_no_broadcast"` before opening.
- Consequence: a peer identity that reached a terminal session can never be re-provisioned
  without wiping LSP state. Avoid `pm clear` on the device during provisioning; if needed,
  rotate the LSP datadir or the peer identity deliberately.
- Upstream: RLN `src/ldk.rs` duplicate-session guard, [virtual channels notes](https://hackmd.io/@xalkan/virtual-channels).

### L3. Client `inbound_balance_msat` 0 while LSP reports 250000000

- Status: UNVERIFIED as a known issue; no upstream report found.
- Ranked causes: (1) best-block stuck at genesis before the first channel — fixed upstream in
  [PR #119](https://github.com/UTEXO-Protocol/rgb-lightning-node/pull/119), confirm the build
  includes it; (2) the client has not drained `ChannelPending`/`ChannelReady` because nothing
  ticks; (3) perspective confusion (LSP inbound = client outbound).
- Diagnose in order: `chainSyncStatusValue().height > 0` → `listRuntimeEventsValue()` shows
  `ChannelReady` → `listChannelsJson()` `is_usable`.

### L4. Inbound keysend never appears in `listPaymentsJson`

- Cause (likely, high confidence): two payment models exist in the wasm SDK. The parity model
  (`keysend`, `sendPaymentJson`, `createLnInvoiceJson`, `listPaymentsJson`) is backed by the
  event-stream ledger; the live model (`keysendLive`, `sendPaymentLiveJson`,
  `createLnInvoiceLiveValue`, `livePaymentValue`, `livePaymentsValue`) is backed by the real
  `ChannelManager`. A real LSP keysend is accounted in the live model. Reading the parity
  store therefore shows nothing even when the HTLC settled.
- Status: open, high value.
- Fix: generate invoices and keysends with the `*Live*` family and poll
  `livePaymentValue(hash)` (`pending → claimable → claiming → succeeded`). Keep
  `listRuntimeEventsValue()` as ground truth for the event.
- Upstream precedent for a claimed-but-unrecorded payment:
  [ldk-node #966](https://github.com/lightningdevkit/ldk-node/issues/966),
  [#1083](https://github.com/lightningdevkit/ldk-node/issues/1083).

### L5. BOLT11: LSP sees `InboundAutoClaim: Pending`; LSP→device shows `Outbound: Failed`

- Causes: an invoice minted with the parity `createLnInvoice` has no live inbound HTLC to bind
  (use `createLnInvoiceLiveValue`); the device not ticking cannot claim; route hints encode the
  scid alias that only exists after the channel is usable.
- Amount floors that silently break small payments: `channels.htlc_min_msat = 3000000` for RGB
  channels, `virtual_htlc_min_msat = 1000`, `dust_limit_msat = 546000`. An RGB-routed HTLC
  below 3,000,000 msat fails to route (WDK documents the same floor). 1 sat is possible only
  after the virtual channel exists ([RLN PR #75](https://github.com/UTEXO-Protocol/rgb-lightning-node/pull/75)).
- Status: open.

### L6. Event pump: custom `setInterval` instead of the SDK driver

- Current code pumps `chainSyncTickValue()` + `processNativeRuntimeQueueValue()` every 250 ms
  and `syncOnline` every 3 s.
- The SDK ships `autoDriveStartValue(interval_ms)` (chain sync → live LDK → event drain →
  channel reconcile; upstream examples use 400 ms), `autoDriveStopValue()`,
  `autoDriveStatusValue()`, plus RGB-specific `processPendingRgbTransactions()` and
  `driveRgbFundingWork()` which the LN tick does not cover.
- Status: open. Replace the hand-rolled pump; keep the RGB work in the same driver.
- Lifecycle: start `preloadPersistentRuntimeState()` → `installAutoPeerManagerHooks()` →
  `attachWallet` → `chainSyncStartValue` → `autoDriveStartValue`; suspend with
  `autoDriveStopValue()` + `persistLdkRuntimeState()`; resume with
  `reconnectManagerOnResume()`.

### L7. Seed and node state live in WebView storage

- Status: accepted gap for the demo, must be fixed before any real funds.
- Facts: IndexedDB survives normal restarts but not `pm clear`, and can be lost on ungraceful
  process death. It is plaintext inside the app sandbox. `navigator.storage.persist()` is not a
  guarantee in WebView.
- Fix: keep the seed in Android Keystore / `expo-secure-store`, keep large state in an encrypted
  native DB, and treat WebView state as a cache that can be reconstructed. VSS replication
  (`configureLdkVssReplication`) is the only path that survives a wiped profile.

### Operational hazards that cost the most time

1. **Helper process dies silently.** `mobile_helper.py` is started detached with `setsid`; when
   it dies, every app call becomes `TypeError: Failed to fetch`. Always check
   `pgrep -af mobile_helper.py` and `GET /lspinfo` before debugging the app. The helper lives in
   `%TEMP%`, **not in the repo** — move it into `scripts/` before the next session.
2. **Wireless adb port changes.** `adb mdns services` gives the current `_adb-tls-connect` port;
   pairing uses a different port from the `_adb-tls-pairing` record. A refused connect means the
   phone toggled Wireless debugging or went to sleep.
3. **Phone locked or app backgrounded.** `dumpsys window | grep mCurrentFocus`,
   `dumpsys power | grep mWakefulness`. Nothing works unless METEVO is foregrounded and unlocked.
4. **Logcat buffer rotates fast** because the invoice-inbox poll logs every 3 s. Capture to a
   file (`adb logcat -v time > /tmp/app.log`) instead of reading the ring buffer.
5. **`pm clear` rotates the node identity** and leaves an orphan virtual-channel session on the
   LSP (L2). Prefer force-stop/start when you only need to re-run a flow.
6. **Gradle without Node 22 on PATH** fails in `createExpoConfig`; always export the nvm path.

---

## 5. Quick triage table

| Symptom | Who to blame | Check |
|---|---|---|
| `Failed to fetch` in app | helper down, or page-side fetch | helper `/lspinfo`, helper access log |
| Request in helper log, then nothing | reply path (W2/W3) | bridge id, `injectJavaScript` payload |
| `wallet did not connect` | `open` threw; read its error | logcat `wallet open failed` |
| `LSP never listed this node as a peer` | gateway/peer, or app backgrounded | LSP `/lsp/peers`, `mCurrentFocus` |
| `session already exists` | L2, not an error | reuse the existing channel |
| `Asset with id ... not found` | R1 | use `null` + `"Any"` |
| `Transport type is not supported` | R3 | scheme must be `rpc` |
| `no valid transport endpoints` | R3 | path `/json-rpc`, proxy protocol 0.2 |
| `Not enough assets` | R6 | transfer still `WaitingCounterparty` |
| balance `null` after send | R5 | recipient `refreshValue` |
| wallet busy | R4 | serialise all calls |

---

## 6. Priority list for the next session

Status after the 2026-11-20 evening session (commit `ad7074b`):

1. ~~Build and test the R5 patch~~ — **DONE, verified**: `usdm issued` with
   `settled/spendable = 100`; LSP transfers 4/5/6 `Settled`.
2. ~~Idempotent flow~~ — done: `withWallet` queue replaced the busy flag; `open` reuses the
   existing channel and provisions in the background (never a second virtual session).
3. ~~autoDrive~~ — done: `autoDriveStartValue(400)` + queued RGB work
   (`processPendingRgbTransactions`, `driveRgbFundingWork`).
4. ~~Switch invoices and keysends to the `*Live*` API family~~ — **DONE and VERIFIED
   2026-11-21**: `wasm selftest ok` with `sentOk:true, receivedOk:true` on the first
   attempt (device→LSP keysend via `keysendLiveJson`, LSP→device keysend tracked via
   `livePaymentsValue`; LSP `/listpayments` shows Outbound Succeeded with preimage and the
   matching InboundAutoClaim). `createLnInvoiceLiveValue`/`sendPaymentLiveJson` are wired
   in the same style but a BOLT11-invoice round trip is still untested.
5. ~~Decouple wallet readiness~~ — done (fast `open`, background provisioning).
6. Direct peer payment (not via the LSP) — open, needs a second peer.
7. ~~Helper into the repo~~ — done: `scripts/mobile_helper.py`, ports/routes documented in
   `docs/wasm-rln-runbook.md`.
8. Foreground service (W4) and seed move to Keystore (L7) — still open.

New constraints discovered this session:

- **The device rgb wallet DB is pure MEMFS** (`data_dir=/tmp/...`, no `IDBFS`/`syncfs`
  anywhere in the wasm-sdk sources): every app restart wipes BTC balance, colored UTXOs and
  recipient records. Balances do not survive restarts; do not restart the app after
  issuance during a demo; unfetched LSP consignments become orphans that lock LSP
  spendable — recover with `python3 scripts/lsp_transfers.py ' ' recover`.
- The LSP never broadcasts or settles on its own; every state advance needs an LSP
  refresh (the harness now does this, but ad-hoc testing must remember it).
- Two regtest stacks coexist on the LAN computer: the demo chain (helper 3010, esplora
  3002, bitcoind 19445 `admin:passw`, proxy 3005 protocol 0.2) and an older analysis stack
  (bitcoind 18443 `dev:dev`, tip differs, proxy 3000 protocol 1.0). The LSP wallet is
  synced to the demo chain.

Remaining work:

## 6. Original priority list

1. **Build and test the R5 patch.** `harness.js` now calls
   `refreshValue(s.online, null, [], false)` before reissuing and inside the settlement loop.
   Build, install, keep METEVO foreground, trigger `issueusdm`, expect
   `[metevo] usdm issued` with a non-null balance and `[metevo] wasm ping ok` carrying
   `balanceUsdmBaseUnits > 0`.
2. **Make the flow idempotent across launches.** Replace the `__metevoOpenBusy` flag with a
   real per-wallet promise queue (R4). Never open a second virtual channel (L2).
3. **Replace the hand pump with `autoDriveStartValue(400)`** and wire the RGB work
   (L6). Keep `syncOnline` in the same driver.
4. **Switch invoices and keysends to the `*Live*` API family** (L4/L5) and verify one
   LSP→device invoice and one device→LSP invoice end to end. Mind the 3,000,000 msat RGB HTLC
   floor; use ≥ 3,000,000 msat for the first invoice tests.
5. **Decouple wallet readiness from channel readiness** in `open`: reply as soon as the node and
   wallet are online, provision the channel in the background. The UI must never block for
   minutes.
6. **Prove direct peer payment** (not via the LSP) once a second peer exists.
7. **Move the helper into the repo** (`scripts/mobile_helper.py`) and document the ports.
8. Only then consider the foreground service (W4) and the seed move to Keystore (L7).

---

## 7. Verification protocol

Run these before touching code; each must pass in order.

```bash
# 1. computer side
pgrep -af "mobile_helper|wasm-proxy-gateway|rgb-lightning-node"
curl -s http://127.0.0.1:3010/lspinfo
curl -s -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:3010/lsp/peers
curl -s http://127.0.0.1:3002/blocks/tip/height
# expected: LSP pubkey 033b26cc..., peers contains the device pubkey, esplora height > 0

# 2. phone
adb -s <serial> shell dumpsys window      | grep mCurrentFocus   # must be app.metevo.wallet
adb -s <serial> shell dumpsys power       | grep mWakefulness     # Awake
adb -s <serial> logcat -d -s ReactNativeJS:V | grep -E "wasm ping ok|wallet open failed|usdm"
```

Expected device status line once healthy:

```
[metevo] wasm ping ok ... {"nodePubkey":"...","btcSpendableSat":0,
 "balanceUsdmBaseUnits":<n>,"channelReady":true}
```

`btcSpendableSat: 0` is correct: the on-chain balance is zero and the USDm balance is not BTC.
Do not "fix" that number.

---

## 8. Facts worth not rediscovering

- LSP pubkey: `033b26cca96f27ce8162237b20e47dd4c85e32db36d28d6d6434aa669b8ea2126c`.
- LSP runs from `/home/aballarini/rgb-lightning-node/target/release/rgb-lightning-node` with
  datadir `.e2e-regular-rln-datadir/mobile`, `--daemon-listening-port 3101`,
  `--ldk-peer-listening-port 9802`, `--enable-virtual-channels-v0`.
- USDM asset: `rgb:XqfNs5tL-tqOAD1j-thP6c4s-5B03Gsn-7pZqbn8-3aSi2Ns`, precision 8.
- Endpoint that works from both host and phone: `rpc://192.168.178.20:3005/json-rpc`.
- `pm clear` = new node pubkey + orphaned virtual-channel session on the LSP.
- Release APK: `android/app/build/outputs/apk/release/app-release.apk`, ~318 MB.
- If the JS bundle looks stale, delete
  `android/app/build/generated/assets/react/release/index.android.bundle` and rebuild.
- `WSL` shell can drop (`0x8007274c`); retry. Avoid `wsl --shutdown` mid-session.

---

## 9. Open questions

- Does the installed `@utexo/rln-wasm` build expose the full `*Live*` family (L4/L5)? Confirm
  against `bindings/wasm-sdk/pkg/rln_wasm_sdk.d.ts` before rewriting the flows.
- Does the build include RLN PR #119 (L3 best-block fix)?
- Which rgb-lib/wasm revision exactly is bundled, and does it predate the `saveNewAsset` fix
  (R1)?
- Is `navigator.storage.persist()` honoured on the Pixel 9 WebView? Test before relying on
  WebView persistence for anything important.
- Does `trusted_no_broadcast` carry amountless invoices? Untested.

---

## 10. Sources

- RGB wallet: [rgb-lib](https://github.com/RGB-Tools/rgb-lib),
  [UTEXO rgb-lib-wasm](https://github.com/UTEXO-Protocol/rgb-lib-wasm),
  [rgb-proxy-server](https://github.com/RGB-Tools/rgb-proxy-server),
  [UTEXO RN SDK docs](https://docs.utexo.com/sdk/react-native-sdk).
- Lightning: [RLN wasm SDK architecture](https://github.com/UTEXO-Protocol/rgb-lightning-node/blob/dev/bindings/wasm-sdk/ARCHITECTURE.md),
  [wasm-proxy-gateway](https://github.com/UTEXO-Protocol/rgb-lightning-node/tree/dev/tools/wasm-proxy-gateway),
  [ldk-node wasm issue](https://github.com/lightningdevkit/ldk-node/issues/902),
  [WDK RGB Lightning channels](https://docs.wdk.tether.io/sdk/community-modules/wdk-rgb-lightning/guides/peers-channels).
- Android/WebView: [Chromium CORS](https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/cors-and-webview-api.md),
  [load local content](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content),
  [RN WebView reference](https://github.com/reactnativecommunity/react-native-webview/blob/master/docs/Reference.md),
  [cached apps freezer](https://source.android.com/docs/core/perf/cached-apps-freezer),
  [Doze](https://developer.android.com/training/monitoring-device-state/doze-standby),
  [FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types).
- Size: [rust wasm code size](https://rustwasm.github.io/book/reference/code-size.html),
  [APK splits](https://developer.android.com/studio/build/configure-apk-splits).
