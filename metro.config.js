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


// Comprehensive web-specific module resolution
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only intercept for web platform
  if (platform !== 'web') {
    if (originalResolver) {
      return originalResolver(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  }

  // WEB PLATFORM RESOLUTIONS
  try {
    // 1. Block Google Mobile Ads on web
    if (moduleName === 'react-native-google-mobile-ads' || 
        moduleName.startsWith('react-native-google-mobile-ads/')) {
      return {
        filePath: require.resolve('./lib/stubs/ads-stub.js'),
        type: 'sourceFile',
      };
    }

    // 1.5. Block RevenueCat on web
    if (moduleName === 'react-native-purchases') {
      return {
        filePath: require.resolve('./lib/stubs/revenuecat-stub.js'),
        type: 'sourceFile',
      };
    }

    // 1.6. Block Voice recognition on web
    if (moduleName === '@react-native-voice/voice') {
      return {
        filePath: require.resolve('./lib/stubs/voice-stub.js'),
        type: 'sourceFile',
      };
    }

    // 2. Block native-only modules
    const nativeOnlyModules = [
      '@picovoice/porcupine-react-native',
      'expo-local-authentication',
      'react-native-biometrics',
    ];
    if (nativeOnlyModules.includes(moduleName)) {
      return {
        filePath: require.resolve('./lib/stubs/native-module-stub.js'),
        type: 'sourceFile',
      };
    }

    // 3. Handle React Native internal modules (the main issue)
    // These are modules inside react-native/Libraries that have no web equivalent
    const isReactNativeInternal = 
      moduleName.includes('react-native/Libraries/') ||
      moduleName.includes('/Utilities/') ||
      moduleName.includes('/Network/') ||
      moduleName.includes('/Core/') ||
      moduleName.includes('/RCT') ||
      moduleName.startsWith('./') && context.originModulePath?.includes('react-native/Libraries');

    if (isReactNativeInternal) {
      // Use universal stub for all React Native internals
      return {
        filePath: require.resolve('./lib/stubs/universal-rn-stub.js'),
        type: 'sourceFile',
      };
    }

    // 4. Specific stubs for known problematic modules
    const stubMappings = {
      'ReactDevToolsSettingsManager': './lib/stubs/devtools-stub.js',
      '/src/private/debugging': './lib/stubs/devtools-stub.js',
      '/Core/Devtools/': './lib/stubs/devtools-stub.js',
      'DeviceEventEmitter': './lib/stubs/DeviceEventEmitter-stub.js',
      'NativeEventEmitter': './lib/stubs/NativeEventEmitter-stub.js',
      '/EventEmitter/': './lib/stubs/NativeEventEmitter-stub.js',
      'HMRClient': './lib/stubs/HMRClient-stub.js',
      '/HMRClient': './lib/stubs/HMRClient-stub.js',
    };

    for (const [pattern, stubPath] of Object.entries(stubMappings)) {
      if (moduleName.includes(pattern)) {
        return {
          filePath: require.resolve(stubPath),
          type: 'sourceFile',
        };
      }
    }

  } catch (error) {
    // If our stub resolution fails, fall through to default resolver
    console.warn('[Metro Web] Stub resolution error:', error.message);
  }
  
  // Use default resolver for everything else
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
