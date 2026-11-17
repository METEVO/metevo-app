import { AppEnv, appEnvSchema, EnvInput } from './schema';

/**
 * Raw values exactly as found in the environment. Expo embeds
 * `EXPO_PUBLIC_*` keys from `.env*` files into `process.env` at bundle
 * time; other loaders (scripts, later phases) can feed `EnvInput` the same
 * way.
 */
const RAW_ENV: EnvInput = {
  ...process.env,
  // Expo only embeds public keys written with a literal property access.
  EXPO_PUBLIC_REAL_USDM_PURCHASE: process.env.EXPO_PUBLIC_REAL_USDM_PURCHASE,
  EXPO_PUBLIC_WALLET_MODE: process.env.EXPO_PUBLIC_WALLET_MODE,
  EXPO_PUBLIC_NETWORK_TARGET: process.env.EXPO_PUBLIC_NETWORK_TARGET,
  EXPO_PUBLIC_RLN_NODE_URL: process.env.EXPO_PUBLIC_RLN_NODE_URL,
  EXPO_PUBLIC_RLN_REQUEST_TIMEOUT_MS: process.env.EXPO_PUBLIC_RLN_REQUEST_TIMEOUT_MS,
  EXPO_PUBLIC_RLN_USDM_TICKER: process.env.EXPO_PUBLIC_RLN_USDM_TICKER,
  EXPO_PUBLIC_RLN_USDM_ASSET_ID: process.env.EXPO_PUBLIC_RLN_USDM_ASSET_ID,
  EXPO_PUBLIC_RLN_PEER_URI: process.env.EXPO_PUBLIC_RLN_PEER_URI,
  EXPO_PUBLIC_WALLET_AUTH: process.env.EXPO_PUBLIC_WALLET_AUTH,
};

let cached: AppEnv | null = null;

/**
 * Parse + validate the environment exactly once, eagerly at import time.
 * Deliberate fail-fast: a broken `.env` must crash at startup with a clear
 * message instead of misbehaving silently mid-flow.
 */
export function loadEnv(): AppEnv {
  if (cached !== null) {
    return cached;
  }

  const parsed = appEnvSchema.safeParse(RAW_ENV);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      ['METEVO environment validation failed.', 'Fix the values in .env / .env.local:', details].join('\n'),
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * The validated, immutable app environment.
 * Import this everywhere instead of touching `process.env` directly.
 */
export const ENV: AppEnv = loadEnv();
