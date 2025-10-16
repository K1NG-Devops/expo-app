/**
 * AI Proxy Edge Function
 * 
 * Secure proxy for AI requests with:
 * - Quota enforcement BEFORE calling AI
 * - PII redaction per WARP.md
 * - Usage logging and cost tracking
 * - Server-side only (no client AI keys)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AIProxyRequest {
  scope: 'teacher' | 'principal' | 'parent'
  service_type: 'lesson_generation' | 'grading_assistance' | 'homework_help' | 'progress_analysis' | 'insights' | 'transcription'
  payload: {
    prompt?: string
    context?: string
    audio_url?: string  // For transcription requests
    images?: Array<{
      data: string  // base64-encoded image
      media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    }>
    metadata?: Record<string, any>
  }
  metadata?: {
    student_id?: string
    class_id?: string
    subject?: string
    [key: string]: any
  }
}

// PII redaction patterns per WARP.md
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
  /\b(?:\+27|0)[6-9][0-9]{8}\b/g, // SA phone numbers
  /\b\d{13}\b/g, // SA ID numbers
]

function redactPII(text: string): { redactedText: string; redactionCount: number } {
  let redactedText = text
  let redactionCount = 0
  
  PII_PATTERNS.forEach(pattern => {
    const matches = redactedText.match(pattern)
    if (matches) {
      redactionCount += matches.length
      redactedText = redactedText.replace(pattern, '[REDACTED]')
    }
  })
  
  return { redactedText, redactionCount }
}

async function checkQuota(
  supabaseAdmin: any,
  userId: string,
  preschoolId: string | null,
  serviceType: string
): Promise<{ allowed: boolean; quotaInfo?: any; error?: string }> {
  try {
    // Get user's current usage for this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: usageData, error: usageError } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('service_type', serviceType)
      .gte('created_at', startOfMonth.toISOString())
      .eq('status', 'success')

    if (usageError) {
      return { allowed: false, error: usageError.message }
    }

    const used = usageData?.length || 0
    
    // Default quotas by tier (from limits.ts)
    const defaultQuotas = {
      lesson_generation: 5,
      grading_assistance: 5,
      homework_help: 15
    }

    const limit = defaultQuotas[serviceType as keyof typeof defaultQuotas] || 5
    const remaining = Math.max(0, limit - used)

    if (remaining <= 0) {
      return {
        allowed: false,
        quotaInfo: {
          used,
          limit,
          remaining: 0,
          reset_at: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).toISOString()
        }
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Quota check failed:', error)
    return { allowed: false, error: 'Quota service unavailable' }
  }
}

type ClaudeModel = 'claude-3-haiku-20240307' | 'claude-3-5-sonnet-20241022'
type SubscriptionTier = 'free' | 'starter' | 'basic' | 'premium' | 'pro' | 'enterprise'

// Model pricing per million tokens
const MODEL_PRICING = {
  'claude-3-haiku-20240307': {
    input: 0.00000025,   // $0.25/1M
    output: 0.00000125,  // $1.25/1M
  },
  'claude-3-5-sonnet-20241022': {
    input: 0.000003,     // $3.00/1M
    output: 0.000015,    // $15.00/1M
  }
}

// Tier-based model selection
function selectModelForTier(tier: SubscriptionTier, hasImages: boolean): ClaudeModel {
  // Vision requires Sonnet 3.5
  if (hasImages) {
    // Only Basic tier (R299) and above get vision
    if (['basic', 'premium', 'pro', 'enterprise'].includes(tier)) {
      return 'claude-3-5-sonnet-20241022'
    }
    throw new Error('Vision features require Basic subscription (R299) or higher')
  }
  
  // For text-only, use Haiku for lower tiers, Sonnet for premium
  if (['pro', 'enterprise'].includes(tier)) {
    return 'claude-3-5-sonnet-20241022'
  }
  
  return 'claude-3-haiku-20240307'
}

async function callClaude(
  prompt: string,
  tier: SubscriptionTier,
  images?: Array<{ data: string; media_type: string }>
): Promise<{
  content: string
  tokensIn: number
  tokensOut: number
  cost: number
  model: string
}> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured')
  }

  const hasImages = images && images.length > 0
  const model = selectModelForTier(tier, hasImages)
  
  // Build message content
  let messageContent: any
  if (hasImages) {
    // Multi-modal message with images
    messageContent = [
      ...images.map(img => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.media_type,
          data: img.data,
        }
      })),
      {
        type: 'text',
        text: prompt
      }
    ]
  } else {
    // Text-only message
    messageContent = prompt
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ],
      system: `You are Dash, a smart colleague helping with EduDash Pro.

🌍 MULTILINGUAL CONVERSATION RULES:
- If user speaks Zulu → respond naturally in Zulu
- If user speaks Afrikaans → respond naturally in Afrikaans  
- If user speaks English → respond naturally in English
- DO NOT explain what the user said or translate
- DO NOT teach language unless explicitly asked
- Just have a normal conversation in their language

EXAMPLES:
❌ BAD: "'Unjani' means 'How are you' in Zulu. It's a common greeting..."
✅ GOOD: "Ngiyaphila, ngiyabonga! Wena unjani?" (if they spoke Zulu)

❌ BAD: "You asked 'How are you' in Zulu. Let me explain the counting song 'Onjani desh'..."
✅ GOOD: "Ngiyaphila kahle, ngiyabonga ukubuza. Ungisiza kanjani namuhla?"

RESPONSE STYLE:
- Natural, conversational (like a smart colleague)
- Answer in 1-3 sentences for greetings
- Match the user's language WITHOUT commenting on it
- State facts only - if you don't know, say "I don't have that information"
- NO educational lectures unless teaching is requested

CRITICAL:
- NEVER make up data (student counts, assignments, etc)
- If you don't have specific data, say "I need to check the database"
- NO theatrical narration (*clears throat*, *smiles*, etc.)
- Focus on being helpful, not educational by default`
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} ${error}`)
  }

  const result = await response.json()
  
  const tokensIn = result.usage?.input_tokens || 0
  const tokensOut = result.usage?.output_tokens || 0
  
  // Calculate cost based on model
  const pricing = MODEL_PRICING[model]
  const cost = (tokensIn * pricing.input) + (tokensOut * pricing.output)

  return {
    content: result.content[0]?.text || '',
    tokensIn,
    tokensOut,
    cost,
    model
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'method_not_allowed', message: 'Only POST requests allowed' } }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Parse request
    const requestBody: AIProxyRequest = await req.json()
    const { scope, service_type, payload, metadata = {} } = requestBody

    // Validate request
    if (!scope || !service_type || !payload?.prompt) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'invalid_request',
            message: 'Missing required fields: scope, service_type, or payload.prompt'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'unauthorized', message: 'Missing authorization header' }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'unauthorized', message: 'Invalid token' }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile for preschool_id and subscription tier
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('preschool_id, subscription_tier')
      .eq('auth_user_id', user.id)
      .single()

    const preschoolId = profile?.preschool_id || null
    const tier: SubscriptionTier = (profile?.subscription_tier?.toLowerCase() || 'free') as SubscriptionTier
    const startTime = Date.now()

    // Check quota before proceeding
    const quotaCheck = await checkQuota(supabaseAdmin, user.id, preschoolId, service_type)

    if (!quotaCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'quota_exceeded',
            message: 'AI quota exceeded for this service',
            quota_info: quotaCheck.quotaInfo
          }
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '3600' // Try again in 1 hour
          } 
        }
      )
    }

    // Redact PII from prompt per WARP.md
    const { redactedText, redactionCount } = redactPII(payload.prompt)
    
    // Extract images if present
    const images = payload.images
    
    // Call Claude API
    try {
      const aiResult = await callClaude(redactedText, tier, images)
      
      // Log successful usage
      const { data: logData, error: logError } = await supabaseAdmin
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          preschool_id: preschoolId,
          organization_id: preschoolId,
          service_type: service_type,
          ai_model_used: aiResult.model,
          status: 'success',
          input_tokens: aiResult.tokensIn,
          output_tokens: aiResult.tokensOut,
          total_cost: aiResult.cost,
          processing_time_ms: Date.now() - startTime,
          input_text: redactedText,
          output_text: aiResult.content,
          metadata: {
            ...metadata,
            scope,
            tier,
            has_images: images && images.length > 0,
            image_count: images?.length || 0,
            redaction_count: redactionCount,
            input_cost: aiResult.cost - (aiResult.tokensOut * MODEL_PRICING[aiResult.model as ClaudeModel].output),
            output_cost: aiResult.tokensOut * MODEL_PRICING[aiResult.model as ClaudeModel].output
          }
        })
        .select('id')
        .single()

      const usageId = logData?.id || 'unknown'

      return new Response(
        JSON.stringify({
          success: true,
          content: aiResult.content,
          usage: {
            tokens_in: aiResult.tokensIn,
            tokens_out: aiResult.tokensOut,
            cost: aiResult.cost,
            usage_id: usageId
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (aiError) {
      // Log failed usage
      await supabaseAdmin
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          preschool_id: preschoolId,
          organization_id: preschoolId,
          service_type: service_type,
          ai_model_used: tier === 'free' || tier === 'starter' ? 'claude-3-haiku-20240307' : 'claude-3-5-sonnet-20241022',
          status: 'error',
          input_tokens: 0,
          output_tokens: 0,
          total_cost: 0,
          processing_time_ms: Date.now() - startTime,
          error_message: (aiError as Error).message,
          input_text: redactedText,
          metadata: {
            ...metadata,
            scope,
            error: (aiError as Error).message,
            redaction_count: redactionCount
          }
        })

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'ai_service_error',
            message: 'AI service temporarily unavailable'
          }
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('AI Proxy Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'internal_error',
          message: 'Internal server error'
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
