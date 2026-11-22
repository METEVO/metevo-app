# Wallet auth flow + LSP bootstrap design (2026-11-21)

Status: awaiting approval. Author: session with the human partner (decisions in
"Approaches" are theirs unless marked [call]).

## Intent

Turn the demo harness into a wallet-shaped app: nobody should see a "DEMO" auto-provisioning
flow. The user registers (new wallet) or connects (existing seed) once, unlocks with their
fingerprint afterwards, and the LSP welcomes a brand-new wallet exactly once — 250,000 sats
pushed into the channel plus 20 USDM — using the product LSP stack (`utexo-lsp`), not the
demo helper scripts.

## Goals

- Entry screen before anything wallet-related:
  - no stored wallet → `Register new wallet` + `Connect existing seed`;
  - stored wallet → `Login` (fingerprint) + `Connect another seed`.
- Register: RN generates the 12-word seed, shows it full-screen once, stores it encrypted in
  `expo-secure-store`, then boots the node.
- Connect: user types their seed (validated), it replaces the stored one (after confirm),
  node boots with it. Works for "reconnect on a new device".
- Login: `expo-local-authentication` fingerprint; PIN/system fallback when biometrics are
  unavailable; on success read the seed and boot the node.
- First connect of a wallet: the LSP opens a `trusted_no_broadcast` virtual channel to the
  device pushing **250,000 sats + 20 USDM** (2,000,000,000 base units, precision 8).
- Never re-deliver: the LSP provisioner naturally opens one channel per peer and skips
  peers that already have one; no app-side delivery logic remains.
