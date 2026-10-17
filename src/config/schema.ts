import { z } from 'zod';

/**
 * Single source of truth for every environment-dependent value in METEVO.
 *
 * Rules:
 * - Declare here, provide in .env (baseline) or .env.local (machine-local
 *   overrides). Never hardcode values in components.
 * - EXPO_PUBLIC_* values are embedded into the app bundle by Expo and are
 *   meant for non-secret, client-side behaviour (recording tuning).
 * - Everything else is validated here but NOT embedded in the bundle; those
 *   keys are consumed by Node-side scripts (RGB node, LSP, AI testing) in
 *   the future functional phases. Never move secrets behind the
 *   EXPO_PUBLIC_ prefix.
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

/**
 * Empty string or unset -> undefined (a commented-out value counts as
 * absent). The ".optional()" on the inner schema is essential: without it,
 * the absent value would fail as "Required" and crash the app at startup.
 */
const emptyToUndefined = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().optional(),
);

/** Like emptyToUndefined, but the value must be a valid URL when present. */
const optionalUrlFromEnv = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().url().optional(),
);

/** Lightning peer URI: compressed pubkey (66 hex chars) @ host : port. */
const LSP_PEER_URI_PATTERN = /^[0-9a-f]{66}@[a-z0-9.\-]+:[0-9]{1,5}$/i;

/** Like emptyToUndefined, but the value must be a peer URI when present. */
const optionalPeerUriFromEnv = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().regex(LSP_PEER_URI_PATTERN).optional(),
);

export const appEnvSchema = z.object({
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
   * "wdk" drives the real @utexo/wdk-rgb-lightning node (debug APK builds). */
  EXPO_PUBLIC_WALLET_MODE: z.enum(['mock', 'wdk']).default('mock'),
  /** Bitcoin network for the embedded wallet node. */
  EXPO_PUBLIC_WALLET_NETWORK: z.enum(['regtest', 'testnet', 'signet', 'mainnet']).default('regtest'),
  /** Connectivity secrets (LSP token, bitcoind RPC, RGB endpoints) are NOT
   * bundle-embedded: wdk mode loads them at runtime from the provisioned
   * device config file (src/services/metevo/deviceConfig.ts). */
  /** How long the wallet setup waits for the LSP to provision the USDm
   * channel before continuing without one (the LSP provisions on a cron;
   * readiness is reported through the wallet status afterwards). */
  EXPO_PUBLIC_CHANNEL_PROVISION_TIMEOUT_MS: intFromEnv(120_000, 5_000, 600_000),

  // --- Reserved for future functional phases (validated when present) ----------
  /** Lightning Service Provider peer as pubkey@host:port for direct peer
   * connects outside the LSP API base URL flow. */
  LSP_PEER_URI: optionalPeerUriFromEnv,
  /** RGB-compatible node / indexer endpoint. */
  RGB_NODE_ENDPOINT: optionalUrlFromEnv,
  /** BIP-39 mnemonic for the embedded WDK RGB Lightning wallet. Node-side
   * script use (tests) only - the app generates and stores the seed in the
   * device secure store, never in the environment. */
  METEVO_WALLET_MNEMONIC: emptyToUndefined,
  /** Password for unlocking the embedded wallet node. Node-side use only. */
  METEVO_WALLET_PASSWORD: emptyToUndefined,
  /** Wallet account xpub - public key only, never private keys. */
  RGB_NODE_ACCOUNT_XPUB: emptyToUndefined,
  /** Locally provisioned QVAC model identifier. */
  QVAC_MODEL_ID: emptyToUndefined,
  /** OpenRouter API key - script-side AI testing only (phase 2 fallback).
   * Never embedded in the app bundle, never behind EXPO_PUBLIC_. */
  OPENROUTER_API_KEY: emptyToUndefined,
});

export type AppEnv = z.infer<typeof appEnvSchema>;
export type EnvInput = Record<string, unknown>;
