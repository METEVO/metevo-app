# Wallet Auth Flow + LSP Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wallet-shaped entry flow (register / connect / fingerprint login) with the seed in `expo-secure-store`, and one-time LSP bootstrap (250k sats + 20 USDM pushed into the channel) delivered by the `utexo-lsp` Go service.

**Architecture:** RN owns the seed end to end: generate/import → show once → store encrypted → boot the WASM harness after auth with `?mnemonic=&runtimeId=` (plumbing the harness already has). The Go LSP service drives the existing RLN daemon (3101); its cron provisions a `trusted_no_broadcast` virtual channel per new peer with a 250,000,000 msat push + 2,000,000,000 base units (20 USDM) of the bootstrap-issued IFA asset, skipping peers that already have the channel — "first connect only" is the LSP's behaviour, not app logic. USDm balance on the card comes from the channel's `asset_remote_amount`.

**Tech Stack:** Expo RN (wasm wallet mode), `expo-secure-store`, `expo-local-authentication`, `@scure/bip39` + `@noble/hashes` (both already installed), jest + ts-jest (`tests/` root), Go 1.26 (`utexo-lsp`), regtest demo chain (helper scripts stay for fund/mine).

**Spec:** `docs/superpowers/specs/2026-11-21-wallet-auth-bootstrap-design.md` (read together with this plan; the spec holds the UI patterns from `design/screens/dark/AUTH-*.svg`).

## Global Constraints

- Nothing is pushed; all commits stay local on `feat/on-device-rln`.
- Every rebuild that changes `EXPO_PUBLIC_*` env deletes
  `android/app/build/outputs/../generated/assets/react/release/index.android.bundle` and
  `app/build/intermediates/{assets,compressed_assets}` first (stale-bundle trap).
- Build command (Node 22 on PATH):
  `export PATH=/home/aballarini/.nvm/versions/node/v22.23.3/bin:/usr/local/bin:/usr/bin:/bin && export ANDROID_HOME=/home/aballarini/Android/Sdk && EXPO_PUBLIC_WALLET_MODE=wasm EXPO_PUBLIC_WASM_PING=1 EXPO_PUBLIC_WASM_SELFTEST=1 sh ./gradlew :app:assembleRelease --no-daemon` (run from `metevo-app/android`; `EXPO_PUBLIC_WASM_ISSUE` is retired).
- Device must be foregrounded/unlocked (`app.metevo.wallet`) for anything to run; adb is
  wireless (port changes: `adb mdns services`).
- Demo chain untouched except bringing up the Go service; helper `/lsp/openvirtual`,
  `/lsp/issueusdm`, `/lsp/sendrgb` become unused by the app flow (code stays).
- LSP numbers are exact: capacity 500000 sat, sats push 250000000 msat, asset push
  2000000000 base units (20 USDM), `trusted_no_broadcast`, cron 30 s.

## Review Focus

- Seed normalization on Connect: mixed case, extra spaces, newlines — `validateSeed` must
  normalize and accept; rejects an invalid checksum word list. Test pins it (Task 1).
- Same seed ⇒ same `runtimeId` ⇒ same node identity (no pubkey rotation, no orphan LSP
  session). Test pins it (Task 1).
- Biometric unavailable (no fingerprint enrolled / hardware off): Login must not dead-end —
  auto-login fallback. Manual on device (Task 2).
- Cancel during Connect or Login leaves the stored seed untouched. Manual on device
  (Task 2/Task 6).
- Go LSP down at register: app still works; the card shows "channel provisioning" state
  until the channel exists; balances appear once it does. Manual on device (Task 6).
- Balance zero after channel loss: the USDm read falls back to 0, never to a stale number
  (status keeps last-known only for transient busy errors). Covered by Task 4's harness
  logic and Task 6 device check.

---

### Task 1: Seed custody service

**Files:**
- Create: `src/services/auth/authService.ts`
- Test: `tests/authService.test.ts`

