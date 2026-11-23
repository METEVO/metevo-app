# Phase 1d + Phase 2 experiment — 2026-11-23

Environment: fresh regtest chain (esplora rebuilt, height 150), fresh LSP datadir
`0363ff25…`, asset `rgb:STjORhCH-m5LXUDe-HzV88Ky-iarsoMM-08KIivi-lAm6Pvc`,
phone `45300DLAQ004TS` on `192.168.0.209`, host `192.168.1.30`.

## Result

| Fact | Evidence |
|---|---|
| Bootstrap accepted asynchronously | `POST /lsp/bootstrap` → **202** with job id at 16:14:52 |
| Delivery completed | LSP `Send` `Settled`, recipient `bcrt:utxob:T5Fs_4JW-…`, txid `2fcec1cc…`, at 16:14:5x |
| Phone balance | `[metevo-diag] wallet-diag` → `settled 2000000000 future 2000000000 spendable 2000000000` |
| Phone receive transfer | `listTransfersValue(assetId)` → `{idx:1, kind:ReceiveBlind, status:Settled}` |
| Exactly one send | `listtransfers` for the asset: `total 2 sends 1` (second entry is the Issuance) |
| Self-heal re-post did not duplicate | phone re-posted `/lsp/bootstrap` at 16:16:02 (202); send count stayed 1 (adopt-existing) |
| Stale pin fallback | phone requested its old-chain asset id; helper returned `UnknownContractId`, fell back to `METEVO_PINNED_ASSET_ID` |
| Ping size | status line no longer carries `runtimeEvents`; separate `[metevo-diag] runtime-events` only on change |
| Asset accounting | LSP `assetbalance`: settled 8e9 / future 8e9 / spendable 8e9 after one 2e9 delivery |

## Post-to-balance latency

`POST /lsp/bootstrap` 202 at 16:14:52 → phone balance 2e9 at 16:15:24 = **32 s**, with the
phone's 3 s `skip_sync=false` poll running and the helper mining on `WaitingConfirmations`.

## Stack reset 23:2x (host IP 192.168.1.147, Wi-Fi adb)

Docker lost its containers after a WSL restart; chain came back at height 150. New LSP
datadir4 mnemonic (SAVE this): `antenna pond afraid guard wheel choose run nuclear lunar
perfect hawk awkward`, pubkey `02215ef3…`, asset `rgb:Vua2xlA5-AC64Kag-tyPXiV9-7RXvded-
ZIKcnYS-vT0L~5c` (10e9). Same run, with the `channelReady` fix (`47cd7e4`) installed:

| Fact | Evidence |
|---|---|
| Balance | `usdm 2000000000`, `ready true`, `provisionError null` |
| One send | `listtransfers` sends=1, `Settled`, txid `36fd8242…` |
| Device accounting | stored asset = the new id, `settled/future/spendable 2000000000` |
| UI | `channelReady: true` ⇒ the "Opening your USDm channel…" panel no longer renders |


## Notes for Phase 3

- The phone still calls `/mine` (harness lines ~194, ~293, ~655 in the installed build);
  the helper is now the only miner (`REGTEST_AUTOMINE=1`).
- `channelReady` stays false because the phone sends `channel:false`; the channel path is
  still blocked on the separate inbound `OpenChannel` issue.
- Cold launch re-derives the wallet DB; the app asks for delivery again (new blind invoice)
  and the helper sends another `asset_amount` unless the phone already has a settled balance.
