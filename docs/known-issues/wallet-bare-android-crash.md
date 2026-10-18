# Resolved: wallet-open crash on Android (Bare worklet)

## Update: root cause found and fixed

The original version of this document concluded the crash was an
unfixable upstream bug in `react-native-bare-kit`'s Android callback
dispatch. **That conclusion was wrong**, and is kept below only as a
record of the investigation. The actual, live-reproduced crash had a
much simpler, fully fixable cause.

## What actually crashed

```
I/ReactNativeJS: '[metevo] worklet: rewrote', 56, 'addons to', '.../lib/arm64'
E/p.metevo.wallet: Uncaught (in promise) SyntaxError: Invalid or unexpected token
    at ScriptModule._createFunction (bare:/worklet.bundle/node_modules/bare-module/lib/module.js:209:24)
    ...
    at BundleModule.start (bare:/worklet.bundle/shared/worklet.js:128:17)
F/libc: Fatal signal 6 (SIGABRT) ... tid (bare-worklet)
```

`bare/wallet-worklet.js` imported `hasUsableChannelWith` from
`wallet.js` **and** declared a local function with the same name - an
illegal duplicate binding in the same ES module scope. Reproduced
directly with the real `bare` CLI (no device needed):

```
$ node_modules/bare-runtime/bin/bare bare/wallet-worklet.js
Uncaught SyntaxError: Identifier 'hasUsableChannelWith' has already been declared
```

This is a hard parse/link-time error. It happens while Bare links the
worklet's module graph, **before** `wallet-worklet.js`'s own
`process.on('uncaughtException', ...)` handler has had a chance to run
- so no amount of JS-side `try/catch` could ever have caught it. Bare's
embedder treats an unhandled error at this stage as fatal and aborts
the whole process, which is why every attempt died with the same
native `SIGABRT` signature regardless of which other layer had
previously been fixed.

## Fix

Renamed the local wrapper to `checkUsableChannelWith` and mapped it to
the same `hasUsableChannelWith` RPC method name the app side already
calls (`bareGateway.ts`), so nothing on the wire protocol changed -
only the colliding local identifier. Verified with the real `bare` CLI
(`node_modules/bare-runtime/bin/bare bare/wallet-worklet.js`) that the
module graph now links past this point. Regression test:
`tests/unit/WorkletBundleSyntax.test.ts` runs the actual worklet entry
through the real Bare runtime and fails on any `SyntaxError` in the
module graph - it reproduces this exact bug when reverted.

## How this was actually found

Static analysis and the earlier Node.js-side probe (see below) could
not have caught this: `tsc`, Jest, and plain Node module resolution
all happily accept two same-named bindings being merged by bundling
tools that don't enforce ES module semantics as strictly as Bare does.
The fix came from reproducing the crash live on the connected device
with Metro attached, reading the actual stack trace, then confirming
and iterating on the fix directly against the real `bare` runtime
(`bare-runtime`, a dev dependency) instead of guessing from native
tombstones alone.

## What remains honestly unverified

The duplicate-declaration bug explains the crash reproduced in this
session. It has **not** been re-verified end-to-end on the physical
device after the fix (reaching `connecting-lsp` → a real channel) -
that still requires a human biometric tap, which this agent cannot
perform. Re-test on-device before relying on this for a demo.

## Original (incorrect) investigation, kept for context

A Node.js-side probe against the exact same native addon pairing
(`@utexo/rgb-lightning-node-nodejs@0.2.0-beta.4` +
`@utexo/wdk-rgb-lightning@0.1.0-beta.15`) succeeded completely: real
wallet unlock, real `bootstrapLsp()` against the live local
`utexo-lsp`, real (empty, pre-cron) channel polling. That evidence is
still valid and still demonstrates the WDK/RGB integration itself
works correctly - it just didn't identify *this* bug, because the bug
was Bare-module-linking-specific (an ES-module duplicate-declaration
rule), not a protocol or native-addon-version mismatch.

Device page size was checked and ruled out as a cause
(`getconf PAGE_SIZE` = 4096, not 16 KiB, so this is not the unrelated
16 KiB-alignment issue tracked upstream for a different addon release).

## Lesson for future changes to the worklet

Any new import added to `bare/wallet-worklet.js` must not share a name
with a locally declared handler function. Nothing in the normal
TypeScript/Jest toolchain enforces this - only Bare's own module
linker does, and only at runtime inside the worklet. Run
`tests/unit/WorkletBundleSyntax.test.ts` (or
`node_modules/bare-runtime/bin/bare bare/wallet-worklet.js` directly)
after editing this file.
