import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
// import { Ionicons } from '@expo/vector-icons'; // Not used currently
// import { assertSupabase } from '@/lib/supabase'
import { getFeatureFlagsSync } from '@/lib/featureFlags'
import { track } from '@/lib/analytics'
import { Colors } from '@/constants/Colors'
import { getCombinedUsage } from '@/lib/ai/usage'
import { useHomeworkGenerator } from '@/hooks/useHomeworkGenerator'
import { canUseFeature, getQuotaStatus, getEffectiveLimits } from '@/lib/ai/limits'
import { getPreferredModel, setPreferredModel } from '@/lib/ai/preferences'
import { router } from 'expo-router'
import { useSimplePullToRefresh } from '@/hooks/usePullToRefresh'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

export default function AIHomeworkHelperScreen() {
  const [question, setQuestion] = useState('Explain how to solve long division: 156 ÷ 12 step by step for a Grade 4 learner.')
  const [subject, setSubject] = useState('Mathematics')
  const { loading, generate } = useHomeworkGenerator()
  const [answer, setAnswer] = useState('')
  const [usage, setUsage] = useState<{ lesson_generation: number; grading_assistance: number; homework_help: number }>({ lesson_generation: 0, grading_assistance: 0, homework_help: 0 })
  const [models, setModels] = useState<Array<{ id: string; name: string; provider: 'claude' | 'openai' | 'custom'; relativeCost: number }>>([])
  const [selectedModel, setSelectedModel] = useState<string>('')

  const flags = getFeatureFlagsSync()
  const AI_ENABLED = (process.env.EXPO_PUBLIC_AI_ENABLED === 'true') || (process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES === 'true')
  const aiHelperEnabled = AI_ENABLED && flags.ai_homework_help !== false

  // Refresh function to reload usage and model data
  const handleRefresh = async () => {
    try {
      setUsage(await getCombinedUsage())
      const limits = await getEffectiveLimits()
      setModels(limits.modelOptions || [])
      const stored = await getPreferredModel('homework_help')
      setSelectedModel(stored || (limits.modelOptions && limits.modelOptions[0]?.id) || 'claude-3-haiku')
    } catch (error) {
      console.error('Error refreshing AI homework helper data:', error)
    }
  }

  const { refreshing, onRefreshHandler } = useSimplePullToRefresh(handleRefresh, 'ai_homework_helper')

  useEffect(() => {
    (async () => {
      setUsage(await getCombinedUsage())
      try {
        const limits = await getEffectiveLimits()
        setModels(limits.modelOptions || [])
        const stored = await getPreferredModel('homework_help')
        setSelectedModel(stored || (limits.modelOptions && limits.modelOptions[0]?.id) || 'claude-3-haiku')
      } catch { /* noop */ void 0; }
    })()
  }, [])

  const onAskAI = async () => {
    if (!question.trim()) {
      Alert.alert('Missing question', 'Please enter a question or problem.')
      return
    }
    if (!aiHelperEnabled) {
      Alert.alert('AI Tool Disabled', 'AI Homework Helper is not enabled in this build.')
      return
    }

    // Enforce quota before making a request
    const gate = await canUseFeature('homework_help', 1)
    if (!gate.allowed) {
      const status = await getQuotaStatus('homework_help')
      Alert.alert(
        'Monthly limit reached',
        `You have used ${status.used} of ${status.limit} homework help sessions this month. ${gate.requiresPrepay ? 'Please upgrade or purchase more to continue.' : ''}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'See plans', onPress: () => router.push('/pricing') },
        ]
      )
      return
    }

    try {
      setAnswer('')
      track('edudash.ai.helper.started', { subject })
      const text = await generate({
        question: question,
        subject,
        gradeLevel: 4,
        difficulty: 'medium',
        model: selectedModel,
      })
      setAnswer(typeof text === 'string' ? text : String(text || ''))
      setUsage(await getCombinedUsage())
      track('edudash.ai.helper.completed', { subject })
    } catch (e: any) {
      const msg = String(e?.message || 'Unknown error')
      if (msg.toLowerCase().includes('rate') || msg.includes('429')) {
        Alert.alert('Rate limit', 'Please try again later. You may have reached your usage limit.')
        track('edudash.ai.helper.rate_limited', {})
      } else {
        Alert.alert('Error', msg)
        track('edudash.ai.helper.failed', { error: msg })
      }
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader 
        title="AI Homework Helper" 
        subtitle="Child-safe, step-by-step guidance" 
      />
      
      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefreshHandler}
            tintColor="#007AFF"
            title="Refreshing AI data..."
          />
        }
      >

        {!aiHelperEnabled && (
          <Text style={styles.disabledBanner}>AI Homework Helper is currently disabled by feature flags or build configuration.</Text>
        )}

        <View style={styles.card}>
          {/* Model selector */}
          {models.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Model</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {models.map(m => (
              <TouchableOpacity key={m.id} onPress={async () => { setSelectedModel(m.id); try { await setPreferredModel(m.id, 'homework_help') } catch { /* noop */ void 0; } }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: selectedModel === m.id ? Colors.light.text : '#E5E7EB', backgroundColor: selectedModel === m.id ? Colors.light.text : 'transparent' }}>
                    <Text style={{ color: selectedModel === m.id ? '#fff' : Colors.light.text }}>
                      {`${m.name} · x${m.relativeCost} · ${m.relativeCost <= 1 ? '$' : m.relativeCost <= 5 ? '$$' : '$$$'}${(m as any).notes ? ` · ${(m as any).notes}` : ''}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g., Mathematics"
            placeholderTextColor={Colors.light.tabIconDefault}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Question / Problem</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={question}
            onChangeText={setQuestion}
            placeholder="Paste or type the question here"
            placeholderTextColor={Colors.light.tabIconDefault}
            multiline
          />

          <TouchableOpacity onPress={onAskAI} disabled={loading || !aiHelperEnabled} style={[styles.button, (loading || !aiHelperEnabled) && styles.buttonDisabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ask AI</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Response</Text>
          <Text style={styles.usage}>Monthly usage (local/server): Helper {usage.homework_help}</Text>
          <QuotaSummary feature="homework_help" />
          {answer ? (
            <Text style={styles.answer} selectable>{answer}</Text>
          ) : (
            <Text style={styles.placeholder}>No response yet. Enter a question and press "Ask AI".</Text>
          )}
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
  return <Text style={{ color: Colors.light.tabIconDefault, marginBottom: 8 }}>{text}</Text>
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.light.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.light.tabIconDefault, marginBottom: 12 },
  disabledBanner: { color: '#b45309', backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: StyleSheet.hairlineWidth, padding: 8, borderRadius: 8, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderColor: '#E5E7EB', borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  label: { fontSize: 12, color: Colors.light.tabIconDefault, marginBottom: 6 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.light.text },
  textArea: { minHeight: 120 },
  button: { marginTop: 12, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6, color: Colors.light.text },
  usage: { fontSize: 12, color: Colors.light.tabIconDefault, marginBottom: 8 },
  answer: { fontSize: 13, color: Colors.light.text, lineHeight: 19 },
  placeholder: { fontSize: 13, color: Colors.light.tabIconDefault },
})

