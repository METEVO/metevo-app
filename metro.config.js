const { getDefaultConfig } = require('expo/metro-config');

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
