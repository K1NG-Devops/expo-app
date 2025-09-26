module.exports = function (api) {
  api.cache(true);
  
  // Check if we're in production build
  const isProduction = process.env.NODE_ENV === 'production';
  
  const plugins = [
    'react-native-reanimated/plugin',
  ];
  
  // Only add module resolver in development to reduce build complexity
  if (!isProduction) {
    plugins.unshift([
      'babel-plugin-module-resolver',
      {
        alias: { '@': './', tslib: './node_modules/tslib/tslib.js' },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ]);
  }
  
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
