import { assertSupabase } from '@/lib/supabase';

export type GuardianRequest = {
  id: string;
  school_id: string | null;
  parent_auth_id: string;
  parent_email?: string | null;
  student_id?: string | null;
  child_full_name?: string | null;
  child_class?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
};

export class ParentJoinService {
  static async requestLink(params: {
    schoolId?: string | null;
    parentAuthId: string;
    parentEmail?: string | null;
    studentId?: string | null;
    childFullName?: string | null;
    childClass?: string | null;
  }): Promise<string> {
    const { data, error } = await assertSupabase()
      .from('guardian_requests')
      .insert({
        school_id: params.schoolId ?? null,
        parent_auth_id: params.parentAuthId,
        parent_email: params.parentEmail ?? null,
        student_id: params.studentId ?? null,
        child_full_name: params.childFullName ?? null,
        child_class: params.childClass ?? null,
        status: 'pending',
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }

  static async myRequests(parentAuthId: string): Promise<GuardianRequest[]> {
    const { data, error } = await assertSupabase()
      .from('guardian_requests')
      .select('*')
      .eq('parent_auth_id', parentAuthId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as GuardianRequest[];
  }

  static async listPendingForSchool(schoolId: string): Promise<GuardianRequest[]> {
    const { data, error } = await assertSupabase()
      .from('guardian_requests')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as GuardianRequest[];
  }

  static async approve(requestId: string, studentId: string, approverId: string): Promise<void> {
    // Link parent to the student (set parent_id if empty, otherwise guardian_id)
    // Fetch request
    const { data: req, error: reqErr } = await assertSupabase()
      .from('guardian_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (reqErr || !req) throw reqErr || new Error('Request not found');

    // Update student linkage conservatively
    try {
      // Try to set parent_id if not set
      const { data: student } = await assertSupabase()
        .from('students')
        .select('id, parent_id, guardian_id')
        .eq('id', studentId)
        .single();
      if (student) {
        if (!student.parent_id) {
          await assertSupabase().from('students').update({ parent_id: req.parent_auth_id }).eq('id', studentId);
        } else if (!student.guardian_id && req.parent_auth_id !== student.parent_id) {
          await assertSupabase().from('students').update({ guardian_id: req.parent_auth_id }).eq('id', studentId);
        }
      }
    } catch { /* Intentional: non-fatal */ }

    // Mark request approved
    const { error } = await assertSupabase()
      .from('guardian_requests')
      .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: approverId, student_id: studentId })
      .eq('id', requestId);
    if (error) throw error;
  }

  static async reject(requestId: string, approverId: string): Promise<void> {
    const { error } = await assertSupabase()
      .from('guardian_requests')
      .update({ status: 'rejected', approved_at: new Date().toISOString(), approved_by: approverId })
      .eq('id', requestId);
    if (error) throw error;
  }
}