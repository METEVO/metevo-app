import { execFileSync } from 'child_process';
import path from 'path';

/**
 * Regression guard for a real crash: `wallet-worklet.js` once imported
 * `hasUsableChannelWith` from wallet.js AND declared a local function of
 * the same name, an illegal duplicate module-scope binding. TypeScript
 * and Jest's module resolution never catch this (it only breaks under
 * Bare's own ES module linker), so it shipped silently and aborted the
 * app natively on-device every time the worklet started.
 *
 * This runs the real `bare` runtime (bundled as a dev dependency via
 * `bare-runtime`) against the actual worklet entry file and asserts the
 * module graph links without a SyntaxError. Native addon resolution is
 * expected to fail here (no Android .so files / Bare-native crypto on
 * this host) - only parse/link-time syntax errors are a real regression.
 */
test('the worklet entry module graph has no duplicate-declaration syntax errors', () => {
  const bareBinary = path.join(
    path.dirname(require.resolve('bare-runtime/package')),
    'bin/bare',
  );
  const workletEntry = path.join(__dirname, '../../bare/wallet-worklet.js');

  let output = '';
  try {
    output = execFileSync(bareBinary, [workletEntry], {
      cwd: path.join(__dirname, '../..'),
      timeout: 10_000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (cause: any) {
    output = `${cause.stdout ?? ''}${cause.stderr ?? ''}`;
  }

  expect(output).not.toMatch(/SyntaxError/i);
});
