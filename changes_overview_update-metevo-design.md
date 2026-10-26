# Changes overview — METEVO design update

Integration of the METEVO design handoff (`../design`, the visual and
interaction specification extracted from the supplied SVGs) into this
Expo/React Native mockup app. Branch: `feat/metevo-design-update`, cut from
`origin/main` (`49f4095`). Nothing was pushed; `main` was never touched.

## Scope decisions

- The 70 reference screens are visual references, not routes (per
  `../design/specifications/IMPLEMENTATION.md`). This update restyles the
  existing single-flow shell instead of inventing 70 screens.
- Launch theme is **dark** (`00_opening_screen.svg` is `launch-dark`; token
  palette `dark` is wired). Light-theme assets are included so a later
  ThemeOptions component can switch palettes without new assets.
- Fonts are **not** bundled: the design package does not license font files,
  so text keeps the system font. This is recorded in
  `src/components/styles.ts`.
- Design tokens contain no credentials; no `.env` files were created or
  changed. No secrets exist in this diff.
- `initial_prompt.txt`, the audio pipeline (`useAudioRecorder`, `expo-audio`),
  wallet/intent business logic and configuration schemas were not modified.
- Assets copied from `../design/assets` were checked to contain no scripts
  and no external references before being committed.

## Created files

| File | Purpose |
| --- | --- |
| `src/design/designTokens.ts` | Verbatim copy of `../design/tokens/design_tokens.ts` — single source of visual truth |
| `src/components/StatusHeader.tsx` | Design shell header: profile, METEVO logo mark, audio toggle |
| `src/assets/*.svg` (22 files) | Voice states ×5 ×2 themes, profile/history/spending/audio on/audio off/logo mark ×2 themes |
| `declarations.d.ts` | Type declaration for `*.svg` module imports |
| `changes_overview_update-metevo-design.md` | This document |

## Modified files

| File | Change |
| --- | --- |
| `src/components/styles.ts` | All values now derive from `designTokens` (colors, scaled layout, typography, `voiceStates`); `scale()` implements `runtimeGuidance.scaleFormula`; superseded wireframe aliases (`danger`, `primaryLabel`) removed |
| `App.tsx` | Root background from tokens (dark `#000000`) |
| `metro.config.js` | `react-native-svg-transformer` wired; `svg` moved from asset extensions to source extensions |
| `package.json` / `package-lock.json` | `react-native-svg@15.15.4` (Expo SDK 57 pinned version) + dev `react-native-svg-transformer` |
| `src/screens/HomeScreen.tsx` | Fixed shell: anchored header + balance, scrollable task canvas, anchored voice control and History/Spending |
| `src/components/RecordingControls.tsx` | Renders the design voice states (idle microphone / listening stop-square) at the full 80-unit accessibility viewport; audio toggle moved to `StatusHeader`; recording state machine untouched |
| `src/components/VoiceVisualizer.tsx` | Deleted — superseded by the design voice state assets (processing state is `voice_processing_*.svg`) |
| `src/components/ProfileLink.tsx` | Profile icon asset inside the avatar control |
| `src/components/HistorySpendingLinks.tsx` | History/Spending icon assets with labels; touch target ≥ 48 px |
| `src/components/TransactionList.tsx` | Hardcoded `#666666` replaced by `colors.textMuted` |
| `src/components/intent-cards/IntentCardShell.tsx` | Placeholder outline now uses the `attention` state color |
| `src/components/DynamicFrame.tsx` | Canvas min-height from `layout.taskCanvas` token |

## Commits (oldest first)

1. `9ae46e7` feat(design): integrate metevo design tokens into shared styles
2. `4f365ec` chore(ui): render svg design assets via react-native-svg
3. `6dae494` feat(design): add metevo voice and interface svg assets
4. `57867e8` feat(ui): add status header with logo and audio toggle
5. `e2af443` feat(ui): align task canvas and list cards with tokens
6. `bcd5922` feat(ui): swap talk button for voice state assets
7. `ddef3f8` feat(ui): use design icons in profile and history actions
8. `a10f6df` feat(ui): anchor fixed shell layout in home screen
9. `0721116` chore(ui): drop superseded wireframe style aliases
10. `docs(design): add changes overview for design update` (this file)

## Architectural choices

- **Token bridge, not a styling engine.** `src/components/styles.ts` keeps
  its established export surface (`colors`, `layout`, `typography`,
  `cardBase`) so existing components compile unchanged; the values now come
  from `designTokens`. Semantic voice-state colors are exposed as
  `voiceStates`. No theme provider, no CSS-in-JS, no asset loader was added.
- **Reference-unit scaling.** `scale(referenceUnits)` multiplies by
  `windowWidth / 236.8` (the token scale formula), measured once at module
  init (portrait is locked in `app.json`). Voice assets render at the full
  80-unit viewport so state outlines keep their clearance; the visual fill
  diameter stays 63 reference units, per `ACCESSIBILITY.md`.
- **Icons render at intrinsic size.** Each icon's rendered size is
  `scale(intrinsic viewBox size)`, so no hand-picked pixel values entered
  the code.
- **Voice control states.** Idle = `voice_idle` asset, listening =
  `voice_listening` asset; stopping never implies acceptance. Processing,
  success and attention states are shipped as assets and will be wired by
  the functional phases that own those states.
- **Fixed shell.** Header, balance, voice control and bottom actions are
  anchored; only the task canvas scrolls, matching the handoff's fixed-shell
  rule and keeping the voice anchor stationary.

## Testing instructions (Open Code)

Run from the repository root (`metevo-app-redesign/`). The design package is
expected at `../design`.

1. **TypeScript gate** (the project's existing check; passes clean):

   ```bash
   npm run typecheck
   ```

2. **Asset integrity** (must print `CLEAN`):

   ```bash
   grep -l -i -E 'script|href|url\(' src/assets/*.svg || echo CLEAN
   ```

3. **Branch hygiene** (must list only `feat/metevo-design-update` commits,
   none on `main`):

   ```bash
   git log --oneline origin/main..HEAD
   git status --short   # must be empty
   ```

4. **Visual / on-device check** (requires Node >= 20.16 for the Expo CLI and
   a device or emulator; not runnable in the authoring environment, which
   has Node 18):

   ```bash
   npx expo start
   ```

   Then verify on the device:
   - dark launch background, METEVO mark centered in the header;
   - voice control shows the mint microphone silhouette (idle) and the pink
     stop square with solid ring while recording; size ≈ 105 dp fill with
     outline clearance;
   - profile, History and Spending icons render; History/Spending keep
     ≥ 48 px touch targets;
   - scrolling the task canvas never moves the voice control;
   - system font scaling enlarges text without breaking the shell.

5. **Known environment note:** `npm install` warns that Metro/Expo tooling
   wants Node ≥ 20.19 while the WSL default is 18.19. `npm run typecheck`
   is unaffected; upgrade Node before running `expo start`.

## Open items

- On-device visual and TalkBack verification (the handoff's acceptance
  checks) — needs a device/emulator.
- Light-theme palette is available in tokens but not yet selectable (no
  ThemeOptions component exists; that is a functional-phase component).
- `react-native-svg` was added; `app.json` `userInterfaceStyle` intentionally
  left untouched to keep this diff presentation-only.
