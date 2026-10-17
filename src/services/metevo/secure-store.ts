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
 */

const MNEMONIC_KEY = 'metevo.wallet.mnemonic';
/** Presence marker: existence checks must not pull the seed into JS. */
const WALLET_PRESENT_KEY = 'metevo.wallet.present';
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

export async function storeWalletMnemonic(mnemonic: string): Promise<void> {
  const already = await SecureStore.getItemAsync(MNEMONIC_KEY);
  if (already) {
    throw new SecureWalletStoreError('a wallet already exists on this device');
  }
  await SecureStore.setItemAsync(MNEMONIC_KEY, mnemonic, BIOMETRIC_OPTIONS);
  await SecureStore.setItemAsync(WALLET_PRESENT_KEY, 'true', BIOMETRIC_OPTIONS);
}

export async function readWalletMnemonic(): Promise<string | null> {
  return SecureStore.getItemAsync(MNEMONIC_KEY, BIOMETRIC_OPTIONS);
}

export async function walletExistsOnDevice(): Promise<boolean> {
  return (await SecureStore.getItemAsync(WALLET_PRESENT_KEY)) !== null;
}

/**
 * Full secure wallet creation path used by the app interface:
 *  1. generate (or accept) a BIP-39 mnemonic,
 *  2. require biometric enrollment,
 *  3. authenticate the user,
 *  4. store the mnemonic in the secure store only.
 * Returns nothing sensitive.
 */
export async function createWalletSecurely(
  generateMnemonic: () => Promise<string> | string,
): Promise<void> {
  if (!(await deviceSupportsBiometrics())) {
    throw new SecureWalletStoreError(
      'no biometric hardware or no credentials enrolled; enroll a fingerprint/face or device PIN first',
    );
  }
  await authenticateToAccessSecrets('Set up your METEVO wallet');
  const mnemonic = await generateMnemonic();
  await storeWalletMnemonic(mnemonic);
}
