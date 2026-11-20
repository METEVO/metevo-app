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
EXPO_PUBLIC_WALLET_MODE=wasm EXPO_PUBLIC_WASM_PING=1 EXPO_PUBLIC_WASM_ISSUE=1 \
  sh ./gradlew :app:assembleRelease --no-daemon
adb connect 192.168.178.21:<port>
adb install -r --no-streaming app/build/outputs/apk/release/app-release.apk
```

`gradlew` may lose its exec bit; use `sh ./gradlew`. Stale JS bundle: delete
`app/build/generated/assets/react/release/index.android.bundle` and rebuild.
