import { adaptWalletResult, intentToCardId } from '../../src/ai/walletResult';
import { WalletIntentParse } from '../../src/ai/agents/walletIntentAgent';

function parseWith(overrides: Partial<WalletIntentParse>): WalletIntentParse {
  return {
    intent: 'CHECK_BALANCE',
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

describe('adaptWalletResult', () => {
  test('maps spoken time expressions onto structured periods', () => {
    const result = adaptWalletResult(parseWith({ intent: 'GET_SPENDING_SUMMARY', timeframe: 'Last Week' }));
    expect(result.parameters.timeframe).toEqual({
      period: 'last_week',
      start_date: null,
      end_date: null,
    });
  });

  test('keeps only wallet currencies, nulls everything else', () => {
    const usdm = adaptWalletResult(parseWith({ currency: 'USDM' }));
    expect(usdm.parameters.currency).toBe('USDM');

    const usdt = adaptWalletResult(parseWith({ currency: 'USDT' }));
    expect(usdt.parameters.currency).toBeNull();
  });
});

describe('intentToCardId', () => {
  test('send opens the currency-matching card', () => {
    expect(
      intentToCardId(adaptWalletResult(parseWith({ intent: 'SEND_PAYMENT', currency: 'USDM' }))),
    ).toBe('send-usdm');
    expect(
      intentToCardId(
        adaptWalletResult(parseWith({ intent: 'SEND_PAYMENT', currency: 'BITCOIN_SATOSHI' })),
      ),
    ).toBe('send-btc');
  });

  test('a send without a usable currency opens no card', () => {
    expect(
      intentToCardId(adaptWalletResult(parseWith({ intent: 'SEND_PAYMENT', currency: null }))),
    ).toBeNull();
  });

  test('read and receive intents map onto their cards', () => {
    expect(intentToCardId(adaptWalletResult(parseWith({ intent: 'RECEIVE_PAYMENT' })))).toBe(
      'create-usdm-invoice',
    );
    expect(intentToCardId(adaptWalletResult(parseWith({ intent: 'CHECK_BALANCE' })))).toBe(
      'read-balance',
    );
    expect(
      intentToCardId(adaptWalletResult(parseWith({ intent: 'GET_SPENDING_SUMMARY' }))),
    ).toBe('read-spending-overview');
    expect(
      intentToCardId(adaptWalletResult(parseWith({ intent: 'GET_TRANSACTION_HISTORY' }))),
    ).toBe('read-transactions');
  });

  test('swap and unknown render nothing', () => {
    expect(intentToCardId(adaptWalletResult(parseWith({ intent: 'SWAP' })))).toBeNull();
    expect(intentToCardId(adaptWalletResult(parseWith({ intent: 'UNKNOWN' })))).toBeNull();
  });
});
