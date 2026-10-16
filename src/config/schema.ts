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

  // --- Reserved for future functional phases (validated when present) ----------
  /** Lightning Service Provider peer. TODO(phase 2): real peers are
   * pubkey@host:port, not URLs - relax this schema when wiring the LSP. */
  LSP_PEER_URI: optionalUrlFromEnv,
  /** RGB-compatible node / indexer endpoint. */
  RGB_NODE_ENDPOINT: optionalUrlFromEnv,
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
