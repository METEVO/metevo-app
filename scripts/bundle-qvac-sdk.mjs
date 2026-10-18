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
 * Run after `npm install`, after changing qvac.config.json, or after
 * upgrading @qvac/sdk:
 *   npm run bundle:qvac
 */
import { existsSync } from 'node:fs';
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
