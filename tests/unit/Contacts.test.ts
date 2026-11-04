import {
  findContactByName,
  findContactByPubkey,
  forgetContact,
  isKnownContact,
  forgetPendingContact,
  isValidNodePubkey,
  listContacts,
  listPendingContacts,
  rememberContact,
  rememberPendingContact,
} from '../../src/services/metevo/contacts';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
}));

const mockStore = new Map<string, string>();

const PEER = '02' + 'a'.repeat(64);

describe('contact store (node id verification for in-person payments)', () => {
  beforeEach(() => {
    mockStore.clear();
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
    mockStore.set('metevo.contacts.index', 'not-json{');
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

  test('a name cannot point at two different nodes', async () => {
    await rememberContact('Alice', PEER);

    await expect(rememberContact('alice', '03' + 'b'.repeat(64))).rejects.toThrow(
      'already uses that name',
    );
    // The same node can be renamed.
    await expect(rememberContact('Alice B.', PEER)).resolves.toMatchObject({ name: 'Alice B.' });
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

describe('phone, email and pending contacts', () => {
  const OTHER = '03' + 'b'.repeat(64);

  beforeEach(() => {
    mockStore.clear();
  });

  test('a payable contact keeps normalized phone and email', async () => {
    await expect(
      rememberContact('Maria', PEER, { phone: '+39 333 123 4567', email: 'Maria@Example.com' }),
    ).resolves.toMatchObject({ phone: '+393331234567', email: 'maria@example.com' });
  });

  test('refreshing a contact without details keeps the saved ones', async () => {
    await rememberContact('Maria', PEER, { phone: '+393331234567' });
    await expect(rememberContact('Maria R.', PEER)).resolves.toMatchObject({
      name: 'Maria R.', phone: '+393331234567',
    });
  });

  test('invalid phone or email is never stored', async () => {
    await expect(rememberContact('Maria', PEER, { phone: '3331234567' })).rejects.toThrow('country code');
    await expect(rememberPendingContact('Luca', { email: 'luca@' })).rejects.toThrow('email');
    expect(mockStore.size).toBe(0);
  });

  test('a pending contact needs a phone or an email, and is never payable', async () => {
    await expect(rememberPendingContact('Luca', {})).rejects.toThrow('phone number or an email');
    await rememberPendingContact('Luca', { phone: '+393331234567' });
    await expect(listPendingContacts()).resolves.toMatchObject([{ name: 'Luca', phone: '+393331234567' }]);
    await expect(listContacts()).resolves.toEqual([]);
    await expect(findContactByName('luca')).resolves.toBeNull();
  });

  test('names stay unique across payable and pending contacts', async () => {
    await rememberContact('Maria', PEER);
    await expect(rememberPendingContact('maria', { email: 'm@example.com' })).rejects.toThrow('already uses that name');
    await rememberPendingContact('Luca', { email: 'luca@example.com' });
    await expect(rememberContact('Luca', OTHER)).rejects.toThrow('already uses that name');
  });

  test('the same phone or email cannot be saved twice', async () => {
    await rememberContact('Maria', PEER, { email: 'maria@example.com' });
    await expect(rememberPendingContact('Mary', { email: 'MARIA@example.com' })).rejects.toThrow('phone or email');
  });

  test('an arriving METEVO contact completes the matching pending entry', async () => {
    await rememberPendingContact('Luca', { phone: '+393331234567' });
    await rememberContact('Luca', OTHER, { phone: '+39 333 1234567', email: 'luca@example.com' });
    await expect(listPendingContacts()).resolves.toEqual([]);
    await expect(findContactByName('Luca')).resolves.toMatchObject({
      nodePubkey: OTHER, phone: '+393331234567', email: 'luca@example.com',
    });
  });

  test('forgetPendingContact removes only that entry', async () => {
    const luca = await rememberPendingContact('Luca', { phone: '+393331234567' });
    await rememberPendingContact('Anna', { email: 'anna@example.com' });
    await forgetPendingContact(luca.id);
    await expect(listPendingContacts()).resolves.toMatchObject([{ name: 'Anna' }]);
  });
});
