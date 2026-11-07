import {
  JournalEntry,
  MAX_JOURNAL_ENTRIES,
  appendEntry,
  listPayments,
  parseJournal,
  recordSettledPayment,
  summarizeSpending,
} from '../../src/services/metevo/paymentJournal';
import {
  EMPTY_HISTORY,
  describeDay,
  describeEntry,
  spokenHistory,
  spokenSpending,
} from '../../src/services/metevo/journalMessages';

let mockFiles: Record<string, string> = {};

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/docs/',
  getInfoAsync: jest.fn(async (path: string) => ({ exists: path in mockFiles })),
  readAsStringAsync: jest.fn(async (path: string) => mockFiles[path]),
  writeAsStringAsync: jest.fn(async (path: string, value: string) => {
    mockFiles[path] = value;
  }),
}));

const NOW = new Date('2026-11-07T12:00:00Z');

function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'e1',
    direction: 'sent',
    amountUsdm: 5,
    counterparty: 'pippo',
    channel: 'remote',
    settledAt: NOW.toISOString(),
    demo: true,
    ...overrides,
  };
}

function daysBefore(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

describe('payment journal storage', () => {
  beforeEach(() => {
    mockFiles = {};
  });

  test('a fresh phone has no payments', async () => {
    await expect(listPayments()).resolves.toEqual([]);
  });

  test('recorded payments come back newest first', async () => {
    await recordSettledPayment(
      { direction: 'received', amountUsdm: 20, counterparty: null, channel: 'remote', demo: false },
      new Date(daysBefore(1)),
    );
    await recordSettledPayment(
      { direction: 'sent', amountUsdm: 5, counterparty: 'pippo', channel: 'remote', demo: true },
      NOW,
    );
    const payments = await listPayments();
    expect(payments.map((p) => p.direction)).toEqual(['sent', 'received']);
    expect(payments[0]).toMatchObject({ amountUsdm: 5, counterparty: 'pippo', demo: true });
  });

  test('concurrent records are both kept', async () => {
    await Promise.all([
      recordSettledPayment({ direction: 'sent', amountUsdm: 1, counterparty: null, channel: 'remote', demo: true }),
      recordSettledPayment({ direction: 'sent', amountUsdm: 2, counterparty: null, channel: 'remote', demo: true }),
    ]);
    await expect(listPayments()).resolves.toHaveLength(2);
  });

  test('a corrupted file reads as an empty journal', async () => {
    mockFiles['/docs/payment-journal.json'] = '{not json';
    await expect(listPayments()).resolves.toEqual([]);
  });
});

describe('payment journal helpers', () => {
  test('parseJournal drops malformed entries', () => {
    const raw = JSON.stringify([entry(), { id: 'bad', direction: 'stolen' }, entry({ id: 'e2', amountUsdm: Number.NaN })]);
    expect(parseJournal(raw).map((e) => e.id)).toEqual(['e1']);
  });

  test('appendEntry keeps at most the newest entries', () => {
    const full = Array.from({ length: MAX_JOURNAL_ENTRIES }, (_, i) => entry({ id: `old${i}` }));
    const next = appendEntry(full, entry({ id: 'new' }));
    expect(next).toHaveLength(MAX_JOURNAL_ENTRIES);
    expect(next[0].id).toBe('new');
    expect(next.some((e) => e.id === `old${MAX_JOURNAL_ENTRIES - 1}`)).toBe(false);
  });

  test('summarizeSpending splits the last 7 and 30 days', () => {
    const summary = summarizeSpending(
      [
        entry({ amountUsdm: 5, settledAt: daysBefore(1) }),
        entry({ direction: 'received', amountUsdm: 20, settledAt: daysBefore(2) }),
        entry({ amountUsdm: 10, settledAt: daysBefore(12) }),
        entry({ amountUsdm: 99, settledAt: daysBefore(45) }),
      ],
      NOW,
    );
    expect(summary.week).toEqual({ sentUsdm: 5, receivedUsdm: 20 });
    expect(summary.month).toEqual({ sentUsdm: 15, receivedUsdm: 20 });
  });
});

describe('journal messages', () => {
  test('entries read in plain words', () => {
    expect(describeEntry(entry())).toBe('Sent 5.00 USDm to pippo');
    expect(describeEntry(entry({ direction: 'received', counterparty: null, amountUsdm: 20 }))).toBe(
      'Received 20.00 USDm',
    );
  });

  test('days are relative', () => {
    expect(describeDay(NOW.toISOString(), NOW)).toBe('today');
    expect(describeDay(daysBefore(1), NOW)).toBe('yesterday');
    expect(describeDay(daysBefore(4), NOW)).toBe('4 days ago');
  });

  test('spoken history says dollars and stops at three payments', () => {
    expect(spokenHistory([], NOW)).toBe(EMPTY_HISTORY);
    const spoken = spokenHistory(
      [entry(), entry({ id: 'b' }), entry({ id: 'c' }), entry({ id: 'd', counterparty: 'zed' })],
      NOW,
    );
    expect(spoken).toBe(
      'Your last payments: Sent 5 dollars to pippo, today. Sent 5 dollars to pippo, today. Sent 5 dollars to pippo, today.',
    );
  });

  test('spoken spending reads both windows', () => {
    expect(
      spokenSpending({ week: { sentUsdm: 5, receivedUsdm: 0 }, month: { sentUsdm: 15.5, receivedUsdm: 20 } }),
    ).toBe(
      'This week you sent 5 dollars and received 0 dollars. This month you sent 15.5 dollars and received 20 dollars.',
    );
  });
});
