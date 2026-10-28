import {
  ContactLinkError,
  decodeContactLink,
  encodeContactLink,
  MAX_CONTACT_LINK_BYTES,
} from '../../src/services/metevo/contactLink';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const NODE = `02${'ab'.repeat(32)}`;
const contact = { name: 'Maria', nodePubkey: NODE };
const link = (query: string) => `metevo://contact?${query}`;

describe('contact sharing v1', () => {
  test.each(['Maria', 'Maria Rossi', 'Èdi + Ana & Co? #1', '李 小龙', 'A=B', '🙂']) (
    'round-trips the name %s', (name) => {
      expect(decodeContactLink(encodeContactLink({ ...contact, name }))).toEqual({ ...contact, name });
    },
  );

  test('canonicalizes whitespace and pubkey casing, without sharing local metadata', () => {
    const encoded = encodeContactLink({ name: ' Maria ', nodePubkey: ` ${NODE.toUpperCase()} `, addedAt: 'yesterday' } as typeof contact);
    expect(encoded).toBe(link(`v=1&name=Maria&node=${NODE}`));
    expect(decodeContactLink(encoded)).toEqual(contact);
  });

  test('accepts reordered fields, encoded keys and form-style spaces', () => {
    expect(decodeContactLink(link(`node=${NODE}&%6eame=Maria+Rossi&v=1`))).toEqual({
      ...contact, name: 'Maria Rossi',
    });
  });

  test.each([
    '', 'https://example.com/contact?v=1', 'metevo://other?v=1',
    `metevo://contact/path?v=1&name=Maria&node=${NODE}`,
    link(`v=1&name=Maria&node=${NODE}#fragment`),
    link(`v=1&name=Maria&node=${NODE}&`),
    link(`v=1&name=Maria&node=${NODE}&btc=address`),
    link(`v=1&v=1&name=Maria&node=${NODE}`),
    link(`v=1&name=Maria&%6eame=Bob&node=${NODE}`),
    link(`v=1&name=Maria&node=${NODE}&__proto__=x`),
    link(`v=1&name=Maria&node=${NODE}&broken`),
    link(`name=Maria&node=${NODE}`), link(`v=1&node=${NODE}`),
    link('v=1&name=Maria'), link(`v=1&name=%ZZ&node=${NODE}`),
    link(`v=1&name=%C3&node=${NODE}`),
  ])('rejects malformed input: %s', (input) => {
    expect(() => decodeContactLink(input)).toThrow(ContactLinkError);
  });

  test.each(['0', '2', '01', ''])('rejects unsupported version %s', (version) => {
    expect(() => decodeContactLink(link(`v=${version}&name=Maria&node=${NODE}`))).toThrow(
      expect.objectContaining({ code: 'unsupported-version' }),
    );
  });

  test.each(['', '  ', 'a'.repeat(65), '🙂'.repeat(33), 'Maria\nBob', '\u202eBob', '\ud800']) (
    'rejects an invalid name', (name) => {
      expect(() => encodeContactLink({ ...contact, name })).toThrow(ContactLinkError);
    },
  );

  test('enforces decoded-name bounds on input too', () => {
    expect(() => decodeContactLink(link(`v=1&name=${'a'.repeat(65)}&node=${NODE}`))).toThrow(
      expect.objectContaining({ code: 'invalid-name' }),
    );
    expect(() => decodeContactLink(link(`v=1&name=Maria%0ABob&node=${NODE}`))).toThrow(ContactLinkError);
  });

  test('accepts names at the character and UTF-8 limits', () => {
    for (const name of ['a'.repeat(64), 'é'.repeat(64), '🙂'.repeat(32)]) {
      const encoded = encodeContactLink({ ...contact, name });
      expect(new TextEncoder().encode(encoded).length).toBeLessThanOrEqual(MAX_CONTACT_LINK_BYTES);
      expect(decodeContactLink(encoded).name).toBe(name);
    }
  });

  test.each(['Maria', `04${'ab'.repeat(32)}`, NODE.slice(0, -1), `${NODE}f`, `02${'z'.repeat(64)}`]) (
    'rejects invalid node identities', (nodePubkey) => {
      expect(() => encodeContactLink({ ...contact, nodePubkey })).toThrow(ContactLinkError);
      expect(() => decodeContactLink(link(`v=1&name=Maria&node=${nodePubkey}`))).toThrow(ContactLinkError);
    },
  );

  test('rejects oversized raw input before parsing', () => {
    expect(() => decodeContactLink('x'.repeat(MAX_CONTACT_LINK_BYTES + 1))).toThrow(
      expect.objectContaining({ code: 'too-long' }),
    );
  });

  test('decoding never reads or writes the contact store', async () => {
    const store = await import('expo-secure-store');
    decodeContactLink(encodeContactLink(contact));
    expect(store.getItemAsync).not.toHaveBeenCalled();
    expect(store.setItemAsync).not.toHaveBeenCalled();
  });
});
