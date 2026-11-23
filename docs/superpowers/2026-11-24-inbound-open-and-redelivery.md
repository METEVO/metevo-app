# Inbound LDK `OpenChannel` and cold-launch redelivery — investigation (2026-11-24)

## 1. Inbound open: what was established

Direction tested: LSP (`rgb-lightning-node` :3101) → phone (RLN WASM in WebView), peer connected
through `wasm-proxy-gateway` (:3001) with a LAN TCP relay, `RELAY_AUTH_REQUIRED=false`.

| Observation | Evidence |
|---|---|
| LSP enqueues the open | `.../datadir4/mobile/.ldk/logs/logs.txt`: `Handling SendOpenChannel event` then `Enqueueing message OpenChannel` |
| LSP never receives accept/error | no `Received accept_channel`, no error line after the enqueue |
| LSP channel row stays `Opening`, `funding_txid: null` | `POST :3101/listchannels` |
| Phone never registers the channel | status `channels: []` (both RGB and vanilla opens) |
| Same failure without anchors and without asset | vanilla `openchannel` (100k sat, `with_anchors:false`) → identical |
| Transport registers the peer at RLN | `POST :3101/listpeers` → device pubkey present |
| Phone↔LSP session churns | runtime events: `peer manager socket disconnected`, `peer transport is disconnected` |

Outbound attempt from the phone (`openChannelValueWithOptions`) fails with **`peer is not connected`**.

That error comes from `bindings/wasm-sdk/src/ldk_live_backend.rs:3039-3061`: `open_channel` polls
`PeerManager::list_peers()` and errors when the peer is absent. So the LDK `PeerManager` never sees
the peer, even though the transport session exists.

The transport session is driven by `bindings/wasm-sdk/src/peer_session.rs`. Its inbound loop
(:368-446) calls `adapter.read_event(...)` and, **on any error**, runs
`socket_disconnected()`, marks the session disconnected and drops the whole inbound queue (:403-417).
Every read failure therefore looks like a silent disconnect to the remote side — exactly what the
LSP log shows.

The Rust read path is real, not a stub: `ldk_live_backend.rs:2113-2158` calls
`peer_manager.read_event(&mut descriptor, &bytes)`. `lib.rs:25` compiles only `ldk_live_backend`
(not the `_wasm`/`_nonwasm` variants). A `PeerHandleError` there maps to
`ERR_PEER_MANAGER_READ_EVENT_FAILED`, which the session turns into a disconnect.

Conclusion: inbound frames are being rejected by LDK's `read_event` (framing/parse level), so the
noise handshake never completes, `list_peers()` stays empty, and both inbound and outbound channel
opens fail. Pinning the exact byte-level cause needs the SDK's own debug lines, which the release
WASM build does not emit (the WebView console is not forwarded and `wasm_debug` is compiled out);
that requires a debug WASM build or a patched `read_event_for_peer` that returns the byte length and
the first message type in the error string.

Not RGB-specific: asset, anchors and capacity were all varied.

## 2. Cold-launch redelivery: confirmed, and it drains the supply

Measured on the pinned asset `rgb:Vua2xlA5-…` after several cold launches:

```
listtransfers: sends 6
  7 Settled  (bcrt:utxob:DNiQiX8o…)
  6 Settled  (bcrt:utxob:VwBFIQWL…)
  5 Failed   (bcrt:wvout:BNzjCs…)
  4 Settled  (bcrt:utxob:tfupbKjl…)
  3 Settled  (bcrt:utxob:cKXYPcdu…)
  2 Settled  (bcrt:utxob:eUubKnef…)
assetbalance: settled 0 / spendable 0
```

`RlnWasmWallet` keeps its DB in `/tmp/rln_wasm_e2e_<runtimeId>` inside the WASM filesystem, which is
re-created on a cold launch. `deliver` is computed as `true` whenever the cached asset id reports no
settled balance (`harness.js`, `provisionChannel`), so every cold launch creates a new blind invoice
and the helper sends another `asset_amount`. Five successful deliveries consumed the 10e9 supply.

So: **yes, cold-launch redelivery still occurs**, and it is supply-draining rather than idempotent.

## 3. What a real fix needs

1. **Inbound open**: a debug WASM build (or a `read_event_for_peer` that reports bytes/type in the
   error) to name the failing frame; then either fix the transport framing or the message handler.
   Until then, keep the LSP-driven on-chain delivery (`channel:false`) for the demo.
2. **Redelivery**: persist the rgb-lib wallet DB (VSS backup or an IndexedDB mirror of `data_dir`) so
   a launch restores the settled balance instead of asking for a new delivery; or gate `deliver` on a
   server-side per-peer "already delivered" record instead of the local wallet state.
