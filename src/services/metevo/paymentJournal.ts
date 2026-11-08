import * as FileSystem from 'expo-file-system/legacy';

/**
 * On-device journal of settled payments, the data behind History and
 * Spending. It only knows payments this phone saw settle: the node's own
 * payment list is not exposed by the wallet gateway yet.
 */

export type PaymentDirection = 'sent' | 'received';
export type PaymentChannel = 'remote' | 'in-person';

export interface JournalEntry {
  id: string;
  direction: PaymentDirection;
  amountUsdm: number;
  counterparty: string | null;
  channel: PaymentChannel;
  settledAt: string;
  demo: boolean;
}

export type NewJournalEntry = Omit<JournalEntry, 'id' | 'settledAt'>;

export interface SpendingTotals {
  sentUsdm: number;
  receivedUsdm: number;
}

export interface SpendingSummary {
  week: SpendingTotals;
  month: SpendingTotals;
}

export const MAX_JOURNAL_ENTRIES = 200;

const JOURNAL_FILE = 'payment-journal.json';
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

function journalPath(): string {
  return `${FileSystem.documentDirectory ?? ''}${JOURNAL_FILE}`;
}

function isJournalEntry(value: unknown): value is JournalEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    (entry.direction === 'sent' || entry.direction === 'received') &&
    typeof entry.amountUsdm === 'number' &&
    Number.isFinite(entry.amountUsdm) &&
    (entry.counterparty === null || typeof entry.counterparty === 'string') &&
    (entry.channel === 'remote' || entry.channel === 'in-person') &&
    typeof entry.settledAt === 'string' &&
    !Number.isNaN(Date.parse(entry.settledAt)) &&
    typeof entry.demo === 'boolean'
  );
}

/** Keeps only well-formed entries, newest first; anything else reads as empty. */
export function parseJournal(raw: string): JournalEntry[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(isJournalEntry)
      .sort((a, b) => Date.parse(b.settledAt) - Date.parse(a.settledAt));
  } catch {
    return [];
  }
}

export function appendEntry(
  entries: JournalEntry[],
  entry: JournalEntry,
): JournalEntry[] {
  return [entry, ...entries].slice(0, MAX_JOURNAL_ENTRIES);
}

function totalsSince(entries: JournalEntry[], since: number): SpendingTotals {
  return entries
    .filter((entry) => Date.parse(entry.settledAt) >= since)
    .reduce<SpendingTotals>(
      (totals, entry) =>
        entry.direction === 'sent'
          ? { ...totals, sentUsdm: totals.sentUsdm + entry.amountUsdm }
          : { ...totals, receivedUsdm: totals.receivedUsdm + entry.amountUsdm },
      { sentUsdm: 0, receivedUsdm: 0 },
    );
}

/** Rolling windows: the last 7 days and the last 30 days. */
export function summarizeSpending(
  entries: JournalEntry[],
  now: Date = new Date(),
): SpendingSummary {
  const nowMs = now.getTime();
  return {
    week: totalsSince(entries, nowMs - WEEK_MS),
    month: totalsSince(entries, nowMs - MONTH_MS),
  };
}

export async function listPayments(): Promise<JournalEntry[]> {
  const path = journalPath();
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return [];
    }
    return parseJournal(await FileSystem.readAsStringAsync(path));
  } catch (cause) {
    console.warn(
      '[metevo][journal] read failed:',
      cause instanceof Error ? cause.message : 'unknown',
    );
    return [];
  }
}

let pendingWrite: Promise<void> = Promise.resolve();

/**
 * Appends one settled payment. Writes are serialized so two payments
 * settling together never overwrite each other; a failed write is logged
 * and never breaks the payment flow that called it.
 */
export function recordSettledPayment(
  entry: NewJournalEntry,
  now: Date = new Date(),
): Promise<void> {
  pendingWrite = pendingWrite.then(async () => {
    try {
      const current = await listPayments();
      const next = appendEntry(current, {
        ...entry,
        id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        settledAt: now.toISOString(),
      });
      await FileSystem.writeAsStringAsync(journalPath(), JSON.stringify(next));
    } catch (cause) {
      console.warn(
        '[metevo][journal] write failed:',
        cause instanceof Error ? cause.message : 'unknown',
      );
    }
  });
  return pendingWrite;
}
