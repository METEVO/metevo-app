import { ENV } from '../../config/env';
import { MetevoLspClient } from './lsp-api';

let cached: MetevoLspClient | null = null;

export function getMetevoLspClient(): MetevoLspClient {
  if (cached) return cached;
  const baseUrl = ENV.METEVO_LSP_URL;
  const bearerToken = ENV.METEVO_LSP_BEARER_TOKEN;
  if (!baseUrl || !bearerToken) {
    throw new Error(
      'METEVO_LSP_URL and METEVO_LSP_BEARER_TOKEN must be set in .env to reach the METEVO LSP',
    );
  }
  cached = new MetevoLspClient({ baseUrl, bearerToken });
  return cached;
}

export function resetMetevoLspClient(): void {
  cached = null;
}
