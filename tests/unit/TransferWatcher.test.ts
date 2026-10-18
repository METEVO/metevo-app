import {
  mapTransferStatus,
  watchTransfersToTerminal,
  TransferInfo,
} from '../../src/services/metevo/transferWatcher';

/** Queued refresh responses; each call pops one entry (last repeats). */
function refreshFromQueue(queue: TransferInfo[][]) {
  let calls = 0;
  const refresh = jest.fn(async () => {
    const index = Math.min(calls, queue.length - 1);
    calls += 1;
    return queue[index];
  });
  return { refresh, callCount: () => calls };
}

const transfer = (overrides: Partial<TransferInfo> = {}): TransferInfo => ({
  transferId: 't-1',
  kind: 'outbound',
  status: 'Pending',
  amount: null,
  ...overrides,
});

describe('mapTransferStatus', () => {
  test.each([
    ['Settled', 'settled'],
    ['Failed', 'failed'],
    ['Pending', 'pending'],
    ['Processing', 'pending'],
    ['CounterpartyExpired', 'pending'],
    ['', 'pending'],
  ])('maps %s to %s', (raw, expected) => {
    expect(mapTransferStatus(raw)).toBe(expected);
  });
});

describe('watchTransfersToTerminal', () => {
  const noDelay = () => Promise.resolve();
  // Every test uses an advancing clock: a frozen clock plus a no-op delay
  // would starve the timer phase (microtask-only yields) and hang jest's
  // own test timeout - the deadline must stay reachable.
  const tickingClock = () => {
    let tick = 0;
    return () => {
      tick += 1_000;
      return tick;
    };
  };

  test('resolves settled when a watched transfer settles', async () => {
    // The first refresh is the baseline (pre-payment): the transfer is not
    // visible yet, exactly like a watch started before submission.
    const { refresh, callCount } = refreshFromQueue([
      [],
      [transfer({ status: 'Pending' })],
      [transfer({ status: 'Processing' })],
      [transfer({ status: 'Settled' })],
    ]);

    const result = await watchTransfersToTerminal({
      refresh,
      intervalMs: 10,
      timeoutMs: 10_000,
      delay: noDelay,
      now: tickingClock(),
    });

    expect(result.status).toBe('settled');
    expect(result.transfer?.transferId).toBe('t-1');
    expect(callCount()).toBe(4);
  });

  test('resolves failed when the transfer fails', async () => {
    const { refresh } = refreshFromQueue([
      [],
      [transfer({ status: 'Pending' })],
      [transfer({ status: 'Failed' })],
    ]);

    const result = await watchTransfersToTerminal({
      refresh,
      intervalMs: 10,
      timeoutMs: 10_000,
      delay: noDelay,
      now: tickingClock(),
    });

    expect(result.status).toBe('failed');
  });

  test('reports unknown at the deadline while still pending', async () => {
    const { refresh, callCount } = refreshFromQueue([
      [transfer({ status: 'Pending' })],
    ]);

    const result = await watchTransfersToTerminal({
      refresh,
      intervalMs: 1_000,
      timeoutMs: 2_500,
      delay: noDelay,
      now: (() => {
        let tick = 0;
        return () => {
          tick += 1_000;
          return tick;
        };
      })(),
    });

    expect(result.status).toBe('unknown');
    expect(result.transfer).toBeNull();
    // Polls at t=1ms, 1001ms, 2001ms; the 3001ms check exceeds the 2500ms
    // deadline, so exactly three refreshes run.
    expect(callCount()).toBe(3);
  });

  test('ignores terminal transfers that the predicate does not watch', async () => {
    const { refresh, callCount } = refreshFromQueue([
      [transfer({ transferId: 'old', status: 'Settled' })],
      [transfer({ transferId: 'old', status: 'Settled' })],
      [transfer({ transferId: 'old', status: 'Settled' }), transfer({ transferId: 't-1', status: 'Settled' })],
    ]);

    const result = await watchTransfersToTerminal({
      refresh,
      intervalMs: 10,
      timeoutMs: 10_000,
      delay: noDelay,
      now: tickingClock(),
      transferId: 't-1',
    });

    expect(result.status).toBe('settled');
    expect(result.transfer?.transferId).toBe('t-1');
    expect(callCount()).toBe(3);
  });

  test('ignores transfers already present in the baseline snapshot', async () => {
    // Both polls return the same pre-existing settled transfer; without a
    // baseline exclusion the watcher would report an instant false settled.
    const { refresh, callCount } = refreshFromQueue([
      [transfer({ transferId: 'pre-existing', status: 'Settled' })],
      [transfer({ transferId: 'pre-existing', status: 'Settled' })],
    ]);

    const result = await watchTransfersToTerminal({
      refresh,
      intervalMs: 10,
      timeoutMs: 1_000,
      delay: noDelay,
      now: (() => {
        let tick = 0;
        return () => {
          tick += 10_000;
          return tick;
        };
      })(),
    });

    expect(result.status).toBe('unknown');
    // The single poll both captures the baseline and hits the deadline
    // (the clock advances past the timeout between the two calls), so the
    // pre-existing settled transfer is never mistaken for settlement.
    expect(callCount()).toBe(1);
  });

  test('stops promptly when shouldStop turns true', async () => {
    const { refresh, callCount } = refreshFromQueue([
      [transfer({ status: 'Pending' })],
      [transfer({ status: 'Pending' })],
      [transfer({ status: 'Pending' })],
    ]);
    // The clock must advance so the deadline bounds the loop even if
    // cancellation never fires; shouldStop flips once two polls ran.
    let stopped = false;
    const result = await watchTransfersToTerminal({
      refresh,
      intervalMs: 10,
      timeoutMs: 10_000,
      delay: noDelay,
      now: (() => {
        let tick = 0;
        return () => {
          tick += 1_000;
          return tick;
        };
      })(),
      shouldStop: () => {
        if (callCount() >= 2) {
          stopped = true;
        }
        return stopped;
      },
    });

    expect(result.status).toBe('unknown');
    expect(callCount()).toBe(2);
  });

  test('never resolves settled from an empty transfer list', async () => {
    const { refresh } = refreshFromQueue([[]]);

    const result = await watchTransfersToTerminal({
      refresh,
      intervalMs: 10,
      timeoutMs: 100,
      delay: noDelay,
      now: (() => {
        let tick = 0;
        return () => {
          tick += 1_000;
          return tick;
        };
      })(),
    });

    expect(result.status).toBe('unknown');
    expect(result.transfer).toBeNull();
  });
});
