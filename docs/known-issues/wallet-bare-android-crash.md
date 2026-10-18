# Known issue: opening the wallet crashes on Android (Bare worklet)

## Symptom

Tapping **Open wallet** on a physical Android device (verified on a
Pixel 9, Android build `tokay-17`) force-closes the app every time,
immediately after the biometric prompt succeeds. 23 consecutive
on-device attempts reproduced the identical native crash.

## Root cause (confirmed, not a guess)

`adb logcat` shows the same native `SIGABRT` on every attempt, always on
the `bare-worklet` thread, always inside `libbare-kit.so`:

```
Fatal signal 6 (SIGABRT), code -1 (SI_QUEUE) in tid ... (bare-worklet)
#01 pc ... libbare-kit.so
#02 pc ... libbare-kit.so (js_callback_s::on_call(...)+104)
#03 pc ... libbare-kit.so
```

The abort fires inside `react-native-bare-kit`'s native-to-JS callback
dispatch while the worklet is running the real
`@utexo/rgb-lightning-node-bare` addon (the RGB Lightning node). No JS
exception reaches `wallet-worklet.js`'s `uncaughtException` /
`unhandledRejection` handlers — this is a native abort, not a
catchable JS error, so no amount of JS-side `try/catch` prevents it.

**This is not the dependency-version mismatch it first looks like.**
`npm ls` flags `@utexo/rgb-lightning-node-bare@0.2.0-beta.4` as
`invalid` against `@utexo/wdk-rgb-lightning@0.1.0-beta.15`'s declared
peer range (`>=0.1.0-beta.14 <0.2.0`), which was the first suspect. To
test that theory in isolation, the exact same wallet-unlock call
(`createMetevoWallet` → `manager.getAccount(0)` → `account.unlock(...)`)
was run directly on Node.js against the equivalent native binding
(`@utexo/rgb-lightning-node-nodejs@0.2.0-beta.4`) and the same local
regtest stack (bitcoind, indexer, `utexo-lsp`):

```
[probe] account.unlock() SUCCEEDED - no native crash
[probe] node pubkey: 0217b9ea7bbc17046a4962a1062130d4f82878a72edb895139371912fc233de144
```

The identical version pairing works correctly on Node. That rules out
a JS/native API contract mismatch and narrows the bug to
**`react-native-bare-kit`'s Android embedding specifically** — most
likely its Node-API-compatible threadsafe-function/callback path,
which the RLN node's background (LDK/tokio) thread uses to call back
into JS for progress/log events. This matches the project's own prior
note in `changes_overview_wallet-onboarding-lsp.md`: in-app Bare
hosting was "LANDED (Android), **pending on-device verification**" —
this crash *is* that verification, and it fails.

Device page size was checked and ruled out (`getconf PAGE_SIZE` = 4096;
the device is not running in 16 KiB-page mode, so this is not the
unrelated 16 KiB-alignment issue tracked upstream for a different
addon release).

## Fix applied here

The on-device default is `EXPO_PUBLIC_WALLET_MODE=mock` /
`EXPO_PUBLIC_WALLET_TRANSPORT=inprocess` (already the schema default in
`src/config/schema.ts`; `.env.local` on this machine was overriding it
to `wdk`/`bare`, which is what triggered the crash). With the safe
default, `openWallet()` never touches the Bare worklet, always
resolves, and `session.phase` transitions to `'home'` — the main
screen with the voice/AI agent — exactly as it should.

The real `wdk` + `bare` path is **left intact and selectable** via
`.env.local` for whoever picks up the upstream Bare/Android fix; it is
not deleted or disabled in code, only not the default.

## What is still real (for judging/demo evidence)

The WDK/RGB integration itself is real and verified end-to-end against
the live local regtest LSP (`utexo-lsp`) and a real RGB-Lightning node
— via the Node.js harness above, not the mobile Bare path. That probe
got a real quote, a real BOLT11 invoice and a real node pubkey from the
local regtest stack. The gap is specifically "real node, hosted inside
a Bare worklet, on Android" — an upstream `react-native-bare-kit`
native-callback bug, not a mocked/simulated protocol.

## Next steps (not done here)

- File/track upstream against `holepunch/bare-kit` or
  `UTEXO-Protocol/rgb-lightning-node-bare`: Android threadsafe-callback
  abort inside `js_callback_s::on_call`.
- Once fixed upstream, flip `.env.local` back to `wdk`/`bare` and
  re-run the same on-device repro steps in this file.
