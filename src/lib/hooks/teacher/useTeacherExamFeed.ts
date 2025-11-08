import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ExamFeedItem {
  id: string
  studentId: string
  studentFirstName: string | null
  studentLastName: string | null
  grade: string
  subject: string
  examTitle: string | null
  scoreObtained: number
  scoreTotal: number
  percentage: number
  completedAt: string
  thumbnail_url?: string | null
}

export function useTeacherExamFeed(preschoolId: string | null) {
  const supabase = createClient()
  const [items, setItems] = useState<ExamFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const teacherId = sessionData.session?.user?.id
        if (!teacherId) { setItems([]); setLoading(false); return }

        // Base query: last 14 days
        let query = supabase
          .from('exam_user_progress')
          .select(`
            id,
            user_id,
            grade,
            subject,
            exam_title,
            score_obtained,
            score_total,
            percentage,
            completed_at,
            profiles!inner(id,first_name,last_name,preschool_id,assigned_teacher_id)
          `)
          .gte('completed_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('completed_at', { ascending: false })
          .limit(15)

        if (preschoolId) { query = query.eq('profiles.preschool_id', preschoolId) }
        query = query.eq('profiles.assigned_teacher_id', teacherId)

        const { data, error } = await query
        if (error) throw error

        const mapped: ExamFeedItem[] = (data || []).map((row: any) => ({
          id: row.id,
          studentId: row.user_id,
          studentFirstName: row.profiles?.first_name || null,
          studentLastName: row.profiles?.last_name || null,
          grade: row.grade,
          subject: row.subject,
          examTitle: row.exam_title,
          scoreObtained: Number(row.score_obtained || 0),
          scoreTotal: Number(row.score_total || 0),
          percentage: Number(row.percentage || 0),
          completedAt: row.completed_at,
          thumbnail_url: null,
        }))

        // Also fetch recent activity submissions (ECD)
        let aQuery = supabase
          .from('activity_submissions')
          .select(`id, user_id, type, title, score, total, percentage, thumbnail_url, created_at, profiles!inner(first_name,last_name,preschool_id)`) 
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(10)
          .eq('assigned_teacher_id', teacherId)
        if (preschoolId) { aQuery = aQuery.eq('profiles.preschool_id', preschoolId) }

        const { data: acts, error: aErr } = await aQuery
        if (aErr) throw aErr

        const mappedActs: ExamFeedItem[] = (acts || []).map((row: any) => ({
          id: row.id,
          studentId: row.user_id,
          studentFirstName: row.profiles?.first_name || null,
          studentLastName: row.profiles?.last_name || null,
          grade: 'ECD',
          subject: row.type,
          examTitle: row.title || 'Activity',
          scoreObtained: Number(row.score || 0),
          scoreTotal: Number(row.total || 0),
          percentage: Number(row.percentage || 0),
          completedAt: row.created_at,
          thumbnail_url: row.thumbnail_url || null,
        }))

        setItems([...mappedActs, ...mapped].sort((a,b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()))
      } catch (e: any) {
        console.error('[useTeacherExamFeed] error', e)
        setError(e.message || 'Failed to load')
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchFeed()
  }, [preschoolId])

  return { items, loading, error }
}
