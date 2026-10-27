# Building METEVO for iPhone (and running it on tablets)

Status of this document: written against the `main` branch at the commit that
caps the tablet layout. It lists every change still needed to build the app on a
Mac and run it on an iPhone, and what to expect on an iPad or an Android tablet.

Today the repository builds and runs on **Android phones only**. The wallet runs
in `remote` mode (HTTP to an `rgb-lightning-node`), the voice pipeline runs
on-device through QVAC, and the in-person link is an Android native module.

---

## 0. Short version

| Target | State | Work needed |
| --- | --- | --- |
| Android phone | works (reference target) | none |
| Android tablet | works, phone-sized column centred | none; tune `MAX_FRAME_WIDTH` if wanted |
| iPhone | builds only after the changes below | config, QVAC worker rebuild, model provisioning, LAN URL |
| iPad | same as Android tablet | same iOS work as iPhone |
| In-person pay/receive (NFC + Wi-Fi Direct) | Android only | native rewrite, out of scope |

---

## 1. Prerequisites on the Mac

- macOS with the current Xcode and command line tools (`xcode-select --install`).
- An Apple ID/team for device signing (`DEVELOPMENT_TEAM`), and the phone
  registered in that team.
- CocoaPods (`brew install cocoapods` or `gem install cocoapods`).
- Node **22** (`.nvmrc`/nvm; Expo 57 refuses older Node here) and npm.
- Docker (optional) if the regtest node stack runs on the same Mac.
- The iPhone must be able to reach the wallet node over the LAN or a tunnel;
  `adb reverse` is not available on iOS (see §3).

---

## 2. Required code and config changes

Each item states the file and the exact edit.

### 2.1 `app.json` — iOS app identity, permissions, ATS

There is no `ios` block today and no `ios/` project. Add:

```json
"ios": {
  "bundleIdentifier": "app.metevo.wallet",
  "buildNumber": "1",
  "appleTeamId": "<YOUR_TEAM_ID>",
  "supportsTablet": true,
  "infoPlist": {
    "NSLocalNetworkUsageDescription": "METEVO talks to your wallet node on this network.",
    "NSAppTransportSecurity": {
      "NSAllowsLocalNetworking": true,
      "NSAllowsArbitraryLoads": true
    }
  }
}
```

- `NSMicrophoneUsageDescription` is already added by the `expo-audio` plugin
  (`microphonePermission` in `app.json`); do not duplicate it.
- `NSLocalNetworkUsageDescription` is required on iOS 14+ before the app may
  open sockets to LAN addresses.
- `NSAllowsArbitraryLoads` is what lets a **development** build talk to
  `http://192.168.x.x:3101`. Apple rejects it in App Store review; for a
  release, use an HTTPS node URL or a `.local` hostname with
  `NSAllowsLocalNetworking` only. See §8.
- `supportsTablet: true` is what makes the app installable natively on an iPad.
- Keep `"orientation": "portrait"`. For App Store submission on iPad, review
  also requires either all orientations or `UIRequiresFullScreen`.

Then generate the project (do not commit `ios/` unless the project decides to):

```bash
npx expo prebuild -p ios --clean
cd ios && pod install && cd ..
```

`react-native-bare-kit` ships `react-native-bare-kit.podspec` and an `ios/`
folder, so the Bare runtime pod resolves.

### 2.2 `scripts/bundle-qvac-sdk.mjs` — the AI worker is hard-coded to Android

Today:

```js
await buildMobileBundle(
  { modRequest: { projectRoot, platform: 'android' } },
  { installMissingPrebuilds: true },
);
```

Change it to take the platform from the first argument, defaulting to Android so
existing Android builds do not change:

```js
const platform = process.argv[2] ?? 'android';
await buildMobileBundle(
  { modRequest: { projectRoot, platform } },
  { installMissingPrebuilds: true },
);
```

Then regenerate per target, immediately before building:

```bash
npm run bundle:qvac -- ios       # iPhone / iPad
npm run bundle:qvac -- android   # back to Android
```

The output is a single file,
`node_modules/@qvac/sdk/dist/worker.mobile.bundle.js`, and it is **overwritten**
by each run: the last platform you bundled is the one that ships. Verify
`qvac/addons.manifest.json` after an iOS run and confirm the addon list matches
the generated bundle.

The iOS addon packages are already dependencies:
`@qvac/asr-ggml-ios`, `@qvac/fabric-ios`, `@qvac/tts-ggml-ios`. The Expo plugin's
`installMissingPrebuilds` pins any package QVAC needs for the current platform.

### 2.3 `src/ai/qvacRuntime.ts` — the STT model has no download fallback

Only the LLM can be provisioned without `adb`:

```ts
stt: { …, fileName: …, minRamGb: 2 },                       // no bytes, no httpUrl
llm: { …, bytes: LLM_BYTES, httpUrl: LLM_HTTP_URL, … },     // can download
```

