import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { logger } from './logger';

// Dynamically import SecureStore to avoid web issues
let SecureStore: any = null;
try {
  if (Platform.OS !== 'web') {
    SecureStore = require('expo-secure-store');
  }
} catch (e) {
  console.debug('SecureStore import failed (web or unsupported platform)', e);
}

// Dynamically require AsyncStorage to avoid web/test issues
let AsyncStorage: any = null;
try {
  const mod = require('@react-native-async-storage/async-storage');
  AsyncStorage = mod?.default ?? mod;
} catch (e) {
  console.debug('AsyncStorage import failed (non-React Native env?)', e);
  // Web fallback using localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    AsyncStorage = {
      getItem: async (key: string) => {
        try {
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          // ignore
        }
      },
      removeItem: async (key: string) => {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore
        }
      },
    };
  }
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Enhanced debugging for environment variable loading
const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;
const envName = process.env.EXPO_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'unknown';
try {
  const meta = { 
    hasUrl: !!url, 
    hasAnon: !!anon,
    urlLength: url ? url.length : 0,
    anonLength: anon ? anon.length : 0,
    urlStart: url ? url.substring(0, 25) + '...' : 'MISSING',
    anonStart: anon ? anon.substring(0, 20) + '...' : 'MISSING',
    env: envName,
  };
  if (isDevelopment) {
    logger.debug('Supabase env check', meta);
  } else if (envName === 'preview') {
    // Log minimally in preview to help diagnose missing env in release builds (no secrets)
    console.log('[Supabase] Env summary', meta);
  }
  } catch (e) {
    try { logger.error('Supabase debug error:', e); } catch { /* Logger unavailable */ }
  }

// SecureStore adapter (preferred for iOS). Note: SecureStore has a ~2KB limit per item on Android.
const SecureStoreAdapter = SecureStore ? {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value, { keychainService: key }),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
} : null;

// AsyncStorage adapter (preferred for Android, no 2KB limit)
const AsyncStorageAdapter = AsyncStorage
  ? {
      getItem: (key: string) => AsyncStorage.getItem(key),
      setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
    }
  : null;

// In-memory fallback for tests or environments without the above storages
const MemoryStorageAdapter = {
  _map: new Map<string, string>(),
  getItem: async (key: string) => (MemoryStorageAdapter._map.has(key) ? MemoryStorageAdapter._map.get(key)! : null),
  setItem: async (key: string, value: string) => {
    MemoryStorageAdapter._map.set(key, value);
  },
  removeItem: async (key: string) => {
    MemoryStorageAdapter._map.delete(key);
  },
};

// Custom storage adapter for web that prevents cross-tab sync
const IsolatedWebStorageAdapter = typeof window !== 'undefined' && Platform?.OS === 'web' ? {
  getItem: async (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
      // Don't dispatch storage events to prevent cross-tab triggers
    } catch {
      // ignore
    }
  },
  removeItem: async (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
} : null;

function chooseStorage() {
  try {
    // Web platform: use isolated storage to prevent cross-tab sync
    if (Platform?.OS === 'web') {
      if (IsolatedWebStorageAdapter) return IsolatedWebStorageAdapter;
      if (AsyncStorageAdapter) return AsyncStorageAdapter;
      return MemoryStorageAdapter;
    }
    // Use AsyncStorage on Android to avoid SecureStore size limit warning/failures
    if (Platform?.OS === 'android' && AsyncStorageAdapter) return AsyncStorageAdapter;
    // iOS and other platforms: prefer SecureStore; fall back if unavailable
    if (SecureStoreAdapter) return SecureStoreAdapter;
    if (AsyncStorageAdapter) return AsyncStorageAdapter;
  } catch (e) {
    console.debug('chooseStorage unexpected error', e);
  }
  return MemoryStorageAdapter;
}

