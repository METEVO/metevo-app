import { CHECK_WORD_COUNT, contactCheckWords } from '../../src/services/metevo/contactCheckWords';

jest.mock('expo-secure-store', () => ({}));

const NODE = `02${'ab'.repeat(32)}`;

describe('contact check words', () => {
  test('are four words, stable for the same node whatever its casing', () => {
    const words = contactCheckWords(NODE);
    expect(words).toHaveLength(CHECK_WORD_COUNT);
    expect(contactCheckWords(` ${NODE.toUpperCase()} `)).toEqual(words);
    words.forEach((word) => expect(word).toMatch(/^[a-z]+$/));
  });

  test('differ when either end of the key differs', () => {
    const base = `02${'00'.repeat(32)}`;
    const startChanged = `02ff${'00'.repeat(31)}`;
    const endChanged = `02${'00'.repeat(31)}ff`;
    expect(contactCheckWords(startChanged)).not.toEqual(contactCheckWords(base));
    expect(contactCheckWords(endChanged)).not.toEqual(contactCheckWords(base));
  });

  test('cover all 256 byte values with distinct words', () => {
    const seen = new Set<string>();
    for (let byte = 0; byte < 256; byte += 1) {
      const hex = byte.toString(16).padStart(2, '0');
      seen.add(contactCheckWords(`02${hex}${'00'.repeat(31)}`)[0]);
    }
    expect(seen.size).toBe(256);
  });

  test('refuse an invalid node', () => {
    expect(() => contactCheckWords('Maria')).toThrow('pubkey');
  });
});
