// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable support for symlinks and monorepos
  resolver: {
    unstable_enableSymlinks: true,
  },
});

module.exports = config;