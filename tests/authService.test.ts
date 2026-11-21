jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
  };
});

import { generateSeed, validateSeed, seedToRuntimeId, saveWallet, loadSeed, hasStoredWallet } from '../src/services/auth/authService';

test('generateSeed returns 12 valid words', () => {
  const seed = generateSeed();
  expect(seed.split(/\s+/)).toHaveLength(12);
  expect(validateSeed(seed)).toBe(seed);
});

test('validateSeed normalizes case, extra spaces and newlines', () => {
  const seed = generateSeed();
  const messy = '  ' + seed.toUpperCase().replace(/ /g, '\n  ') + ' ';
  expect(validateSeed(messy)).toBe(seed);
  expect(validateSeed('not a real seed phrase at all')).toBeNull();
});

test('seedToRuntimeId is stable and 16 hex chars', () => {
  const seed = generateSeed();
  expect(seedToRuntimeId(seed)).toBe(seedToRuntimeId(seed));
  expect(seedToRuntimeId(seed)).toMatch(/^[0-9a-f]{16}$/);
  expect(seedToRuntimeId(seed)).not.toBe(seedToRuntimeId(generateSeed()));
});

test('saveWallet stores seed and existence flag; loadSeed round-trips', async () => {
  await saveWallet('abc def');
  expect(await loadSeed()).toBe('abc def');
  expect(await hasStoredWallet()).toBe(true);
});
