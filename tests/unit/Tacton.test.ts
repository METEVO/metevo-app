import {
  TACTON_PATTERNS,
  playTacton,
  setTactonVibrator,
  TactonKind,
  TactonVibrator,
} from '../../src/services/metevo/tacton';

describe('tacton haptic feedback', () => {
  let vibrated: number[] | null;
  const recorder: TactonVibrator = {
    vibrate(pattern) {
      vibrated = [...pattern];
    },
  };

  beforeEach(() => {
    vibrated = null;
    setTactonVibrator(recorder);
  });

  afterEach(() => {
    // Never leak the recorder into other suites (the default resolves the
    // platform vibrator lazily, which must not run under Node).
    setTactonVibrator(null);
  });

  test.each(Object.keys(TACTON_PATTERNS) as TactonKind[])(
    'plays a fixed non-empty pattern for %s',
    (kind) => {
      playTacton(kind);
      expect(vibrated).toEqual(TACTON_PATTERNS[kind]);
      expect(vibrated?.length).toBeGreaterThan(0);
    },
  );

  test('success and error patterns are clearly distinct', () => {
    playTacton('success');
    const successPattern = vibrated;
    playTacton('error');
    expect(vibrated).not.toEqual(successPattern);
  });

  test('no-op when no platform vibrator is available (Node/tests)', () => {
    setTactonVibrator(null);
    expect(() => playTacton('success')).not.toThrow();
    expect(vibrated).toBeNull();
  });
});
