# On-device RLN demo runbook (wasm mode)

Companion to `docs/wasm-on-device-rln-handoff.md`. LAN topology, ports and helper routes.

## Processes on the LAN computer (192.168.1.147)

| Port | Process | Notes |
|---|---|---|
| 3010 | `scripts/mobile_helper.py` (python3) | plain HTTP helper at `http://192.168.1.147:3010`, started detached (`setsid`, log in `/tmp/mobile_helper.out`) |
| 3101 | LSP `rgb-lightning-node .e2e-regular-rln-datadir2/mobile --daemon-listening-port 3101 --ldk-peer-listening-port 9802 --network regtest --disable-authentication` | LSP API on 3101, LDK peer port 9802. Must run **without** `DEFAULT_VIRTUAL_OPEN_MODE` — the RGB channel is a regular (non-virtual) channel |
| 3001 | `wasm-proxy-gateway` | WebSocket→TCP for LDK + Esplora at `ws://192.168.1.147:3001` |
| 3002 | Esplora | block data for BDK/rgb-lib at `http://192.168.1.147:3002` |
| 3005 | RGB proxy → container :3000 | JSON-RPC at `rpc://192.168.1.147:3005/json-rpc`, protocol 0.2 |
| 19445 | bitcoind RPC | wallet `bdk-test` |

## Helper routes (mobile_helper.py, port 3010)

GET: `/lspinfo`, `/lsp/peers`, `/txstatus?txid=…`
POST: `/fund` `{address, btc}`, `/mine` `{blocks}`,
`/lsp/bootstrap` `{peer_pubkey_and_opt_addr, recipient_id?, transport_endpoints?, ticker?,
capacity_sat?, asset_amount?, push_msat?, deliver?}`,
`/lsp/sendrgb` `{asset_id, amount, recipient_id, transport_endpoints}`,
`/lsp/refresh` `{}`, `/lsp/keysend` `{dest_pubkey, amt_msat}`,
`/lsp/invoice`, `/lsp/pay`.

Start: `setsid python3 scripts/mobile_helper.py >/tmp/mobile_helper.out 2>&1 &` (check with `pgrep -af mobile_helper.py`, `curl -s http://192.168.1.147:3010/lspinfo`).

## Restart rules before the device demo

1. **RLN 3101 without `DEFAULT_VIRTUAL_OPEN_MODE`.** Start it as in the demo
   procedure (`env -u DEFAULT_VIRTUAL_OPEN_MODE …`). With that variable set,
   RLN injects `virtual_open_mode` into every `/openchannel` and the bootstrap
   opens a virtual channel instead of the regular RGB one.
2. **Go LSP 8080 stopped.** `pkill -f utexo-lsp-data/application`.
   `/home/aballarini/utexo-lsp-data/start.sh` can restart it when needed, but
   it must not run during the device demo: its reconciler cron opens a
   competing (virtual) channel for every new peer.
3. **Helper 3010 restarted after every edit.** A running process keeps the old
   module: `pkill -f scripts/mobile_helper.py; setsid python3
   scripts/mobile_helper.py >/tmp/mobile_helper.out 2>&1 &`.

## Health check order

1. `pgrep -af "mobile_helper|wasm-proxy-gateway|rgb-lightning-node"` — helper dies silently; every app call then fails with `TypeError: Failed to fetch`.
2. `curl -s http://127.0.0.1:3010/lspinfo`
3. `curl -s http://127.0.0.1:3002/blocks/tip/height` — must be > 0.
4. Phone: `adb -s <serial> shell dumpsys window | grep mCurrentFocus` must be `app.metevo.wallet`; `mWakefulness=Awake`. Backgrounded = frozen (Android 14 cached-app freezer).

## Build / install

