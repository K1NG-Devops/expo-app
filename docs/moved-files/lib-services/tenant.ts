import { assertSupabase } from '@/lib/supabase';

export type CreateSchoolParams = {
  schoolName: string;
  adminName?: string | null;
  phone?: string | null;
  planTier?: 'free' | 'starter' | 'premium' | 'enterprise';
};

export class TenantService {
  static async createSchool(params: CreateSchoolParams): Promise<string> {
    const { data, error } = await assertSupabase().rpc('principal_create_school', {
      p_school_name: params.schoolName,
      p_admin_name: params.adminName ?? null,
      p_phone: params.phone ?? null,
      p_plan_tier: params.planTier ?? 'free',
    });
    if (error) throw error;
    return String(data);
  }

  static async getMySchoolId(): Promise<string | null> {
    // Try profile first
    const { data: prof } = await assertSupabase()
      .from('profiles')
      .select('preschool_id')
      .maybeSingle();
    return (prof as any)?.preschool_id || null;
  }
}
