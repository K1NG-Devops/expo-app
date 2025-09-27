// Focused polyfill for React.use to support Context and Thenables on React 18
// This enables expo-router 5.x which calls React.use(Context)
import React from 'react';

if (!React.use) {
  // Resolve the symbol used by React context objects
  const CONTEXT_TYPE = React.createContext(null).$$typeof;

  React.use = function use(value) {
    // Support Suspense/thenables: throw the promise to suspend
    if (value && typeof value.then === 'function') {
      throw value;
    }

    // Support React Context: React.use(Context) -> useContext(Context)
    if (value && typeof value === 'object' && value.$$typeof === CONTEXT_TYPE) {
      return React.useContext(value);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[polyfills] React.use called with unsupported value. This polyfill only supports Context and Thenables. Received:',
        value
      );
    }

    // Return undefined by default to avoid rendering arbitrary objects as children
    return undefined;
  };
}