`provision()` downloads only when both `httpUrl` and `bytes` are set; otherwise
it errors with "The stt model is not on this phone yet. Push …". There is no
`adb push` on iOS, so add the same two fields for `stt`:

```ts
stt: {
  kind: 'stt',
  modelType: 'whispercpp-transcription',
  folder: 'whisper',
  fileName: ENV.EXPO_PUBLIC_QVAC_WHISPER_MODEL_ENGLISH ?? 'en-small.bin',
  bytes: <exact byte size of that file>,
  httpUrl: '<HTTPS url of the ggml whisper model>',
  minRamGb: 2,
},
```

Pin the URL to a commit (the LLM entry already does) and set `bytes` to the exact
size the app should verify. Keep the URL and `EXPO_PUBLIC_QVAC_WHISPER_MODEL_FILE`
consistent. Test with `curl -sIL <url>` first.

The alternative — a file import UI that writes into
`<documents>/models/whisper/` — is more work and not needed for a demo.

### 2.4 Provisioning scripts — `adb` only, no iOS path

These scripts cannot run against an iPhone:

| Script | Purpose | iOS consequence |
| --- | --- | --- |
| `scripts/push-device-config.cjs` | pushes `metevo-wallet-config.json` for **wdk** mode | not needed while `EXPO_PUBLIC_WALLET_MODE=remote` |
| `scripts/push-remote-node-token.cjs` | pushes the RLN bearer token | only needed when the node runs with `--root-public-key` |
| `scripts/push-whisper-models.cjs` | pushes model files | superseded by §2.3 |

For the demo, run the node **without** `--root-public-key` on the iOS side, so
`loadRemoteNodeBearerToken()` finding no file is the supported path. If token
auth is required, add an in-app provisioning screen (out of scope here) or copy
the token into the app's Documents folder with Xcode's Devices window.

### 2.5 Optional: the on-device wallet (wdk mode)

`EXPO_PUBLIC_WALLET_MODE=wdk` starts a Bare worklet with
`bare/wallet.rlnbundle`. That path is Android-specific in three places:

- the bundle is produced with `bare-pack --linked` against Android prebuilds;
- `rewriteLinkedAddons()` rewrites `linked:` addons to `file:` URLs inside
  `nativeLibraryDir`, which the provisioning script derives from the APK path;
- `@utexo/rgb-lightning-node-bare-ios` is installed, but nothing stages it.

Re-enabling wdk on iOS needs an iOS bundle (`bare-pack` for `ios-arm64`), a
different addon-resolution strategy (or a bare-kit build with the addons linked
in), and its own provisioning file. **Not needed for the current remote-mode
demo.**

### 2.6 In-person pay/receive — no iOS equivalent

`src/services/localelink/index.ts` binds `NativeModules.MetevoLocalLinkModule`,
implemented only in Kotlin:

```
android/app/src/main/java/app/metevo/wallet/localelink/
```

iOS has no third-party NFC card emulation and no Wi-Fi Direct. The JS already
degrades: `isLocalLinkNative()` returns `false` and the flow reports that the
local link is unavailable (the Pixel shows the same message today). A real iOS
port needs `MultipeerConnectivity`/AWDL plus a QR-based fallback. Out of scope.

### 2.7 Already platform-neutral — no change

- All UI, theme, intents, voice state machine, `AttentionSignal`: no
  `Platform.OS` branch anywhere in `src/`.
- `expo-audio`, `expo-secure-store`, `expo-local-authentication`,
  `expo-device`, `expo-file-system`, `react-native-svg`: iOS-capable.
- Remote wallet gateway: plain HTTP + zod, no native code.

---

## 3. Connecting the iPhone to the wallet node

iOS has no `adb reverse`, so `EXPO_PUBLIC_RLN_NODE_URL=http://127.0.0.1:3101`
(used through the USB tunnel on Android) does not work on a physical iPhone.

Options, in order of least friction:

1. **LAN** — start the regtest stack on the Mac and run
   `infra/regtest/lan_proxy.py` there. It binds `0.0.0.0:3101` → node `3111`, so
   the phone can use `http://<mac-lan-ip>:3101`. Allow the port through the macOS
   firewall and keep both devices on the same network. This needs the ATS
   exception from §2.1.
2. **Simulator** — `http://127.0.0.1:3101` works as-is, but QVAC refuses to load
   models on a simulator (`isPhysicalDevice === false` is an explicit error in
   `qvacRuntime.ts`), so the wallet can be tested, voice cannot.
3. **Tunnel** — an HTTPS tunnel over the node; slower and unnecessary for a demo.

Set the value in `.env.local` (gitignored):

