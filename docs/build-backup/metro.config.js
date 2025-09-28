// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Platform-specific resolver to exclude native-only modules from web
config.resolver.platforms = ['ios', 'android', 'web'];

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Force a single React and ReactDOM to avoid nested copies (e.g., under sentry-expo)
config.resolver.extraNodeModules = {
  react: path.resolve(__dirname, 'node_modules/react'),
  'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
};

// Exclude debug/test/mock files from production bundle
const exclusionList = require('metro-config/src/defaults/exclusionList');
config.resolver.blockList = exclusionList([
  /\/(scripts\/.*test.*|scripts\/.*debug.*|utils\/.*test.*|utils\/.*debug.*|.*mock.*)\//,
  /\/components\/debug\//,
  /\/app\/.*debug.*\.tsx?$/,
  /\/app\/biometric-test\.tsx$/,
  /\/app\/debug-user\.tsx$/,
]);


// Block native-only modules on web platform
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
    
  }
  
  // Use default resolver for other cases
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Add symbolication workaround to prevent ENOENT errors with <anonymous> files
config.symbolicator = {
  customizeFrame: (frame) => {
    // Skip symbolication for <anonymous> files to prevent ENOENT errors
    if (frame.file && frame.file.includes('<anonymous>')) {
      return null;
    }
    return frame;
  },
};

module.exports = config;
