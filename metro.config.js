// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const expoConfig = getDefaultConfig(__dirname);

/** @type {import('metro-config').MetroConfig} */
const config = mergeConfig(expoConfig, {
  // Add any custom Metro config here if needed
});

module.exports = config;
return config;