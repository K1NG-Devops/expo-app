// @ts-nocheck
import React, { useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { HomeworkService } from '@/lib/services/homeworkService'
import { getFeatureFlagsSync } from '@/lib/featureFlags'
import { track } from '@/lib/analytics'
import { getCombinedUsage, incrementUsage } from '@/lib/ai/usage'

export default function AIHomeworkGraderLive() {
  const [assignmentTitle, setAssignmentTitle] = useState('Counting to 10')
  const [gradeLevel, setGradeLevel] = useState('Age 5')
  const [submissionContent, setSubmissionContent] = useState('I counted 1 2 3 4 6 7 8 10')
  const [isStreaming, setIsStreaming] = useState(false)
  const [jsonBuffer, setJsonBuffer] = useState('')
  const [parsed, setParsed] = useState<null | { score: number; feedback: string; suggestions: string[]; strengths: string[]; areasForImprovement: string[] }>(null)
  const [usage, setUsage] = useState<{ lesson_generation: number; grading_assistance: number; homework_help: number }>({ lesson_generation: 0, grading_assistance: 0, homework_help: 0 })
  const bufferRef = useRef('')

  const flags = getFeatureFlagsSync()
  const AI_ENABLED = (process.env.EXPO_PUBLIC_AI_ENABLED === 'true') || (process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES === 'true')
  const aiGradingEnabled = AI_ENABLED && flags.ai_grading_assistance !== false

  React.useEffect(() => {
    (async () => setUsage(await getCombinedUsage()))()
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
            try { await incrementUsage('grading_assistance', 1); setUsage(await getCombinedUsage()); } catch {}
            track('edudash.ai.grader.ui_completed', { score })
          },
          onError: (err) => {
            setIsStreaming(false)
            track('edudash.ai.grader.ui_failed', { error: err?.message })
            Alert.alert('Grading failed', err.message || 'Unknown error')
          },
        }
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