**Interfaces:**
- Produces (used by Tasks 2–3):
  - `generateSeed(): string` — 12-word BIP-39 mnemonic (128 bits, English wordlist).
  - `validateSeed(input: string): string | null` — lowercased, whitespace-split, rejoined
    with single spaces; returns the normalized mnemonic or `null`.
  - `seedToRuntimeId(seed: string): string` — `hex(sha256(utf8(seed)))[0..16]`.
  - `saveWallet(seed: string): Promise<void>` — SecureStore `metevo.seed_v1` = seed,
    `metevo.wallet_exists_v1` = "1".
  - `loadSeed(): Promise<string | null>` — SecureStore read or null.
  - `hasStoredWallet(): Promise<boolean>`.
- SecureStore keys exactly: `metevo.seed_v1`, `metevo.wallet_exists_v1`.

- [ ] **Step 1: Write the failing test** (`tests/authService.test.ts`), jest-mocking
  `expo-secure-store` with an in-memory Map:

```ts
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
  };
});

import { generateSeed, validateSeed, seedToRuntimeId, saveWallet, loadSeed, hasStoredWallet } from '../src/services/auth/authService';

test('generateSeed returns 12 valid words', () => {
  const seed = generateSeed();
  expect(seed.split(/\s+/)).toHaveLength(12);
  expect(validateSeed(seed)).toBe(seed);
});

test('validateSeed normalizes case, extra spaces and newlines', () => {
  const seed = generateSeed();
  const messy = '  ' + seed.toUpperCase().replace(/ /g, '\n  ') + ' ';
  expect(validateSeed(messy)).toBe(seed);
  expect(validateSeed('not a real seed phrase at all')).toBeNull();
});

test('seedToRuntimeId is stable and 16 hex chars', () => {
  const seed = generateSeed();
  expect(seedToRuntimeId(seed)).toBe(seedToRuntimeId(seed));
  expect(seedToRuntimeId(seed)).toMatch(/^[0-9a-f]{16}$/);
  expect(seedToRuntimeId(seed)).not.toBe(seedToRuntimeId(generateSeed()));
});

test('saveWallet stores seed and existence flag; loadSeed round-trips', async () => {
  await saveWallet('abc def');
  expect(await loadSeed()).toBe('abc def');
  expect(await hasStoredWallet()).toBe(true);
});
```

- [ ] **Step 2: Run to verify it fails** — `cd metevo-app && npx jest tests/authService.test.ts`
  Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/services/auth/authService.ts` — `generateMnemonic(wordlist, 128)`
  / `validateMnemonic` from `@scure/bip39`, `wordlist` from `@scure/bip39/wordlists/english`,
  `sha256` from `@noble/hashes/sha2` (match the package's actual export path), and the six
  functions with the exact signatures above (SecureStore `getItemAsync`/`setItemAsync`).
- [ ] **Step 4: Run to verify it passes** — same jest command. Expected: PASS (all four).
- [ ] **Step 5: Commit** — `git add src/services/auth tests/authService.test.ts && git commit -m "feat(auth): seed custody service (secure store + bip39)"`.

### Task 2: AuthScreen

**Files:**
- Create: `src/screens/AuthScreen.tsx`

**Interfaces:**
- Consumes: everything from Task 1; `ThemeContext` tokens (`src/design/ThemeContext`).
- Produces: `AuthScreen({ onAuthenticated }: { onAuthenticated: (seed: string, runtimeId: string) => void })`.
- States (design-repo patterns, requested buttons):
  - `welcome` — no stored wallet: header "Welcome to METEVO / Your money. Your voice.",
    filled `Register new wallet`, outlined `Connect existing seed`; with stored wallet:
    filled `Login with fingerprint`, outlined `Connect another seed`. Mic + "Say Repeat"
    hint kept visually (static label is fine).
  - `register-seed` — full-screen TaskPanel-style "write it down": the 12 words, `Copy`
    button, scrollable, `I wrote it down` confirm → saves via `saveWallet` → `onAuthenticated`.
  - `connect-seed` — TaskPanel with a multiline seed input; `Go back` outlined +
    `Continue` filled (disabled until `validateSeed` returns non-null); on continue:
    confirm-replace dialog when a wallet already exists → `saveWallet` → `onAuthenticated`.
  - `unlocking` — "Please wait / Unlocking your wallet / Complete the fingerprint prompt."
    with `Cancel`; runs `LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock your METEVO wallet' })`
    after `hasHardwareAsync` + `isEnrolledAsync`; if hardware/enrollment missing → skip the
    prompt (auto-login). Success → `loadSeed` → `onAuthenticated`. Cancel/fail → `welcome`.
  - `error` — "Needs attention / Could not unlock your wallet." `Go back` + `Try again`
    (failure of authenticateAsync or empty stored seed).
