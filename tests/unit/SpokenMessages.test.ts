import { spokenMessage } from '../../src/ai/localization/spokenMessages';
import type { UiLanguage } from '../../src/hooks/useWalletSession';

const ALL_LANGUAGES = Object.keys({
  english: null,
  italiano: null,
  turkce: null,
  francais: null,
  hindi: null,
  espanol: null,
  kiswahili: null,
}) as UiLanguage[];

describe('spokenMessages', () => {
  test('every message exists in every design language', () => {
    for (const language of ALL_LANGUAGES) {
      expect(spokenMessage('balanceReady', language).trim().length).toBeGreaterThan(0);
      expect(spokenMessage('reviewAndConfirm', language).trim().length).toBeGreaterThan(0);
      expect(spokenMessage('didNotUnderstand', language).trim().length).toBeGreaterThan(0);
    }
  });

  test('balance phrasing keeps wallet terminology (saldo, not equilibrio)', () => {
    const italian = spokenMessage('balanceReady', 'italiano');
    expect(italian).toContain('saldo');
    expect(italian).not.toContain('equilibrio');
  });

  test('canonical data never leaks through the prose catalog', () => {
    for (const language of ALL_LANGUAGES) {
      expect(spokenMessage('missingTransferDetails', language)).not.toMatch(/amount|recipient/);
    }
  });
});
