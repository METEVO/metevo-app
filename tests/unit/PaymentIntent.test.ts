import { parseVoicePaymentIntent } from '../../src/services/metevo/paymentIntent';

describe('parseVoicePaymentIntent', () => {
  const valid = { action: 'pay', asset: 'USDm', amount: 10, recipient: 'Maria' };

  test('parses a valid JSON string from the voice model', () => {
    const intent = parseVoicePaymentIntent(JSON.stringify(valid));
    expect(intent).toEqual({
      action: 'pay',
      asset: 'USDM',
      amount: 10,
      recipient: 'Maria',
    });
  });

  test('parses a valid object', () => {
    expect(parseVoicePaymentIntent(valid)?.recipient).toBe('Maria');
  });

  test('normalizes the asset ticker to upper case', () => {
    expect(parseVoicePaymentIntent({ ...valid, asset: 'usdm' })?.asset).toBe('USDM');
  });

  test.each([
    ['non-JSON string', 'pay ten usdm to Maria'],
    ['JSON array', '[]'],
    ['wrong action', JSON.stringify({ ...valid, action: 'request' })],
    ['missing recipient', JSON.stringify({ action: 'pay', asset: 'USDm', amount: 10 })],
    ['empty recipient', JSON.stringify({ ...valid, recipient: '   ' })],
    ['zero amount', JSON.stringify({ ...valid, amount: 0 })],
    ['negative amount', JSON.stringify({ ...valid, amount: -5 })],
    ['fractional amount', JSON.stringify({ ...valid, amount: 10.5 })],
    ['NaN amount', JSON.stringify({ ...valid, amount: 'NaN' })],
    ['missing amount', JSON.stringify({ action: 'pay', asset: 'USDm', recipient: 'Maria' })],
    ['missing asset', JSON.stringify({ action: 'pay', amount: 10, recipient: 'Maria' })],
    ['bad asset ticker', JSON.stringify({ ...valid, asset: 'USDT!' })],
    ['oversized recipient', JSON.stringify({ ...valid, recipient: 'x'.repeat(121) })],
    ['null', null],
    ['undefined', undefined],
  ])('fails safely to null on %s', (_label, raw) => {
    expect(parseVoicePaymentIntent(raw)).toBeNull();
  });

  test('rejects an amount above the safety cap', () => {
    expect(
      parseVoicePaymentIntent({ ...valid, amount: 1_000_001 }),
    ).toBeNull();
  });
});
