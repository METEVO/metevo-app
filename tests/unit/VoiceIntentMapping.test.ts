import {
  intentActionFromInstruction,
} from '../../src/utils/voiceIntentMapping';
import { WalletInstruction } from '../../src/ai/qwen';

function instruction(overrides: Partial<WalletInstruction> = {}): WalletInstruction {
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

describe('wallet instruction -> intent card mapping', () => {
  test('a complete send maps to the USDm card with a payable payload', () => {
    const action = intentActionFromInstruction(
      instruction({ amount: 25, currency: 'USDM', recipient: 'Andrea' }),
      'Send 25 USDm to Andrea',
    );
    expect(action).not.toBeNull();
    expect(action!.cardId).toBe('send-usdm');
    expect(action!.payload).toEqual({
      action: 'pay',
      asset: 'USDM',
      amount: 25,
      recipient: 'Andrea',
    });
    expect(action!.announcement).toContain('25 USDM');
    expect(action!.announcement).toContain('Andrea');
  });

  test('bitcoin currencies route to the sats card', () => {
    const action = intentActionFromInstruction(
      instruction({ amount: 5000, currency: 'BITCOIN_SATOSHI', recipient: 'Maria' }),
      'Send 5000 sats to Maria',
    );
    expect(action!.cardId).toBe('send-btc');
    expect((action!.payload as { asset: string }).asset).toBe('BITCOIN_SATOSHI');
  });

  test('an incomplete send opens the card without a payable payload', () => {
    const action = intentActionFromInstruction(
      instruction({ amount: null, recipient: 'Maria' }),
      'Send some money to Maria',
    );
    expect(action!.cardId).toBe('send-usdm');
    expect(action!.payload).toBeNull();
  });

  test('a fractional amount never reaches the payable payload', () => {
    const action = intentActionFromInstruction(
      instruction({ amount: 10.5, currency: 'USDM', recipient: 'Maria' }),
      'Send ten and a half',
    );
    expect(action!.payload).toBeNull();
  });

  test('read intents map to their cards with no payload', () => {
    expect(intentActionFromInstruction(instruction({ intent: 'CHECK_BALANCE' }), '')!.cardId).toBe(
      'read-balance',
    );
    expect(
      intentActionFromInstruction(instruction({ intent: 'GET_TRANSACTION_HISTORY' }), '')!.cardId,
    ).toBe('read-transactions');
    expect(
      intentActionFromInstruction(instruction({ intent: 'GET_SPENDING_SUMMARY' }), '')!.cardId,
    ).toBe('read-spending-overview');
  });

  test('receive opens the payment request card with the spoken amount', () => {
    const action = intentActionFromInstruction(
      instruction({ intent: 'RECEIVE_PAYMENT', amount: 20, currency: 'USDM' }),
      'Create a request for 20 USDm',
    );
    expect(action!.cardId).toBe('create-usdm-invoice');
    expect(action!.payload).toEqual({ amountUsd: 20 });
  });

  test('unknown instructions are not understood', () => {
    expect(intentActionFromInstruction(instruction({ intent: 'UNKNOWN' }), '')).toBeNull();
  });

  test('a dollar swap opens the simulation from USDm with the spoken amount', () => {
    const action = intentActionFromInstruction(
      instruction({ intent: 'SWAP', amount: 12.5, currency: 'USD' }),
      'Swap 12.5 dollars to bitcoin',
    );
    expect(action!.cardId).toBe('swap');
    expect(action!.payload).toEqual({ direction: 'USDM_TO_BTC', draft: '12.5' });
    expect(action!.announcement).toContain('No funds will be exchanged');
  });

  test('a sats swap opens the simulation from BTC', () => {
    const action = intentActionFromInstruction(
      instruction({ intent: 'SWAP', amount: 5000, currency: 'sats' }),
      'Swap 5000 sats to dollars',
    );
    expect(action!.payload).toEqual({ direction: 'BTC_TO_USDM', draft: '5000' });
  });

  test('a swap amount the card cannot hold exactly is left empty', () => {
    expect(
      intentActionFromInstruction(instruction({ intent: 'SWAP', amount: 0.001, currency: 'BTC' }), '')!
        .payload,
    ).toEqual({ direction: 'BTC_TO_USDM', draft: '' });
    expect(
      intentActionFromInstruction(instruction({ intent: 'SWAP', amount: 1.005, currency: 'USD' }), '')!
        .payload,
    ).toEqual({ direction: 'USDM_TO_BTC', draft: '' });
    expect(intentActionFromInstruction(instruction({ intent: 'SWAP' }), '')!.payload).toEqual({
      direction: 'USDM_TO_BTC',
      draft: '',
    });
  });
});