- While booting after `onAuthenticated`, App shows "Please wait / Preparing your wallet"
  (Task 3) — AuthScreen hands over before that state.

- [ ] **Step 1: Implement AuthScreen** with the five states above (single file; style from
  ThemeContext tokens; no new deps).
- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`. Expected: no errors.
- [ ] **Step 3: Commit** — `git add src/screens/AuthScreen.tsx && git commit -m "feat(auth): AuthScreen (register/connect/fingerprint login)"`.

### Task 3: App gate + harness URI + retire auto-issue

**Files:**
- Modify: `App.tsx` (wasm branch)
- Modify: `src/components/WasmWebViewHost.tsx`

**Interfaces:**
- Consumes: Task 1 service, Task 2 AuthScreen.
- Produces: `WasmWebViewHost({ mnemonic, runtimeId }: { mnemonic: string; runtimeId: string })`
  — source URI
  `file:///android_asset/wasm/harness.html?mnemonic=${encodeURIComponent(mnemonic)}&runtimeId=${runtimeId}`.

- [ ] **Step 1: WasmWebViewHost** — replace the fixed source with the two props; DELETE the
  auto-issue effect (`EXPO_PUBLIC_WASM_ISSUE` branch) entirely; keep PING + SELFTEST effects
  and the offscreen wrapper + `onRenderProcessGone` remount.
