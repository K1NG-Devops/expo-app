module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          // Avoid transforming relative imports inside node_modules (e.g., '.' in react-native-svg)
          // Only provide explicit aliases we actually use
          alias: { '@': './', tslib: './node_modules/tslib/tslib.js' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};

