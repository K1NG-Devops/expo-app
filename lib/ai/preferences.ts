import * as SecureStore from 'expo-secure-store'
import { assertSupabase } from '@/lib/supabase'

const KEY_PREFIX = 'ai_preferred_model'

export async function getPreferredModel(feature?: 'lesson_generation' | 'grading_assistance' | 'homework_help'): Promise<string | null> {
  try {
    const { data } = await assertSupabase().auth.getUser()
    const uid = data?.user?.id || 'anonymous'
    const key = `${KEY_PREFIX}_${feature || 'global'}_${uid}`
    const raw = await SecureStore.getItemAsync(key)
    if (raw) return raw
    // Backward compatibility: check global key without feature
    const legacy = await SecureStore.getItemAsync(`${KEY_PREFIX}_${uid}`)
    return legacy || null
  } catch {
    return null
  }
}

export async function setPreferredModel(modelId: string, feature?: 'lesson_generation' | 'grading_assistance' | 'homework_help'): Promise<void> {
  try {
    const { data } = await assertSupabase().auth.getUser()
    const uid = data?.user?.id || 'anonymous'
    const key = `${KEY_PREFIX}_${feature || 'global'}_${uid}`
    await SecureStore.setItemAsync(key, modelId)
  } catch { /* noop */ }
}

