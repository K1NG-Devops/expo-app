/**
 * HMR Client stub for web
 * Bypasses Expo's HMR client that fails on web
 */

// No-op HMR client for web
const HMRClient = {
  setup: () => {},
  enable: () => {},
  disable: () => {},
  registerBundle: () => {},
};

export default HMRClient;
