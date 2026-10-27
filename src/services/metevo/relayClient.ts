import { ENV } from '../../config/env';
import { loadDeviceWalletConfig } from './deviceConfig';
import { MetevoLspClient } from './lsp-api';

/**
 * One place that turns the provisioned device config into an LSP client.
 * Both halves of the relay use it: the payer's request/poll flow and the
 * recipient's inbox poll.
 */
export async function loadRelayClient(): Promise<MetevoLspClient> {
  const device = await loadDeviceWalletConfig();
  return new MetevoLspClient({
    baseUrl: device.lspApiUrl,
    bearerToken: device.lspBearerToken,
  });
}

/** The relay has no server in mock mode; the in-process relay stands in. */
export function relayAvailable(): boolean {
  return ENV.EXPO_PUBLIC_WALLET_MODE !== 'mock';
}
