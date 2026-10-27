import {
  findContactByName,
  findContactByPubkey,
  forgetContact,
  isKnownContact,
  isValidNodePubkey,
  listContacts,
  rememberContact,
} from '../../src/services/metevo/contacts';

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

  test('a payment can only be addressed to a valid node pubkey', async () => {
    expect(isValidNodePubkey(PEER)).toBe(true);
    expect(isValidNodePubkey(` ${PEER.toUpperCase()} `)).toBe(true);
    expect(isValidNodePubkey('Maria')).toBe(false);
    expect(isValidNodePubkey('04' + 'a'.repeat(64))).toBe(false);
    expect(isValidNodePubkey('02' + 'a'.repeat(62))).toBe(false);
    await expect(rememberContact('Maria', 'Maria')).rejects.toThrow('pubkey');
  });

  test('resolves a spoken name and a sender pubkey to the same contact', async () => {
    await rememberContact('Bob', PEER);

    await expect(findContactByName('  bob ')).resolves.toMatchObject({ nodePubkey: PEER });
    await expect(findContactByName('Alice')).resolves.toBeNull();
    await expect(findContactByPubkey(PEER.toUpperCase())).resolves.toMatchObject({
      name: 'Bob',
    });
    await expect(findContactByPubkey('03' + 'a'.repeat(64))).resolves.toBeNull();
  });

  test('forgetContact removes only the requested node', async () => {
    await rememberContact('Bob', PEER);
    await rememberContact('Maria', '03' + 'b'.repeat(64));

    await forgetContact(PEER);

    const contacts = await listContacts();
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe('Maria');
    await expect(isKnownContact(PEER)).resolves.toBe(false);
  });
});
