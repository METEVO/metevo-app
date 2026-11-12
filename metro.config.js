const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// Gradle builds never run `expo prebuild`, so nothing else writes the QVAC
// worker. Without it the APK installs but voice fails at runtime with a
// misleading "configure the QVAC Expo plugin" error: stop the build here.
const QVAC_MOBILE_BUNDLE = path.join(
  __dirname,
  'node_modules/@qvac/sdk/dist/worker.mobile.bundle.js',
);
if (!fs.existsSync(QVAC_MOBILE_BUNDLE)) {
  throw new Error(
    `[qvac] Missing ${path.relative(__dirname, QVAC_MOBILE_BUNDLE)}. ` +
      'Run `npm run bundle:qvac` before building: without it the app cannot start voice.',
  );
}

// Basic Metro configuration. The first real dependency requiring a custom
// transformer is react-native-svg: .svg files become React components so
// the METEVO design assets render as vector graphics.
const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve(
  'react-native-svg-transformer',
);
config.resolver.assetExts = config.resolver.assetExts.filter(
  (extension) => extension !== 'svg',
);
config.resolver.sourceExts.push('svg');
// The Bare worklet bundle ships as a data asset: the worklet runtime
// evaluates it, Metro must not try to compile it.
config.resolver.assetExts.push('rlnbundle');

module.exports = config;