```bash
export PATH=/home/aballarini/.nvm/versions/node/v22.23.3/bin:/usr/local/bin:/usr/bin:/bin
cd metevo-app/android
export ANDROID_HOME=/home/aballarini/Android/Sdk
EXPO_PUBLIC_WALLET_MODE=wasm \
EXPO_PUBLIC_WASM_HELPER_URL=http://192.168.1.147:3010 \
EXPO_PUBLIC_WASM_INDEXER_URL=http://192.168.1.147:3002 \
EXPO_PUBLIC_WASM_NODE_PROXY_URL=ws://192.168.1.147:3001 \
EXPO_PUBLIC_WASM_PING=1 \
EXPO_PUBLIC_WASM_SELFTEST=1 \
  sh ./gradlew :app:assembleRelease --no-daemon
adb connect <phone-ip>:<port>
adb install -r --no-streaming app/build/outputs/apk/release/app-release.apk
```

`EXPO_PUBLIC_WASM_ISSUE` is retired (the app never issues; the helper's
`/lsp/bootstrap` owns provisioning). Every rebuild that changes
`EXPO_PUBLIC_*` env must first delete
`app/build/generated/assets/react/release/index.android.bundle` and
`app/build/intermediates/{assets,compressed_assets}` — gradle keeps the stale
bundle UP-TO-DATE otherwise.

## Go METEVO LSP (utexo-lsp, port 8080) — must be STOPPED

The Go service's reconciler cron opens its own (virtual) channel for every new
peer and races the helper's bootstrap. Do not run it while the wasm demo uses
`/lsp/bootstrap`:

```bash
pkill -f utexo-lsp-data/application
```

Provisioning now lives entirely in `scripts/mobile_helper.py`:

1. the device creates a blind RGB invoice (`blindReceiveValue`) and POSTs
   `/lsp/bootstrap` with its pubkey and the `recipient_id`;
2. the helper ensures the USDM asset (issues a fresh NIA when no ticker match
   has `2 × asset_amount` spendable), ensures colorable UTXOs
   (`ensureColoredSpendable`), creates the channel UTXO and calls
   `/openchannel` with `{capacity_sat, push_msat, asset_id, asset_amount,
   public: false, with_anchors: true}` and **no** `virtual_open_mode` — a
   regular RGB channel;
3. it polls `listchannels` until `status: "Opened"` and, when a `recipient_id`
   was supplied, delivers the asset to that blind invoice with `/sendrgb`.

`push_msat` defaults to 250 000 000 and is clamped to `capacity_sat / 2`
(RLN rejects a push above the capacity; the opener keeps sats for its asset
HTLCs). One-time issuance is not needed: `/lsp/bootstrap` issues USDM through
`issue_usdm()` when no ticker match has enough spendable (cache
`/tmp/metevo_usdm_asset.json`; delete it to force a new asset). Deliveries are
idempotent per (asset, peer, blind invoice), persisted in
`/tmp/metevo_bootstrap_deliveries.json`. A second bootstrap call while one is
running returns HTTP 409.

`EXPO_PUBLIC_WASM_ISSUE` stays retired: the app never issues.

## Demo procedure (register / connect / login)

0. LAN side first (order matters): Docker `rgbwasm`-stack containers up
   (`wasm-sdk-esplora-1` publishes bitcoind `19445` + esplora `3002`,
   `wasm-sdk-proxy-1` publishes `3005`), then RLN 3101, then unlock it:

   ```bash
   cd /home/aballarini/rgb-lightning-node
   # no DEFAULT_VIRTUAL_OPEN_MODE: /lsp/bootstrap must open a regular RGB channel
   env -u DEFAULT_VIRTUAL_OPEN_MODE \
     setsid ./target/release/rgb-lightning-node .e2e-regular-rln-datadir2/mobile \
     --daemon-listening-port 3101 --ldk-peer-listening-port 9802 \
     --network regtest --disable-authentication > /tmp/rln.log 2>&1 &
   curl -sS -X POST http://127.0.0.1:3101/unlock -H 'content-type: application/json' \
     -d '{"password":"rln-password","indexer_url":"http://127.0.0.1:3002",
          "proxy_endpoint":"rpc://127.0.0.1:3005/json-rpc","announce_addresses":[]}'
   ```

   Then the helper (3010) and the gateway (3001, env from the process table).
   The RLN node locks after every restart — the unlock call is mandatory. The
   Go METEVO LSP on 8080 must NOT be running (its cron would open a competing
   virtual channel).