let client: SupabaseClient | null = null;
if (url && anon) {
  const storage = chooseStorage();
  // Disable aggressive auto-refresh on web to prevent loading state loops
  const isWeb = Platform?.OS === 'web';
  const autoRefresh = isWeb ? false : true; // Only auto-refresh on mobile
  
  client = createClient(url, anon, {
    auth: {
      storage: storage as any,
      autoRefreshToken: autoRefresh,
      persistSession: true,
      detectSessionInUrl: false,
      // Prevent storage sync events from triggering refreshes on web
      storageKey: isWeb ? 'edudash-web-session' : 'sb-auth-token',
      flowType: isWeb ? 'implicit' : 'pkce',
      // Disable noisy debug logs (only enable explicitly for auth debugging)
      debug: process.env.EXPO_PUBLIC_DEBUG_SUPABASE === 'true',
    },
  });
  
  // Suppress excessive GoTrueClient debug logs in development
  if (isDevelopment && typeof global !== 'undefined') {
    const originalConsoleLog = console.log;
    console.log = (...args: any[]) => {
      // Filter out GoTrueClient session management spam
      const msg = args[0];
      if (typeof msg === 'string' && (
        msg.includes('GoTrueClient@') && (
          msg.includes('#_acquireLock') ||
          msg.includes('#__loadSession()') ||
          msg.includes('#_useSession') ||
          msg.includes('#getSession() session from storage')
        )
      )) {
        return; // Suppress
      }
      originalConsoleLog.apply(console, args);
    };
  }

  if (client && isDevelopment) {
    logger.info('Supabase client initialized successfully');
  }

  // Add global error handler for auth errors
  client.auth.onAuthStateChange((event) => {
    if (event === 'TOKEN_REFRESHED') {
      logger.info('Token refreshed successfully');
    } else if (event === 'SIGNED_OUT') {
      logger.info('User signed out');
      // Clear any stale session data
      storage.removeItem('edudash_user_session').catch(() => {});
      storage.removeItem('edudash_user_profile').catch(() => {});
    }
  });
  
  // CRITICAL FIX: Block storage event listeners on web that trigger cross-tab refresh
  if (isWeb && typeof window !== 'undefined') {
    // Intercept and block storage events that Supabase listens to
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type: string, listener: any, options?: any) {
      if (type === 'storage') {
        // Block storage event listeners to prevent cross-tab sync
        console.log('[Supabase] Blocking storage event listener to prevent cross-tab refresh');
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  }
}

// Helper function to assert supabase client exists
export function assertSupabase(): SupabaseClient {
  if (!client) {
    const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
    const isTest = process.env.NODE_ENV === 'test';
    
    if (isDev || isTest) {
      // Development/test environment - show detailed debugging info
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
      
      let errorMsg = 'Supabase client not initialized.\n';
      
      if (!url && !anon) {
        errorMsg += 'BOTH environment variables are missing:\n';
        errorMsg += '- EXPO_PUBLIC_SUPABASE_URL\n';
        errorMsg += '- EXPO_PUBLIC_SUPABASE_ANON_KEY\n';
      } else if (!url) {
        errorMsg += 'Missing: EXPO_PUBLIC_SUPABASE_URL\n';
      } else if (!anon) {
        errorMsg += 'Missing: EXPO_PUBLIC_SUPABASE_ANON_KEY\n';
      } else {
        errorMsg += 'Environment variables are present but client failed to initialize.\n';
        errorMsg += `URL length: ${url.length}, Key length: ${anon.length}\n`;
      }
      
      errorMsg += '\nTo fix:\n';
      errorMsg += '1. Check that your .env file exists in the project root\n';
      errorMsg += '2. Restart your development server (Metro/Expo)\n';
      errorMsg += '3. Clear cache: npx expo start --clear\n';
      
      throw new Error(errorMsg);
    } else {
      // Production environment - show user-friendly message
      throw new Error('Unable to connect to the service. Please check your internet connection and try again.');
    }
  }
  return client;
}

export const supabase = client as unknown as SupabaseClient;
