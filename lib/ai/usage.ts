import * as SecureStore from 'expo-secure-store'
import { assertSupabase } from '@/lib/supabase'

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

export async function getUsage(): Promise<AIUsageRecord> {
  const uid = await getCurrentUserId()
  const key = `${STORAGE_PREFIX}_${uid}_${monthKey()}`
  try {
    const raw = await SecureStore.getItemAsync(key)
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
    await SecureStore.setItemAsync(key, JSON.stringify(next))
  } catch {
    // swallow
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

