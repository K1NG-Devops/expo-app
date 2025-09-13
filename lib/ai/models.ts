export type AIModelId = 'claude-3-haiku' | 'claude-3-sonnet' | 'claude-3-opus'

export type AIModelInfo = {
  id: AIModelId
  name: string
  provider: 'claude' | 'openai' | 'custom'
  relativeCost: number // configurable weight for pricing/cost hints (1x, 5x, 20x)
  notes?: string
}

// Central place to tune model weights for UI hints and rough cost estimates
export const MODEL_WEIGHTS: Record<AIModelId, number> = {
  'claude-3-haiku': 1,
  'claude-3-sonnet': 5, // ~5x haiku
  'claude-3-opus': 20,  // ~20x haiku
}

export function getDefaultModels(): AIModelInfo[] {
  return [
    { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'claude', relativeCost: MODEL_WEIGHTS['claude-3-haiku'], notes: 'Fastest, lowest cost' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'claude', relativeCost: MODEL_WEIGHTS['claude-3-sonnet'], notes: 'Balanced quality/cost' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'claude', relativeCost: MODEL_WEIGHTS['claude-3-opus'], notes: 'Highest quality, slowest' },
  ]
}

