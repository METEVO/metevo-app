import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Device secure store for METEVO wallet secrets.
 *
 * Hardening rules (WDK requirement):
 *  - Seeds and node keys live ONLY in the device secure store (Keychain on
 *    iOS, Keystore/EncryptedSharedPreferences on Android). They are never
 *    written to AsyncStorage, SQLite, the WDK dataDir or any log.
 *  - Reading them requires a successful biometric / device-credential unlock
 *    (biometric preferred, PIN fallback).
 *  - The WDK secret manager holds the mnemonic in memory only while the node
 *    runs; the dataDir keeps channel state but never seed material.
 *
 * Multi-wallet model: one account, many named wallets. The index stores
 * only non-secret metadata (id, name, createdAt); each seed lives in its
 * own biometric-gated entry.
 */

export interface StoredWalletMeta {
  id: string;
  name: string;
  createdAt: string;
}

const WALLET_INDEX_KEY = 'metevo.wallets.index';
const walletSeedKey = (id: string) => `metevo.wallet.${id}.mnemonic`;
const WALLET_PRESENT_KEY = 'metevo.wallet.present';

/**
 * Pre-multi-wallet keys. A device that created a wallet before the
 * multi-wallet model keeps its seed under the legacy key; it migrates into
 * the index as the first wallet without any data movement.
 */
const LEGACY_MNEMONIC_KEY = 'metevo.wallet.mnemonic';

const BIOMETRIC_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export class SecureWalletStoreError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SecureWalletStoreError';
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export async function deviceSupportsBiometrics(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function authenticateToAccessSecrets(reason: string): Promise<void> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  if (!result.success) {
    throw new SecureWalletStoreError('biometric authentication failed or was cancelled');
  }
}

async function readIndex(): Promise<StoredWalletMeta[]> {
  const raw = await SecureStore.getItemAsync(WALLET_INDEX_KEY, BIOMETRIC_OPTIONS);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(wallets: StoredWalletMeta[]): Promise<void> {
  await SecureStore.setItemAsync(
    WALLET_INDEX_KEY,
    JSON.stringify(wallets),
    BIOMETRIC_OPTIONS,
  );
}

/** One-time bridge: a pre-multi-wallet seed becomes the first wallet. */
async function migrateLegacyWalletIfNeeded(): Promise<void> {
  const index = await readIndex();
  if (index.length > 0) {
    return;
  }
  const legacy = await SecureStore.getItemAsync(LEGACY_MNEMONIC_KEY, BIOMETRIC_OPTIONS);
  if (legacy === null) {
    return;
  }
  await writeIndex([
    { id: 'legacy', name: 'Everyday wallet', createdAt: new Date().toISOString() },
  ]);
}

export async function listWallets(): Promise<StoredWalletMeta[]> {
  await migrateLegacyWalletIfNeeded();
  return readIndex();
}

export async function walletExistsOnDevice(): Promise<boolean> {
  await migrateLegacyWalletIfNeeded();
  return (await readIndex()).length > 0;
}

/**
 * Full creation path for one named wallet:
 *  1. require biometric enrollment,
 *  2. authenticate the user,
 *  3. generate (or accept) a BIP-39 mnemonic,
 *  4. store the seed under the wallet id, then append the index entry.
 * Returns nothing sensitive.
 */
export async function createWalletEntry(
  name: string,
  generateMnemonic: () => Promise<string> | string,
): Promise<StoredWalletMeta> {
  if (!(await deviceSupportsBiometrics())) {
    throw new SecureWalletStoreError(
      'no biometric hardware or no credentials enrolled; enroll a fingerprint/face or device PIN first',
    );
  }
  await authenticateToAccessSecrets('Set up your METEVO wallet');
  const mnemonic = await generateMnemonic();

  const id = `w-${Date.now()}`;
  await SecureStore.setItemAsync(walletSeedKey(id), mnemonic, BIOMETRIC_OPTIONS);

  const index = await readIndex();
  const entry: StoredWalletMeta = {
    id,
    name: name.trim().length > 0 ? name.trim() : 'Everyday wallet',
    createdAt: new Date().toISOString(),
  };
  await writeIndex([...index, entry]);
  return entry;
}

export async function readWalletMnemonicById(id: string): Promise<string | null> {
  if (id === 'legacy') {
    return SecureStore.getItemAsync(LEGACY_MNEMONIC_KEY, BIOMETRIC_OPTIONS);
  }
  return SecureStore.getItemAsync(walletSeedKey(id), BIOMETRIC_OPTIONS);
}
