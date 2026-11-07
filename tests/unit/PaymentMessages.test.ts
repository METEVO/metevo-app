import {
  MAX_TAP_AMOUNT,
  NOT_AUTHORIZED_NOTE,
  paymentMessage,
  parseWholeUsdm,
} from '../../src/services/metevo/paymentMessages';
import type { PaymentFlowStage } from '../../src/hooks/usePaymentFlow';

const context = { recipient: 'Bob', amount: 20 };

describe('payment stage messages', () => {
  test('the wait names the recipient and tells the user what to ask', () => {
    expect(paymentMessage('requesting', context)).toEqual({
      title: 'Waiting for Bob to accept',
      spoken: 'Waiting for Bob to accept. Ask Bob to open METEVO.',
    });
  });

  test.each<PaymentFlowStage>([
    'requesting',
    'review',
    'authorizing',
    'submitting',
    'watching',
    'settled',
    'failed',
    'unknown',
  ])('stage %s has both a written and a spoken line', (stage) => {
    const message = paymentMessage(stage, context);
    expect(message.title.length).toBeGreaterThan(0);
    expect(message.spoken).not.toBeNull();
  });

  test('an uncertain payment warns against paying again', () => {
    expect(paymentMessage('unknown', context).spoken).toContain('Do not pay again');
  });

  test('Check status is only mentioned when the payment can be checked', () => {
    expect(paymentMessage('unknown', { ...context, canCheckStatus: true }).spoken).toContain(
      'Tap Check status',
    );
    expect(paymentMessage('unknown', context).spoken).not.toContain('Check status');
  });

  test('success repeats who received how much', () => {
    expect(paymentMessage('settled', context).spoken).toBe('Done. Bob received 20 dollars.');
  });
});

describe('typed whole USDm amounts', () => {
  test('accepts whole positive amounts', () => {
    expect(parseWholeUsdm('20')).toBe(20);
    expect(parseWholeUsdm(' 7 ')).toBe(7);
  });

  test.each(['12.50', '12,5', '0', '-3', 'abc', '', String(MAX_TAP_AMOUNT + 1)])(
    'refuses %p instead of rounding',
    (text) => {
      expect(parseWholeUsdm(text)).toBeNull();
    },
  );
});

describe('confirmation notes', () => {
  test('a refused confirmation says nothing was sent', () => {
    expect(NOT_AUTHORIZED_NOTE).toContain('Nothing was sent');
  });
});
