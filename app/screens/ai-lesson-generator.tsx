import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { assertSupabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { LessonGeneratorService } from '@/lib/ai/lessonGenerator'

export default function AILessonGeneratorScreen() {
  const palette = { background: '#fff', text: '#111827', textSecondary: '#6B7280', outline: '#E5E7EB', surface: '#FFFFFF', primary: '#3B82F6' }
  const [generated, setGenerated] = useState<any | null>({ title: 'New Lesson', description: 'AI generated lesson', content: { sections: [] }, activities: [] })
  const [saving, setSaving] = useState(false)

  const categoriesQuery = useQuery({
    queryKey: ['lesson_categories'],
    queryFn: async () => {
      const { data, error } = await assertSupabase().from('lesson_categories').select('id,name')
      if (error) throw error
      return (data || []) as { id: string; name: string }[]
    },
    staleTime: 60_000,
  })

  const classesQuery = useQuery({
    queryKey: ['teacher_classes'],
    queryFn: async () => {
      const { data, error } = await assertSupabase()
        .from('classes')
        .select('id,name')
        .eq('is_active', true)
      if (error) throw error
      return (data || []) as { id: string; name: string }[]
    },
    staleTime: 60_000,
  })

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
      <View style={[styles.header, { borderBottomColor: palette.outline }]}>
        <Text style={[styles.title, { color: palette.text }]}>AI Lesson Generator</Text>
      </View>

      <ScrollView contentContainerStyle={styles.contentPadding}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>Preview</Text>
          <Text style={{ color: palette.textSecondary }}>This is a minimal scaffold. Integrate your preferred AI provider to generate content.</Text>
        </View>

        <TouchableOpacity onPress={onSave} style={[styles.primaryBtn, { backgroundColor: '#3B82F6' }]} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Lesson</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  contentPadding: { padding: 16 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  primaryBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
})
