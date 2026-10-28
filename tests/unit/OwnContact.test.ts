import * as SecureStore from 'expo-secure-store';
import { readOwnContactName, saveOwnContact } from '../../src/services/metevo/ownContact';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
}));
const NODE = `02${'ab'.repeat(32)}`;
const OTHER_NODE = `03${'cd'.repeat(32)}`;

beforeEach(() => { mockStore.clear(); jest.clearAllMocks(); });

test('sharing name belongs to exactly the current wallet node, not the contact book', async () => {
  expect(await readOwnContactName(NODE)).toBeNull();
  expect(await saveOwnContact(' Edi ', NODE.toUpperCase())).toEqual({ name: 'Edi', nodePubkey: NODE });
  expect(await readOwnContactName(NODE)).toBe('Edi');
  expect(await readOwnContactName(OTHER_NODE)).toBeNull();
  expect(mockStore.has('metevo.contacts.index')).toBe(false);
});

test('invalid name or missing/invalid node cannot be persisted', async () => {
  await expect(saveOwnContact('', NODE)).rejects.toThrow();
  await expect(saveOwnContact('Edi', 'missing')).rejects.toThrow();
  await expect(readOwnContactName('')).rejects.toThrow();
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
});

test('a corrupt stored name asks for a name again rather than sharing invalid data', async () => {
  mockStore.set(`metevo.contacts.self.${NODE}`, '\u202eInvalid');
  expect(await readOwnContactName(NODE)).toBeNull();
});

test('storage failures propagate so the UI can retry instead of claiming a saved name', async () => {
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('store failed'));
  await expect(saveOwnContact('Edi', NODE)).rejects.toThrow('store failed');
  expect(await readOwnContactName(NODE)).toBeNull();
});
