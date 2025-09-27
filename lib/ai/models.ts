export type AIModelId = 'claude-3-haiku' | 'claude-3-sonnet' | 'claude-3-opus' | 'claude-4-opus' | 'claude-4-opus-turbo'
export type SubscriptionTier = 'free' | 'starter' | 'premium' | 'enterprise'

export type AIModelInfo = {
  id: AIModelId
  name: string
  provider: 'claude' | 'openai' | 'custom'
  relativeCost: number // configurable weight for pricing/cost hints (1x, 5x, 20x)
  notes?: string
  minTier: SubscriptionTier // Minimum subscription tier required
  displayName: string // User-friendly display name
  description: string // Detailed description for UI
}

// Central place to tune model weights for UI hints and rough cost estimates
export const MODEL_WEIGHTS: Record<AIModelId, number> = {
  'claude-3-haiku': 1,
  'claude-3-sonnet': 5, // ~5x haiku
  'claude-3-opus': 20,  // ~20x haiku
  'claude-4-opus': 50,  // ~50x haiku - Maximum intelligence
  'claude-4-opus-turbo': 35, // ~35x haiku - Fast maximum intelligence
}

// Tier hierarchy for access checks
export const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  'free': 1,
  'starter': 2,
  'premium': 3,
  'enterprise': 4,
}

// Monthly quota limits by tier (number of AI requests)
export const TIER_QUOTAS: Record<SubscriptionTier, { ai_requests: number; priority_support: boolean; rpm_limit: number; max_model_access: AIModelId }> = {
  'free': { ai_requests: 50, priority_support: false, rpm_limit: 5, max_model_access: 'claude-3-haiku' },
  'starter': { ai_requests: 500, priority_support: false, rpm_limit: 15, max_model_access: 'claude-3-sonnet' },
  'premium': { ai_requests: 2500, priority_support: true, rpm_limit: 30, max_model_access: 'claude-4-opus-turbo' },
  'enterprise': { ai_requests: -1, priority_support: true, rpm_limit: 60, max_model_access: 'claude-4-opus' }, // -1 = unlimited
}

export function getDefaultModels(): AIModelInfo[] {
  return [
    {
      id: 'claude-3-haiku',
      name: 'Claude 3 Haiku',
      displayName: 'Dash Fast',
      provider: 'claude',
      relativeCost: MODEL_WEIGHTS['claude-3-haiku'],
      minTier: 'free',
      description: 'Lightning-fast responses for quick questions and basic lesson planning',
      notes: 'Available on all plans'
    },
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      displayName: 'Dash Smart',
      provider: 'claude',
      relativeCost: MODEL_WEIGHTS['claude-3-sonnet'],
      minTier: 'starter',
      description: 'Balanced intelligence for comprehensive lesson generation and detailed feedback',
      notes: 'Starter plan and above'
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      displayName: 'Dash Expert',
      provider: 'claude',
      relativeCost: MODEL_WEIGHTS['claude-3-opus'],
      minTier: 'premium',
      description: 'Maximum intelligence for complex educational content and advanced grading',
      notes: 'Premium and Enterprise only'
    },
    {
      id: 'claude-4-opus-turbo',
      name: 'Claude 4 Opus Turbo',
      displayName: 'Dash Genius',
      provider: 'claude',
      relativeCost: MODEL_WEIGHTS['claude-4-opus-turbo'],
      minTier: 'premium',
      description: 'Ultra-fast maximum intelligence with advanced reasoning, creative problem-solving, and comprehensive educational expertise',
      notes: 'Premium plan and above - Claude 4 Opus level intelligence with speed optimization'
    },
    {
      id: 'claude-4-opus',
      name: 'Claude 4 Opus',
      displayName: 'Dash Mastermind',
      provider: 'claude',
      relativeCost: MODEL_WEIGHTS['claude-4-opus'],
      minTier: 'enterprise',
      description: 'Peak AI intelligence with deep reasoning, creative insights, advanced educational analysis, and comprehensive problem-solving capabilities',
      notes: 'Enterprise only - Full Claude 4 Opus capabilities with maximum intelligence'
    },
  ]
}

/**
 * Check if a user's tier allows access to a specific model
 */
export function canAccessModel(userTier: SubscriptionTier, modelId: AIModelId): boolean {
  const model = getDefaultModels().find(m => m.id === modelId)
  if (!model) return false
  
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[model.minTier]
}

/**
 * Get all models available to a specific tier
 */
export function getModelsForTier(tier: SubscriptionTier): AIModelInfo[] {
  return getDefaultModels().filter(model => canAccessModel(tier, model.id))
}

/**
 * Get the default/recommended model for a tier
 */
export function getDefaultModelForTier(tier: SubscriptionTier): AIModelId {
  const availableModels = getModelsForTier(tier)
  if (availableModels.length === 0) return 'claude-3-haiku' // fallback
  
  // Return the highest tier model available (last in filtered array)
  return availableModels[availableModels.length - 1].id
}

/**
 * Check quota limits for a tier
 */
export function getTierQuotas(tier: SubscriptionTier) {
  return TIER_QUOTAS[tier]
}

