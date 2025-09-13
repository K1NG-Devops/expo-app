import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '@/constants/Colors'
import { assertSupabase } from '@/lib/supabase'
import { getEffectiveLimits } from '@/lib/ai/limits'

export default function AdminAIAllocationScreen() {
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [orgName, setOrgName] = useState<string>('')
  const [teachers, setTeachers] = useState<Array<{ id: string; email: string; quota: { lesson_generation: string; grading_assistance: string; homework_help: string } }>>([])
  const [saving, setSaving] = useState(false)
  const [orgLimits, setOrgLimits] = useState<null | { quotas: { lesson_generation: number; grading_assistance: number; homework_help: number }, used: { lesson_generation: number; grading_assistance: number; homework_help: number } }>(null)

  useEffect(() => {
    (async () => {
      try {
        const limits = await getEffectiveLimits()
        setAllowed(!!limits.canOrgAllocate)
        // Load organization name and teacher list (basic version)
        const { data: userRes } = await assertSupabase().auth.getUser()
        const uid = userRes?.user?.id || ''
        let orgId: string | null = null
        let orgDisplay = ''
        const { data: prof } = await assertSupabase().from('profiles').select('id, preschool_id').eq('id', uid).maybeSingle()
        if (prof && (prof as any).preschool_id) {
          orgId = (prof as any).preschool_id
          const { data: org } = await assertSupabase().from('preschools').select('name').eq('id', orgId).maybeSingle()
          orgDisplay = (org as any)?.name || 'Organization'
        } else {
          orgDisplay = 'Organization'
        }
        setOrgName(orgDisplay)

        if (orgId) {
          const { data: profs } = await assertSupabase().from('profiles').select('id,email,role').eq('preschool_id', orgId).eq('role', 'teacher')
          const list: Array<{ id: string; email: string; quota: { lesson_generation: string; grading_assistance: string; homework_help: string } }> = (profs || []).map((p: any) => ({
            id: p.id,
            email: p.email,
            quota: { lesson_generation: '', grading_assistance: '', homework_help: '' },
          }))
          setTeachers(list)

          // Try to load org limits summary from server
          try {
            const { data: limitsRes } = await assertSupabase().functions.invoke('ai-usage', { body: { action: 'org_limits', organization_id: orgId } as any })
            if (limitsRes && (limitsRes.quotas || limitsRes.used)) {
              setOrgLimits({
                quotas: {
                  lesson_generation: Number(limitsRes.quotas?.lesson_generation || 0),
                  grading_assistance: Number(limitsRes.quotas?.grading_assistance || 0),
                  homework_help: Number(limitsRes.quotas?.homework_help || 0),
                },
                used: {
                  lesson_generation: Number(limitsRes.used?.lesson_generation || 0),
                  grading_assistance: Number(limitsRes.used?.grading_assistance || 0),
                  homework_help: Number(limitsRes.used?.homework_help || 0),
                },
              })
            }
          } catch { /* noop */ }
        }
      } catch (e: any) {
        console.log('Allocation init failed:', e?.message)
      } finally {
        setReady(true)
      }
    })()
  }, [])

  const onSave = async () => {
    try {
      setSaving(true)
      // Build payload
      const allocations = teachers
        .map(t => ({
          user_id: t.id,
          lesson_generation: Number(t.quota.lesson_generation || 0) || 0,
          grading_assistance: Number(t.quota.grading_assistance || 0) || 0,
          homework_help: Number(t.quota.homework_help || 0) || 0,
        }))
      // Call server function to set org allocation (backend to implement)
      const { error } = await assertSupabase().functions.invoke('ai-usage', { body: { action: 'set_allocation', allocations } as any })
      if (error) throw error
      Alert.alert('Saved', 'Allocations updated successfully.')
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to save allocations now.')
    } finally {
      setSaving(false)
    }
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.light.text }}>Loading…</Text>
      </View>
    )
  }

  if (!allowed) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'AI Allocation', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff' }} />
        <StatusBar style="light" backgroundColor="#0b1220" />
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>AI Allocation</Text>
            <Text style={styles.subtitle}>This feature is available for:</Text>
            <Text style={styles.bullet}>• Preschools on Pro (R599) and higher</Text>
            <Text style={styles.bullet}>• K-12 Schools on Enterprise (special pricing)</Text>
            <TouchableOpacity style={styles.cta} onPress={() => router.push('/pricing')}>
              <Text style={styles.ctaText}>See plans</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'AI Allocation', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff' }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>AI Allocation</Text>
          <Text style={styles.subtitle}>Organization: {orgName}</Text>

          {orgLimits && (
            <View style={styles.rowBox}>
              <Text style={[styles.teacherEmail, { marginBottom: 6 }]}>This month</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <SummaryPill label="Lessons" used={orgLimits.used.lesson_generation} limit={orgLimits.quotas.lesson_generation} />
                <SummaryPill label="Grading" used={orgLimits.used.grading_assistance} limit={orgLimits.quotas.grading_assistance} />
                <SummaryPill label="Helper" used={orgLimits.used.homework_help} limit={orgLimits.quotas.homework_help} />
              </View>
            </View>
          )}

          {teachers.map((t, idx) => (
            <View key={t.id} style={styles.rowBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.teacherEmail}>{t.email}</Text>
                <View style={styles.quotaRow}>
                  <QuotaInput label="Lessons" value={t.quota.lesson_generation} onChange={(v) => updateTeacher(idx, 'lesson_generation', v)} />
                  <QuotaInput label="Grading" value={t.quota.grading_assistance} onChange={(v) => updateTeacher(idx, 'grading_assistance', v)} />
                  <QuotaInput label="Helper" value={t.quota.homework_help} onChange={(v) => updateTeacher(idx, 'homework_help', v)} />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.saveCta} onPress={onSave} disabled={saving}>
            <Text style={styles.saveCtaText}>{saving ? 'Saving…' : 'Save allocations'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  )

  function updateTeacher(index: number, key: 'lesson_generation' | 'grading_assistance' | 'homework_help', value: string) {
    setTeachers(prev => prev.map((t, i) => i === index ? { ...t, quota: { ...t.quota, [key]: value } } : t))
  }
}

function SummaryPill({ label, used, limit }: { label: string; used: number; limit: number }) {
  const rem = Math.max(0, (limit || 0) - (used || 0))
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#1f2937', backgroundColor: '#111827' }}>
      <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{label}: <Text style={{ color: '#fff' }}>{used}/{limit}</Text> ({rem} left)</Text>
    </View>
  )
}

function QuotaInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#9CA3AF"
        style={styles.input}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: '#0b1220' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#9CA3AF' },
  bullet: { fontSize: 13, color: '#9CA3AF' },
  teacherEmail: { color: '#fff', fontWeight: '700' },
  rowBox: { backgroundColor: '#111827', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1f2937' },
  quotaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  inputLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: '#0b1220', color: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#1f2937', paddingHorizontal: 10, paddingVertical: 8 },
  cta: { marginTop: 10, backgroundColor: '#00f5ff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start' },
  ctaText: { color: '#000', fontWeight: '800' },
  saveCta: { marginTop: 12, backgroundColor: '#00f5ff', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  saveCtaText: { color: '#000', fontWeight: '800' },
})

