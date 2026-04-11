const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Exclude test files and vitest from Metro bundling
config.resolver.blockList = [
  /.*\.test\.(ts|tsx|js|jsx)$/,
  /e2e\/.*/,
  /tests\/.*/,
  /node_modules\/vitest\/.*/,
];

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
