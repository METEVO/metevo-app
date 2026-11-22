# On-device RLN demo runbook (wasm mode)

Companion to `docs/wasm-on-device-rln-handoff.md`. LAN topology, ports and helper routes.

## Processes on the LAN computer (192.168.178.20)

| Port | Process | Notes |
|---|---|---|
| 3010 | `scripts/mobile_helper.py` (python3) | plain HTTP helper, started detached (`setsid`, log in `%TEMP%`) |
| 3101 | LSP `rgb-lightning-node .e2e-regular-rln-datadir/mobile --daemon-listening-port 3101 --ldk-peer-listening-port 9802 --network regtest --disable-authentication --enable-virtual-channels-v0` | LSP API on 3101, LDK peer port 9802 |
| 3001 | `wasm-proxy-gateway` | WebSocket→TCP for LDK + Esplora |
| 3002 | Esplora | block data for BDK/rgb-lib |
| 3005 | RGB proxy → container :3000 | JSON-RPC at `/json-rpc`, protocol 0.2 |
| 19445 | bitcoind RPC | wallet `bdk-test` |

## Helper routes (mobile_helper.py, port 3010)

GET: `/lspinfo`, `/lsp/peers`, `/txstatus?txid=…`
POST: `/fund` `{address, btc}`, `/mine` `{blocks}`,
`/lsp/openvirtual` `{peer_pubkey, capacity_sat, push_msat}`,
`/lsp/issueusdm` `{}`, `/lsp/sendrgb` `{asset_id, amount, recipient_id, transport_endpoints}`,
`/lsp/refresh` `{}`, `/lsp/keysend` `{dest_pubkey, amt_msat}`,
`/lsp/invoice`, `/lsp/pay`.

Start: `setsid python3 scripts/mobile_helper.py >/dev/null 2>&1 &` (check with `pgrep -af mobile_helper.py`, `curl -s http://127.0.0.1:3010/lspinfo`).

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
EXPO_PUBLIC_WALLET_MODE=wasm EXPO_PUBLIC_WASM_PING=1 EXPO_PUBLIC_WASM_SELFTEST=1 \
  sh ./gradlew :app:assembleRelease --no-daemon
adb connect 192.168.178.21:<port>
adb install -r --no-streaming app/build/outputs/apk/release/app-release.apk
```

`EXPO_PUBLIC_WASM_ISSUE` is retired (the app never issues; the Go LSP owns
provisioning). Every rebuild that changes `EXPO_PUBLIC_*` env must first delete
`app/build/generated/assets/react/release/index.android.bundle` and
`app/build/intermediates/{assets,compressed_assets}` — gradle keeps the stale
bundle UP-TO-DATE otherwise.

## METEVO LSP service (utexo-lsp, port 8080)

Go service built from `/home/aballarini/metevo-hack/utexo-lsp`:

```bash
cd /home/aballarini/metevo-hack/utexo-lsp
CGO_ENABLED=1 go build -o /home/aballarini/utexo-lsp-data/application ./main.go
```

Start (detached; live process must run with the second form, asset pinned and
channel amounts set):

```bash
cd /home/aballarini/metevo-hack/utexo-lsp && \
LSP_BASE_URL=http://127.0.0.1:3101 \
RGB_NODE_BASE_URL=http://127.0.0.1:3101 \
APAY_BEARER_TOKEN=my-shared-secret-token \
DATABASE_DRIVER=sqlite \
DATABASE_URL=/home/aballarini/utexo-lsp-data/utexo_lsp.db \
LIGHTNING_ADDRESS_DOMAIN_URL=http://127.0.0.1:8080 \
SUPPORTED_ASSET_IDS=rgb:G_UMjqXO-WDfjO0Z-K~ik1W2-7mhdFbx-yyv2LGo-hZZHkwo \
DEFAULT_CHANNEL_CAPACITY_SAT=500000 \
DEFAULT_CHANNEL_PUSH_MSAT=250000000 \
DEFAULT_CHANNEL_ASSET_AMOUNT=4000000000 \
METEVO_CHANNEL_PUSH_ASSET_AMOUNT=2000000000 \
DEFAULT_VIRTUAL_OPEN_MODE=trusted_no_broadcast \
setsid /home/aballarini/utexo-lsp-data/application \
  > /home/aballarini/utexo-lsp-data/lsp.log 2>&1 &
