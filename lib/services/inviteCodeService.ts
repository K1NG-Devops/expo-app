import { assertSupabase } from '@/lib/supabase';

export type SchoolInvitationCode = {
  id: string;
  code: string;
  invitation_type: string;
  preschool_id: string;
  school_id?: string | null;
  is_active: boolean | null;
  max_uses?: number | null;
  current_uses?: number | null;
  expires_at?: string | null;
  description?: string | null;
  invited_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function generateReadableCode(length = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I, L, O, 0, 1 for readability
  let s = '';
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export class InviteCodeService {
  static async listParentCodes(preschoolId: string): Promise<SchoolInvitationCode[]> {
    const { data, error } = await assertSupabase()
      .from('school_invitation_codes')
      .select('*')
      .eq('preschool_id', preschoolId)
      .eq('invitation_type', 'parent')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as SchoolInvitationCode[];
  }

  static async createParentCode(params: {
    preschoolId: string;
    invitedBy?: string | null;
    description?: string | null;
    maxUses?: number | null; // null => unlimited
    expiresAt?: string | null; // ISO string or null
    codeLength?: number; // default 8
  }): Promise<SchoolInvitationCode> {
    const length = params.codeLength ?? 8;

    // Try up to 3 attempts in case of code collision
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateReadableCode(length);
      const payload: Partial<SchoolInvitationCode> = {
        code,
        invitation_type: 'parent',
        preschool_id: params.preschoolId,
        invited_by: params.invitedBy ?? null,
        description: params.description ?? 'School-wide parent invite code',
        max_uses: params.maxUses ?? null,
        expires_at: params.expiresAt ?? null,
        is_active: true,
      } as any;

      const { data, error } = await assertSupabase()
        .from('school_invitation_codes')
        .insert(payload)
        .select('*')
        .single();

      if (!error && data) {
        return data as unknown as SchoolInvitationCode;
      }

      // If duplicate or unique violation, retry; otherwise throw
      const msg = String(error?.message || '').toLowerCase();
      if (!(msg.includes('duplicate') || msg.includes('unique'))) {
        throw error;
      }
    }
    throw new Error('Could not generate a unique invite code. Please try again.');
  }

  static async setActive(inviteId: string, isActive: boolean): Promise<void> {
    const { error } = await assertSupabase()
      .from('school_invitation_codes')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', inviteId);
    if (error) throw error;
  }
}
