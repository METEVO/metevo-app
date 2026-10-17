import * as FileSystem from 'expo-file-system/legacy';
import { z } from 'zod';

/**
 * Device-provisioned wallet configuration for wdk mode.
 *
 * Connectivity secrets (LSP bearer token, bitcoind RPC credentials) must
 * never ride the EXPO_PUBLIC_ prefix: Expo inlines those into the shipped
 * bundle, where they are recoverable by anyone holding the APK. Instead,
 * a debug build reads them at runtime from a JSON file pushed into the
 * app's internal storage (see scripts/push-device-config.cjs).
 */

export class WalletConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletConfigError';
  }
}

const DEVICE_CONFIG_FILE = 'metevo-wallet-config.json';

/** Lightning peer URI: compressed pubkey (66 hex chars) @ host : port. */
const LSP_PEER_URI_PATTERN = /^[0-9a-f]{66}@[a-z0-9.\-]+:[0-9]{1,5}$/i;

const deviceConfigSchema = z
  .object({
    /** METEVO LSP API base URL (utexo-lsp serving the USDm asset). */
    metevoLspUrl: z.string().url(),
    /** Bearer token for the LSP /metevo/* routes and the node peer link. */
    metevoLspBearerToken: z.string().min(1),
    /** Lightning peer URI of the LSP (pubkey@host:port, from GET /get_info).
     * When present, the gateway connects the peer explicitly before waiting
     * for the LSP's channel-provisioning cron. */
    lspPeerUri: z.string().regex(LSP_PEER_URI_PATTERN).optional(),
    bitcoindRpcHost: z.string().min(1),
    bitcoindRpcPort: z.number().int().min(1).max(65_535),
    bitcoindRpcUsername: z.string().min(1),
    bitcoindRpcPassword: z.string().min(1),
    rgbIndexerUrl: z.string().url(),
    rgbProxyEndpoint: z.string().url(),
  })
  .strict();

export type DeviceWalletConfig = z.infer<typeof deviceConfigSchema>;

/**
 * Loads and validates the provisioned configuration. Error messages
 * describe field paths and reasons only - never the values.
 */
export async function loadDeviceWalletConfig(): Promise<DeviceWalletConfig> {
  const path = `${FileSystem.documentDirectory ?? ''}${DEVICE_CONFIG_FILE}`;

  let raw: string;
  try {
    raw = await FileSystem.readAsStringAsync(path);
  } catch {
    throw new WalletConfigError(
      'no device wallet configuration was provisioned; push metevo-wallet-config.json with scripts/push-device-config.cjs and reopen the wallet',
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new WalletConfigError(
      'the provisioned device wallet configuration is not valid JSON',
    );
  }

  const parsed = deviceConfigSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new WalletConfigError(
      `the provisioned device wallet configuration is invalid:\n${details}`,
    );
  }
  return parsed.data;
}
