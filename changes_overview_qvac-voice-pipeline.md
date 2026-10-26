# Changes overview — on-device QVAC voice pipeline (STT → agents → TTS)

Third task, new checkout `metevo-app-voice` (full copy of `metevo-app-redesign`
incl. git history), branch `feat/qvac-voice-pipeline` stacked on
`feat/wallet-onboarding-lsp`. The two local modifications that were already
present in the source checkout (`android/gradle.properties`,
`scripts/push-device-config.cjs`) travel with the copy but stay uncommitted.
Nothing pushed; `main` untouched.

## What this delivers

1. The reference voice workflow (`metevo-ai` Python pipeline + the
   `metevo-app-comp` QVAC app) is ported into the redesign app's TypeScript
   layer, end to end and fully on device:
   - **STT** — language-scoped Whisper models through the QVAC
     `whispercpp-transcription` plugin; non-English speech is transcribed
     straight to English (the language boundary: canonical wallet data stays
     unchanged, only prose is localized).
   - **Agents** — parsing runs through an **agent enum**: `VoiceAgent`
     selects an entry in the agent registry, which redirects to that
     agent's system prompt and JSON answer schema (`agentRunner.ts` is the
     single inference seam; no caller branches on the agent).
     - `WalletIntent`: the METEVO financial intent parser (port of
       `intent_parser.py` + the repo's `initial_prompt.txt`, extended with
       RECEIVE/SWAP from the newer reference prompt).
     - `PaymentConfirmation`: classifies a spoken reply to an on-screen
       payment review as CANCEL / CONTINUE / UNCLEAR (port of
       `conversation_manager.py`; a spoken reply can only dismiss or keep
       the review — it can never execute a payment).
   - **Validation (code, not model)** — port of `validate_result.py` and
     `transaction_validator.py`: currency re-derived from the user's words
     (USDT/EUR abort), amount/limit positivity, purpose-echo check, layer
     gating, direction-conflict rejection, sats-whole-number rule,
     missing-fields readiness.
   - **Wallet JSON** — port of `response_adapter.py`
     (`intent` + `parameters` + `purpose`), plus the mapping from parser
     intents to the app's `IntentId` cards (`send-usdm`, `send-btc`,
     `create-usdm-invoice`, `read-balance`, `read-spending-overview`,
     `read-transactions`).
   - **TTS** — QVAC speech synthesis (Supertonic multilingual GGUF through
     the `onnx-tts` plugin) speaks the localized outcome; PCM is wrapped
     into a WAV container and played via expo-audio. The existing
     `speakAnnouncement` seam is now live; synthesis failure degrades to
     silence + log, never to a broken flow.
2. The recording hand-off seam in `HomeScreen` is wired: finished recording
   -> `useVoicePipeline` -> DynamicFrame card + spoken announcement.
3. Per-language model selection lives in the validated env schema
   (see table below) — no model names are hardcoded in code.
4. `qvac.config.json` selects exactly the three plugins the app needs
   (LLM, Whisper ASR, TTS); `npm run bundle:qvac` regenerates the
   `qvac/` worker bundle via `@qvac/sdk/commands`.

## Safety properties (what the demo should show)

- The model proposes, code decides: every field is re-checked against the
  user's own words before anything reaches the wallet flow.
- Nothing executes from voice: a complete send parks in
  `awaiting-confirmation` and opens the review card; the one-tap touch
  confirm on the card stays the only submission path (propose + approve).
- The model never sees keys or seeds; inference (`src/ai`) and signing
  (`src/services/metevo`) stay separate modules.
- Fail-safe paths: empty transcript, agent failure, validation failure and
  unsupported currency all become structured error outcomes with a spoken
  fallback instead of exceptions crossing the UI.
- Audit trail: `VoiceOutcome.canonicalMessage` carries the English
  canonical sentence (e.g. the confirmation request) for the log; spoken
  prose is never parsed by code.

## Environment variables (all via .env / .env.local, zod-validated)

| Key | Purpose |
| --- | --- |
| `EXPO_PUBLIC_QVAC_WHISPER_MODEL_<LANGUAGE>` | Whisper model file per UI language (english/italiano/turkce/francais/hindi/espanol/kiswahili), resolved under `<documents>/models/whisper` |
| `EXPO_PUBLIC_QVAC_WHISPER_TRANSLATE_TO_ENGLISH` | Transcribe non-English speech straight to English (the parsing boundary) |
| `EXPO_PUBLIC_QVAC_LLM_MODEL` | Intent LLM: QVAC registry preset name (whitelisted in `modelRegistry.ts`) or local file path |
| `EXPO_PUBLIC_QVAC_LLM_MAX_TOKENS` / `EXPO_PUBLIC_QVAC_LLM_TIMEOUT_MS` | Completion budget and fail-safe timeout |
| `EXPO_PUBLIC_QVAC_TTS_MODEL` / `EXPO_PUBLIC_QVAC_TTS_ENGINE` / `EXPO_PUBLIC_QVAC_TTS_VOICE` | Speech synthesis model, engine and baked voice |
| `EXPO_PUBLIC_QVAC_TTS_FALLBACK_LANGUAGE` | Language spoken when the model cannot synthesize the selected one |
| `EXPO_PUBLIC_QVAC_TTS_UNLOAD_AFTER_USE` | Free the TTS model after each announcement (one small model at a time) |

## Device setup (before the demo)

1. `npm install` (Node >= 22.17), then `npm run bundle:qvac` after any
   `qvac.config.json` or SDK change.
2. `npx expo prebuild` (the QVAC expo-plugin adds the platform prebuilds),
   then `npx expo run:android --device` — llamacpp does not run on
   emulators, use a physical device.
3. Provision the Whisper model files named in the env (e.g. `en.bin`,
   `sw.bin`) into the app documents `models/whisper/` directory; a missing
   model surfaces a clear error instead of a silent failure.
4. Registry models (Qwen LLM, Supertonic TTS) download on first use —
   cache them before the demo and keep the device offline afterwards: the
   whole loop then runs with the network disabled.

## Verify in docs / known follow-ups

- Plugin specifiers and `modelType` values were verified against the
  installed `@qvac/sdk` types at integration time (whisper plugin
  `whispercpp-transcription`, TTS plugin `onnx-tts`).
- The Spanish and Kiswahili spoken phrases are first-pass translations;
  the five reference languages carry the wording from the reference
  pipeline's catalog.
- Prefilling the send/review cards from `VoiceOutcome.walletResult` (the
  proposal values the pipeline already validated) is the next UX step;
  today the parsed values are available on the hook outcome.
- Kiswahili TTS depends on the loaded model's language coverage; the
  fallback language env keeps announcements working regardless.
