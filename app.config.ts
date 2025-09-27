import 'dotenv/config';

// This config file ensures EXPO_PUBLIC_* variables from .env are loaded
// before the Metro bundler starts, so `process.env.EXPO_PUBLIC_*` is
// available in the web/native bundle during development.
//
// Do NOT put secrets here. Only EXPO_PUBLIC_* keys should be used in app code.

export default ({ config }) => ({
  ...config,
  web: {
    ...config.web,
    build: {
      babel: {
        include: ['@expo/router'],
      },
    },
  },
});