```
EXPO_PUBLIC_WALLET_MODE=remote
EXPO_PUBLIC_RLN_NODE_URL=http://<mac-lan-ip>:3101
EXPO_PUBLIC_WALLET_NETWORK=regtest
EXPO_PUBLIC_CHANNEL_PROVISION_TIMEOUT_MS=120000
EXPO_PUBLIC_QVAC_WHISPER_MODEL_ENGLISH=en-small.bin
EXPO_PUBLIC_QVAC_LLM_MODEL_FILE=Qwen3-0.6B-Q4_0.gguf
```

`EXPO_PUBLIC_*` values are inlined into the bundle. Never move the bearer token,
bitcoind credentials or the node root key there.

---

## 4. Build and run

```bash
nvm use 22
npm ci
npm run bundle:qvac -- ios            # §2.2, after any npm install
npx expo prebuild -p ios --clean      # §2.1, first time and after plugin changes
cd ios && pod install && cd ..
npx expo run:ios --device             # pick the connected iPhone
```

For a release/TestFlight build, use EAS with the same order
(`bundle:qvac` → `eas build -p ios`), and remember the ATS restriction from §2.1.

First run on the device:

1. Wallet opens against the LAN node; balance and channel state appear.
2. Press and hold the microphone: the app downloads the LLM (~382 MB, HTTPS) on
   first use, and the STT model once §2.3 is done. Both land in
   `<documents>/models/`.
3. Payment requests create real invoices through the node; pay one from the
   regtest side and confirm the "Received" state.

---

## 5. Verification checklist for the iPhone build

- [ ] App installs and launches; the METEVO mark is centred between Profile and
      Audio, bottom links show the icon pinned left and the label centred.
- [ ] `Wallet connected` with the live balance (USDm **and** sats).
- [ ] Offline/unreachable: attention panel, orange title, "Last known balance",
      orange attention microphone, "Needs attention", `Reconnect` recovers.
- [ ] Voice turn on the device: STT loads, the intent card opens, the invoice is
      real and settles.
- [ ] Card errors (failed/unknown/stopped) turn the panel, the microphone and the
      balance label into the attention state.
- [ ] In-person controls report the local link is unavailable (expected, §2.6).
- [ ] `npm run typecheck` and `npm test` still pass with the changes.

---

## 6. What will not work on iPhone

| Feature | Why |
| --- | --- |
| In-person pay/receive (NFC + Wi-Fi Direct) | no native module; no iOS API for third-party card emulation or Wi-Fi Direct |
| On-device wallet (`EXPO_PUBLIC_WALLET_MODE=wdk`) | bundle and addon staging are Android-specific (§2.5) |
| Voice on the Simulator | QVAC requires a physical device by design |
| `adb`-based provisioning scripts | no `adb` on iOS (§2.4) |
| Neural TTS | not bundled in this build on any platform; replies use the system voice |

---

## 7. Tablet layout

`src/design/theme.ts` now caps the reference frame:

```ts
const MAX_FRAME_WIDTH = 460;

export function designFrameWidth(): number {
  return Math.min(Dimensions.get('window').width, MAX_FRAME_WIDTH);
}

export const scale = (referenceUnits: number): number =>
  (referenceUnits * designFrameWidth()) / REFERENCE_FRAME_WIDTH;
```

`HomeScreen`'s shell takes `maxWidth: designFrameWidth()` and `alignSelf:
'center'`, so past 460 logical pixels the design stops growing and the column is
centred instead of magnified. This is what keeps an iPad or a 10" Android tablet
readable; verified with `adb shell wm size 1600x2560` + `wm density 320`
(800×1280 dp).

Tuning: raise `MAX_FRAME_WIDTH` if the column looks too narrow on a large iPad,
lower it to stay closer to the phone. It is the only number to touch. Real
tablet-specific composition (two columns, larger panels) would be a design task,
not a config change.

`orientation` stays `portrait`; tablet landscape is not supported today.

---

## 8. Risks and open questions

- **QVAC on iOS is untested.** The addon packages exist and the SDK lists iOS,
  but every run so far used the Android worker bundle. Budget a debugging
  session for the first iOS build rather than assuming it is green.
- **The Qwen intent tier does not load on Android** (`CANNOT_LOAD`, fabric
  addon). The iOS addon is a different binary; whether it loads is unknown.
  Voice falls back to the command parser either way.
- **ATS.** `NSAllowsArbitraryLoads` is a development shortcut. A submission needs
  an HTTPS node endpoint, a `.local` host with `NSAllowsLocalNetworking`, or a
  per-domain exception; Apple does not accept exceptions for raw IP addresses.
- **Signing.** `appleTeamId` must be a real team; free personal teams expire
  after 7 days of app install.
- **Storage.** Whisper (`small.en` is ~460 MB class) plus Qwen (~382 MB) plus
  models pushed separately means roughly 0.9 GB in the app sandbox; check the
  device has room before the demo.
