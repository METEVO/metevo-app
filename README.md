<div align="center">

<img src="src/assets/logo_lockup_dark.svg" alt="METEVO" height="72" />
<!-- Project logo slot: add the project-specific logo next to the METEVO lockup. -->

# METEVO

**Voice-Native, Screen-Free Self-Custodial Wallet for Bitcoin L2 (RGB & USDm)**

![Status](https://img.shields.io/badge/status-hackathon%20build-orange)
![Network](https://img.shields.io/badge/network-regtest%20%7C%20signet-blue)
![Expo](https://img.shields.io/badge/Expo-57-000020?logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
![RGB](https://img.shields.io/badge/RGB-USDm-8A2BE2)
![Lightning](https://img.shields.io/badge/Lightning-rgb--lightning--node-F7931A?logo=lightning)
![QVAC](https://img.shields.io/badge/AI-QVAC%20on--device-00B386)
![License](https://img.shields.io/badge/license-not%20specified-lightgrey)

</div>

---
**Contents:** [Overview](#-overview--project-summary) · [Quick Start](#-hackathon-testing--quick-start-guide) · [Limitations](#️-known-limitations--architectural-constraints) · [Previous work](#-previous-work)

## 🚀 Overview / Project Summary

### Team METEVO

| Member | Role | GitHub | Linkedin |
| --- | --- | --- | --- |
| Sevgi | UX/UI, brand & marketing, customer reach-out |  | [@sevgiaydogann](https://www.linkedin.com/in/sevgiaydogann) |
| Andrea | Skeleton wireframe, code review, LSP & node infrastructure | [@ABallarini](https://github.com/ABallarini) | [@andrea-ballarini](https://www.linkedin.com/in/andrea-ballarini/) |
| Zeynep | AI workflow: on-device STT/LLM tuning, multilingual intents | [@ulassude](https://github.com/ulassude) | [@Zeynep](https://www.linkedin.com/in/zeynep-sude-ulas-b7b8a31ba) |
| Edi | Marketability, frontend implementation, protocol | [@bc1edi](https://github.com/bc1edi) | [@Edi](https://www.linkedin.com/in/edi-de-rosa-12302290) |

### The idea

Financial-inclusion tools often fail because they replicate desktop paradigms on mobile devices: seed phrases, hexadecimal hashes and multi-screen flows lock out low-literacy and visually impaired users. METEVO turns the smartphone into a voice-native, screen-free, self-custodial wallet for USDm on Bitcoin's RGB layer: the user speaks naturally in their own language, an entirely on-device AI pipeline (speech-to-text, QVAC/Qwen intent parsing, text-to-speech read-back) understands the request, a single confirmation card keeps the human in charge and a real RGB-over-Lightning transfer settles on Bitcoin, with no voice data or financial metadata ever leaving the device.

### Stack & what is installed and working

- React Native + Expo
- Working today: the complete single-screen wireframe app runs on Android through Expo Go, the TypeScript typecheck passes with zero errors and recordings are stored as .m4a.
- Not yet wired (by design, seams are prepared): real RGB transfers, on-device QVAC voice-to-intent, TTS read-back

### RGB Lighting Stack used

| Piece | Role | Why it is central, not decorative |
|---|---|---|
| **RGB** | The settlement layer of the core flow. | Every send/receive in the demo is a **real RGB transfer of a USDm-token asset** (issue → invoice → send → witness). |
| **QVAC** | The interface itself. | The local model makes the product's two decisions, fully on-device with no network: (1) speech transcript → structured intent `{action: send\|receive\|read, asset: USDm\|BTC, amount, recipient, confidence}`; (2) whether the request is *complete enough* to show a confirmation card or a follow-up question is needed. |
| **WDK** | Self-custodial keys + UTXO management that RGB transfers attach to. | Used for interaction from the mobile wallet app |

## 📱 Hackathon Testing & Quick Start Guide

### Run it: two phones on a local regtest network

Each phone is backed by its own [rgb-lightning-node](https://github.com/RGB-Tools/rgb-lightning-node) (RLN) daemon, reached over its REST API (`EXPO_PUBLIC_WALLET_MODE=remote`). Both nodes, the bitcoind/electrs chain backend and the RGB proxy run in Docker. The app talks to the wallet only through `WalletSessionGateway`. Moving to the on-device node later (`EXPO_PUBLIC_WALLET_MODE=wdk`) changes the env only, not the screens.

The app boots straight into the home shell: there is no sign-in and no wallet creation. The wallet connects by itself on launch (biometrics are opt-in via `EXPO_PUBLIC_WALLET_AUTH`) and the English QVAC voice agent (Whisper + Qwen, `src/ai/{whisper,qwen,onDeviceVoice}.ts`) loads its models in the background — speak after the mic button becomes active.

| `EXPO_PUBLIC_WALLET_MODE` | Keys live on | Use |
| --- | --- | --- |
| `mock` | nowhere (simulated) | Expo Go UI demos |
| `remote` | the RLN daemon | real payments today, two phones on regtest |
| `wdk` | the phone (WDK + Bare worklet) | on-device node, pending the upstream Android fix |

#### Prerequisites

- Docker with Compose v2, `jq`, `openssl`, `curl` (Linux or WSL).
- Node 22 and the Android SDK (`adb`). Two Android phones with USB debugging, or one phone plus an emulator.
- An RLN Docker image built from the same sources as the `openapi.yaml` the app codes against. Images built from June 2026 sources never lock in RGB channels (they stay `Opening`). Sources from September 2026 (`af03c7f`) work:

  ```bash
  git clone --recurse-submodules https://github.com/RGB-Tools/rgb-lightning-node
  cd rgb-lightning-node && docker build -t rgb-lightning-node:latest .
  ```

#### 1. Start the regtest stack

```bash
cd infra/regtest
./regtest.sh up          # first run writes .env with random secrets (gitignored, mode 600)
./regtest.sh bootstrap   # init + unlock + fund alice and bob, issue USDM, open alice->bob channel
python3 lan_proxy.py &   # re-expose the node APIs to the LAN (run in the background)
./regtest.sh status      # balances, channel, and the adb lines for step 3
```

- `bootstrap` is idempotent, so a rerun changes nothing. Node mnemonics go to `infra/regtest/.secrets/` (gitignored, mode 600) and are never printed.
- The channel starts with alice holding 400 USDm and bob 100 USDm, so both phones can pay. You can change this in `.env` (`CHANNEL_*`).
- Only the two node APIs are published. Docker binds them to loopback
  (`127.0.0.1:3111` alice, `127.0.0.1:3112` bob) because docker's published
  ports do not receive inbound LAN traffic under WSL mirrored networking;
  `python3 infra/regtest/lan_proxy.py` re-exposes them on plain
  `0.0.0.0:3101`/`0.0.0.0:3102` sockets, which mirrored networking does
  deliver. Phones reach the node over Wi-Fi at the host's LAN IP
  (`EXPO_PUBLIC_RLN_NODE_URL=http://<host-ip>:3101`), with `adb reverse` as
  the USB fallback. They run without authentication, so do not expose them
  beyond the demo LAN.
- After a restart (`./regtest.sh down` then `up`), nodes come back locked. Run `./regtest.sh unlock`.
- `./regtest.sh reset` wipes all chain and node data.

#### 2. Configure and install the app (one build for both phones)

Create `.env.local` (gitignored):

```bash
EXPO_PUBLIC_WALLET_MODE=remote
EXPO_PUBLIC_RLN_NODE_URL=http://localhost:3001
EXPO_PUBLIC_WALLET_NETWORK=regtest
```

Both phones use the same URL. `adb reverse` decides which node each one reaches. Build and install the debug APK on both devices:

```bash
cd android && NODE_ENV=development ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
adb -s <ALICE_SERIAL> install -r app/build/outputs/apk/debug/app-debug.apk
adb -s <BOB_SERIAL>   install -r app/build/outputs/apk/debug/app-debug.apk
```

(An x86_64 emulator needs `-PreactNativeArchitectures=x86_64`.)

#### Voice models when the QVAC hub is unreachable

By default the QVAC voice agent resolves Whisper and the Qwen LLM from the QVAC model registry and downloads them on first use. On networks where that hub is unreachable (TLS interception, offline demo rigs), sideload instead:

```bash
# .env.local — a value ending in .bin/.gguf selects a local file instead of a registry preset
EXPO_PUBLIC_QVAC_WHISPER_MODEL_ENGLISH=en-small.bin

# copy models/whisper/*.bin into the app sandbox (needs a debuggable build)
node scripts/push-whisper-models.cjs
```

The Qwen LLM is cached at `<documents>/.qvac/models/<sha256(registryPath)[:16]>_<file>.gguf`; a file with the registry's exact size and sha256 checksum skips the download and is checksum-verified on load. The SDK validates every sideloaded model before use, so a wrong file fails loudly instead of silently.

#### 3. Wire each phone to its own node

```bash
adb -s <ALICE_SERIAL> reverse tcp:3001 tcp:3101
adb -s <ALICE_SERIAL> reverse tcp:8081 tcp:8081
adb -s <BOB_SERIAL>   reverse tcp:3001 tcp:3102
adb -s <BOB_SERIAL>   reverse tcp:8081 tcp:8081
```

`adb devices` lists the serials. An emulator also works with `adb reverse`, so use the same lines with its serial.

#### 4. Start Metro and open the wallets

```bash
npx expo start --port 8081 --clear   # --clear after any .env.local change: EXPO_PUBLIC_* is inlined
```

On each phone, go through Language → Theme → **Sign in** → select "Remote node" → **Open wallet**, then pass the biometric prompt. The home shell shows that node's real balances. Alice starts at 400.00 USDm and bob at 100.00 USDm, with "Wallet connected" in the header.

#### 5. Pay between the two wallets

```bash
cd infra/regtest
INVOICE=$(./regtest.sh invoice bob 100000000)   # 1 USDm (precision 8)
./regtest.sh pay alice "$INVOICE"
```

Both phones show the new balances within one poll (`EXPO_PUBLIC_WALLET_STATUS_POLL_MS`, default 10 s). The same flow runs through the app's gateway code in an automated test:

```bash
METEVO_IT_ALICE_URL=http://127.0.0.1:3101 METEVO_IT_BOB_URL=http://127.0.0.1:3102 npx jest tests/integration
```

Phone-to-phone sending from inside the app is not wired for this two-node setup yet. The voice Send flow needs the LSP invoice relay, and the NFC in-person card has no trigger. Use `regtest.sh invoice`/`pay` to move funds for now.

#### 6. Offline behaviour

When a phone's node is unreachable, for example after `docker compose stop rln-alice`, the header reads "Wallet node unreachable". The home screen keeps the last known balances and disables Receive. When the node is back (`start` + `./regtest.sh unlock`), the next poll restores everything without reopening the wallet.

#### Remote node with authentication (beyond local testing)

Put the node behind HTTPS (required: the env schema rejects `http://` when `EXPO_PUBLIC_METEVO_ENV=prod`). Start it with `--root-public-key` and mint a biscuit token per phone. The token is never put in `.env`, because `EXPO_PUBLIC_*` values ship inside the APK. Provision it into the app sandbox instead:

```bash
RLN_NODE_BEARER_TOKEN=<token> ANDROID_SERIAL=<serial> node scripts/push-remote-node-token.cjs
```

The node holds the keys, so anyone who can reach its API controls the wallet.

## ⚠️ Known Limitations & Architectural Constraints

> [!WARNING]
> These constraints apply to the hackathon build.

- **No Offline Support.** We could not run the RGB Lightning nodes directly inside the smartphone during the hackathon, because of technical and architectural constraints: the on-device node (WDK RGB Lightning in a Bare worklet) does not run reliably on Android yet. Each phone therefore talks to its own rgb-lightning-node server over REST (`EXPO_PUBLIC_WALLET_MODE=remote`) and needs a connection to it; when the node is unreachable the app shows the last known balances and disables payments until it is back.
- **No Swap Support.** Swap functionality is not implemented yet. Future work: connect the LSP (Lightning Service Provider, our `utexo-lsp` fork) to the swap mechanism, so USDm and BTC can be swapped over the same channels.

## 🧭 Previous Work

### What we have done so far (prior work, declared)

#### 1. Brainstorming, wireframe sketches and visual design (before the hackathon)

The project started with a first brainstorming session on the product vision (a voice-native financial companion, absolute on-device privacy, accessibility as a first-class citizen) followed by hand-drawn wireframe sketches of the single-screen layout and the first logo/typography explorations; the initial design ideas is included in the repository at [metevo-design.pdf](metevo-design.pdf). In the visual direction every state transition is accompanied by haptic feedback and audio read-back so the app is fully usable without looking at the screen. The original layout blueprint:

~~~text
+-------------------------------------------------------+
|  [>] Profile                        [🔊] Audio: ON    | <--- Status Header
+-------------------------------------------------------+
|                                                       |
|                                                       |
|               [ METEVO AUDIO CANVAS ]                 |
|       "Sending ten USDm to Mama for groceries"        | <--- Live Transcript /
|                  [Intent: SEND_USDM]                  |      Intent Card
|               [Accept or decline Button]              |
|                                                       |
+-------------------------------------------------------+
|                   ((  O  ))                           |
|               THE GIANT TACTILE MIC                   |
|              (Tap to Speak / Hold)                    | <--- Central Hardware
|                                                       |      Mimicking Button
+-------------------------------------------------------+
|  [ History ]                  [ Spending Recap ]      | <--- Quick Context Chips
+-------------------------------------------------------+
|                     [ LOGO ]                          | <--- Footer
+-------------------------------------------------------+
~~~

#### 2. First version of the text-processing prompt (before the hackathon)

The first version of the voice/text processing prompt turns natural-language wallet commands into strict JSON: intents SEND_USDM, CHECK_BALANCE, GET_SPENDING_SUMMARY, GET_TRANSACTION_HISTORY and UNKNOWN, with amount, currency, recipient, timeframe and limit plus purpose (the reason for a transfer) and target_layer (RGB_LN, BTC_LN or ONCHAIN). It enforces hard safety rules ambiguous requests fall back to UNKNOWN and the model never executes financial transactions. Its intents map one-to-one onto the intent cards of the app's dynamic frame. 

The full prompt is stored in [initial_prompt.txt](initial_prompt.txt).

#### 3. Initial implementation of the mocked frontend as a wireframe (hackathon foundation phase)

The current repository is the initial implementation of the mocked frontend, ready to be filled with logic: a single screen with the profile link, one compact balances card (USDm and SATS with mocked values), the last three transactions (mocked list), a dynamic intent frame that renders a TODO card for each of the six supported intents (send USDm, send BTC, create USDm invoice, read transactions, read spending overview, read balance) driven by a useIntents hook, the TALK recording button with its audio toggle and the History/Spending quick links. The recording state machine is already functional: one tap starts, the second tap stops, silence auto-stops after a configurable 3-second window through a race-safe single transition, mic metering feeds a minimal visualizer and every finished recording (.m4a/AAC). All environment-dependent values live exclusively in validated .env/.env.local configuration, components are small and modular and there is intentionally no navigation or state-management library.

~~~bash
npm install
npm start          # Metro; scan the QR with Expo Go (SDK 57)
npx tsc --noEmit   # type gate: zero errors
~~~

#### 4. Initial research on STT and TTS models (before the hackathon)

So far, we have evaluated local, on-device options for the voice pipeline, exploring Whisper for speech-to-text and localized text-to-speech for state read-backs, while building out and benchmarking the local intent parser. Using Qwen3-0.6B, we implemented an engine that converts natural language wallet commands into strict, structured JSON (capturing amounts, recipients, payment methods and purposes) backed by validation rules to prevent incorrect or missing data. Through prompt hardening and hyperparameter tuning, we've achieved 80% accuracy on our small test set, while we need to continue iterating over it, as well as studying the broader speech-to-text and text-to-speech options for the full pipeline.

#### 5. Highlights from protocol testing (past months of 2026)

Before and alongside the hackathon we ran protocol tests in two dedicated repositories; the highlights below are the findings that directly shape METEVO's wallet core.

- [wdk-rgb-flow-testing](https://github.com/ABallarini/wdk-rgb-flow-testing) — end-to-end payment flows between an RGB Lightning Node (RLN, driven through its REST API) and Tether's WDK RGB Lightning library acting as an embedded mobile node, automated on regtest and extended to the public UTEXO Signet network: a basic Lightning payment (WDK invoice paid by RLN via REST), an on-chain BTC transfer a complete RGB NIA asset flow.
- [bitcode](https://github.com/faktotum-project/bitcode) — a terminal coding and Bitcoin agent in Node. multi-provider LLMs (OpenAI, Anthropic, Groq, Ollama, LM Studio), MCP, local skills and custom commands, plus a first integration of QVAC local inference (qvac/bitcode-local), its Bitcoin payment tools are testnet-only and always require explicit human approval.
