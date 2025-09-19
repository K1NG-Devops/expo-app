import { assertSupabase } from '@/lib/supabase'

export type OrgType = 'preschool' | 'k12' | 'individual'
export type Tier = 'free' | 'parent_starter' | 'parent_plus' | 'private_teacher' | 'pro' | 'enterprise'

/**
 * Determine organization type for the current user.
 * Priority:
 * - user_metadata.org_type if present ('preschool' | 'k12')
 * - If profile.preschool_id exists -> 'preschool'
 * - Else 'individual'
 */
export async function getOrgType(): Promise<OrgType> {
  try {
    const { data: userRes } = await assertSupabase().auth.getUser()
    const orgTypeMeta = ((userRes?.user?.user_metadata as any)?.org_type || '').toLowerCase()
    if (orgTypeMeta === 'k12' || orgTypeMeta === 'school') return 'k12'
    if (orgTypeMeta === 'preschool' || orgTypeMeta === 'pre_school') return 'preschool'

    // Fallback: infer from profile record
    if (userRes?.user?.id) {
      const { data: prof } = await assertSupabase()
        .from('profiles')
        .select('id, preschool_id')
        .eq('id', userRes.user.id)
        .maybeSingle()
      if (prof && (prof as any).preschool_id) return 'preschool'
    }
    return 'individual'
  } catch {
    return 'individual'
  }
}

/**
 * Plan gating for organization-managed AI allocations.
 * - Preschools: available starting from Pro (R599 package and up)
 * - K-12 Schools: Enterprise only (special pricing)
 * - Individuals: not applicable
 * - Principals: always allowed regardless of tier (core management capability)
 */
export async function canUseAllocation(tier: Tier, orgType: OrgType): Promise<boolean> {
  // Check if user is a principal or principal_admin - they should always have access
  try {
    const { data } = await assertSupabase().auth.getUser()
    const userRole = (data?.user?.user_metadata as any)?.role
    if (userRole === 'principal' || userRole === 'principal_admin') {
      return true
    }
  } catch {
    // Continue with tier-based checks if role check fails
  }

  if (orgType === 'preschool') {
    return tier === 'pro' || tier === 'enterprise'
  }
  if (orgType === 'k12') {
    return tier === 'enterprise'
  }
  return false
}

/**
 * Optional: model selection UI available from Pro and Enterprise.
 */
export function canSelectModels(tier: Tier): boolean {
  return tier === 'pro' || tier === 'enterprise'
}

