import * as ExpoCrypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

// Hermes ships no WebCrypto; @noble's randomBytes (used by generateMnemonic)
// needs crypto.getRandomValues, so bridge it to expo-crypto once, before use.
const globalCrypto = globalThis as unknown as {
  crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array };
};
if (!globalCrypto.crypto?.getRandomValues) {
  globalCrypto.crypto = { getRandomValues: ExpoCrypto.getRandomValues };
}

const SEED_KEY = 'metevo.seed_v1';
const EXISTS_KEY = 'metevo.wallet_exists_v1';

export function generateSeed(): string {
  return generateMnemonic(wordlist, 128);
}

export function validateSeed(input: string): string | null {
  const normalized = input
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .join(' ');
  return validateMnemonic(normalized, wordlist) ? normalized : null;
}

export function seedToRuntimeId(seed: string): string {
  return bytesToHex(sha256(utf8ToBytes(seed))).slice(0, 16);
}

export async function saveWallet(seed: string): Promise<void> {
  // Android Keystore-backed item; reads require device authentication.
  await SecureStore.setItemAsync(SEED_KEY, seed, { requireAuthentication: true });
  await SecureStore.setItemAsync(EXISTS_KEY, '1');
}

export async function loadSeed(): Promise<string | null> {
  return SecureStore.getItemAsync(SEED_KEY, {
    requireAuthentication: true,
    authenticationPrompt: 'Unlock your METEVO wallet',
  });
}

export async function hasStoredWallet(): Promise<boolean> {
  return (await SecureStore.getItemAsync(EXISTS_KEY)) === '1';
}
