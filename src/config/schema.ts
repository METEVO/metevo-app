import { z } from 'zod';

/**
 * Single source of truth for the app's own environment-dependent values.
 *
 * Rules:
 * - Every key here is app-facing and non-secret, declared with the
 *   EXPO_PUBLIC_ prefix (Expo embeds these into the bundle) and validated
 *   here. Never move a secret behind the EXPO_PUBLIC_ prefix.
 * - Connectivity secrets (LSP token, bitcoind RPC, RGB endpoints) are not
 *   app env at all: wdk mode loads them at runtime from the provisioned
 *   device config file (src/services/metevo/deviceConfig.ts).
 * - Node-side tooling (regtest script, future AI test scripts) keeps its
 *   own environment: scripts/test-metevo-flow.env.example.
 */

/** "true" / "false" -> boolean, with a default for unset keys. */
const boolFromEnv = (fallback: 'true' | 'false') =>
  z.preprocess(
    (value) => (value === undefined ? fallback : value),
    z.union([z.literal('true'), z.literal('false')]).transform((value) => value === 'true'),
  );

/** Integer from a string env value, bounded, with a default for unset keys. */
const intFromEnv = (fallback: number, min: number, max: number) =>
  z.preprocess(
    (value) => (value === undefined ? undefined : value),
    z.coerce
      .number()
      .int()
      .min(min)
      .max(max)
      .default(fallback),
  );

/** Number (dB scale) from a string env value, bounded, with a default. */
const numberFromEnv = (fallback: number, min: number, max: number) =>
  z.preprocess(
    (value) => (value === undefined ? undefined : value),
    z.coerce
      .number()
      .min(min)
      .max(max)
      .default(fallback),
  );

/** Non-empty trimmed string from env, with a default for unset keys. */
const stringFromEnv = (fallback: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1).default(fallback),
  );

/**
 * Non-empty string or unset. An empty value counts as unset so the
 * committed template can list every key without forcing a value; a
 * whitespace-only or empty assigned value never reaches the app.
 */
const optionalNonEmptyString = () =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim().length === 0 ? undefined : value,
    z.string().min(1).optional(),
  );

/** Absolute http(s) URL or unset (empty counts as unset). */
const optionalUrl = () =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim().length === 0 ? undefined : value,
    z.string().url().optional(),
  );

/** Lightning peer URI: compressed pubkey (66 hex chars) @ host : port. */
const PEER_URI_PATTERN = /^[0-9a-f]{66}@[a-z0-9.\-]+:[0-9]{1,5}$/i;