- [ ] **Step 2: App.tsx** — in the wasm branch: `const [session, setSession] = useState<{seed: string; runtimeId: string} | null>(null)`;
  AuthScreen computes the runtimeId itself, so the callback is
  `onAuthenticated={(seed, runtimeId) => setSession({ seed, runtimeId })}`; render
  `<WasmWebViewHost mnemonic={session.seed} runtimeId={session.runtimeId} />` +
  `WalletSessionProvider` + `AppRoot` when `session !== null`; show a `Please wait /
  Preparing your wallet` TaskPanel-style overlay while `session !== null` and
  `wallet === null` (via WalletSessionProvider state; if wiring that is invasive, a fixed
  30 s overlay behind HomeScreen's own connecting state is acceptable).
- [ ] **Step 3: Typecheck + jest suite** — `npx tsc --noEmit && npx jest`. Expected: pass.
- [ ] **Step 4: Commit** — `git commit -am "feat(auth): gate the wallet behind auth; boot harness with the stored seed"`.

### Task 4: USDm balance from the channel

**Files:**
- Modify: `android/app/src/main/assets/wasm/harness.js` (`status` case)

**Interfaces:**
- Produces: `status` reply field `balanceUsdmBaseUnits` = first channel with non-null
  `asset_id` → its `asset_remote_amount` (Number), else the previous
  `getAssetBalanceValue(localStorage metevo.usdm_asset_id)` fallback (settled, may be 0),
  else null.
  ERRATA (post-implementation, Task 6): RLN's `openchannel_push_asset_amount` integration
  test pins that the RESPONDER (the device) sees the push as `asset_local_amount`, not
  `asset_remote_amount`. The shipped harness (`b59a385`) reads `asset_local_amount` — that
  is the correct side. Do not "fix" it back to the remote side.

- [ ] **Step 1: Implement** in the `status` case: after `const channels = JSON.parse(node.listChannelsJson())`,
  compute `assetChannel = (channels || []).find((c) => c.asset_id != null)`; if found use
  `Number(assetChannel.asset_remote_amount || 0)`; otherwise the existing stored-asset read.
- [ ] **Step 2: Syntax check** — `node --check` on a `.mjs` copy. Expected: SYNTAX_OK.
- [ ] **Step 3: Commit** — `git commit -am "feat(harness): USDm balance from the RGB channel"`.

### Task 5: Go LSP bring-up + bootstrap asset

**Files (LAN computer):**
- Create: `/home/aballarini/utexo-lsp-data/` (binary, sqlite db, log, `bootstrap.json`)
- Build from: `/home/aballarini/metevo-hack/utexo-lsp` (`CGO_ENABLED=1 go build -o /home/aballarini/utexo-lsp-data/application ./main.go`)

**Interfaces:**
- Produces: running `utexo-lsp` on `:8080` driving RLN 3101; the IFA USDM asset id recorded
  in `/home/aballarini/utexo-lsp-data/bootstrap.json` and in the service env
  (`SUPPORTED_ASSET_IDS`). Later tasks consume only the running service.

- [ ] **Step 1: Build** — `CGO_ENABLED=1 go build -o /home/aballarini/utexo-lsp-data/application ./main.go`
  from the `utexo-lsp` tree. Expected: binary exists.
- [ ] **Step 2: Start (pre-bootstrap env)** — setsid with:
  `LSP_BASE_URL=http://127.0.0.1:3101 RGB_NODE_BASE_URL=http://127.0.0.1:3101
  APAY_BEARER_TOKEN=my-shared-secret-token DATABASE_DRIVER=sqlite
  DATABASE_URL=/home/aballarini/utexo-lsp-data/utexo_lsp.db
  LIGHTNING_ADDRESS_DOMAIN_URL=http://127.0.0.1:8080 :8080` — verify `GET /health` → `{"ok":true}`.
- [ ] **Step 3: Bootstrap the asset** — `POST /metevo/bootstrap` with
  `Authorization: Bearer my-shared-secret-token`, body `{}`. Expected 200 with
  `asset_id`, `ticker: "USDM"`, `issued: 1000000000000`, `config: "SUPPORTED_ASSET_IDS=…\nMETEVO_USD_SATS_RATE=3000"`.
  Save the JSON to `/home/aballarini/utexo-lsp-data/bootstrap.json`. Repeat the call once:
  expected **409** (same-ticker IFA asset exists) — proves once-only issuance.
- [ ] **Step 4: Restart with the asset pinned** — stop the process; restart with the same
  env PLUS `SUPPORTED_ASSET_IDS=<asset_id from step 3>`. Verify `GET /health` ok.
- [ ] **Step 5: Record the runbook** — append the exact start command + env to
  `metevo-app/docs/wasm-rln-runbook.md`. Commit:
  `git commit -am "docs(runbook): utexo-lsp bootstrap bring-up"`.

### Task 6: End-to-end on device

**Files:**
- Modify: `metevo-app/docs/wasm-rln-runbook.md` (demo procedure)

**Interfaces:**
- Consumes: all previous tasks; the built APK; the running Go LSP; the demo chain
  (helper /fund, esplora, bitcoind).

- [ ] **Step 1: Rebuild + install** — Global Constraints build command (fresh bundle) +
  `adb install -r --no-streaming`. Expected: Success.
- [ ] **Step 2: Register flow on device** — launch app: welcome screen with
  `Register new wallet`; tap → seed screen (12 words); confirm → "Preparing your wallet" →
  HomeScreen "Wallet connected". Within ~90 s: `status` logcat line shows
  `balanceUsdmBaseUnits: 2000000000` and `btcSpendableSat` > 0. Screenshot the balance card.
- [ ] **Step 3: LSP-side evidence** — `GET :3101/listchannels` shows the device peer channel
  with `asset_id` + `asset_local_amount: 2000000000`; Go service log line for the
  openchannel; `POST :3101/assetbalance {"asset_id": …}` shows `offchain_outbound` reduced
  by 2e9.
- [ ] **Step 4: Restart → login** — force-stop, relaunch: `Login with fingerprint` →
  authenticate → same balances (`asset_remote_amount` persisted, no new channel — LSP
  `/listchannels` channel count unchanged).
- [ ] **Step 5: Regression** — `wasm selftest ok` in logcat (SELFTEST env on); sats payments
  unaffected. Record the demo procedure (start app ≥12 min before LN payments; USDm visible
  immediately) in the runbook. Commit:
  `git commit -am "docs(runbook): register/connect/login demo procedure"`.

### Task 7: Stable node identity + one-time on-chain funding (post-approval amendments)

**Files:**
- Modify: `android/app/src/main/assets/wasm/harness.js`
- Modify: `docs/wasm-rln-runbook.md`

**Interfaces:**
- Consumes: Task 5's Go LSP (cron provisions per NEW peer identity — so identity stability
  is what makes "no re-delivery after restart" true), Task 6's runbook.
