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
    throw new Error('Supabase client not initialized. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return client;
}

export const supabase = client as unknown as SupabaseClient;