- USDm balance on the card comes from the channel itself
  (`asset_remote_amount` on the device's asset channel — the RGB-Lightning model), with the
  on-chain RGB balance as a fallback of 0.

## Non-goals

- On-chain settlement of the in-channel USDM (the LSP's buy/claim/sell flows exist but are
  out of scope; the balance is the in-channel one).
- VSS replication / Keystore migration of node state (separate L7 work).
- Multi-wallet switcher UI (Connect replaces the stored seed after a confirm dialog).
- Changing the RLN LSP daemon itself.

## Anti-goals (what would make this a failure)

- Any path that re-delivers 20 USDM on later opens.
- The seed leaving the device in plaintext (URL param is acceptable only because the seed is
  shown on screen during register anyway; the secure store is the durable home).
- The demo regtest setup breaking before the new flow is verified on the device.

## Constraints / findings from the code

- The harness (`harness.js`) already accepts `?mnemonic=<seed>&runtimeId=<id>` — the seed
  handoff needs no harness change. [call] runtimeId = first 16 hex chars of
  sha256(seed) so the same seed always maps to the same node identity.
- The demo RLN LSP (3101, built from `/home/aballarini/rgb-lightning-node`) exposes asset
  channels: `/listchannels` rows carry `asset_id`, `asset_local_amount`,
  `asset_remote_amount`; `/openchannel` takes `asset_id`/`asset_amount`/`push_asset_amount`
  and `virtual_open_mode`. The wasm SDK mirrors this (`listChannelsJson`,
  `openChannelValueWithOptions`).
- The Go service `utexo-lsp` (internal/lspapi, main.go at the repo root — build with
  `CGO_ENABLED=1 go build -o application ./main.go`) is the product LSP API:
  - `POST /metevo/bootstrap` (bearer `APAY_BEARER_TOKEN`): creates UTXOs and issues the
    METEVO IFA asset — 1,000,000,000,000 base units (10,000 USDM) supply + 100,000,000,000
    inflation, precision 8 — and returns `SUPPORTED_ASSET_IDS=<asset>` config. A second call
    409s (same-ticker IFA asset exists) without re-issuing; the 409 message contains the
    asset id.
  - Its 30 s cron reconciles channels for every peer of the RLN node: the client is
    `LSP_BASE_URL` (not RGB_NODE_BASE_URL); with the 3101 daemon having no `/listconnections`
    it falls back to `/listpeers` and synthesizes one RGB intent per peer per supported
    asset, opening `DefaultVirtualOpenMode` channels with `DefaultChannelPushMsat` sats push
    and `MetevoChannelPushAssetAmount` asset push, skipping peer|asset pairs that already
    have the channel. This is the once-per-wallet delivery — no app logic needed.
- e2e proof this path works: `utexo-lsp/tests/e2e/tests/test_virtual_channel_asset_payment.py`
  (asset virtual channel ready → asset LN invoice payment → `assetbalance.offchain_*` moves).
- Current demo asset (NIA `rgb:6qk~MFsN…`, 100 USDM supply, helper-issued) is replaced by the
  IFA asset from `/metevo/bootstrap`.
- The device rgb wallet DB is wiped on every app restart (MEMFS). With delivery moved into
  the channel this stops mattering for USDm: the in-channel balance lives in the LDK node
  state, which survives restarts (channelReady/`asset_local_amount` persist; to be verified
  on-device during the plan's task for it).
- Go service is NOT currently running; the helper scripts (`mobile_helper.py /lsp/*`) stay
  for funding/mining but their `/lsp/openvirtual`, `/lsp/issueusdm`, `/lsp/sendrgb` paths
  become unused by the app flow.

## Approaches considered

1. **Helper-script bootstrap** (extend `mobile_helper.py` with a combined
   openvirtual+sendrgb call): smallest diff, but it grows the demo scaffolding the product
   is supposed to retire, and per-wallet "only once" state would live in a script.
   Rejected — the user explicitly pointed at the product LSP.
2. **utexo-lsp Go service (chosen)**: `/metevo/bootstrap` for the asset, cron provisioning
   for the per-peer channel with sats+asset push. Matches the product architecture; the
   "first connect only" behaviour falls out of the reconciler's skip logic; the app gains a
   real LSP API it can grow into (buy/claim/lightning address later).
3. **New route on the RLN daemon**: rejected — product policy belongs in the Go service,
   not in the upstream node.

## Parts already decided

- Seed custody: RN owns it; `expo-secure-store` keys: `metevo.seed_v1` (the seed) and
  `metevo.wallet_exists_v1` ("1" once a wallet was registered/connected). Biometric prompt
  guards the read; a failed/unavailable biometric falls back to the system auth prompt and
  then to showing Connect only.
- AuthScreen visual language follows the design repo's auth screens
  (`design/screens/dark/AUTH-*.svg`) with the requested buttons, not the design's
  account-context fields:
  - Welcome state mirrors AUTH-01: "Welcome to METEVO / Your money. Your voice." header,
    primary filled button `Register new wallet`, outlined button `Connect existing seed`;
    when a stored wallet exists the filled button becomes `Login with fingerprint` and the
    outlined one `Connect another seed`. Voice mic + "Say Repeat" hint stay (same as app
    shell).
  - Register/Connect panels follow the TaskPanel pattern (AUTH-02/03): dark panel with mint
    border, title + one-line explanation, `Go back` outlined + `Continue` filled.
  - Waiting state follows AUTH-CHECK ("Please wait / Signing in / Complete the secure
    prompt…" + Cancel) for the biometric prompt; failure state follows AUTH-ERROR
    ("Needs attention / Could not unlock / …" with Go back / Try again). No name/email
    fields — self-custodial seed wallet has no account context.
  - Register's seed display is a full-screen "write it down" view in the same TaskPanel
    style: the 12 words, a copy button, and an enabled-after-scroll `I wrote it down`
    confirm; then a `Please wait / Preparing your wallet` state while the node boots.
- Register shows the phrase on a full-screen "write it down" view (12 words, copy button,
  "I wrote it down" confirmation) — not a native alert: 12 words don't fit an alert and a
  confirm step prevents dismissing by accident. [call]
- The harness boots only after auth succeeds; before that the app shows AuthScreen.
  `WasmWebViewHost` receives the seed via the source URI; the auto-issue effect is deleted
  (ISSUE flag retired); PING/SELFTEST stay as diagnostics.
- Bootstrap numbers: capacity 500,000 sat, push 250,000,000 msat, asset push 2,000,000,000
  base units (20 USDM), `METEVO_USD_SATS_RATE=3000`, cron 30 s, `trusted_no_broadcast`.
- USDm balance read (harness `status`): for the first channel with `asset_id != null`,
  `balanceUsdmBaseUnits = asset_remote_amount`; sats stay `vanilla.spendable`.
- Device connect path unchanged: harness `open` connects the peer through the ws gateway
  (existing code, including the self-heal).
- Go service bring-up on the LAN computer (source tree: `/home/aballarini/metevo-hack/utexo-lsp`,
  NOT `/home/aballarini/utexo-lsp`): `LSP_BASE_URL=http://127.0.0.1:3101`
  (reconciler + node client), `RGB_NODE_BASE_URL=http://127.0.0.1:3101`,
  `APAY_BEARER_TOKEN=my-shared-secret-token` (matches the app's existing device config),
  `DATABASE_URL=/home/aballarini/utexo-lsp-data/utexo_lsp.db` (sqlite),
  `DEFAULT_CHANNEL_CAPACITY_SAT=500000`, `DEFAULT_CHANNEL_PUSH_MSAT=250000000`,
  `METEVO_CHANNEL_PUSH_ASSET_AMOUNT=2000000000`, `DEFAULT_VIRTUAL_OPEN_MODE=trusted_no_broadcast`;
  then one `POST /metevo/bootstrap`, then `SUPPORTED_ASSET_IDS=<asset>` and a restart of the
  Go service. Capacity/push values are NOT defaults — they must be set explicitly.
- Delivery verification on-device: after register, within ~60 s the device `status` shows
  `channelReady: true` and `balanceUsdmBaseUnits: 2000000000`; the LSP `/listchannels` shows
  the peer channel with `asset_id` + `asset_local_amount: 2000000000`.

## Left to the builder

- Which exact Go build command/entrypoint — resolved by the builder check: `main.go` at the
  utexo-lsp repo root, `CGO_ENABLED=1 go build -o application ./main.go`, sqlite via
  `DATABASE_DRIVER=sqlite` + `DATABASE_URL`.
- Where the Go service binary/log live on the LAN host (suggest `/home/aballarini/utexo-lsp-data/`).
- Order-of-operations edge: if the Go service is started after the device peer is already
  connected, the cron still provisions on its next tick — no special casing needed.
- `bip39` wordlist source in RN (`@scure/bip39` is the small, audited choice).
- Migration for the device currently holding the old NIA asset: not needed — a fresh
  register wipes the demo state; document that the old asset is abandoned.

## Verification plan (summary)

1. Go service up: `GET /health` ok; `POST /metevo/bootstrap` returns the asset id once and
   409 on a second call.
2. Register on device: seed shown → stored → node boots → `status` shows
   `balanceUsdmBaseUnits: 2000000000` and sats; LSP `/listchannels` shows the peer channel
   with the asset push; LSP `/assetbalance` `offchain_outbound` drops by 2e9.
3. Restart the app → fingerprint login → same balances (no new channel, no re-push).
4. Connect with a different seed → new node identity → new channel provisioned once.
5. Old demo flow regression: helper /fund + mining still work; selftest keysend still ok.
