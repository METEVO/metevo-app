import { CHECK_WORD_COUNT, contactCheckWords } from '../../src/services/metevo/contactCheckWords';

jest.mock('expo-secure-store', () => ({}));

const NODE = `02${'ab'.repeat(32)}`;

describe('contact check words', () => {
  test('are six words, stable for the same node whatever its casing', () => {
    const words = contactCheckWords(NODE);
    expect(words).toHaveLength(CHECK_WORD_COUNT);
    expect(contactCheckWords(` ${NODE.toUpperCase()} `)).toEqual(words);
    words.forEach((word) => expect(word).toMatch(/^[a-z]+$/));
  });

  test('change when any byte of the key changes, not only the ends', () => {
    const base = contactCheckWords(`02${'00'.repeat(32)}`);
    const changedAt = (position: number) =>
      contactCheckWords(`02${'00'.repeat(position)}ff${'00'.repeat(31 - position)}`);
    [0, 1, 15, 30, 31].forEach((position) => {
      expect(changedAt(position)).not.toEqual(base);
    });
  });

  test('match the fixed vector computed outside the app', () => {
    expect(contactCheckWords(NODE)).toEqual(['swan', 'goat', 'lamp', 'ghost', 'fork', 'beach']);
  });

  test('refuse an invalid node', () => {
    expect(() => contactCheckWords('Maria')).toThrow('pubkey');
  });
});
