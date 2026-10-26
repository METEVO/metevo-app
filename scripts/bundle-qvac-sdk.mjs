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
// addons in qvac/addons.manifest.json. The wallet worklet runs on the same
// bare-kit, so its addons must be in that allowlist too, or the APK ships
// without them.
const WALLET_BUNDLE = join(projectRoot, 'bare/wallet.rlnbundle');
const ADDONS_MANIFEST = join(projectRoot, 'qvac/addons.manifest.json');

/** "linked:libutexo__rgb-lightning-node-bare.0.2.0-beta.4.so" -> "@utexo/rgb-lightning-node-bare" */
function packageNameOfLinkedAddon(specifier) {
  const match = specifier.match(/^linked:lib(.+?)\.\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.so$/);
  if (match === null) {
    throw new Error(`unrecognised linked addon specifier: ${specifier}`);
  }
  const [scope, name] = match[1].split('__');
  return name === undefined ? scope : `@${scope}/${name}`;
}

function walletBundleAddonPackages() {
  const source = readFileSync(WALLET_BUNDLE, 'utf8');
  const newline = source.indexOf('\n');
  // Bare bundle header: "<length>\n<json>", where length counts the json and its newline.
  const header = JSON.parse(source.slice(newline + 1, newline + Number(source.slice(0, newline))));
  return header.addons.map(packageNameOfLinkedAddon);
}

const walletAddons = walletBundleAddonPackages();
const unresolved = walletAddons.filter((name) => !existsSync(join(projectRoot, 'node_modules', name)));
if (unresolved.length > 0) {
  throw new Error(`wallet bundle addons not installed: ${unresolved.join(', ')}`);
}
const manifest = JSON.parse(readFileSync(ADDONS_MANIFEST, 'utf8'));
manifest.addons = [...new Set([...manifest.addons, ...walletAddons])].sort();
writeFileSync(ADDONS_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[qvac] addons manifest: ${manifest.addons.length} addons (wallet worklet included)`);
