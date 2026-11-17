const mockEffects: Array<() => void | (() => void)> = [];
const mockListeners: Array<(state: string) => void> = [];
const mockStart = jest.fn(async (_link: string) => {});
const mockStop = jest.fn(async () => {});
jest.mock('react', () => ({
  useEffect: (effect: () => void | (() => void)) => mockEffects.push(effect),
  useState: (value: unknown) => [value === null ? 'ready' : value, jest.fn()],
  useRef: (value: unknown) => ({ current: value }),
  useCallback: (callback: unknown) => callback,
}));
jest.mock('react-native', () => ({ AppState: {
  currentState: 'active',
  addEventListener: (_event: string, listener: (state: string) => void) => {
    mockListeners.push(listener); return { remove: jest.fn() };
  },
} }));
jest.mock('../../src/services/metevo/contactNfc', () => ({
  getContactNfcStatus: async () => 'ready',
  startContactNfcSharing: (link: string) => mockStart(link),
  stopContactNfcSharing: () => mockStop(),
}));
jest.mock('../../src/services/metevo/contactEvents', () => ({ logContactEvent: jest.fn() }));
import { useContactNfcShare } from '../../src/hooks/useContactNfc';
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

beforeEach(() => { mockEffects.length = 0; mockListeners.length = 0; jest.clearAllMocks(); });

test('background stops sharing; returning only restarts a still-mounted screen', async () => {
  useContactNfcShare('link');
  const cleanups = mockEffects.map((effect) => effect());
  await flush();
  expect(mockStart).toHaveBeenCalledTimes(1);
  mockListeners.forEach((listener) => listener('background'));
  await flush();
  expect(mockStop).toHaveBeenCalledTimes(2);
  mockListeners.forEach((listener) => listener('active'));
  await flush();
  expect(mockStart).toHaveBeenCalledTimes(2);
  cleanups.forEach((cleanup) => cleanup?.());
  mockListeners.forEach((listener) => listener('active'));
  await flush();
  expect(mockStart).toHaveBeenCalledTimes(2);
});

test('a start resolving after background/unmount is followed by stop, never a new start', async () => {
  let finish!: () => void;
  mockStart.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
  useContactNfcShare('link');
  const cleanups = mockEffects.map((effect) => effect());
  await flush();
  mockListeners.forEach((listener) => listener('background'));
  cleanups.forEach((cleanup) => cleanup?.());
  finish();
  await flush();
  expect(mockStart).toHaveBeenCalledTimes(1);
  expect(mockStop.mock.calls.length).toBeGreaterThanOrEqual(2);
});
