import { SIMULATION_NOTICE, SwapFlow, SwapFlowPorts } from '../../src/services/swap/swapFlow';
import { SIMULATED_QUOTE_TTL_MS } from '../../src/services/swap/swapQuote';
import { SwapExecutionResult, SwapService, createSimulatedSwapService } from '../../src/services/swap/swapService';

const NOW = 1_700_000_000_000;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(overrides: Partial<SwapFlowPorts> = {}, draft = '10') {
  let clock = NOW;
  const announcements: string[] = [];
  const service = createSimulatedSwapService({ delayMs: 0 });
  const ports: SwapFlowPorts = {
    service,
    authorize: jest.fn().mockResolvedValue(undefined),
    announce: (text) => announcements.push(text),
    now: () => clock,
    ...overrides,
  };
  const flow = new SwapFlow(ports, { direction: 'USDM_TO_BTC', draft });
  return {
    flow,
    ports,
    announcements,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe('swap flow', () => {
  test('entry -> review -> one biometric prompt -> simulation completed', async () => {
    const { flow, ports, announcements } = setup();
    flow.review(null);
    expect(flow.getState().stage).toBe('review');
    expect(announcements[0]).toContain(SIMULATION_NOTICE);

    await flow.confirm();
    expect(ports.authorize).toHaveBeenCalledTimes(1);
    expect(flow.getState().stage).toBe('completed');
    expect(announcements.at(-1)).toContain('No funds were exchanged');
  });

  test('an invalid amount stays on the entry with a spoken note', () => {
    const { flow, announcements } = setup({}, '1.005');
    flow.review(null);
    const state = flow.getState();
    expect(state.stage).toBe('entry');
    expect(state.stage === 'entry' && state.note).toBe('Enter a valid amount.');
    expect(announcements).toEqual(['Enter a valid amount.']);
  });

  test('a known balance below the amount warns but still allows the simulation', async () => {
    const { flow, announcements } = setup({}, '10');
    flow.review(999);
    const state = flow.getState();
    expect(state.stage).toBe('review');
    const warning = 'Your balance is 9.99 USDm: a real swap would fail.';
    expect(state.stage === 'review' && state.balanceWarning).toBe(warning);
    expect(announcements[0]).toContain(warning);
    await flow.confirm();
    expect(flow.getState().stage).toBe('completed');
  });

  test('no warning when the balance covers the amount or is unknown', () => {
    const covered = setup({}, '10');
    covered.flow.review(1_000);
    const unknown = setup({}, '10');
    unknown.flow.review(null);
    for (const { flow } of [covered, unknown]) {
      const state = flow.getState();
      expect(state.stage === 'review' && state.balanceWarning).toBeNull();
    }
  });

  test('reversing the pair switches the input asset', () => {
    const { flow } = setup({}, '5000');
    flow.reverse();
    flow.review(null);
    const state = flow.getState();
    expect(state.stage).toBe('review');
    expect(state.stage === 'review' && state.quote.direction).toBe('BTC_TO_USDM');
  });

  test('a cancelled fingerprint returns to the review without simulating', async () => {
    const execute = jest.fn();
    const service: SwapService = { ...createSimulatedSwapService({ delayMs: 0 }), execute };
    const { flow } = setup({
      service,
      authorize: jest.fn().mockRejectedValue(new Error('cancelled')),
    });
    flow.review(null);
    await flow.confirm();
    const state = flow.getState();
    expect(state.stage).toBe('review');
    expect(state.stage === 'review' && state.note).toContain('Nothing happened');
    expect(execute).not.toHaveBeenCalled();
  });

  test('a double tap on confirm prompts and simulates only once', async () => {
    const pending = deferred<void>();
    const authorize = jest.fn().mockReturnValue(pending.promise);
    const base = createSimulatedSwapService({ delayMs: 0 });
    const execute = jest.fn<Promise<SwapExecutionResult>, Parameters<SwapService['execute']>>(
      (quote, now) => base.execute(quote, now),
    );
    const { flow } = setup({ authorize, service: { ...base, execute } });
    flow.review(null);

    const first = flow.confirm();
    const second = flow.confirm();
    pending.resolve();
    await Promise.all([first, second]);

    expect(authorize).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(flow.getState().stage).toBe('completed');
  });

  test('an expired quote goes back to the amount instead of prompting', async () => {
    const { flow, ports, advance } = setup();
    flow.review(null);
    advance(SIMULATED_QUOTE_TTL_MS);
    await flow.confirm();
    const state = flow.getState();
    expect(state.stage).toBe('entry');
    expect(state.stage === 'entry' && state.draft).toBe('10.00');
    expect(ports.authorize).not.toHaveBeenCalled();
  });

  test('a simulated failure is reported and spoken', async () => {
    const { flow, announcements } = setup({
      service: createSimulatedSwapService({ delayMs: 0, fail: true }),
    });
    flow.review(null);
    await flow.confirm();
    const state = flow.getState();
    expect(state.stage).toBe('failed');
    expect(announcements.at(-1)).toBe('The simulation failed. No funds were exchanged.');
  });

  test('closing the card drops a late fingerprint result', async () => {
    const pending = deferred<void>();
    const execute = jest.fn();
    const { flow } = setup({
      authorize: jest.fn().mockReturnValue(pending.promise),
      service: { ...createSimulatedSwapService({ delayMs: 0 }), execute },
    });
    flow.review(null);
    const confirming = flow.confirm();
    flow.dispose();
    pending.resolve();
    await confirming;
    expect(execute).not.toHaveBeenCalled();
    expect(flow.getState().stage).toBe('authorizing');
  });

  test('edit keeps the reviewed amount', () => {
    const { flow } = setup({}, '12.5');
    flow.review(null);
    flow.edit();
    const state = flow.getState();
    expect(state.stage === 'entry' && state.draft).toBe('12.50');
  });
});
