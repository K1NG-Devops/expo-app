/**
 * babel.config.js - Minimal Babel Configuration
 * 
 * Using babel-preset-expo which handles all standard transformations.
 * Expo preset automatically handles:
 * - TypeScript
 * - JSX/TSX
 * - Environment variables (EXPO_PUBLIC_*)
 * - Platform-specific code
 * - Production optimizations (minification, console removal)
 * 
 * Only required plugins:
 * - module-resolver: For @ alias (import from '@/...')
 * - react-native-reanimated: Required by reanimated library
 */
module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: { '@': './' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