1. Build + install the APK (build block above; delete the stale bundle first).
2. Register: launch the app → `Register new wallet` → the 12-word seed screen →
   `I wrote it down` → "Preparing your wallet" → HomeScreen. The device node
   connects to the LSP, creates a blind RGB invoice and POSTs
   `/lsp/bootstrap`; the helper issues/ensures USDM, creates the colorable
   UTXO and the regular 500 000 sat RGB channel (`push 250 000 000 msat` =
   250 000 sat) and delivers the asset to the blind invoice. Expect
   `balanceUsdmBaseUnits: 2000000000` (20.00 USDm) in the `[metevo] wasm ping
   ok` logcat line within ~90 s, and the LSP-side channel row
   (`asset_local_amount: 2000000000`, `virtual_open_mode: null`). No on-chain
   `/fund` is needed: the LSP pushes the sats into the channel.
3. Restart → login: force-stop + relaunch → `Login with fingerprint` → the
   biometric prompt (or auto-login when no fingerprint is enrolled) →
   HomeScreen. The node identity is now stable per seed: the harness flushes
   the LDK runtime state to the persistent store immediately after node
   setup (a force-stop never fires pagehide/beforeunload) and every boot
   preloads it — same seed ⇒ same node pubkey, so `/lsp/bootstrap` finds the
   existing peer+asset channel and does not open a second one. (Identity
   still rotates after `pm clear` — see pitfalls.)
4. LN payments need the ~12 min channel-convergence window after an app
   restart: open the app ~15 min before showing a keysend. Balances appear
   immediately; the selftest (36 attempts / 18 min) covers the window.

## Known pitfalls (all hit on 21–22 Nov)

- **A regular RGB channel, not a virtual one.** The helper's `/openchannel`
  sends no `virtual_open_mode`; RLN 3101 must also run without
  `DEFAULT_VIRTUAL_OPEN_MODE` set, otherwise RLN injects it and the channel
  row comes back with a non-null `virtual_open_mode`.
- **Asset channel opens need on-chain sats.** RLN requires
  `capacity_sat ≤ colored spendable` before opening an asset channel. After a
  reboot/refill: `POST :3010/fund {address, btc: 10}` (address from
  `POST :3101/address {}`), `POST :3010/mine {"blocks":2}`, then
  `POST :3101/createutxos {"up_to":false,"num":5,"size":650000,"fee_rate":10,"skip_sync":false}`.
  `up_to:false` is required: with `up_to:true` the node 403s
  `Allocations already available` and creates nothing.
- **A failed `Initiated` asset send locks the whole supply** (`future` grows,
  `spendable` drops to 0) — e.g. the channel funding of a peer that died
  mid-open. Release it with an explicit batch index (the `null` sweep only
  touches expired transfers):
  `POST :3101/failtransfers {"batch_transfer_idx":<idx>,"no_asset_only":false,"skip_sync":false}`
  then `refreshtransfers`. This recovered the full 1e12 supply with no loss.
- **Stale relay state.** If the device peer connects but the channel never
  converges, check `/tmp/gw2.log`: `Connection reset without closing handshake`
  from the phone means the relay session is dead — restart the gateway (same
  env), force-stop + relaunch the app.
- **Typing a seed via adb into the Connect screen**: `input text` goes through
  Gboard, which autocorrects non-Italian words ("scrap scanoe" → "scarpe
  canoe") and capitalises; the seed then fails validation. Either pick
  dictionary-safe words, or type uppercase (autocorrect skips all-caps; the
  app lowercases before validating).
- **`pm clear` rotates the node identity** and orphans the LSP channel — never
  use it; force-stop only.


