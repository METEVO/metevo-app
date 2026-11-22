# METEVO On-Device RLN — Virtual Channel Blocker Analysis (Final)

Date: 2026-11-22. Branch: `feat/on-device-rln`.
Latest commits: `00207a4` (crypto bridge), `b59a385` (self-open removal + balance side),
`e7ec144` (stable identity + funding), `42164fe` (channel balance read), `65f21c0`/`416e0e7`/`b41e2b5` (auth flow).

## What works end-to-end on the phone today

1. **Register**: welcome → 12-word seed → confirm → node boots → 0.01 BTC on-chain funded →
   card shows 1,000,000 sats. Login across force-stops works.
2. **LSP provisions the channel**: the Go METEVO LSP cron opens a `trusted_no_broadcast`
   virtual channel (500k sats capacity, 250k sats push, 20 USDM asset push) — the LSP side
   confirms `offchain_outbound: 2000000000` and the channel row appears in `/listchannels`.

## The blocker (one sentence)

The device's WASM LDK runtime never accepts/processes the inbound virtual-channel open from
the LSP, so the channel stays "Opening" on both sides and the 20 USDM never appears on the
device.

## Root cause (traced through the public SDK source)

The chain: LSP sends the funding consignment → device's peer session receives it →
the SDK's peer-hook processes it → **the hook's payload handler has no case for the
virtual-channel funding consignment** → the message is recorded as "unrecognized" and
`applied: false` → dropped.

The exact code path in the SDK (`bindings/wasm-sdk/src/ln_node.rs`, public repo
UTEXO-Protocol/rgb-lightning-node branch `dev`):

```
read_event hook (line 1806):
  → ldk_runtime.peer_read_event_for_peer(peer_pubkey, payload_hex)  ← feeds LDK natively ✓
  → pending_peer_hook_events.push(Payload(payload_hex))

process_events hook (line 1817):
  → ldk_runtime.peer_process_events()  ← LDK processes standard BOLT messages ✓
  → drain_pending_peer_hook_events()  (line 6485)
    → apply_runtime_hook_payload()  (line 6324)

apply_runtime_hook_payload (line 6324):
  1. parse_payment_status_event_payload() → if match, handle payment status
  2. parse_transport_event_payload() → if match, handle peer/channel transport
  3. ELSE → record "unrecognized event payload format" with applied: false  ← DROPPED
```

The LSP's `trusted_no_broadcast` funding consignment is an **RLN custom `rgb_ln_wire`
protocol message** — it is neither a payment-status-update nor a transport-event.
The `apply_runtime_hook_payload` function has **no third case for RGB wire messages**,
so the consignment falls through and is dropped.

**However**: the payload was ALREADY fed to `ldk_runtime.peer_read_event_for_peer()` in step
1 of the `read_event` hook — so LDK received it natively. The LDK's custom message handler
should process the RGB wire message. The question is whether the WASM SDK's LDK runtime has
the custom message handler wired for RGB wire protocol messages.

The "Discarded funding" on the LSP side (17-minute timeout) means the LSP's LDK gave up
waiting for the device to complete the channel funding handshake — the device's LDK DID
receive the messages natively but did not complete the virtual-channel acceptance.

## Why the device's LDK doesn't complete the virtual channel

Most likely cause: the device's LDK runtime receives the `OpenChannel` message from the LSP
and fires the `Event::OpenChannelRequest`. The SDK's event handler checks
`enable_virtual_channels_v0` (set to `true` via `setEnableVirtualChannelsV0(true)` in the
harness). If the flag is correctly mirrored to the LDK runtime backend, the handler should
accept the channel and proceed with the trusted-no-broadcast funding flow.

But the channel never completes. Possible reasons:
1. The `setEnableVirtualChannelsV0` mirror into the live backend
   (`set_virtual_channels_v0_for_runtime`) happens at a different runtime key than the
   `OpenChannelRequest` handler reads (key mismatch between the node's runtime key and the
   wallet's runtime key).
2. The `ensure_stable_identity_for_channel_operations` check fails silently (identity_seed
   is present but the LDK runtime's `set_identity_stable` is called with `false` because
   `identity_stable_for_channel_operations()` returns false at the moment the runtime is
   prepared, before the SDK mnemonic is set).
3. The device's LDK processes the `OpenChannel` but the virtual-channel acceptance logic
   in `ldk.rs` (`handle_open_channel` for trusted_no_broadcast) has an additional
   requirement (e.g. counterparty BTC balance floor, `VIRTUAL_HTLC_MIN_MSAT`) that the
   WASM-side LDK runtime can't satisfy (e.g. it doesn't have the asset registered).

