import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { assertSupabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { LessonGeneratorService } from '@/lib/ai/lessonGenerator'
import { getFeatureFlagsSync } from '@/lib/featureFlags'
import { track } from '@/lib/analytics'
import { getCombinedUsage } from '@/lib/ai/usage'
import { canUseFeature, getQuotaStatus, getEffectiveLimits } from '@/lib/ai/limits'
import { getPreferredModel, setPreferredModel } from '@/lib/ai/preferences'
import { router, useLocalSearchParams } from 'expo-router'
import { useSimplePullToRefresh } from '@/hooks/usePullToRefresh'
import { useLessonGenerator } from '@/hooks/useLessonGenerator'
import { useLessonGeneratorModels, useTierInfo } from '@/hooks/useAIModelSelection'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/contexts/ThemeContext'
import { toast } from '@/components/ui/ToastProvider'

export default function AILessonGeneratorScreen() {
  const { theme } = useTheme()
  const palette = useMemo(() => ({
    background: theme.background,
    text: theme.text,
    textSecondary: theme.textSecondary,
    outline: theme.border,
    surface: theme.surface,
    primary: theme.primary,
    accent: theme.accent,
  }), [theme])
  const [generated, setGenerated] = useState<any | null>({ title: 'New Lesson', description: 'AI generated lesson', content: { sections: [] }, activities: [] })
  const [topic, setTopic] = useState('Fractions')
  const [subject, setSubject] = useState('Mathematics')
  const [gradeLevel, setGradeLevel] = useState('3')
  const [duration, setDuration] = useState('45')
  const [objectives, setObjectives] = useState('Understand proper fractions; Compare simple fractions')
  const searchParams = useLocalSearchParams<{ topic?: string; subject?: string; gradeLevel?: string; duration?: string; objectives?: string; autogenerate?: string }>()
  const [saving, setSaving] = useState(false)
  const { loading: generating, result, generate } = useLessonGenerator() as any
  const [pending, setPending] = useState(false)
  const [usage, setUsage] = useState<{ lesson_generation: number; grading_assistance: number; homework_help: number }>({ lesson_generation: 0, grading_assistance: 0, homework_help: 0 })
  
  // Use tier-based model selection
  const {
    availableModels,
    selectedModel,
    setSelectedModel,
    tier,
    quotas,
    isLoading: modelsLoading
  } = useLessonGeneratorModels()
  
  const { tierInfo } = useTierInfo()

  const categoriesQuery = useQuery({
    queryKey: ['lesson_categories'],
    queryFn: async () => {
      const { data, error } = await assertSupabase().from('lesson_categories').select('id,name')
      if (error) throw error
      return (data || []) as { id: string; name: string }[]
    },
    staleTime: 60_000,
  })

  const flags = getFeatureFlagsSync();
  const AI_ENABLED = (process.env.EXPO_PUBLIC_AI_ENABLED === 'true') || (process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES === 'true');

  // Refresh function to reload usage data and categories
  const handleRefresh = async () => {
    try {
      setUsage(await getCombinedUsage())
      // Refetch categories
      await categoriesQuery.refetch()
    } catch (error) {
      console.error('Error refreshing AI lesson generator data:', error)
    }
  }

  const { refreshing, onRefreshHandler } = useSimplePullToRefresh(handleRefresh, 'ai_lesson_generator')

  useEffect(() => {
    (async () => {
      setUsage(await getCombinedUsage())
    })()
  }, [])

  // Apply prefill from Dash action params
  useEffect(() => {
    const t = (searchParams?.topic || '').trim();
    const s = (searchParams?.subject || '').trim();
    const g = (searchParams?.gradeLevel || '').trim();
    const d = (searchParams?.duration || '').trim();
    const o = (searchParams?.objectives || '').trim();
    if (t) setTopic(t);
    if (s) setSubject(s);
    if (g && /^\d+$/.test(g)) setGradeLevel(g);
    if (d && /^\d+$/.test(d)) setDuration(d);
    if (o) setObjectives(o);

    const auto = String(searchParams?.autogenerate || '').toLowerCase();
    if (auto === '1' || auto === 'true' || auto === 'yes') {
      setTimeout(() => onGenerate(), 300);
    }
  }, [searchParams])

  const buildDashPrompt = () => {
    const objs = (objectives || '').split(';').map(s => s.trim()).filter(Boolean)
    return `Generate a ${Number(duration) || 45} minute lesson plan for Grade ${Number(gradeLevel) || 3} in ${subject} on the topic "${topic}".
Learning objectives: ${objs.join('; ') || 'derive reasonable objectives'}.
Provide a structured plan with objectives, warm-up, core activities, assessment ideas, and closure. Use clear bullet points.`
  }

  const onOpenWithDash = () => {
    const initialMessage = buildDashPrompt()
    router.push({ pathname: '/screens/dash-assistant', params: { initialMessage } })
  }

  const onGenerate = async () => {
    try {
      setPending(true)
      if (!AI_ENABLED || flags.ai_lesson_generation === false) {
        toast.warn('AI Lesson Generator is disabled in this build.');
        return;
      }
      // Enforce quota before making a request
      const gate = await canUseFeature('lesson_generation', 1)
      if (!gate.allowed) {
        const status = await getQuotaStatus('lesson_generation')
        Alert.alert(
          'Monthly limit reached',
          `You have used ${status.used} of ${status.limit} lesson generations this month. ${gate.requiresPrepay ? 'Please upgrade or purchase more to continue.' : ''}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'See plans', onPress: () => router.push('/pricing') },
          ]
        )
        return
      }
      track('edudash.ai.lesson.generate_started', {})
      const lessonText = await generate({
        topic: topic || 'Lesson Topic',
        subject: subject || 'General Studies',
        gradeLevel: Number(gradeLevel) || 3,
        duration: Number(duration) || 45,
        learningObjectives: (objectives || '').split(';').map(s => s.trim()).filter(Boolean),
        language: 'en',
        model: selectedModel,
      })
      setGenerated((prev: any) => ({
        ...(prev || {}),
        description: lessonText || 'No lesson content returned.',
      }))
      setUsage(await getCombinedUsage())
      track('edudash.ai.lesson.generate_completed', {})
    } catch (e: any) {
      track('edudash.ai.lesson.generate_failed', { error: e?.message })
      toast.error(`Generation failed: ${e?.message || 'Please try again'}`)
    } finally {
      setPending(false)
      setSaving(false)
    }
  }

  const onSave = async () => {
    try {
      setSaving(true)
      const { data: auth } = await assertSupabase().auth.getUser()
      const authUserId = auth?.user?.id || ''
      const { data: profile } = await assertSupabase().from('users').select('id,preschool_id').eq('auth_user_id', authUserId).maybeSingle()
      if (!profile) { toast.error('Not signed in'); return }

      const categoryId = categoriesQuery.data?.[0]?.id
      if (!categoryId) { toast.warn('Please create a category first'); return }

      const res = await LessonGeneratorService.saveGeneratedLesson({
        lesson: generated,
        teacherId: profile.id,
        preschoolId: profile.preschool_id,
        ageGroupId: 'n/a',
        categoryId,
        template: { duration: 30, complexity: 'moderate' },
        isPublished: true,
      })
      if (!res.success) {
        toast.error(`Save failed: ${res.error || 'Unknown error'}`)
        return
      }
      toast.success(`Lesson saved (id ${res.lessonId})`)
    } catch (e: any) {
      toast.error(`Save error: ${e?.message || 'Failed to save'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScreenHeader 
        title="AI Lesson Generator" 
        subtitle="Create AI-powered lesson plans" 
      />

      {/* Dash-styled header row */}
      <View style={[styles.dashHeaderRow]}>
        <View style={[styles.inlineAvatar, { backgroundColor: theme.primary }]}>
          <Ionicons name="sparkles" size={16} color={theme.onPrimary} />
        </View>
        <Text style={[styles.dashTitleText, { color: palette.text }]}>Dash • Lesson Generator</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={[styles.openWithDashBtn, { borderColor: palette.outline }]} onPress={onOpenWithDash}>
          <Ionicons name="chatbubbles-outline" size={16} color={palette.text} />
          <Text style={[styles.openWithDashText, { color: palette.text }]}>Open with Dash</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.contentPadding}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefreshHandler}
            tintColor="#3B82F6"
            title="Refreshing AI data..."
          />
        }
      >
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline, marginTop: 16 }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>Lesson Parameters</Text>
          <Text style={{ color: palette.textSecondary }}>Customize the generation prompt. Dash can auto-fill and generate for you.</Text>

          <Text style={[styles.label, { color: palette.textSecondary, marginTop: 8 }]}>Topic</Text>
          <TextInput style={[styles.input, { color: palette.text, borderColor: palette.outline }]} value={topic} onChangeText={setTopic} placeholder="e.g., Fractions" />

          <Text style={[styles.label, { color: palette.textSecondary, marginTop: 8 }]}>Subject</Text>
          <TextInput style={[styles.input, { color: palette.text, borderColor: palette.outline }]} value={subject} onChangeText={setSubject} placeholder="e.g., Mathematics" />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: palette.textSecondary, marginTop: 8 }]}>Grade Level</Text>
              <TextInput style={[styles.input, { color: palette.text, borderColor: palette.outline }]} value={gradeLevel} onChangeText={setGradeLevel} keyboardType="numeric" placeholder="e.g., 3" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: palette.textSecondary, marginTop: 8 }]}>Duration (min)</Text>
              <TextInput style={[styles.input, { color: palette.text, borderColor: palette.outline }]} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="e.g., 45" />
            </View>
          </View>

          <Text style={[styles.label, { color: palette.textSecondary, marginTop: 8 }]}>Learning Objectives (separate with ;)</Text>
          <TextInput style={[styles.input, { color: palette.text, borderColor: palette.outline }]} value={objectives} onChangeText={setObjectives} placeholder="Objective A; Objective B" />

          <Text style={{ color: palette.textSecondary, marginTop: 8 }}>
            Monthly usage (local): Lessons generated {usage.lesson_generation}
          </Text>
          <QuotaBar feature="lesson_generation" planLimit={quotas.ai_requests} color={theme.primary} />
          {result?.__fallbackUsed && (
            <View style={[styles.fallbackChip, { borderColor: palette.outline, backgroundColor: theme.accent + '20' }]}>
              <Text style={{ color: palette.textSecondary }}>Fallback used</Text>
            </View>
          )}
        </View>

        {/* Tier-based Model selector */}
        {!modelsLoading && availableModels.length > 0 && (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>AI Model</Text>
              {tierInfo && (
                <View style={{ 
                  paddingHorizontal: 8, 
                  paddingVertical: 4, 
                  borderRadius: 12, 
                  backgroundColor: tierInfo.color + '20' 
                }}>
                  <Text style={{ color: tierInfo.color, fontSize: 11, fontWeight: '600' }}>
                    {tierInfo.badge} Plan
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={{ color: palette.textSecondary, marginBottom: 12, fontSize: 13 }}>
              {tierInfo?.description || 'Select your AI model'}
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {availableModels.map(m => {
                const isSelected = selectedModel === m.id
                const costDisplay = m.relativeCost <= 1 ? '$' : m.relativeCost <= 5 ? '$$' : '$$$'
                
                return (
                  <TouchableOpacity 
                    key={m.id} 
                    onPress={() => {
                      setSelectedModel(m.id)
                      // Persist preference
                      setPreferredModel(m.id, 'lesson_generation').catch(() => {})
                    }} 
                    style={{
                      paddingHorizontal: 12, 
                      paddingVertical: 8, 
                      borderRadius: 8, 
                      borderWidth: 1, 
                      borderColor: isSelected ? (tierInfo?.color || '#111827') : palette.outline, 
                      backgroundColor: isSelected ? (tierInfo?.color || '#111827') + '10' : 'transparent'
                    }}
                  >
                    <Text style={{ 
                      color: isSelected ? (tierInfo?.color || '#111827') : palette.text,
                      fontSize: 13,
                      fontWeight: isSelected ? '600' : '400'
                    }}>
                      {m.displayName || m.name}
                    </Text>
                    <Text style={{
                      color: palette.textSecondary,
                      fontSize: 11,
                      marginTop: 2
                    }}>
                      {costDisplay} · {m.notes}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            
            {/* Show quota information */}
            <View style={{ 
              marginTop: 12, 
              padding: 8, 
              backgroundColor: palette.outline + '30', 
              borderRadius: 6 
            }}>
              <Text style={{ color: palette.textSecondary, fontSize: 11 }}>
                Plan limits: {quotas.ai_requests === -1 ? 'Unlimited' : `${quotas.ai_requests}`} requests/month, {quotas.rpm_limit} requests/minute
              </Text>
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={onGenerate} style={[styles.primaryBtn, { backgroundColor: theme.primary, flex: 1 }]} disabled={generating || pending}>
            {(generating || pending) ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={[styles.primaryBtnText, { color: theme.onPrimary }]}>Generate Lesson</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onSave} style={[styles.primaryBtn, { backgroundColor: theme.accent, flex: 1 }]} disabled={saving}>
            {saving ? <ActivityIndicator color={theme.onAccent} /> : <Text style={[styles.primaryBtnText, { color: theme.onAccent }]}>Save Lesson</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function QuotaBar({ feature, planLimit, color }: { feature: 'lesson_generation' | 'grading_assistance' | 'homework_help'; planLimit?: number; color: string }) {
  const [status, setStatus] = React.useState<{ used: number; limit: number; remaining: number } | null>(null)
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const s = await getQuotaStatus(feature)
        const limit = planLimit && planLimit > 0 ? planLimit : s.limit
        const remaining = Math.max(0, (limit === -1 ? 0 : limit) - s.used)
        if (mounted) setStatus({ used: s.used, limit, remaining })
      } catch {
        if (mounted) setStatus(null)
      }
    })()
    return () => { mounted = false }
  }, [feature, planLimit])
  if (!status) return null
  if (status.limit === -1) {
    return <Text style={{ color: '#6B7280', marginTop: 4 }}>Quota: Unlimited</Text>
  }
  const pct = Math.max(0, Math.min(100, Math.round((status.used / Math.max(1, status.limit)) * 100)))
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' }}>
        <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
      </View>
      <Text style={{ color: '#6B7280', marginTop: 4, fontSize: 12 }}>
        Quota: {status.used}/{status.limit} used · {Math.max(0, status.limit - status.used)} remaining
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  contentPadding: { padding: 16 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'transparent' },
  primaryBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { fontWeight: '700' },
  dashHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, marginTop: 16 },
  inlineAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  dashTitleText: { fontSize: 14, fontWeight: '700' },
  openWithDashBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  openWithDashText: { fontSize: 12, marginLeft: 6, fontWeight: '600' },
  fallbackChip: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
})
