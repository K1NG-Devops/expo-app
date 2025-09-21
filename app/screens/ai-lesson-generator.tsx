import React, { useState, useEffect } from 'react'
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
import { router } from 'expo-router'
import { useSimplePullToRefresh } from '@/hooks/usePullToRefresh'
import { useLessonGenerator } from '@/hooks/useLessonGenerator'
import { useLessonGeneratorModels, useTierInfo } from '@/hooks/useAIModelSelection'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

export default function AILessonGeneratorScreen() {
  const palette = { background: '#fff', text: '#111827', textSecondary: '#6B7280', outline: '#E5E7EB', surface: '#FFFFFF', primary: '#3B82F6' }
  const [generated, setGenerated] = useState<any | null>({ title: 'New Lesson', description: 'AI generated lesson', content: { sections: [] }, activities: [] })
  const [topic, setTopic] = useState('Fractions')
  const [subject, setSubject] = useState('Mathematics')
  const [gradeLevel, setGradeLevel] = useState('3')
  const [duration, setDuration] = useState('45')
  const [objectives, setObjectives] = useState('Understand proper fractions; Compare simple fractions')
  const [saving, setSaving] = useState(false)
  const { loading: generating, generate } = useLessonGenerator()
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

  const onGenerate = async () => {
    try {
      if (!AI_ENABLED || flags.ai_lesson_generation === false) {
        Alert.alert('AI Disabled', 'Lesson generator is not enabled in this build.');
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
      Alert.alert('Generation failed', e?.message || 'Unable to generate lesson at this time.')
    }
  }

  const onSave = async () => {
    try {
      setSaving(true)
      const { data: auth } = await assertSupabase().auth.getUser()
      const authUserId = auth?.user?.id || ''
      const { data: profile } = await assertSupabase().from('users').select('id,preschool_id').eq('auth_user_id', authUserId).maybeSingle()
      if (!profile) { Alert.alert('Not signed in', 'No user profile.'); return }

      const categoryId = categoriesQuery.data?.[0]?.id
      if (!categoryId) { Alert.alert('Select category', 'Please create a category first.'); return }

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
        Alert.alert('Save failed', res.error || 'Unknown error')
        return
      }
      Alert.alert('Saved', `Lesson saved with id ${res.lessonId}`)
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save')
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
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>Lesson Parameters</Text>
          <Text style={{ color: palette.textSecondary }}>Customize the generation prompt.</Text>

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
          <QuotaSummary feature="lesson_generation" />
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
          <TouchableOpacity onPress={onGenerate} style={[styles.primaryBtn, { backgroundColor: '#111827', flex: 1 }]} disabled={generating}>
            {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Generate Lesson</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onSave} style={[styles.primaryBtn, { backgroundColor: '#3B82F6', flex: 1 }]} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Lesson</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function QuotaSummary({ feature }: { feature: 'lesson_generation' | 'grading_assistance' | 'homework_help' }) {
  const [text, setText] = React.useState<string>('')
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const status = await getQuotaStatus(feature)
        if (mounted) setText(`Quota: ${status.used}/${status.limit} used, ${status.remaining} remaining`)
      } catch {
        if (mounted) setText('Quota: unavailable')
      }
    })()
    return () => { mounted = false }
  }, [feature])
  if (!text) return null
  return <Text style={{ color: '#6B7280', marginTop: 4 }}>{text}</Text>
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
  primaryBtnText: { color: '#fff', fontWeight: '700' },
})
