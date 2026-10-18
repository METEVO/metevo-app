import { isKnownContact, listContacts, rememberContact } from '../../src/services/metevo/contacts';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => mockContactsJson),
  setItemAsync: jest.fn(async (_key: string, value: string) => {
    mockContactsJson = value;
  }),
}));

let mockContactsJson: string | null = null;

const PEER = '02' + 'a'.repeat(64);

describe('contact store (node id verification for in-person payments)', () => {
  beforeEach(() => {
    mockContactsJson = null;
  });

  test('a fresh device knows nobody', async () => {
    await expect(listContacts()).resolves.toEqual([]);
    await expect(isKnownContact(PEER)).resolves.toBe(false);
  });

  test('rememberContact persists and is idempotent per pubkey', async () => {
    await rememberContact('Maria', PEER);
    await rememberContact('Maria', PEER.toUpperCase());
    const contacts = await listContacts();
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ name: 'Maria', nodePubkey: PEER });
    await expect(isKnownContact(PEER)).resolves.toBe(true);
  });

  test('isKnownContact ignores case and whitespace', async () => {
    await rememberContact('Luca', PEER);
    await expect(isKnownContact(`  ${PEER.toUpperCase()} `)).resolves.toBe(true);
    await expect(isKnownContact('03' + 'a'.repeat(64))).resolves.toBe(false);
  });

  test('corrupted store content degrades to an empty contact list', async () => {
    mockContactsJson = 'not-json{';
    await expect(listContacts()).resolves.toEqual([]);
    await expect(isKnownContact(PEER)).resolves.toBe(false);
  });
});
