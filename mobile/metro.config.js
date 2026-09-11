const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro').Config}
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
