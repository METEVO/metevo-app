import { formatSats, formatUsdmBalance } from '../../src/utils/balanceFormat';

describe('balance formatting', () => {
  it('shows USDm base units with two decimals', () => {
    expect(formatUsdmBalance(12_050_000_000)).toBe('120.50 USDm');
    expect(formatUsdmBalance(0)).toBe('0.00 USDm');
  });

  it('shows a dash when the USDm balance is unknown', () => {
    expect(formatUsdmBalance(null)).toBe('— USDm');
  });

  it('groups sats in thousands whatever the locale', () => {
    expect(formatSats(99_678_917)).toBe('99,678,917 sats');
    expect(formatSats(950)).toBe('950 sats');
  });

  it('shows a dash when the sats balance is unknown', () => {
    expect(formatSats(null)).toBe('— sats');
  });
});
