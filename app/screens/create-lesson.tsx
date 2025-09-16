import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Stack, router } from 'expo-router'
import { assertSupabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { LessonGeneratorService } from '@/lib/ai/lessonGenerator'
import { useAuth } from '@/contexts/AuthContext'

export default function CreateLessonScreen() {
  const { profile } = useAuth()
  const hasActiveSeat = profile?.hasActiveSeat?.() || profile?.seat_status === 'active'
  const canCreate = hasActiveSeat || (!!profile?.hasCapability && profile.hasCapability('create_assignments' as any))
  const palette = { background: '#0b1220', text: '#FFFFFF', textSecondary: '#9CA3AF', outline: '#1f2937', surface: '#111827', primary: '#00f5ff' }

  const [mode, setMode] = useState<'manual' | 'ai'>('manual')
  const [title, setTitle] = useState('New Lesson')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [complexity, setComplexity] = useState<'simple' | 'moderate' | 'complex'>('moderate')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const categoriesQuery = useQuery({
    queryKey: ['lesson_categories_for_create'],
    queryFn: async () => {
      const { data, error } = await assertSupabase().from('lesson_categories').select('id,name')
      if (error) throw error
      return (data || []) as { id: string; name: string }[]
    },
    staleTime: 60_000,
  })

  const onSave = async () => {
    try {
      if (!title.trim()) { Alert.alert('Title required', 'Please enter a lesson title.'); return }
      const catId = categoryId || categoriesQuery.data?.[0]?.id
      if (!catId) { Alert.alert('No category', 'Please create a lesson category first.'); return }

      setSaving(true)
      const { data: auth } = await assertSupabase().auth.getUser()
      const authUserId = auth?.user?.id || ''
      const { data: profile } = await assertSupabase().from('users').select('id,preschool_id').eq('auth_user_id', authUserId).maybeSingle()
      if (!profile) { Alert.alert('Not signed in', 'No user profile.'); return }

      const res = await LessonGeneratorService.saveGeneratedLesson({
        lesson: { title, description, content: { sections: [{ title: 'Overview', content: description }] } },
        teacherId: profile.id,
        preschoolId: profile.preschool_id,
        ageGroupId: 'n/a',
        categoryId: catId,
        template: { duration: parseInt(duration) || 30, complexity },
        isPublished: true,
      })
      if (!res.success) { Alert.alert('Save failed', res.error || 'Unknown error'); return }
      Alert.alert('Saved', `Lesson saved with id ${res.lessonId}`, [{ text: 'OK', onPress: () => router.back() }])
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const categories = categoriesQuery.data || []

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ 
        title: 'Create Lesson', 
        headerStyle: { backgroundColor: palette.background }, 
        headerTitleStyle: { color: '#fff' }, 
        headerTintColor: palette.primary,
        headerBackVisible: true,
        headerBackTitleVisible: false
      }} />
      <StatusBar style="light" backgroundColor={palette.background} />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.chip, mode === 'manual' && styles.chipActive]} onPress={() => setMode('manual')}>
              <Text style={[styles.chipText, mode === 'manual' && styles.chipTextActive]}>Manual</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, mode === 'ai' && styles.chipActive]} onPress={() => setMode('ai')}>
              <Text style={[styles.chipText, mode === 'ai' && styles.chipTextActive]}>AI</Text>
            </TouchableOpacity>
          </View>

          {!canCreate ? (
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
              <Text style={styles.cardTitle}>Access Restricted</Text>
              <Text style={{ color: palette.textSecondary }}>Your teacher seat is not active or you lack permission to create lessons. Please contact your administrator.</Text>
            </View>
          ) : mode === 'ai' ? (
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
              <Text style={styles.cardTitle}>AI Lesson Generator</Text>
              <Text style={{ color: palette.textSecondary, marginBottom: 8 }}>Use the AI generator to draft a CAPS-aligned lesson.</Text>
              <TouchableOpacity onPress={() => router.push('/screens/ai-lesson-generator')} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Open AI Lesson Generator</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
                <Text style={styles.cardTitle}>Basics</Text>
                <Text style={styles.label}>Title</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Lesson title" placeholderTextColor={palette.textSecondary} />
                <Text style={[styles.label, { marginTop: 10 }]}>Description</Text>
                <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Brief description" placeholderTextColor={palette.textSecondary} multiline />
              </View>

              <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
                <Text style={styles.cardTitle}>Category</Text>
                {categoriesQuery.isLoading ? (
                  <ActivityIndicator color={palette.primary} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map(c => (
                      <TouchableOpacity key={c.id} style={[styles.chip, categoryId === c.id && styles.chipActive]} onPress={() => setCategoryId(c.id)}>
                        <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
                <Text style={styles.cardTitle}>Settings</Text>
                <Text style={styles.label}>Duration (minutes)</Text>
                <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="30" placeholderTextColor={palette.textSecondary} />

                <Text style={[styles.label, { marginTop: 10 }]}>Complexity</Text>
                <View style={styles.row}>
                  {(['simple','moderate','complex'] as const).map(c => (
                    <TouchableOpacity key={c} style={[styles.chip, complexity === c && styles.chipActive]} onPress={() => setComplexity(c)}>
                      <Text style={[styles.chipText, complexity === c && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity onPress={onSave} disabled={saving} style={[styles.primaryBtn, saving && { opacity: 0.6 }]}>
                {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryBtnText}>Save Lesson</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  card: { borderWidth: 1, borderColor: '#1f2937', borderRadius: 12, padding: 12, gap: 8 },
  cardTitle: { color: '#fff', fontWeight: '800' },
  label: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  input: { backgroundColor: '#111827', color: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#1f2937', padding: 12 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  chip: { borderWidth: 1, borderColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  chipActive: { backgroundColor: '#00f5ff', borderColor: '#00f5ff' },
  chipText: { color: '#9CA3AF', fontWeight: '700' },
  chipTextActive: { color: '#000' },
  primaryBtn: { backgroundColor: '#00f5ff', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#000', fontWeight: '800' },
})

