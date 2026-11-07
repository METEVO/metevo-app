import type { JournalEntry, SpendingSummary } from './paymentJournal';

/** Written and spoken copy for the History and Spending cards. */

export const JOURNAL_SCOPE_NOTE = 'Payments made with this phone.';
export const EMPTY_HISTORY = 'No payments yet on this phone.';

const SPOKEN_HISTORY_LIMIT = 3;

export function formatUsdm(amount: number): string {
  return `${amount.toFixed(2)} USDm`;
}

/** Spoken amounts say dollars, like the payment flow does. */
function spokenMoney(amount: number): string {
  return `${Number(amount.toFixed(2))} dollars`;
}

function spokenEntry(entry: JournalEntry): string {
  return describeEntry(entry).replace(formatUsdm(entry.amountUsdm), spokenMoney(entry.amountUsdm));
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function describeDay(settledAt: string, now: Date = new Date()): string {
  const settled = new Date(settledAt);
  const daysAgo = Math.round((startOfDay(now) - startOfDay(settled)) / 86_400_000);
  if (daysAgo <= 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  return `${daysAgo} days ago`;
}

/** "Sent 5.00 USDm to pippo" / "Received 20.00 USDm". */
export function describeEntry(entry: JournalEntry): string {
  const amount = formatUsdm(entry.amountUsdm);
  if (entry.direction === 'sent') {
    return entry.counterparty === null
      ? `Sent ${amount}`
      : `Sent ${amount} to ${entry.counterparty}`;
  }
  return entry.counterparty === null
    ? `Received ${amount}`
    : `Received ${amount} from ${entry.counterparty}`;
}

export function spokenHistory(entries: JournalEntry[], now: Date = new Date()): string {
  if (entries.length === 0) {
    return EMPTY_HISTORY;
  }
  const latest = entries
    .slice(0, SPOKEN_HISTORY_LIMIT)
    .map((entry) => `${spokenEntry(entry)}, ${describeDay(entry.settledAt, now)}`);
  return `Your last payments: ${latest.join('. ')}.`;
}

export function spokenSpending(summary: SpendingSummary): string {
  return (
    `This week you sent ${spokenMoney(summary.week.sentUsdm)} ` +
    `and received ${spokenMoney(summary.week.receivedUsdm)}. ` +
    `This month you sent ${spokenMoney(summary.month.sentUsdm)} ` +
    `and received ${spokenMoney(summary.month.receivedUsdm)}.`
  );
}
