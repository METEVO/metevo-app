# Changes overview — wallet onboarding, WDK integration and LSP setup

Second task on `metevo-app-redesign`, branch `feat/wallet-onboarding-lsp`
stacked on `feat/metevo-design-update` (design layer from the previous task).
Nothing pushed; `main` untouched.

## What this delivers

1. The prepared WDK implementation (from the other checkout's
   `feat/usdm-buy-flow`) is merged in verbatim: the RGB-Lightning wallet
   service, the METEVO LSP API client, the funding state machine and the
   biometric-gated secure store.
2. The design's wallet journey is implemented as a phase-driven flow:
   Opening (00) -> Language (25/26) -> Theme (27) -> Account (28) ->
   Wallet select & open (29, with recovery from 35) -> connected home shell.
3. The task cards are prepared per the design and mocked where the backend
   is not ready: receive request -> waiting -> receipt (19), payment review
   -> pending -> settled (20/21), contacts list/details/add/alias/delete
   (30-34) with the spec's phone-normalization and soft-delete rules.
4. Two runtime modes behind one state machine, selected only through
   validated environment configuration:
   - `EXPO_PUBLIC_WALLET_MODE=mock` (default): the full flow runs with
     deterministic demo data - works in Expo Go and debug APKs.
   - `EXPO_PUBLIC_WALLET_MODE=wdk`: the real `@utexo/wdk-rgb-lightning`
     node runs on-device (debug APK builds). The native module is required
     lazily, so mock mode never loads it.

## Wallet + LSP flow (real mode)

`createWallet()` -> BIP-39 256-bit mnemonic from the platform CSPRNG
(`expo-crypto`), biometric gate, stored in the device secure store only
(never in env, never logged) -> `openWallet()` -> `createMetevoWallet`
(WDK manager configured with `METEVO_LSP_URL` + bearer token so the node
connects to the LSP as a peer) -> channel provisioning is polled via
`getMetevoWalletStatus` until the USDm channel is usable (30 s window; the
LSP provisions channels for connected peers) -> home shows the real
balance and "Wallet connected". The `fundMetevoWallet` prepared flow
(quote -> pay -> claim) is available for the USDm buy step.

## Environment variables (all via .env / .env.local, zod-validated)

| Key | Purpose |
| --- | --- |
| `EXPO_PUBLIC_WALLET_MODE` | `mock` (default) or `wdk` |
| `EXPO_PUBLIC_WALLET_NETWORK` | `regtest` (default) / testnet / signet / mainnet |
| `EXPO_PUBLIC_BITCOIND_RPC_HOST` / `_PORT` / `_USERNAME` / `_PASSWORD` | wdk-mode chain sync (regtest values; password only in `.env.local`, never committed) |
| `EXPO_PUBLIC_RGB_INDEXER_URL` / `EXPO_PUBLIC_RGB_PROXY_ENDPOINT` | wdk-mode RGB endpoints |
| `METEVO_LSP_URL` / `METEVO_LSP_BEARER_TOKEN` | METEVO LSP `/metevo/*` routes (token equals LSP `APAY_BEARER_TOKEN`; never behind `EXPO_PUBLIC_`) |
| `LSP_PEER_URI` | now validated as `pubkey@host:port` (schema TODO fulfilled) |
| `METEVO_WALLET_MNEMONIC` / `METEVO_WALLET_PASSWORD` | Node-side test scripts only; the app never reads a seed from env |

No key, seed or token is hardcoded anywhere; the app generates its seed on
device and keeps it in `expo-secure-store` behind biometrics.

## Created files

| File | Purpose |
| --- | --- |
| `src/services/metevo/*` (ported) | `wallet.ts`, `lsp-api.ts`, `lsp-client-instance.ts`, `funding.ts`, `secure-store.ts`, `index.ts` |
| `src/services/metevo/wallet-gateway.ts` | One session interface; mock + lazy-WDK implementations |
| `src/services/spokenInteraction.ts` | Insertion seams for the audio/AI phase (read-back, option highlighting) |
| `src/hooks/useWalletSession.ts` | Opening -> language -> theme -> account -> wallet -> home state machine |
| `src/components/onboarding/OpeningSplash.tsx` | Design 00 (vector lockup + tagline) |
| `src/components/onboarding/OnboardingFrame.tsx` | Shared onboarding shell: canvas, voice orb, Hear options seam, actions |
| `src/components/onboarding/LanguageOptions.tsx` | Design 25/26: 7 languages, 4 visible, highlight-vs-select |
| `src/components/onboarding/ThemeOptions.tsx` | Design 27: palette previews + explicit confirm |
| `src/components/onboarding/AccountAccess.tsx` | Design 28: welcome / create (biometric seed setup) / sign-in |
| `src/components/onboarding/WalletSelector.tsx` | Design 29/35: select -> opening -> ready / attention + retry |
| `src/components/ui/ActionButton.tsx` | Design ActionButton: primary/outlined/selected/disabled |
| `src/components/intent-cards/ReceiveRequestCard.tsx` | Design 19 (mocked settlement) |
| `src/components/intent-cards/SendPaymentCard.tsx` | Design 20/21 (mocked proposal + settlement) |
| `src/components/contacts/ContactsPanel.tsx` | Design 30-34 (local mock store) |
| `tests/unit/*`, `tests/e2e/*`, `scripts/test-metevo-flow.cjs`, `jest.config.js` | Ported prepared tests + Node-side LSP flow script |
| `src/assets/logo_lockup_dark.svg`, `back_dark.svg` | Opening + back navigation assets |

