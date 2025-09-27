module.exports = function (api) {
  api.cache(true);
  
  const plugins = [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        // Exclude node_modules from transformation to prevent path resolution issues
        transformFunctions: ['require', 'require.resolve'],
        resolvePath: (sourcePath, currentFile, opts) => {
          // Don't transform paths that are already in node_modules
          if (currentFile.includes('node_modules') || sourcePath.startsWith('node_modules')) {
            return null;
          }
          return sourcePath;
        },
      },
    ],
    'react-native-reanimated/plugin',
  ];
  
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};

