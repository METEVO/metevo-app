const { getDefaultConfig } = require('expo/metro-config');

// Basic Metro configuration. Intentionally minimal: METEVO adds no custom
// resolvers or transformers until a real dependency requires it.
const config = getDefaultConfig(__dirname);

module.exports = config;
