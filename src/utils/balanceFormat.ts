export const USDM_PRECISION_DIGITS = 8;

/** Formats the wallet's USDm base units as the design's "20.00 USDm". */
export function formatUsdmBalance(baseUnits: number | null): string {
  if (baseUnits === null) {
    return '— USDm';
  }
  return `${(baseUnits / 10 ** USDM_PRECISION_DIGITS).toFixed(2)} USDm`;
}

export function formatSats(sats: number | null): string {
  if (sats === null) {
    return '— sats';
  }
  // Fixed grouping: the reference design shows 99,678,917 regardless of locale.
  return `${sats.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} sats`;
}
