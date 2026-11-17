import { parseSwapStart } from '../../src/services/swap/swapPayload';
test('only an explicit USD purchase amount is prefilled', () => {
  expect(parseSwapStart({ purchaseUsd: true, draft: '10' })).toEqual({ draft: '10' });
  expect(parseSwapStart({ direction: 'BTC_TO_USDM', draft: '5000' }).draft).toBe('');
  expect(parseSwapStart({ direction: 'USDM_TO_BTC', draft: '10' }).draft).toBe('');
  expect(parseSwapStart(null)).toEqual({ draft: '' });
});