## Modified files

`src/config/schema.ts` (wallet/LSP env keys + peer-URI relaxation),
`.env.example`, `package.json`/`package-lock.json`
(`@utexo/wdk-rgb-lightning`, `expo-secure-store`, `expo-local-authentication`,
`expo-crypto`, `@scure/bip39`, jest devDeps, `test` script), `tsconfig.json`
(tests excluded), `src/types/intents.ts` + `src/hooks/useIntents.ts` +
`src/components/intent-cards/IntentCard.tsx` (registry),
`src/components/DynamicFrame.tsx` (clear-intent seam),
`src/screens/HomeScreen.tsx` (phase gate + quick actions + formatted
balances), `src/components/StatusHeader.tsx` (connection state),
`src/components/styles.ts` (`voiceViewport`), `src/components/RecordingControls.tsx`
(single-sourced voice viewport).

Removed: `SendRgbCard.tsx`, `CreateRgbInvoiceCard.tsx` (TODO shells
superseded by the designed cards).

## Testing instructions (Open Code)

From the repository root, with the design package at `../design`:

```bash
# 1. TypeScript gate
npm run typecheck

# 2. Unit tests (18 tests: LSP client + funding flow, native module mocked)
npm test

# 3. Branch hygiene
git log --oneline origin/main..HEAD
git status --short   # must be empty

# 4. Demo in mock mode (Expo Go or any build; the default)
npx expo start --tunnel
```

### Debug APK with the real WDK node (`EXPO_PUBLIC_WALLET_MODE=wdk`)

Connectivity secrets are **not** in the bundle: the debug APK loads them
at runtime from `metevo-wallet-config.json`, provisioned into the app's
internal storage. Prerequisites: JDK 17, Android SDK/platform tools, adb,
and a running regtest stack (bitcoind + RGB indexer + proxy + `utexo-lsp`
with the METEVO bootstrap issued).

```bash
# 1. Prepare the device config (gitignored once filled):
cp scripts/device-wallet-config.example.json scripts/device-wallet-config.json
#    ...fill in regtest values (LSP URL/token, bitcoind RPC, RGB endpoints)

# 2. Build and install the debug APK (native modules autolinked):
#    set EXPO_PUBLIC_WALLET_MODE=wdk in .env.local first
npx expo run:android --variant debug

# 3. Provision the runtime config onto the device (adb + run-as):
node scripts/push-device-config.cjs

# 4. Fully close and relaunch METEVO, then:
#    create account -> biometric prompt -> wallet selection -> Open wallet
#    -> node opens, connects to the LSP, channel provisioning is polled
#    -> home shows "Wallet connected" and the real balance.
```

Re-run step 3 (and relaunch) whenever the config changes; the config file
never touches the APK bundle, so no rebuild is needed after changing it.

### Voice/AI insertion points (no AI implemented here)

- Recording hand-off: `HomeScreen.handleRecordingComplete` (feeds QVAC
  voice-to-intent, which then calls `useIntents().simulateIntent`).
- Spoken read-back / "Hear options": `src/services/spokenInteraction.ts`
  (no-op seams already wired into every onboarding screen).
- Onboarding voice controls render idle/listening states only; recognition
  stays with the audio phase.

## Security audit record (2026-10-17)

A read-only security audit ran over `origin/main..feat/wallet-onboarding-lsp`.
Verified clean: no committed or logged secrets, 256-bit CSPRNG seed
generation, inert SVG assets, sound lockfile integrity, no injection
surfaces, working lazy-require boundary (Expo Go cannot load the native
module), one-shot mock approval UX with amount/destination/fee display, no
auto-resend on timeout.

Mechanical findings fixed in this branch:

| Finding | Fix commit |
| --- | --- |
| M-3 biometric gate missing on the seed read path | `85cd426` (biometric unlock strictly before `readWalletMnemonic`, with gateway ordering test) |
| L-1 TOCTOU race on wallet creation | `dd0626d` (single-flight wrapper in the gateway factory + concurrency test) |
| L-3 weak validation of untrusted LSP responses | `0ad4301` (strict integer/hash/bolt11 validators + 21 hostile-payload tests) |
| L-2 no timeout on LSP HTTP requests | `26dcad1` (race-based fail-fast timeout, signal-independent, + test) |
| new-surface: demo invoice could reach the real node's sendPayment | `1299a62` (`PaymentValidationError` + bolt11 format guard before `sendPayment`; card shows "Nothing was submitted"; wdk plumbing test fixtures updated to bolt11-shaped fakes) |
| L-6 raw error bodies rendered as UI text | `60c6a09` (`describeWalletError` maps failures to fixed text; raw details logged by type only) |
| I-1/I-2/I-3 barrel footgun, dead password API, jest duplicate key | `e99e9a0` (barrel deleted — nothing imported it; existence now checked via a marker key so the seed never loads just for a boolean; dead `storeWalletPassword`/`readWalletPassword` removed) |