## What was fixed today

- Hermes `crypto.getRandomValues` bridge (`00207a4`) — Register was crashing without it.
- Harness: self-open removed (was blocking the LSP's asset channel permanently — RLN
  allows one virtual session per peer pair), stable identity flush, one-time funding,
  `driveRgbFundingWork` + mining + LSP sync in the status tick and provisioning loop,
  `pendingFunding` + `runtimeEvents` diagnostics, balance from `asset_local_amount`.
- Go LSP: METEVO asset bootstrap (`/metevo/bootstrap`), provisioning env
  (`DEFAULT_CHANNEL_ASSET_AMOUNT=4000000000`, `METEVO_CHANNEL_PUSH_ASSET_AMOUNT=2000000000`),
  `createutxos` tolerance fix, channel push amount configurable (`9e68ec8`).
- Identity root cause: `SHA256("node-signing-key:{mnemonic}:{proxy_url}:{runtime_id}")` —
  rotates when proxy_url changes (PC IP change). In production the LSP URL is a stable
  domain; on LAN it must be pinned.

## Next step (the one-line fix to investigate)

The SDK's `apply_runtime_hook_payload` (ln_node.rs line 6324) needs a third case for
RGB wire protocol messages: `crate::rgb_ln_wire::parse_message(&payload_hex)` → route to
the LDK runtime's custom message handler. This is an upstream SDK change.

Alternatively: check whether the device's LDK runtime processes the messages natively
(the `read_event` hook already feeds them to `peer_read_event_for_peer`) but the
`OpenChannelRequest` event handler rejects the channel because
`ensure_stable_identity_for_channel_operations()` fails at that point on the device.

## Public repo links

- RLN (LSP + WASM SDK source): https://github.com/UTEXO-Protocol/rgb-lightning-node
  - Virtual channel funding registration: `src/ldk.rs` line 2109
  - Funding discard (17-min timeout): `src/ldk.rs` line 3183
  - WASM SDK hook payload handler: `bindings/wasm-sdk/src/ln_node.rs` line 6324
    (`apply_runtime_hook_payload` — the function missing the RGB wire case)
  - WASM SDK hook installation: `bindings/wasm-sdk/src/ln_node.rs` line 1790
    (`installAutoPeerManagerHooks` — `read_event` feeds LDK natively)
  - Node identity derivation: `bindings/wasm-sdk/src/ln_node.rs` line 5186
    (`node_signing_identity` — SHA256 of mnemonic + proxy_url + runtime_id)
- Go METEVO LSP: https://github.com/UTEXO-Protocol/utexo-lsp
  - Channel provisioning: `internal/lspapi/api.go` `reconcileChannels`
  - Bootstrap: `internal/lspapi/metevo.go` `handleMetevoBootstrap`
- Reference flow: https://github.com/ABallarini/wdk-rgb-flow-testing
  - WASM+WDK e2e: `wasm-flow-testing/e2e-test-wasm-wdk.js`
  - Native+WDK e2e: `e2e-payment-flow-wdk-rgb.js`
- Reference RLN tests: https://github.com/ABallarini/rgb-lightning-node/blob/master/src/test/payment.rs
  (`open_channel_funded_raw` — the canonical open/mine/ready loop with funding-txout polling)
- Device harness: `metevo-app/android/app/src/main/assets/wasm/harness.js`
- WASM SDK type declarations: `metevo-app/android/app/src/main/assets/wasm/pkg/rln_wasm_sdk.d.ts`
- Design doc: `metevo-app/docs/superpowers/specs/2026-11-21-wallet-auth-bootstrap-design.md`
- Runbook: `metevo-app/docs/wasm-rln-runbook.md`
