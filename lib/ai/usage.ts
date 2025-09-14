import { Platform } from 'react-native'
import { assertSupabase } from '@/lib/supabase'

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

const storage = chooseStorage();

export type AIUsageFeature = 'lesson_generation' | 'grading_assistance' | 'homework_help'

const STORAGE_PREFIX = 'ai_usage'

function monthKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${y}${m}`
}

async function getCurrentUserId(): Promise<string> {
  try {
    const { data } = await assertSupabase().auth.getUser()
    return data?.user?.id || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

export type AIUsageRecord = Record<AIUsageFeature, number>

export type AIUsageLogEvent = {
  feature: AIUsageFeature
  model: string
  tokensIn?: number
  tokensOut?: number
  estCostCents?: number
  timestamp: string // ISO string
}

export async function getUsage(): Promise<AIUsageRecord> {
  const uid = await getCurrentUserId()
  const key = `${STORAGE_PREFIX}_${uid}_${monthKey()}`
  try {
    const raw = await storage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : {}
    return {
      lesson_generation: Number(parsed.lesson_generation) || 0,
      grading_assistance: Number(parsed.grading_assistance) || 0,
      homework_help: Number(parsed.homework_help) || 0,
    }
  } catch {
    return { lesson_generation: 0, grading_assistance: 0, homework_help: 0 }
  }
}

export async function incrementUsage(feature: AIUsageFeature, count = 1): Promise<void> {
  const uid = await getCurrentUserId()
  const key = `${STORAGE_PREFIX}_${uid}_${monthKey()}`
  try {
    const current = await getUsage()
    const next = { ...current, [feature]: (current[feature] || 0) + count }
    await storage.setItem(key, JSON.stringify(next))
  } catch {
    // swallow
  }
}

const LOG_QUEUE_KEY_PREFIX = 'ai_usage_log_queue'

async function enqueueUsageLog(event: AIUsageLogEvent): Promise<void> {
  const uid = await getCurrentUserId()
  const key = `${LOG_QUEUE_KEY_PREFIX}_${uid}`
  try {
    const raw = await storage.getItem(key)
    const arr: AIUsageLogEvent[] = raw ? JSON.parse(raw) : []
    arr.push(event)
    await storage.setItem(key, JSON.stringify(arr))
  } catch {
    // swallow
  }
}

export async function flushUsageLogQueue(): Promise<void> {
  const uid = await getCurrentUserId()
  const key = `${LOG_QUEUE_KEY_PREFIX}_${uid}`
  try {
    const raw = await storage.getItem(key)
    const arr: AIUsageLogEvent[] = raw ? JSON.parse(raw) : []
    if (!arr.length) return
    const remaining: AIUsageLogEvent[] = []
    for (const ev of arr) {
      try {
        const { error } = await assertSupabase().functions.invoke('ai-usage', { body: { action: 'log', event: ev } as any })
        if (error) remaining.push(ev)
      } catch {
        remaining.push(ev)
      }
    }
    if (remaining.length) {
      await storage.setItem(key, JSON.stringify(remaining))
    } else {
      await storage.removeItem(key)
    }
  } catch {
    // swallow
  }
}

export async function logUsageEvent(event: AIUsageLogEvent): Promise<void> {
  try {
    const payload = { action: 'log', event }
    const { error } = await assertSupabase().functions.invoke('ai-usage', { body: payload as any })
    if (error) throw error
  } catch {
    await enqueueUsageLog(event)
  } finally {
    // best-effort flush of any pending logs
try { await flushUsageLogQueue() } catch { /* noop */ void 0; }
  }
}

export async function getServerUsage(): Promise<AIUsageRecord | null> {
  try {
    const { data, error } = await assertSupabase().functions.invoke('ai-usage', { body: {} as any })
    if (error) throw error
    const src: any = (data && (data.monthly || data)) || {}
    const counts: AIUsageRecord = {
      lesson_generation: Number(src.lesson_generation ?? src.lesson ?? src.lessons ?? 0) || 0,
      grading_assistance: Number(src.grading_assistance ?? src.grading ?? 0) || 0,
      homework_help: Number(src.homework_help ?? src.helper ?? 0) || 0,
    }
    return counts
  } catch {
    return null
  }
}

export async function getCombinedUsage(): Promise<AIUsageRecord> {
  const server = await getServerUsage()
  if (server) return server
  return await getUsage()
}

