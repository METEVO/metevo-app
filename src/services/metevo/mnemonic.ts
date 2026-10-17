import { entropyToMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { getRandomValues } from 'expo-crypto';

/**
 * 256-bit BIP-39 mnemonic from the platform CSPRNG (expo-crypto).
 *
 * Kept in its own module so the wallet gateway loads it lazily: mock mode
 * (Expo Go) and the unit tests never execute the ESM-only dependency.
 */
export function generateMnemonicWithDeviceEntropy(): string {
  return entropyToMnemonic(getRandomValues(new Uint8Array(32)), wordlist);
}
