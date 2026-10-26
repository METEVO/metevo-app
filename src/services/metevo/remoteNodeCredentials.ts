import * as FileSystem from 'expo-file-system/legacy';
import { z } from 'zod';

import { WalletConfigError } from './deviceConfig';

/**
 * Bearer token for a remote node started with --root-public-key. It is a
 * credential, so it never rides EXPO_PUBLIC_ env: scripts/push-remote-node-token.cjs
 * writes it into the app's internal storage. No file means the node runs
 * without authentication (the local regtest stack).
 */

const REMOTE_NODE_CREDENTIALS_FILE = 'metevo-remote-node.json';

const credentialsSchema = z.object({ bearerToken: z.string().min(1) }).strict();

export async function loadRemoteNodeBearerToken(): Promise<string | null> {
  const path = `${FileSystem.documentDirectory ?? ''}${REMOTE_NODE_CREDENTIALS_FILE}`;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(await FileSystem.readAsStringAsync(path));
  } catch {
    throw new WalletConfigError('the provisioned remote node credentials are not valid JSON');
  }
  const parsed = credentialsSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new WalletConfigError('the provisioned remote node credentials are invalid');
  }
  return parsed.data.bearerToken;
}
