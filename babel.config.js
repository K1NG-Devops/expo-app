module.exports = function (api) {
  api.cache(true);
  const isProd = process.env.NODE_ENV === 'production';
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // expo-router/babel is deprecated in SDK 50+ - included in babel-preset-expo
      [
        'module-resolver',
        {
          // Avoid transforming relative imports inside node_modules (e.g., '.' in react-native-svg)
          // Only provide explicit aliases we actually use
          alias: { '@': './', tslib: './node_modules/tslib/tslib.js' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      // EAS Updates handles EXPO_PUBLIC_ environment variables natively
      // No need for transform-inline-environment-variables plugin
      // Remove console statements in production builds (except errors)
      isProd ? [
        'transform-remove-console',
        { exclude: ['error'] }
      ] : null,
      // React Native Reanimated plugin must be last!
      'react-native-reanimated/plugin',
    ].filter(Boolean),
  };
};

