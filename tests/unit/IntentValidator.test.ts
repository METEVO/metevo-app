import {
  IntentValidationError,
  validateWalletIntent,
} from '../../src/ai/validation/intentValidator';
import { WalletIntentParse } from '../../src/ai/agents/walletIntentAgent';

/** A fully-null parse except for the fields each test overrides. */
function parseWith(overrides: Partial<WalletIntentParse>): WalletIntentParse {
  return {
    intent: 'SEND_PAYMENT',
    amount: null,
    currency: null,
    recipient: null,
    timeframe: null,
    limit: null,
    purpose: null,
    target_layer: null,
    ...overrides,
  };
}

describe('validateWalletIntent', () => {
  test('normalizes spoken layer names into enum values', () => {
    const validated = validateWalletIntent(
      parseWith({ target_layer: 'RGB Lightning' as WalletIntentParse['target_layer'] }),
      'send 10 via rgb lightning to Andrea',
    );
    expect(validated.target_layer).toBe('RGB_LN');
  });

  test('derives USDm from dollar wording and $ amounts', () => {
    for (const text of [
      'Okay. Send Maria 50 bucks.',
      'Send 1 buck to Maria',
      'Send $50 to Maria',
      'Send $ 50 to Maria',
      'Send 50 usd to Maria',
    ]) {
      const validated = validateWalletIntent(parseWith({ amount: 50 }), text);
      expect(validated.currency).toBe('USDM');
    }
  });

  test('derives BITCOIN_SATOSHI even from a singular sat', () => {
    const validated = validateWalletIntent(
      parseWith({ amount: 1 }),
      'Send 1 sat to Alice',
    );
    expect(validated.currency).toBe('BITCOIN_SATOSHI');
  });

  test('aborts on USDT and EUR wording', () => {
    for (const text of ['Send 50 USDT to Maria', 'Send 50 euros to Maria']) {
      expect(() => validateWalletIntent(parseWith({ amount: 50 }), text)).toThrow(
        IntentValidationError,
      );
    }
  });

  test('a transaction count is not a timeframe', () => {
    for (const timeframe of ['5', 'last 5', 'latest 5', 'most recent 5']) {
      const validated = validateWalletIntent(
        parseWith({ timeframe, limit: 5 }),
        `show ${timeframe} transactions`,
      );
      expect(validated.timeframe).toBeNull();
      expect(validated.limit).toBe(5);
    }
  });

  test('rejects non-positive amounts and limits', () => {
    expect(() =>
      validateWalletIntent(parseWith({ amount: 0 }), 'send nothing'),
    ).toThrow(IntentValidationError);
    expect(() =>
      validateWalletIntent(parseWith({ limit: -2 }), 'show transactions'),
    ).toThrow(IntentValidationError);
  });

  test('a purpose must be echoed by the user text', () => {
    const echoed = validateWalletIntent(
      parseWith({ purpose: 'groceries' }),
      'Send 10 to Alice for groceries',
    );
    expect(echoed.purpose).toBe('groceries');

    const invented = validateWalletIntent(
      parseWith({ purpose: 'rent' }),
      'Send 10 to Alice',
    );
    expect(invented.purpose).toBeNull();
  });

  test('a payment layer only counts when the user named it', () => {
    const gated = validateWalletIntent(
      parseWith({ target_layer: 'ONCHAIN' }),
      'Send 10 to Alice',
    );
    expect(gated.target_layer).toBeNull();

    const kept = validateWalletIntent(
      parseWith({ target_layer: 'ONCHAIN' }),
      'Send 10 on-chain to Alice',
    );
    expect(kept.target_layer).toBe('ONCHAIN');
  });

  test('payment direction conflicts abort the parse', () => {
    expect(() =>
      validateWalletIntent(parseWith({ intent: 'RECEIVE_PAYMENT' }), 'send 10 to Bob'),
    ).toThrow(IntentValidationError);
    expect(() =>
      validateWalletIntent(
        parseWith({ intent: 'SEND_PAYMENT' }),
        'please generate a payment request for 10',
      ),
    ).toThrow(IntentValidationError);
  });

  test('string "null" answers are normalized to null', () => {
    const validated = validateWalletIntent(
      parseWith({
        recipient: 'null' as unknown as string | null,
        timeframe: 'NULL' as unknown as string | null,
      }),
      'send money to null',
    );
    expect(validated.recipient).toBeNull();
    expect(validated.timeframe).toBeNull();
  });

  test('validation never mutates the parsed input', () => {
    const parsed = parseWith({ amount: 10, timeframe: '5', limit: 5 });
    validateWalletIntent(parsed, 'send 10, show last 5');
    expect(parsed.timeframe).toBe('5');
  });
});
