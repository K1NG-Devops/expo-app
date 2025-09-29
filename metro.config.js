// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

// Load environment variables from .env file
require('dotenv').config();

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for .ppn files (Porcupine wake word models)
config.resolver.assetExts.push('ppn');
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'ppn');

// Platform-specific resolver to exclude native-only modules from web
config.resolver.platforms = ['ios', 'android', 'web'];

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Exclude debug/test/mock files from production bundle
const exclusionList = require('metro-config/src/defaults/exclusionList');
config.resolver.blockList = exclusionList([
  /\/(scripts\/.*test.*|scripts\/.*debug.*|utils\/.*test.*|utils\/.*debug.*|.*mock.*)\//,
  /\/components\/debug\//,
  /\/app\/.*debug.*\.tsx?$/,
  /\/app\/biometric-test\.tsx$/,
  /\/app\/debug-user\.tsx$/,
]);


// Only handle web-specific module resolution to avoid breaking native platforms
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // Block Google Mobile Ads on web
    if (moduleName === 'react-native-google-mobile-ads' || 
        moduleName.startsWith('react-native-google-mobile-ads/')) {
      return {
        filePath: require.resolve('./lib/stubs/ads-stub.js'),
        type: 'sourceFile',
      };
    }
    
    // Handle ReactDevToolsSettingsManager issues on web
    if (moduleName.includes('ReactDevToolsSettingsManager') || 
        moduleName.includes('src/private/debugging/ReactDevToolsSettingsManager') ||
        moduleName === '../../src/private/debugging/ReactDevToolsSettingsManager') {
      return {
        filePath: require.resolve('./lib/stubs/devtools-stub.js'),
        type: 'sourceFile',
      };
    }
  }
  
  // Use default resolver for all other cases
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
