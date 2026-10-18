/**
 * Bundles the QVAC SDK worker for the mobile app.
 *
 * The worker is packed with exactly the plugins enabled in qvac.config.json
 * (LLM completion, whisper transcription, TTS synthesis) so the app bundle
 * stays free of unused native engines. `installMissingPrebuilds` lets the
 * bundler add the platform-specific native addon packages (for example
 * @qvac/fabric-android-arm64) to package.json at the exact required version.
 *
 * Run after changing qvac.config.json or upgrading @qvac/sdk:
 *   npm run bundle:qvac
 */
import { bundleSdk, verifyBundle } from '@qvac/sdk/commands';

/** Device hosts the app ships to; llamacpp requires real devices, not emulators. */
const HOSTS = ['android-arm64', 'ios-arm64'];

const bundle = await bundleSdk({
  projectRoot: process.cwd(),
  configPath: './qvac.config.json',
  installMissingPrebuilds: true,
  quiet: false,
});

const verification = await verifyBundle({
  projectRoot: process.cwd(),
  addonsSource: bundle?.outputPath ?? './qvac/worker.bundle.js',
  hosts: HOSTS,
});

console.log('[qvac] worker bundle verified:', JSON.stringify(verification));