```

The channel env is required: RLN rejects `push_asset_amount` higher than
`asset_amount` (the cron's opens 400 with `InvalidAmount` otherwise; the code
default of `DEFAULT_CHANNEL_ASSET_AMOUNT` is 1). 4e9 asset_amount covers the
2e9 push and keeps `asset_local_amount: 2000000000` on the LSP side of the
channel row (evidence number), while the device receives the 2e9 push on its
`asset_local_amount` side.

Health: `curl -s http://127.0.0.1:8080/health` → `{"ok":true}`; process check
`pgrep -f utexo-lsp-data/application`. Stop: `pkill -f utexo-lsp-data/application`.

One-time bootstrap (first bring-up on a fresh node only — issues the IFA USDM
asset, 1,000,000,000,000 base units, precision 8):

```bash
curl -s -X POST http://127.0.0.1:8080/metevo/bootstrap \
  -H "Authorization: Bearer my-shared-secret-token" \
  -H "Content-Type: application/json" -d '{}'
```

- `200` → `{asset_id, ticker: "USDM", name, precision: 8, issued, config}`.
  Save the JSON to `/home/aballarini/utexo-lsp-data/bootstrap.json` and restart
  the service with `SUPPORTED_ASSET_IDS=<asset_id>` as above.
- `409` → an asset with ticker `USDM` already exists on the node (once-only
  issuance): the body names the existing `asset_id`; do NOT re-issue, just
  ensure the running process has `SUPPORTED_ASSET_IDS` set to it.

On the fresh node the 200's `issued` field reads `0` (the node reports
`issued_supply: null` for a just-issued IFA); the real supply is verified with
`POST :3101/assetbalance {"asset_id": …}` → `settled: 1000000000000`.

## Demo procedure (register / connect / login)

0. LAN side first (order matters): Docker `rgbwasm`-stack containers up
   (`wasm-sdk-esplora-1` publishes bitcoind `19445` + esplora `3002`,
   `wasm-sdk-proxy-1` publishes `3005`), then RLN 3101, then unlock it:

   ```bash
   cd /home/aballarini/rgb-lightning-node
   setsid ./target/release/rgb-lightning-node .e2e-regular-rln-datadir/mobile \
     --daemon-listening-port 3101 --ldk-peer-listening-port 9802 \
     --network regtest --disable-authentication \
     --enable-virtual-channels-v0 > /tmp/rln.log 2>&1 &
   curl -sS -X POST http://127.0.0.1:3101/unlock -H 'content-type: application/json' \
     -d '{"password":"rln-password","indexer_url":"http://127.0.0.1:3002",
          "proxy_endpoint":"rpc://127.0.0.1:3005/json-rpc","announce_addresses":[]}'
   ```

   Then the helper (3010), the gateway (3001, env from the process table) and
   the Go METEVO LSP (8080, start command above). The RLN node locks after
   every restart — the unlock call is mandatory.
1. Build + install the APK (build block above; delete the stale bundle first).
2. Register: launch the app → `Register new wallet` → the 12-word seed screen →
   `I wrote it down` → "Preparing your wallet" → HomeScreen. The device node
   connects to the LSP and the Go LSP cron opens the virtual channel on its
   next 30 s tick. Expect `balanceUsdmBaseUnits: 2000000000` (20.00 USDm) in
   the `[metevo] wasm ping ok` logcat line within ~90 s of the peer appearing,
   and the LSP-side channel row (`asset_local_amount: 2000000000`,
   `push 250000000 msat`, `trusted_no_broadcast`). The sats card reads the
   on-chain wallet only — it stays `0 sats` unless the old
   `runChannelFlow` faucet path funds it.
3. Restart → login: force-stop + relaunch → `Login with fingerprint` → the
   biometric prompt (or auto-login when no fingerprint is enrolled) →
   HomeScreen. Note: the wasm node's LDK state is MEMFS-resident, so a NEW app
   process gets a fresh node pubkey; the LSP provisions a new channel for it
   (the seed and the on-chain wallet stay seed-derived and stable).
4. LN payments need the ~12 min channel-convergence window after an app
   restart: open the app ~15 min before showing a keysend. Balances appear
   immediately; the selftest (36 attempts / 18 min) covers the window.

## Known pitfalls (all hit on 21–22 Nov)

- **One virtual channel session per peer pair.** The harness must never
  self-open via `/lsp/openvirtual` (fixed in commit `b59a385`): a sats-only
  self-open blocks the cron's asset channel with `virtual channel session
  already exists for this peer pair`.
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


