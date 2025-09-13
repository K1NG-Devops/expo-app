import { assertSupabase } from '@/lib/supabase'
import { getCombinedUsage, type AIUsageRecord } from '@/lib/ai/usage'
import { getOrgType, canUseAllocation, type OrgType } from '@/lib/subscriptionRules'
import { getDefaultModels } from '@/lib/ai/models'

export type AIQuotaFeature = 'lesson_generation' | 'grading_assistance' | 'homework_help'
export type Tier = 'free' | 'parent_starter' | 'parent_plus' | 'private_teacher' | 'pro' | 'enterprise'

export type QuotaMap = Record<AIQuotaFeature, number>

const DEFAULT_MONTHLY_QUOTAS: Record<Tier, QuotaMap> = {
  free: { lesson_generation: 5, grading_assistance: 5, homework_help: 15 },
  parent_starter: { lesson_generation: 0, grading_assistance: 0, homework_help: 30 },
  parent_plus: { lesson_generation: 0, grading_assistance: 0, homework_help: 100 },
  private_teacher: { lesson_generation: 20, grading_assistance: 20, homework_help: 100 },
  pro: { lesson_generation: 50, grading_assistance: 100, homework_help: 300 },
  enterprise: { lesson_generation: 5000, grading_assistance: 10000, homework_help: 30000 },
}

export type EffectiveLimits = {
  tier: Tier
  quotas: QuotaMap
  source: 'default' | 'server' | 'org_allocation'
  overageRequiresPrepay: boolean
  modelOptions?: Array<{ id: string; name: string; provider: 'claude' | 'openai' | 'custom'; relativeCost: number }>
  orgType?: OrgType
  canOrgAllocate: boolean
}

async function getUserTier(): Promise<Tier> {
  try {
    const { data } = await assertSupabase().auth.getUser()
    const metaTier = String((data?.user?.user_metadata as any)?.subscription_tier || '').toLowerCase()
    switch (metaTier) {
      case 'pro':
      case 'enterprise':
      case 'parent_starter':
      case 'parent-plus':
      case 'parent_plus':
      case 'private-teacher':
      case 'private_teacher':
        return (metaTier.replace('-', '_') as Tier)
      default:
        return 'free'
    }
  } catch {
    return 'free'
  }
}

async function getServerLimits(): Promise<Partial<EffectiveLimits> | null> {
  try {
    // Attempt to fetch server-defined limits and any org allocation
    const { data, error } = await assertSupabase().functions.invoke('ai-usage', { body: { action: 'limits' } as any })
    if (error) return null
    if (!data) return null

    const payload: any = data
    const quotas: QuotaMap | undefined = payload.quotas
    const overageRequiresPrepay: boolean = payload.overageRequiresPrepay !== false // default true
    const modelOptions = Array.isArray(payload.models)
      ? payload.models
      : getDefaultModels()

    const source: EffectiveLimits['source'] = payload.source === 'org_allocation' ? 'org_allocation' : 'server'

    return { quotas, overageRequiresPrepay, modelOptions, source }
  } catch {
    return null
  }
}

export async function getEffectiveLimits(): Promise<EffectiveLimits> {
  const tier = await getUserTier()
  const server = await getServerLimits()
  const orgType = await getOrgType()

  const quotas = server?.quotas || DEFAULT_MONTHLY_QUOTAS[tier]
  const overageRequiresPrepay = server?.overageRequiresPrepay !== false
  const modelOptions = server?.modelOptions || getDefaultModels()
  const source: EffectiveLimits['source'] = server?.source || 'default'
  const canOrgAllocate = canUseAllocation(tier, orgType)

  return { tier, quotas, overageRequiresPrepay, modelOptions, source, orgType, canOrgAllocate }
}

export type QuotaStatus = {
  used: number
  limit: number
  remaining: number
}

export async function getQuotaStatus(feature: AIQuotaFeature): Promise<QuotaStatus> {
  const limits = await getEffectiveLimits()
  const usage: AIUsageRecord = await getCombinedUsage()
  const used = usage[feature] || 0
  const limit = Math.max(0, limits.quotas[feature] || 0)
  const remaining = Math.max(0, limit - used)
  return { used, limit, remaining }
}

export type CanUseResult = {
  allowed: boolean
  reason?: 'over_quota' | 'suspended' | 'not_enabled'
  requiresPrepay?: boolean
  status: QuotaStatus
  limits: EffectiveLimits
}

export async function canUseFeature(feature: AIQuotaFeature, count = 1): Promise<CanUseResult> {
  const limits = await getEffectiveLimits()
  const status = await getQuotaStatus(feature)
  const remainingAfter = status.remaining - count

  if (remainingAfter < 0) {
    return { allowed: false, reason: 'over_quota', requiresPrepay: limits.overageRequiresPrepay, status, limits }
  }

  return { allowed: true, status, limits }
}

