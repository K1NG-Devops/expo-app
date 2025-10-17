// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Platform-specific resolver to exclude native-only modules from web
config.resolver.platforms = ['ios', 'android', 'web'];

// Ensure JSON files (including locales) are treated as source files
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'json');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'json'];

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

// Enable inline requires for faster startup
config.transformer = {
  ...(config.transformer || {}),
  // OPTIMIZATION: Reduce concurrent workers to save memory during bundling
  maxWorkers: process.env.METRO_MAX_WORKERS ? parseInt(process.env.METRO_MAX_WORKERS, 10) : 2,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Enable optimizations for production builds
if (process.env.NODE_ENV === 'production') {
  // Strip out development-only code
  config.transformer.minifierConfig = {
    ...config.transformer.minifierConfig,
    drop_console: ['log', 'info', 'warn', 'debug'], // Keep 'error'
    drop_debugger: true,
  };
}

// Enable faster rebuilds with persistent cache
config.resetCache = false;

// Better handling of additional asset types
config.resolver.assetExts.push('db', 'zip');

module.exports = config;
