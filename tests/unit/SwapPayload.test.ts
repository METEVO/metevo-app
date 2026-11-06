import { parseSwapStart } from '../../src/services/swap/swapPayload';

describe('swap card payload', () => {
  test('keeps a valid direction and prefilled amount', () => {
    expect(parseSwapStart({ direction: 'BTC_TO_USDM', draft: '5000' })).toEqual({
      direction: 'BTC_TO_USDM',
      draft: '5000',
    });
  });

  test.each([null, undefined, 'swap', { direction: 'ETH_TO_USDM', draft: '1' }])(
    'falls back to an empty USDm -> BTC swap for %p',
    (payload) => {
      expect(parseSwapStart(payload)).toEqual({ direction: 'USDM_TO_BTC', draft: '' });
    },
  );

  test('a non-text amount is dropped, not trusted', () => {
    expect(parseSwapStart({ direction: 'USDM_TO_BTC', draft: 12 })).toEqual({
      direction: 'USDM_TO_BTC',
      draft: '',
    });
  });
});
