// @ts-nocheck
import React, { useRef, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { HomeworkService } from '@/lib/services/homeworkService'
import { getFeatureFlagsSync } from '@/lib/featureFlags'
import { track } from '@/lib/analytics'
import { getCombinedUsage, incrementUsage, logUsageEvent } from '@/lib/ai/usage'
import { canUseFeature, getQuotaStatus, getEffectiveLimits } from '@/lib/ai/limits'
import { getPreferredModel, setPreferredModel } from '@/lib/ai/preferences'
import { router } from 'expo-router'

export default function AIHomeworkGraderLive() {
  const [assignmentTitle, setAssignmentTitle] = useState('Counting to 10')
  const [gradeLevel, setGradeLevel] = useState('Age 5')
  const [submissionContent, setSubmissionContent] = useState('I counted 1 2 3 4 6 7 8 10')
  const [isStreaming, setIsStreaming] = useState(false)
  const [jsonBuffer, setJsonBuffer] = useState('')
  const [parsed, setParsed] = useState<null | { score: number; feedback: string; suggestions: string[]; strengths: string[]; areasForImprovement: string[] }>(null)
  const [usage, setUsage] = useState<{ lesson_generation: number; grading_assistance: number; homework_help: number }>({ lesson_generation: 0, grading_assistance: 0, homework_help: 0 })
  const [models, setModels] = React.useState<Array<{ id: string; name: string; provider: 'claude' | 'openai' | 'custom'; relativeCost: number }>>([])
  const [selectedModel, setSelectedModel] = React.useState<string>('')
  const bufferRef = useRef('')

  const flags = getFeatureFlagsSync()
  const AI_ENABLED = (process.env.EXPO_PUBLIC_AI_ENABLED === 'true') || (process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES === 'true')
  const aiGradingEnabled = AI_ENABLED && flags.ai_grading_assistance !== false

  React.useEffect(() => {
    (async () => {
      setUsage(await getCombinedUsage())
      try {
        const limits = await getEffectiveLimits()
        setModels(limits.modelOptions || [])
        const stored = await getPreferredModel('grading_assistance')
        setSelectedModel(stored || (limits.modelOptions && limits.modelOptions[0]?.id) || 'claude-3-haiku')
      } catch { /* noop */ void 0; }
    })()
  }, [])

  const startStreaming = async () => {
    if (!submissionContent.trim()) {
      Alert.alert('Missing submission', 'Please provide the student submission text.')
      return
    }
    if (!aiGradingEnabled) {
      Alert.alert('AI Tool Disabled', 'Homework grader is not enabled in this build.')
      return
    }
    // Enforce quota before starting
    const gate = await canUseFeature('grading_assistance', 1)
    if (!gate.allowed) {
      const status = await getQuotaStatus('grading_assistance')
      Alert.alert(
        'Monthly limit reached',
        `You have used ${status.used} of ${status.limit} grading sessions this month. ${gate.requiresPrepay ? 'Please upgrade or purchase more to continue.' : ''}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'See plans', onPress: () => router.push('/pricing') },
        ]
      )
      return
    }
    try {
      setIsStreaming(true)
      setJsonBuffer('')
      bufferRef.current = ''
      setParsed(null)
      track('edudash.ai.grader.ui_started', {})

      const submissionId = 'temp-local'
      await HomeworkService.streamGradeHomework(
        submissionId,
        submissionContent,
        assignmentTitle || 'Homework',
        gradeLevel || 'Age 5',
        {
          onDelta: (chunk) => {
            bufferRef.current += chunk
            setJsonBuffer(bufferRef.current)
          },
          onFinal: async ({ score, feedback, suggestions, strengths, areasForImprovement }) => {
            setParsed({ score, feedback, suggestions, strengths, areasForImprovement })
            setIsStreaming(false)
            try {
              await incrementUsage('grading_assistance', 1);
              try { await logUsageEvent({ feature: 'grading_assistance', model: selectedModel, timestamp: new Date().toISOString() }) } catch { /* noop */ void 0; }
              setUsage(await getCombinedUsage());
            } catch { /* noop */ void 0; }
            track('edudash.ai.grader.ui_completed', { score })
          },
          onError: (err) => {
            setIsStreaming(false)
            track('edudash.ai.grader.ui_failed', { error: err?.message })
            Alert.alert('Grading failed', err.message || 'Unknown error')
          },
        },
        { model: selectedModel }
      )
    } catch (e: any) {
      setIsStreaming(false)
      track('edudash.ai.grader.ui_failed', { error: e?.message })
      Alert.alert('Error', e?.message || 'Failed to start grading')
    }
  }

  const scoreColor = parsed ? (parsed.score >= 90 ? '#10B981' : parsed.score >= 80 ? '#3B82F6' : parsed.score >= 70 ? '#F59E0B' : '#EF4444') : '#111827'

  return (
    <View style={[styles.container, { backgroundColor: '#fff' }]}>
      <View style={[styles.header, { borderBottomColor: '#E5E7EB' }]}>
        <View style={styles.headerLeft}>
          <IconSymbol name="doc.text.below.ecg" size={22} color="#8B5CF6" />
          <Text style={[styles.headerTitle, { color: '#111827' }]}>AI Homework Grader (Live)</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
          <Text style={[styles.label, { color: '#6B7280' }]}>Assignment Title</Text>
          <TextInput
            value={assignmentTitle}
            onChangeText={setAssignmentTitle}
            placeholder="e.g., Counting to 10"
            placeholderTextColor={'#9CA3AF'}
            style={[styles.input, { color: '#111827', borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}
          />

          <Text style={[styles.label, { color: '#6B7280' }]}>Grade Level / Age</Text>
          <TextInput
            value={gradeLevel}
            onChangeText={setGradeLevel}
            placeholder="e.g., Age 5 or Grade R"
            placeholderTextColor={'#9CA3AF'}
            style={[styles.input, { color: '#111827', borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}
          />

          <Text style={[styles.label, { color: '#6B7280' }]}>Student Submission</Text>
          <TextInput
            value={submissionContent}
            onChangeText={setSubmissionContent}
            placeholder="Paste or type the student's answer"
            placeholderTextColor={'#9CA3AF'}
            style={[styles.textArea, { color: '#111827', borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}
            multiline
          />

          {/* Model selector */}
          {models.length > 0 && (
            <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
              <Text style={[styles.sectionTitle, { color: '#111827' }]}>Model</Text>
              <View style={[styles.inlineRow, { gap: 8, flexWrap: 'wrap' }]}>
                {models.map(m => (
                  <TouchableOpacity key={m.id} onPress={async () => { setSelectedModel(m.id); try { await setPreferredModel(m.id, 'grading_assistance') } catch { /* noop */ } }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: selectedModel === m.id ? '#8B5CF6' : '#E5E7EB', backgroundColor: selectedModel === m.id ? '#8B5CF6' : 'transparent' }}>
                    <Text style={{ color: selectedModel === m.id ? '#fff' : '#111827' }}>
                      {`${m.name} · x${m.relativeCost} · ${m.relativeCost <= 1 ? '$' : m.relativeCost <= 5 ? '$$' : '$$$'}${(m as any).notes ? ` · ${(m as any).notes}` : ''}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={startStreaming}
            disabled={isStreaming || !aiGradingEnabled}
            style={[styles.primaryButton, { opacity: (isStreaming || !aiGradingEnabled) ? 0.6 : 1, backgroundColor: '#8B5CF6' }]}
          >
            {isStreaming ? (
              <View style={styles.inlineRow}>
                <ActivityIndicator color="#FFF" />
                <Text style={styles.primaryButtonText}> Streaming…</Text>
              </View>
            ) : (
              <View style={styles.inlineRow}>
                <IconSymbol name="waveform" size={18} color="#FFF" />
                <Text style={styles.primaryButtonText}> Start Live Grading</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
          <Text style={[styles.sectionTitle, { color: '#111827' }]}>Live JSON Stream</Text>
          <Text style={{ color: '#6B7280', marginBottom: 6 }}>Monthly usage (local/server): Grading {usage.grading_assistance}</Text>
          <QuotaSummary feature="grading_assistance" />
          <View style={[styles.jsonBox, { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}>
            <Text style={[styles.jsonText, { color: '#111827' }]} selectable>
              {jsonBuffer || (isStreaming ? 'Waiting for tokens…' : 'No data yet. Press "Start Live Grading".')}
            </Text>
          </View>
        </View>

        {parsed && (
          <View style={[styles.parsedCard, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
            <Text style={[styles.parsedTitle, { color: '#111827' }]}>Parsed Summary</Text>
            <Text style={[styles.parsedLabel, { color: '#6B7280' }]}>Score</Text>
            <Text style={[styles.parsedScore, { color: scoreColor }]}>{parsed.score}</Text>
            <Text style={[styles.parsedLabel, { color: '#6B7280' }]}>Feedback</Text>
            <Text style={[styles.parsedText, { color: '#111827' }]}>{parsed.feedback}</Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
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
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  content: { padding: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  textArea: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 120 },
  primaryButton: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  inlineRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  jsonBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 10, minHeight: 80 },
  jsonText: { fontFamily: 'monospace' },
  parsedCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12 },
  parsedTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  parsedLabel: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  parsedScore: { fontSize: 28, fontWeight: '900' },
  parsedText: { fontSize: 13 },
  bottomSpacing: { height: 40 },
})
