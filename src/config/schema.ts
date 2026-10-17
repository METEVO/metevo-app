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
  /** How long the wallet setup waits for the LSP to provision the USDm
   * channel before continuing without one (the LSP provisions on a cron;
   * readiness is reported through the wallet status afterwards). */
  EXPO_PUBLIC_CHANNEL_PROVISION_TIMEOUT_MS: intFromEnv(120_000, 5_000, 600_000),
  /** How the real wallet node is hosted in wdk mode: "inprocess" drives the
   * WDK module from the app's JS runtime (Node tooling/scripts); "bare"
   * hosts it in a Bare worklet (the mobile device path). */
  EXPO_PUBLIC_WALLET_TRANSPORT: z.enum(['inprocess', 'bare']).default('inprocess'),
});

export type AppEnv = z.infer<typeof appEnvSchema>;
export type EnvInput = Record<string, unknown>;
