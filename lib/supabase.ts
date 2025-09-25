import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

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
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
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

// Debug logging for environment variables (only in development)
if (__DEV__) {
  console.log('🔧 Supabase initialization:', {
    hasUrl: !!url,
    hasKey: !!anon,
    urlPreview: url ? `${url.substring(0, 30)}...` : 'NOT_SET',
    keyPreview: anon ? `${anon.substring(0, 20)}...` : 'NOT_SET',
  });
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

function chooseStorage() {
  try {
    // Web platform: use localStorage via AsyncStorage or memory fallback
    if (Platform?.OS === 'web') {
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
  client = createClient(url, anon, {
    auth: {
      storage: storage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

// Helper function to assert supabase client exists
export function assertSupabase(): SupabaseClient {
  if (!client) {
    const debugInfo = {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      nodeEnv: process.env.NODE_ENV,
      easProfile: process.env.EAS_BUILD_PROFILE,
    };
    
    const errorMessage = [
      'Supabase client not initialized.',
      'Environment variables status:',
      `  EXPO_PUBLIC_SUPABASE_URL: ${debugInfo.url}`,
      `  EXPO_PUBLIC_SUPABASE_ANON_KEY: ${debugInfo.key}`,
      `  NODE_ENV: ${debugInfo.nodeEnv}`,
      `  EAS_BUILD_PROFILE: ${debugInfo.easProfile}`,
      '',
      'Solutions:',
      '1. For local development: Make sure .env file exists with correct values',
      '2. For EAS builds: Check eas.json environment configuration',
      '3. Restart development server if you just added .env file'
    ].join('\n');
    
    throw new Error(errorMessage);
  }
  return client;
}

export const supabase = client as unknown as SupabaseClient;
