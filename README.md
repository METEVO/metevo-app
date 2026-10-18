# METEVO — Voice-Native, Screen-Free Self-Custodial Wallet for Bitcoin L2 (RGB & USDm)

## Team METEVO

| Member | Role | GitHub | Linkedin |
| --- | --- | --- | --- |
| Sevgi | UX/UI, brand & marketing, customer reach-out |  | [@sevgiaydogann](https://www.linkedin.com/in/sevgiaydogann) |
| Andrea | Skeleton wireframe, code review, LSP & node infrastructure | [@ABallarini](https://github.com/ABallarini) | [@andrea-ballarini](https://www.linkedin.com/in/andrea-ballarini/) |
| Zeynep | AI workflow: on-device STT/LLM tuning, multilingual intents | [@ulassude](https://github.com/ulassude) | [@Zeynep](https://www.linkedin.com/in/zeynep-sude-ulas-b7b8a31ba) |
| Edi | Marketability, frontend implementation, protocol | [@bc1edi](https://github.com/bc1edi) | [@Edi](https://www.linkedin.com/in/edi-de-rosa-12302290) |

## The idea

Financial-inclusion tools often fail because they replicate desktop paradigms on mobile devices: seed phrases, hexadecimal hashes and multi-screen flows lock out low-literacy and visually impaired users. METEVO turns the smartphone into a voice-native, screen-free, self-custodial wallet for USDm on Bitcoin's RGB layer: the user speaks naturally in their own language, an entirely on-device AI pipeline (speech-to-text, QVAC/Qwen intent parsing, text-to-speech read-back) understands the request, a single confirmation card keeps the human in charge and a real RGB-over-Lightning transfer settles on Bitcoin, with no voice data or financial metadata ever leaving the device.

## Stack & what is installed and working

- React Native + Expo
- Working today: the complete single-screen wireframe app runs on Android through Expo Go, the TypeScript typecheck passes with zero errors and recordings are stored as .m4a.
- Not yet wired (by design, seams are prepared): real RGB transfers, on-device QVAC voice-to-intent, TTS read-back

## RGB Lighting Stack used

| Piece | Role | Why it is central, not decorative |
|---|---|---|
| **RGB** | The settlement layer of the core flow. | Every send/receive in the demo is a **real RGB transfer of a USDm-token asset** (issue → invoice → send → witness). |
| **QVAC** | The interface itself. | The local model makes the product's two decisions, fully on-device with no network: (1) speech transcript → structured intent `{action: send\|receive\|read, asset: USDm\|BTC, amount, recipient, confidence}`; (2) whether the request is *complete enough* to show a confirmation card or a follow-up question is needed. |
| **WDK** | Self-custodial keys + UTXO management that RGB transfers attach to. | Used for interaction from the mobile wallet app |

## What we have done so far (prior work, declared)

### 1. Brainstorming, wireframe sketches and visual design (before the hackathon)

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

### 2. First version of the text-processing prompt (before the hackathon)

The first version of the voice/text processing prompt turns natural-language wallet commands into strict JSON: intents SEND_USDM, CHECK_BALANCE, GET_SPENDING_SUMMARY, GET_TRANSACTION_HISTORY and UNKNOWN, with amount, currency, recipient, timeframe and limit plus purpose (the reason for a transfer) and target_layer (RGB_LN, BTC_LN or ONCHAIN). It enforces hard safety rules ambiguous requests fall back to UNKNOWN and the model never executes financial transactions. Its intents map one-to-one onto the intent cards of the app's dynamic frame. 

The full prompt is stored in [initial_prompt.txt](initial_prompt.txt).

### 3. Initial implementation of the mocked frontend as a wireframe (hackathon foundation phase)

The current repository is the initial implementation of the mocked frontend, ready to be filled with logic: a single screen with the profile link, one compact balances card (USDm and SATS with mocked values), the last three transactions (mocked list), a dynamic intent frame that renders a TODO card for each of the six supported intents (send USDm, send BTC, create USDm invoice, read transactions, read spending overview, read balance) driven by a useIntents hook, the TALK recording button with its audio toggle and the History/Spending quick links. The recording state machine is already functional: one tap starts, the second tap stops, silence auto-stops after a configurable 3-second window through a race-safe single transition, mic metering feeds a minimal visualizer and every finished recording (.m4a/AAC). All environment-dependent values live exclusively in validated .env/.env.local configuration, components are small and modular and there is intentionally no navigation or state-management library.

~~~bash
npm install
npm start          # Metro; scan the QR with Expo Go (SDK 57)
npx tsc --noEmit   # type gate: zero errors
~~~

### 4. Initial research on STT and TTS models (before the hackathon)

So far, we have evaluated local, on-device options for the voice pipeline, exploring Whisper for speech-to-text and localized text-to-speech for state read-backs, while building out and benchmarking the local intent parser. Using Qwen3-0.6B, we implemented an engine that converts natural language wallet commands into strict, structured JSON (capturing amounts, recipients, payment methods and purposes) backed by validation rules to prevent incorrect or missing data. Through prompt hardening and hyperparameter tuning, we've achieved 80% accuracy on our small test set, while we need to continue iterating over it, as well as studying the broader speech-to-text and text-to-speech options for the full pipeline.

### 5. Highlights from protocol testing (past months of 2026)

Before and alongside the hackathon we ran protocol tests in two dedicated repositories; the highlights below are the findings that directly shape METEVO's wallet core.

- [wdk-rgb-flow-testing](https://github.com/ABallarini/wdk-rgb-flow-testing) — end-to-end payment flows between an RGB Lightning Node (RLN, driven through its REST API) and Tether's WDK RGB Lightning library acting as an embedded mobile node, automated on regtest and extended to the public UTEXO Signet network: a basic Lightning payment (WDK invoice paid by RLN via REST), an on-chain BTC transfer a complete RGB NIA asset flow.
- [bitcode](https://github.com/faktotum-project/bitcode) — a terminal coding and Bitcoin agent in Node. multi-provider LLMs (OpenAI, Anthropic, Groq, Ollama, LM Studio), MCP, local skills and custom commands, plus a first integration of QVAC local inference (qvac/bitcode-local), its Bitcoin payment tools are testnet-only and always require explicit human approval.
