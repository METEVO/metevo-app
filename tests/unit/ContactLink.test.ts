import {
  ContactLinkError,
  contactShareMessage,
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

  test.each(['0', '3', '01', ''])('rejects unsupported version %s', (version) => {
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

describe('contact sharing v2 (phone and email)', () => {
  const full = { ...contact, phone: '+393331234567', email: 'maria@example.com' };

  test('round-trips phone and email in a v2 link', () => {
    const encoded = encodeContactLink(full);
    expect(encoded).toBe(link(`v=2&name=Maria&node=${NODE}&phone=%2B393331234567&email=maria%40example.com`));
    expect(decodeContactLink(encoded)).toEqual(full);
  });

  test('keeps v1 when no phone or email is shared, so older builds can read it', () => {
    expect(encodeContactLink({ ...contact, phone: '  ', email: '' })).toBe(link(`v=1&name=Maria&node=${NODE}`));
  });

  test('shares either field alone', () => {
    expect(decodeContactLink(encodeContactLink({ ...contact, phone: '+39 333 123-4567' }))).toEqual({
      ...contact, phone: '+393331234567',
    });
    expect(decodeContactLink(encodeContactLink({ ...contact, email: ' Maria@Example.COM ' }))).toEqual({
      ...contact, email: 'maria@example.com',
    });
  });

  test('accepts a form-encoded plus sign only when percent-encoded', () => {
    expect(decodeContactLink(link(`v=2&name=Maria&node=${NODE}&phone=%2B39 333 1234567`)).phone).toBe('+393331234567');
    expect(() => decodeContactLink(link(`v=2&name=Maria&node=${NODE}&phone=+393331234567`))).toThrow(
      expect.objectContaining({ code: 'invalid-phone' }),
    );
  });

  test.each(['3331234567', '+0123456789', '+39 333', '+39333123456789012', '+39abc1234567'])(
    'rejects the phone %p', (phone) => {
      expect(() => encodeContactLink({ ...contact, phone })).toThrow(expect.objectContaining({ code: 'invalid-phone' }));
    },
  );

  test.each(['maria', 'maria@', '@example.com', 'maria@example', 'ma ria@example.com', 'a<b@example.com', `${'a'.repeat(250)}@x.it`])(
    'rejects the email %p', (email) => {
      expect(() => encodeContactLink({ ...contact, email })).toThrow(expect.objectContaining({ code: 'invalid-email' }));
    },
  );

  test('v1 links cannot carry the v2 fields', () => {
    expect(() => decodeContactLink(link(`v=1&name=Maria&node=${NODE}&phone=%2B393331234567`))).toThrow(
      expect.objectContaining({ code: 'malformed' }),
    );
  });

  test('v2 still requires a valid node and rejects unknown or repeated fields', () => {
    expect(() => decodeContactLink(link('v=2&name=Maria&phone=%2B393331234567'))).toThrow(ContactLinkError);
    expect(() => decodeContactLink(link(`v=2&name=Maria&node=${NODE}&email=a%40b.it&email=c%40d.it`))).toThrow(ContactLinkError);
    expect(() => decodeContactLink(link(`v=2&name=Maria&node=${NODE}&address=x`))).toThrow(ContactLinkError);
  });
});

describe('contact share message', () => {
  test('explains the link and ends with it on its own line, still decodable', () => {
    const message = contactShareMessage({ name: ' Maria ', nodePubkey: NODE, phone: '+393331234567' });
    const lines = message.split('\n');
    expect(lines[0]).toBe('Add Maria to your METEVO contacts: tap the link below.');
    expect(message).toContain('Paste a contact link');
    expect(decodeContactLink(lines[lines.length - 1])).toEqual({ name: 'Maria', nodePubkey: NODE, phone: '+393331234567' });
  });
});
