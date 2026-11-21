import * as SecureStore from 'expo-secure-store';
import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

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
  await SecureStore.setItemAsync(SEED_KEY, seed);
  await SecureStore.setItemAsync(EXISTS_KEY, '1');
}

export async function loadSeed(): Promise<string | null> {
  return SecureStore.getItemAsync(SEED_KEY);
}

export async function hasStoredWallet(): Promise<boolean> {
  return (await SecureStore.getItemAsync(EXISTS_KEY)) === '1';
}