- Produces: node identity stable across force-stops (same seed ⇒ same pubkey); the device
  funds itself on-chain exactly once per wallet (first provisioning), so the card shows
  non-zero sats.

**User decisions this task implements:**
1. Node identity: simplest state-of-the-art fix — the LDK runtime state (which holds the
   node keys) is flushed to the persistent store IMMEDIATELY after node setup, not only on
   `pagehide`/`beforeunload` (a force-stop never fires those, which is why identities
   rotated). Preload at boot already exists (`sdk.preloadPersistentRuntimeState()`).
2. One-time on-chain funding is part of bootstrap: `provisionChannel` funds the device
   on-chain (helper `/fund`) when the vanilla balance is 0, before connecting the peer —
   so the LSP's channel open has an on-chain-funded counterparty and the card shows sats.

- [ ] **Step 1: Immediate LDK flush** — in `main()`, right after the `__sdk` freeze block
  (and keep the pagehide/beforeunload listeners): call `flushLdkState()` once immediately.
  This persists freshly generated node keys on first boot; every later boot preloads them.
- [ ] **Step 2: One-time funding in `provisionChannel`** — before the initial
  `connectPeer`: read `s.wallet.getBtcBalanceValue()` (vanilla spendable/settled, the same
  read as `status`); if < 100000 sat: get address, `helperFetch /fund {address, btc: 0.01}`,
  wait up to 60 s for `getBtcBalanceValue` > 0 with `syncOnline` each second. Guard so a
  provisioning re-run does not double-fund (the balance check IS the guard; the Go cron also
  skips existing channels, so a funded wallet that already has a channel never re-enters
  provisioning at all).
- [ ] **Step 3: Syntax check** — `node --check` on a `.mjs` copy. Expected: SYNTAX_OK.
- [ ] **Step 4: Runbook** — document both behaviours in the demo-procedure section
  (identity now stable per seed; first provisioning funds 0.01 BTC on-chain once).
- [ ] **Step 5: Commit** — `git commit -am "feat(wasm-rln): stable node identity + one-time bootstrap funding"`.

### Task 8: Device verification (Task 6 remainder + Task 7)

**Files:**
- Modify: `docs/wasm-rln-runbook.md`

Steps (device in hand): rebuild+install (Global Constraints), then:
- [ ] Register a fresh wallet → seed → node boots → identity P persists across TWO
  force-stops (check `nodePubkey` in `wasm ping ok` lines) → Go cron opens the channel →
  `balanceUsdmBaseUnits: 2000000000` AND `btcSpendableSat` > 0 → screenshot.
- [ ] Restart → fingerprint login → same pubkey, same balances, no new channel
  (`curl :3101/listchannels` count unchanged).
- [ ] `wasm selftest ok` within the 18-min window → runbook final state → commit runbook
  changes only.

## Notes for the executor

- The harness `issueusdm` case stays in the code but nothing triggers it (retired path;
  keep it as a manual fallback — do not delete in this plan).
- If the Go service's cron does not provision within 90 s, check: device peer actually
  connected (`curl :3010/lsp/peers`), `SUPPORTED_ASSET_IDS` set in the RUNNING process env,
  Go log for skip reasons (payout mismatch / grace).
- `pm clear` on the device still rotates the node identity and orphans the LSP channel —
  never use it; force-stop only.