const baseAppEnvSchema = z.object({
  // --- App flavour -----------------------------------------------------------
  EXPO_PUBLIC_METEVO_ENV: z.enum(['dev', 'prod']).default('dev'),
  EXPO_PUBLIC_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // --- Recording state machine (Step 3.4) --------------------------------------
  /** Silence window (ms) after which the recording stops itself (3s per sketch). */
  EXPO_PUBLIC_RECORDING_SILENCE_TIMEOUT_MS: intFromEnv(3000, 250, 10_000),
  /** Mic level (dB, -160..0) above which audio counts as speech, not silence. */
  EXPO_PUBLIC_RECORDING_SILENCE_THRESHOLD_DB: numberFromEnv(-40, -160, 0),
  /** How often (ms) the mic metering is polled (visualizer + silence timer). */
  EXPO_PUBLIC_RECORDING_METER_POLL_MS: intFromEnv(150, 50, 1000),
  /** Kill switch for the automatic stop (false = stop only on second tap). */
  EXPO_PUBLIC_RECORDING_ALLOW_AUTO_STOP: boolFromEnv('true'),

  // --- Wallet session (Step: onboarding + wallet setup) ------------------------
  /** Wallet runtime: "mock" simulates the full setup flow (Expo Go demos),
   * "wdk" drives the real @utexo/wdk-rgb-lightning node (debug APK builds),
   * "remote" drives an rgb-lightning-node daemon over its REST API. */
  EXPO_PUBLIC_WALLET_MODE: z.enum(['mock', 'wdk', 'remote']).default('mock'),
  /** Bitcoin network for the embedded wallet node. */
  EXPO_PUBLIC_WALLET_NETWORK: z.enum(['regtest', 'testnet', 'signet', 'mainnet']).default('regtest'),
  /** How long the wallet setup waits for the LSP to provision the USDm
   * channel before continuing without one (the LSP provisions on a cron;
   * readiness is reported through the wallet status afterwards). */
  EXPO_PUBLIC_CHANNEL_PROVISION_TIMEOUT_MS: intFromEnv(120_000, 5_000, 600_000),
  /** How the real wallet node is hosted in wdk mode: "inprocess" drives the
   * WDK module from the app's JS runtime (Node tooling/scripts); "bare"
   * hosts it in a Bare worklet (the mobile device path). */
  EXPO_PUBLIC_WALLET_TRANSPORT: z.enum(['inprocess', 'bare']).default('inprocess'),
  /** How often (ms) the home shell refreshes balances and the connection state. */
  EXPO_PUBLIC_WALLET_STATUS_POLL_MS: intFromEnv(10_000, 2_000, 120_000),

  // --- Remote RLN node (EXPO_PUBLIC_WALLET_MODE=remote) ------------------------
  /** REST base URL of the node holding this wallet's keys. A USB phone uses
   * http://localhost:3001 and an `adb reverse` to its own node. */
  EXPO_PUBLIC_RLN_NODE_URL: optionalUrl(),
  EXPO_PUBLIC_RLN_REQUEST_TIMEOUT_MS: intFromEnv(15_000, 1_000, 120_000),
  /** Ticker of the USDm asset; ignored when the asset id is pinned below. */
  EXPO_PUBLIC_RLN_USDM_TICKER: stringFromEnv('USDM'),
  EXPO_PUBLIC_RLN_USDM_ASSET_ID: optionalNonEmptyString(),
  /** Peer (pubkey@host:port) connected when the wallet opens; unset skips it. */
  EXPO_PUBLIC_RLN_PEER_URI: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim().length === 0 ? undefined : value,
    z.string().regex(PEER_URI_PATTERN).optional(),
  ),

  // --- Voice AI (on-device QVAC models) ---------------------------------------
  /** Whisper STT model per UI language, resolved under <documents>/models/whisper.
   * The name is chosen per language so each device only provisions the model
   * it actually speaks. */
  EXPO_PUBLIC_QVAC_WHISPER_MODEL_ENGLISH: stringFromEnv('en-small.bin'),
  EXPO_PUBLIC_QVAC_WHISPER_MODEL_ITALIANO: stringFromEnv('it.bin'),
  EXPO_PUBLIC_QVAC_WHISPER_MODEL_TURKCE: stringFromEnv('tr.bin'),
  EXPO_PUBLIC_QVAC_WHISPER_MODEL_FRANCAIS: stringFromEnv('fr.bin'),
  EXPO_PUBLIC_QVAC_WHISPER_MODEL_HINDI: stringFromEnv('hi.bin'),
  EXPO_PUBLIC_QVAC_WHISPER_MODEL_ESPANOL: stringFromEnv('es.bin'),
  EXPO_PUBLIC_QVAC_WHISPER_MODEL_KISWAHILI: stringFromEnv('sw.bin'),
  /** Transcribe non-English speech straight into English: parsing happens on
   * the English canonical boundary, only prose is localized afterwards. */
  EXPO_PUBLIC_QVAC_WHISPER_TRANSLATE_TO_ENGLISH: boolFromEnv('true'),
  /** Intent LLM: a QVAC registry preset name (whitelisted in
   * src/ai/engine/modelRegistry.ts) or a local model file path. */
  EXPO_PUBLIC_QVAC_LLM_MODEL: stringFromEnv('QWEN3_600M_INST_Q4'),
  /** Completion cap per agent run, mirroring the reference parser budget. */
  EXPO_PUBLIC_QVAC_LLM_MAX_TOKENS: intFromEnv(512, 64, 2048),
  /** Hard timeout for one agent completion: fail safely to a manual path. */
  EXPO_PUBLIC_QVAC_LLM_TIMEOUT_MS: intFromEnv(20_000, 2_000, 120_000),
  /** TTS model: a QVAC registry preset name or a local model file path. */
  EXPO_PUBLIC_QVAC_TTS_MODEL: stringFromEnv('TTS_MULTILINGUAL_SUPERTONIC3_Q8_0'),
  /** Speech synthesis engine behind the loaded TTS model. */
  EXPO_PUBLIC_QVAC_TTS_ENGINE: z
    .enum(['supertonic', 'parler', 'chatterbox', 'cosyvoice3', 'audio8'])
    .default('supertonic'),
  /** Baked voice id for engines that take one (Supertonic: F1, F2, M1, M2). */
  EXPO_PUBLIC_QVAC_TTS_VOICE: stringFromEnv('F1'),
  /** Language code spoken when the selected language is not synthesizable. */
  EXPO_PUBLIC_QVAC_TTS_FALLBACK_LANGUAGE: stringFromEnv('en'),
  /** Free the TTS model after each announcement (one small model at a time). */
  EXPO_PUBLIC_QVAC_TTS_UNLOAD_AFTER_USE: boolFromEnv('true'),

  // --- Network target (Step: payment flows) -----------------------------------
  /** Demo provisioning preset: "regtest" (local metevo-infra) or "signet"
   * (public signet LSP). Selects which device-config profile the setup
   * flow expects; endpoints/credentials themselves stay OUT of app env and
   * are provisioned per target via scripts/device-wallet-config.json. */
  EXPO_PUBLIC_NETWORK_TARGET: z.enum(['regtest', 'signet']).default('regtest'),

  // --- Transfer settlement watcher (Step: refreshTransfers loop) ---------------
  /** How often (ms) the watcher calls refreshTransfers/listTransfers. */
  EXPO_PUBLIC_TRANSFER_POLL_INTERVAL_MS: intFromEnv(2_000, 250, 60_000),
  /** How long (ms) a watch may stay Pending before the outcome is reported
   * as unknown (never guessed as settled). */
  EXPO_PUBLIC_TRANSFER_SETTLE_TIMEOUT_MS: intFromEnv(120_000, 10_000, 900_000),

  // --- QVAC on-device voice models (Step: voice-to-intent pipeline) ------------
  /** QVAC model identifier that parses speech into the payment intent JSON
   * when no language-specific entry matches (verified against the installed
   * @qvac/sdk exports at integration time). */
  EXPO_PUBLIC_QVAC_INTENT_MODEL: z.string().min(1).default('LLAMA_3_2_1B_INST_Q4_0'),
  /** Per-UI-language QVAC model identifiers (speech-to-text / intent). An
   * unset language falls back to EXPO_PUBLIC_QVAC_INTENT_MODEL. */
  EXPO_PUBLIC_QVAC_MODEL_ENGLISH: optionalNonEmptyString(),
  EXPO_PUBLIC_QVAC_MODEL_ITALIANO: optionalNonEmptyString(),
  EXPO_PUBLIC_QVAC_MODEL_TURKCE: optionalNonEmptyString(),
  EXPO_PUBLIC_QVAC_MODEL_FRANCAIS: optionalNonEmptyString(),
  EXPO_PUBLIC_QVAC_MODEL_HINDI: optionalNonEmptyString(),
  EXPO_PUBLIC_QVAC_MODEL_ESPANOL: optionalNonEmptyString(),
  EXPO_PUBLIC_QVAC_MODEL_KISWAHILI: optionalNonEmptyString(),

  // --- Local P2P link (Step: NFC + Wi-Fi Direct) --------------------------------
  /** TCP port the receiver's Wi-Fi Direct group serves the invoice fetch
   * protocol on (the group runs on the 192.168.49.x subnet). */
  EXPO_PUBLIC_LOCAL_LINK_PORT: intFromEnv(48_444, 1024, 65_535),
});

export const appEnvSchema = baseAppEnvSchema.superRefine((env, context) => {
  if (env.EXPO_PUBLIC_WALLET_MODE === 'remote' && env.EXPO_PUBLIC_RLN_NODE_URL === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['EXPO_PUBLIC_RLN_NODE_URL'],
      message: 'required when EXPO_PUBLIC_WALLET_MODE=remote',
    });
  }
  // Release builds forbid cleartext traffic, and the node URL reaches a
  // key-holding wallet: anything outside dev must be TLS.
  if (
    env.EXPO_PUBLIC_METEVO_ENV === 'prod' &&
    env.EXPO_PUBLIC_RLN_NODE_URL !== undefined &&
    !env.EXPO_PUBLIC_RLN_NODE_URL.startsWith('https://')
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['EXPO_PUBLIC_RLN_NODE_URL'],
      message: 'must use https:// in prod',
    });
  }
});

export type AppEnv = z.infer<typeof appEnvSchema>;
export type EnvInput = Record<string, unknown>;
