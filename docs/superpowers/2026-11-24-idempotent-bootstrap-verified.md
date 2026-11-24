# Idempotent pubkey bootstrap — verified on device (2026-11-24)

## Design

- LSP = native `rgb-lightning-node` (:3101). The phone alone runs WASM.
- `/lsp/bootstrap` is idempotent **per peer pubkey**: a per-peer ledger
  (`/tmp/metevo_peer_ledger.json`, atomic) is reconciled with live
  `/listchannels` + `/listtransfers`. If the peer already has an `Opened`/`Opening`
  channel or a settled delivery, the helper answers
  `200 {existing:true, asset_id, channel, delivery, peer_balance, lsp_balance}`
  and makes **no** `/openchannel`, `/sendrgb`, `/issueassetnia`, `/createutxos` call.
- `peer_balance.settled` is the peer's own delivered amount (sum of its Settled
  `Send` rows). `lsp_balance` stays the LSP inventory and is no longer shown as the
  user's balance (it had produced the wrong "80 USDm").
- Phone: consumes `existing:true`, adopts the asset id, logs
  `[metevo-diag] bootstrap-existing`, and falls back to `peer_balance` when the
  WASM wallet DB has no settled balance (cold launch). `balanceSource` is
  `wallet` | `lsp` | null; `channelReady` is true when either source has value.
- Readiness window fix: the 180 s timer now arms when the WebView attaches at
  login (not at module load), so a slow login no longer expires it.

## Evidence (device 192.168.0.209:46179 / 45300DLAQ004TS)

First login after install (wallet credited):
```
balanceUsdmBaseUnits=2000000000  balanceSource=wallet  channelReady=true
sends: 2  (idx 9 Settled = earlier identity, idx 10 Settled = this identity)
```
Replay the same peer with a brand-new fake invoice:
```
POST /lsp/bootstrap -> {"existing":true, "delivery":{txid 8be7021b..., status Settled},
                        "peer_balance":{"settled":2000000000}, "lsp_balance":{...}}
sends after replay: 2   (no new send)
```
Cold launch (force-stop, relaunch, login):
```
nodePubkey=02e0751c... (unchanged)
[metevo-diag] bootstrap-existing {txid cc90d8a1fa4a..., delivered true}
balanceUsdmBaseUnits=2000000000  lspBalanceBaseUnits=2000000000  balanceSource=lsp
channelReady=true  provisionError=null
sends after cold launch: 2   (no new send)
```

## Note on the extra delivery (idx 10)

The node identity is derived from `mnemonic + proxy_url + runtime_id`. The host LAN
IP changed (`192.168.1.147` → `192.168.1.30`), so the same seed produced a new
pubkey (`02e0751c...` vs the old `022eb780...`). The LSP correctly provisioned the
new identity once; with a stable proxy URL it does not repeat.

## Still open

- The phone still calls `/mine` (Phase 3).
- Channel path: the LSP still logs `Bad MAC` on the device's frames, so an inbound
  `OpenChannel` cannot complete (see 2026-11-24-bad-mac-handshake.md).
