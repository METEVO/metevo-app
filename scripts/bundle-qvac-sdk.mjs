/**
 * Bundles the QVAC SDK worker for the mobile app.
 *
 * Runs the same step the `@qvac/sdk/expo-plugin` runs during `expo prebuild`
 * (bundle -> verify -> copy to `@qvac/sdk/dist/worker.mobile.bundle.js`).
 * Builds that go straight through Gradle never run prebuild. Without this
 * step `require('@qvac/sdk/worker.mobile.bundle')` fails at runtime and no
 * model loads.
 *
 * The worker contains only the plugins listed in qvac.config.json.
 * `installMissingPrebuilds` adds the platform addon packages (for example
 * @qvac/fabric-android-arm64) to package.json at the exact required version.
 *
 * Run after `npm install`, after changing qvac.config.json, after
 * upgrading @qvac/sdk, or after `npm run bundle:wallet`:
 *   npm run bundle:qvac
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
// Deep path on purpose: the package exports map only exposes the plugin
// wrapper, not the step itself.
const pluginModule = join(projectRoot, 'node_modules/@qvac/sdk/dist/src/expo/plugins/withMobileBundle.js');
const { buildMobileBundle } = await import(pathToFileURL(pluginModule).href);

await buildMobileBundle(
  { modRequest: { projectRoot, platform: 'android' } },
  { installMissingPrebuilds: true },
);

const mobileBundle = join(projectRoot, 'node_modules/@qvac/sdk/dist/worker.mobile.bundle.js');
if (!existsSync(mobileBundle)) {
  throw new Error(`QVAC mobile bundle was not written to ${mobileBundle}`);
}
console.log(`[qvac] mobile worker bundle ready: ${mobileBundle}`);

// The step above patches react-native-bare-kit's linker to link only the
// addons in qvac/addons.manifest.json. The wallet worklet is NOT merged
// into that allowlist: the wallet runs in remote mode (plain HTTP to the
// regtest node) and never starts a worklet, so the on-device RLN addon
// would only add ~117 MB to the APK. Reintroduce the merge if the wdk
// transport comes back (see docs/known-issues/).
