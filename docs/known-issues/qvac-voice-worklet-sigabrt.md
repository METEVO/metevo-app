# QVAC voice worklet: native SIGABRT during model load (Android)

## Status

In progress. The addon-loading layer is fixed in this repo; the remaining
abort happens inside the prebuilt QVAC/bare-kit native stack once the
fabric addon is actually used, and is version-sensitive to the
`react-native-bare-kit` Android binding.

## Symptom

The app starts, the wallet connects (remote RLN mode), and the QVAC voice
worklet begins its model load. About six seconds after process start the
worklet thread aborts natively and the whole app dies:

```
F/libc: Fatal signal 6 (SIGABRT) ... in tid ... (bare-worklet), pid ... (app.metevo.wallet)
backtrace:
  #00 libc.so (abort)
  #01 libbare-kit.so
  #02 libbare-kit.so (js_callback_s::on_call(v8::FunctionCallbackInfo const&)+104)
  #03 libbare-kit.so
```

`js_callback_s::on_call` is the worklet's native→JS callback entry: a JS
callback invoked from native code threw, and bare-kit's embedder treats an
unhandled error at that stage as fatal (same family as the wallet worklet
crash documented before, but a different trigger).

## What was ruled out or fixed on the way

1. **Addon loading (`CANNOT_LOAD: Cannot load addon 'linked:...'`)** — the
   worklet runtime resolves `linked:` addon specs only against the registry
   compiled into its prebuilt `libbare-kit.so`; the bundle referenced addon
   builds the registry does not know. Fix: `patches/@qvac+sdk+0.21.1.patch`
   rewrites every `linked:` addon reference of the worker bundle (both plain
   entries and the per-platform `{ android, ios }` maps) into `file:` URLs
   inside the app's native library directory, which the runtime dlopens
   directly. The directory comes from the provisioned device config
   (`scripts/push-device-config.cjs`, `nativeLibraryDir`). Verified offline:
   92-100 refs rewritten, zero `linked:libqvac__*` remaining.

2. **Plugin/engine mismatch** — the final app's `qvac.config.json` enabled
   `tts-ggml` and `nmtcpp-translation`, but the configured TTS model
   (Supertonic) is an ONNX model: the ggml engine mis-parsed it (`Unknown
   OLMo setting: token.trim`) inside a native callback. The working AI
   implementation (edi) enables only `llamacpp-completion` and
   `whispercpp-transcription` and never loads TTS. `qvac.config.json` now
   matches that two-plugin set; the TTS plugin needs the `onnx-tts` engine
   (and a packaged `libonnxruntime.so`) before it can come back.

3. **Model files** — `en-small.bin` (Whisper) and the Qwen3-0.6B GGUF are
   sideloaded into the app sandbox and verified; the Qwen cache entry
   matches the registry's `getSingleFileCachePath` layout and checksum, so
   no registry download is needed.

## Remaining difference vs the working edi implementation

The edi app ran the identical worker bundle flow on
`react-native-bare-kit@0.15.6`, whose Android binding ships a prebuilt
`classes.jar`. The final app pinned `0.15.5`, which uses TurboModule
codegen (`specs/`, generated at build time). The native `libbare-kit.so`
is byte-identical between the two versions, so the crash difference lives
in the JS↔native callback plumbing that the binding version changes.

Current attempt: `react-native-bare-kit@0.15.6` plus a one-line pin bump in
`patches/@utexo+rgb-lightning-node-bare+0.2.0-beta.4.patch` (the staging
hook validates the runtime by SHA; the 0.15.6 runtime bytes are identical
to the pinned 0.15.5 ones, so the SHA review still holds).

## Lesson

When a bare-kit worklet aborts inside `js_callback_s::on_call`, look for an
uncaught throw in a native-invoked JS callback (RPC pump, progress
handler), not in the app's own try/catch paths. And when a QVAC model
errors with a garbage-architecture message, first check that the model
format matches the configured engine plugin.