Open decisions that need product input (not mechanical):

- **M-1**: RESOLVED (`e98b9b3`) — bitcoind RPC credentials and RGB
  endpoints are no longer bundle-embedded; wdk mode loads them at runtime
  from the provisioned device config file.
- **M-5**: RESOLVED for the demo path (`788099d`, `e0de3e8`) — the chosen
  transport is a runtime-provisioned device config (debug APK + adb push
  via `run-as`; `scripts/push-device-config.cjs`). The long-term direction
  remains runtime-issued per-device LSP tokens issued by the account layer.
- **M-2**: `fundMetevoWallet` still pays the LSP invoice without decoding
  and verifying the invoice against the quote (amount, payment hash). It
  must gain that check plus an explicit approval card before it is wired
  into the UI.
- **M-4**: no seed backup/reveal step exists; before real funds flow, add a
  one-time verified reveal (or a documented recovery plan) and revisit
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.

## Open items

- ~~Failed / unknown payment status views~~ **resolved** (see follow-up).
- ~~Whole-screen theme preview~~ **resolved** (see follow-up).
- ~~Sign-in is design-only~~ **partially resolved**: existing wallets now
  route to sign-in; passkey itself stays seam-only until the team-owned
  account contract lands.
- ~~30 s channel wait~~ **resolved** (see follow-up).
- Whole-screen theme persistence across app restarts (storage contract) is
  still open; the preference is session-scoped for now.

## Follow-up iteration: status, theme and channel honesty

1. **Payment status machine (design 21 rules, now real).**
   The gateway gained `submitPayment(proposal)` (one-shot; returns the
   trackable payment hash) and `checkPayment(hash)` (query-only; never
   creates a replacement). `SendPaymentCard` now runs the full machine:
   pending (poll every 2 s) -> settled / failed, timeout after possible
   submission -> **unknown**, and submit errors -> unknown. Unknown offers
   only "Check again" - the design forbids automatic resending; failed
   requires the node's confirmed failure and offers "New review" (a new
   proposal, never a resend). The proposal itself stays DEMO-marked until
   the resolver contract lands.
2. **Theme-aware style layer + live whole-screen preview.**
   `src/design/theme.ts` (`createTheme(mode)`) + `ThemeContext.tsx`
   (`ThemePreferenceProvider`, `useTheme`, `useThemedStyles`). Every
   component now derives its palette (and its dark/light icon assets) from
   the provider; the deprecated static palette exports were removed. The
   theme onboarding step sets the preference immediately, so the whole
   screen previews the candidate palette live (text, surfaces, outlines,
   symbols - geometry preserved), exactly as section 27 demands.
3. **Channel provisioning honesty.**
   `EXPO_PUBLIC_CHANNEL_PROVISION_TIMEOUT_MS` (default 120 s, range
   5-600 s) replaces the hardcoded 30 s: the LSP provisions channels on a
   cron, so the wait is best-effort and **timing out is not an error** -
   the home shell opens, keeps polling the wallet status every 5 s, shows
   an "Opening your USDm channel…" note (attention outline) and gates the
   Receive action with the explanation until `channelReady`. No fake
   balance is ever shown ("— USDm" until real).
4. **Existing-wallet routing.**
   The gateway exposes `hasStoredWallet()`; the account welcome detects a
   stored wallet and swaps the paths: Sign in becomes primary, Create
   account is disabled with an explanatory note - instead of failing later
   with "a wallet already exists on this device".
5. **Biometric gate hardening.**
   The WDK open path now authenticates with device biometrics **strictly
   before** reading the stored seed (pinned by
   `tests/unit/WalletGateway.test.ts`). Seed generation moved to
   `src/services/metevo/mnemonic.ts`, lazy-required like the native
   module, so mock mode and the unit tests never execute the ESM-only
   BIP-39 dependency.

New/changed in this iteration: `src/design/theme.ts`,
`src/design/ThemeContext.tsx`, `src/services/metevo/mnemonic.ts`,
`src/services/metevo/wallet-gateway.ts` (payment + stored-wallet + channel
API), `src/hooks/useWalletSession.tsx` (context provider),
`src/components/intent-cards/SendPaymentCard.tsx`,
`src/components/onboarding/AccountAccess.tsx`,
`src/screens/HomeScreen.tsx`, `src/components/*` (theme adoption),
`tests/unit/WalletPayments.test.ts` (6 tests), plus schema/`.env.example`
for the new timeout variable.
