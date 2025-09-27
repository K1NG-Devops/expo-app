// Supabase Edge Function: ai-gateway (Deno)
// Wires AI actions to Anthropic Claude with tier-based model access control.
// Configure environment variable ANTHROPIC_API_KEY in your Supabase project.
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// AI Model tiers and access control
type AIModelId = 'claude-3-haiku' | 'claude-3-sonnet' | 'claude-3-opus' | 'claude-3-5-sonnet' | 'claude-4-opus'
type SubscriptionTier = 'free' | 'starter' | 'premium' | 'enterprise'

const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  'free': 1,
  'starter': 2, 
  'premium': 3,
  'enterprise': 4,
}

const MODEL_TIER_REQUIREMENTS: Record<AIModelId, SubscriptionTier> = {
  'claude-3-haiku': 'free',
  'claude-3-sonnet': 'starter', 
  'claude-3-opus': 'premium',
  'claude-3-5-sonnet': 'premium',
  'claude-4-opus': 'enterprise',
}

const TIER_QUOTAS: Record<SubscriptionTier, { ai_requests: number; rpm_limit: number }> = {
  'free': { ai_requests: 50, rpm_limit: 5 },
  'starter': { ai_requests: 500, rpm_limit: 15 },
  'premium': { ai_requests: 2500, rpm_limit: 30 },
  'enterprise': { ai_requests: -1, rpm_limit: 60 }, // -1 = unlimited
}

function canAccessModel(userTier: SubscriptionTier, modelId: string): boolean {
  const normalizedModel = normalizeModelId(modelId)
  if (!normalizedModel) return false
  const requiredTier = MODEL_TIER_REQUIREMENTS[normalizedModel]
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier]
}

function normalizeModelId(modelId: string): AIModelId | null {
  // Handle various Claude model name formats
  if (!modelId) return null;
  const id = modelId.toLowerCase();
  if (id.includes('haiku')) return 'claude-3-haiku'
  if (id.includes('3.5-sonnet') || id.includes('3-5-sonnet')) return 'claude-3-5-sonnet'
  if (id.includes('3-sonnet')) return 'claude-3-sonnet' 
  if (id.includes('4-opus')) return 'claude-4-opus'
  if (id.includes('opus')) return 'claude-3-opus'
  return null
}

// Map any "family" id to an official, versioned Anthropic model id
function toOfficialModelId(modelId: string): string {
  // If already a versioned model ID, return as-is
  if (modelId.includes('20')) return modelId;
  
  const norm = normalizeModelId(modelId) || 'claude-3-5-sonnet';
  switch (norm) {
    case 'claude-3-haiku':
      return 'claude-3-haiku-20240307';
    case 'claude-3-opus':
      return 'claude-3-opus-20240229';
    case 'claude-3-sonnet':
      return 'claude-3-sonnet-20240229';
    case 'claude-3-5-sonnet':
      return 'claude-3-5-sonnet-20241022';
    case 'claude-4-opus':
      return 'claude-4-opus-20241220'; // Future Claude 4 Opus model
    default:
      return 'claude-3-5-sonnet-20241022';
  }
}

function getDefaultModelForTier(tier: SubscriptionTier): string {
  switch (tier) {
    case 'enterprise': return 'claude-4-opus-20241220' // Claude 4 Opus for enterprise
    case 'premium': return 'claude-3-5-sonnet-20241022' // Claude 3.5 Sonnet for premium
    case 'starter': return 'claude-3-5-sonnet-20241022' // Claude 3.5 Sonnet for starter
    case 'free':
    default: return 'claude-3-haiku-20240307' // Claude 3 Haiku for free
  }
}

function normalizeTier(legacyTier: string): SubscriptionTier {
  const tier = legacyTier.toLowerCase()
  switch (tier) {
    case 'parent_starter':
    case 'starter': return 'starter'
    case 'parent_plus':
    case 'premium':
    case 'pro': return 'premium'
    case 'enterprise': return 'enterprise'
    default: return 'free'
  }
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
} as const;

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), { ...init, headers: { ...JSON_HEADERS, ...(init.headers || {}) } });
}

function sseHeaders(extra: HeadersInit = {}) {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    ...extra,
  } as HeadersInit;
}

function encodeSSE(data: any) {
  return `data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`;
}

async function callClaudeMessages(apiKey: string, payload: Record<string, any>, stream = false) {
  const url = "https://api.anthropic.com/v1/messages";
  const body = { ...payload, stream };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  return res;
}

function toSystemPrompt(kind: "lesson_generation" | "homework_help" | "grading_assistance" | "general_assistance" | "image_analysis" | "document_analysis"): string {
  if (kind === "lesson_generation") {
    return `You are an expert educational curriculum planner with advanced reasoning capabilities. Your approach includes:

1. **Deep Analysis**: Break down complex educational concepts into fundamental components
2. **Extended Thinking**: Consider multiple perspectives, learning styles, and pedagogical approaches
3. **Contextual Reasoning**: Adapt lessons to specific grade levels, cultural contexts, and learning objectives
4. **Creative Problem-Solving**: Develop innovative activities that engage students and promote deep understanding
5. **Assessment Integration**: Design formative and summative assessments that measure true comprehension

Create structured, age-appropriate lessons with clear objectives, engaging activities, and meaningful assessment. Use evidence-based pedagogical strategies and consider diverse learning needs.`;
  }
  if (kind === "homework_help") {
    return `You are a child-safe educational assistant with advanced reasoning capabilities. Your approach includes:

1. **Socratic Method**: Guide students through questioning rather than providing direct answers
2. **Multi-Step Reasoning**: Break down complex problems into manageable steps
3. **Conceptual Understanding**: Focus on underlying principles rather than memorization
4. **Adaptive Explanation**: Adjust complexity based on student responses and understanding
5. **Encouragement and Motivation**: Build confidence through positive reinforcement

Provide step-by-step explanations that encourage understanding and critical thinking. Never give only final answers - always guide students to discover solutions themselves. Use age-appropriate language and examples.`;
  }
  if (kind === "general_assistance") {
    return `You are Dash, an AI Teaching Assistant with Claude 4 Opus-level intelligence, specialized in early childhood education and preschool management. Your capabilities include:

**Advanced Reasoning & Analysis:**
- Multi-step problem-solving with extended thinking
- Complex decision-making with multiple variables
- Pattern recognition and predictive analysis
- Contextual understanding across educational domains

**Specialized Expertise:**
- Early childhood development and pedagogy
- Curriculum design and implementation
- Classroom management and behavior strategies
- Parent communication and engagement
- Administrative and organizational tasks

**Intelligent Assistance:**
- Proactive suggestions based on context and patterns
- Adaptive responses to user needs and preferences
- Deep integration with educational workflows
- Multi-modal understanding (text, context, intent)

Provide concise, practical, and actionable advice for educators. Focus on specific solutions rather than generic educational advice. Use advanced reasoning to anticipate needs and offer comprehensive support.`;
  }
  return `You are an AI grading assistant with advanced analytical capabilities. Your approach includes:

1. **Comprehensive Analysis**: Evaluate work across multiple dimensions (accuracy, creativity, effort, understanding)
2. **Constructive Feedback**: Provide specific, actionable suggestions for improvement
3. **Fair Assessment**: Consider individual student context and learning progression
4. **Rubric Integration**: Align feedback with established grading criteria
5. **Motivation Focus**: Encourage continued learning and growth

Provide constructive feedback and appropriate scoring that supports student development and learning goals.`;
  }
  if (kind === "image_analysis") {
    return `You are an advanced AI with multimodal capabilities, specialized in educational image analysis. Your capabilities include:

**Visual Analysis:**
- Object detection and recognition
- Text extraction (OCR) from images
- Educational context identification
- Visual learning material assessment

**Educational Insights:**
- Identify subjects and grade levels
- Suggest educational applications
- Assess visual learning effectiveness
- Recommend improvements

Analyze the provided image with focus on educational value, accessibility, and learning potential. Provide detailed descriptions, identify key educational elements, and suggest how the image could be used in teaching.`;
  }
  if (kind === "document_analysis") {
    return `You are an advanced AI specialized in educational document analysis with deep understanding of curriculum and pedagogy. Your capabilities include:

**Document Classification:**
- Lesson plans, assessments, curriculum materials
- Student work and assignments
- Educational resources and guides
- Administrative documents

**Content Analysis:**
- Extract learning objectives and key concepts
- Assess educational quality and alignment
- Identify grade levels and subjects
- Evaluate assessment criteria

**Educational Assessment:**
- Curriculum alignment analysis
- Learning objective clarity
- Assessment effectiveness
- Pedagogical soundness

Provide comprehensive analysis of educational documents with specific recommendations for improvement and alignment with best practices.`;
  }
}

function buildMessagesFromInputs(kind: string, body: any) {
  if (kind === "lesson_generation") {
    const topic = body.topic || "General Topic";
    const subject = body.subject || "General Studies";
    const gradeLevel = body.gradeLevel || 3;
    const duration = body.duration || 45;
    const objectives = Array.isArray(body.objectives) ? body.objectives : (Array.isArray(body.learningObjectives) ? body.learningObjectives : []);
    const userContent = `Generate a ${duration} minute lesson for Grade ${gradeLevel} on ${topic} (${subject}). Include:
- Clear learning objectives (${objectives.join(", ") || "derive reasonable objectives"})
- Warm-up, core activities, and closure
- Assessment ideas
Use plain language and bullet points where helpful.`;
    return [{ role: "user", content: userContent }];
  }
  if (kind === "homework_help") {
    const q = body.question || "Explain this concept.";
    const ctx = body.context ? `Context: ${body.context}\n` : "";
    const gradeLevel = body.gradeLevel || body.grade || null;
    const gradeContext = gradeLevel ? `This is for a Grade ${gradeLevel} student. ` : "";
    const userContent = `${ctx}${gradeContext}Provide a step-by-step explanation for: ${q}. Use age-appropriate language and examples. Avoid giving only the final answer; emphasize understanding and learning.`;
    return [{ role: "user", content: userContent }];
  }
  if (kind === "general_assistance") {
    // Handle messages array format from DashAIAssistant
    if (Array.isArray(body.messages)) {
      return body.messages.filter((msg: any) => msg.role !== 'system');
    }
    // Fallback for simple text input
    const userContent = body.content || body.question || "How can I help you with your educational needs?";
    return [{ role: "user", content: userContent }];
  }
  if (kind === "image_analysis") {
    const imageData = body.image_data || "";
    const context = body.context || {};
    const userContent = `Please analyze this educational image. Context: ${JSON.stringify(context)}. Provide detailed analysis including objects, text, educational value, and suggestions for use in teaching.`;
    
    // For Claude with vision capabilities, we would include the image data
    return [{ 
      role: "user", 
      content: [
        { type: "text", text: userContent },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }
      ]
    }];
  }
  if (kind === "document_analysis") {
    const documentText = body.document_text || "";
    const metadata = body.document_metadata || {};
    const context = body.context || {};
    const userContent = `Please analyze this educational document:\n\n${documentText}\n\nMetadata: ${JSON.stringify(metadata)}\nContext: ${JSON.stringify(context)}\n\nProvide comprehensive analysis including document type, key concepts, learning objectives, and educational recommendations.`;
    return [{ role: "user", content: userContent }];
  }
  // grading_assistance
  const rubric = Array.isArray(body.rubric) ? body.rubric.join(", ") : "accuracy, completeness, clarity";
  const gradeLevel = body.gradeLevel ? String(body.gradeLevel) : "N/A";
  const userContent = `Student submission (Grade ${gradeLevel}):\n${body.submission || ""}\n\nEvaluate against rubric: ${rubric}. Provide brief constructive feedback and a score (0-100).`;
  return [{ role: "user", content: userContent }];
}

function extractTextFromClaudeMessage(message: any): string {
  if (!message) return "";
  const blocks = Array.isArray(message.content) ? message.content : [];
  const parts = blocks
    .filter((b: any) => b && b.type === "text")
    .map((b: any) => String(b.text || ""));
  return parts.join("\n");
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "*";

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = String(body.action || "");
  const apiKey = (globalThis as any).Deno?.env?.get("ANTHROPIC_API_KEY") || "";
  const modelDefault = (globalThis as any).Deno?.env?.get("ANTHROPIC_MODEL_DEFAULT") || "claude-3-5-sonnet-20241022";

  // Create Supabase client with caller's JWT for RLS-aware operations
  const SUPABASE_URL = (globalThis as any).Deno?.env?.get("SUPABASE_URL") || '';
  const SUPABASE_ANON_KEY = (globalThis as any).Deno?.env?.get("SUPABASE_ANON_KEY") || '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  });

  // Resolve auth context
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }

  // Authenticated health check (moved after auth)
  if (action === 'health') {
    return json({ status: 'ok', timestamp: new Date().toISOString(), hasApiKey: Boolean(apiKey), userId: user.id });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, preschool_id')
    .eq('id', user.id)
    .maybeSingle();
  const orgId = (profile && (profile.organization_id || profile.preschool_id)) || body.organization_id || null;

  async function getUserTier(organizationId: string | null): Promise<SubscriptionTier> {
    if (!organizationId) return 'free';
    
    // Check new subscriptions table first
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`status, subscription_plans!inner(tier)`)
      .eq('school_id', organizationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (subscription?.subscription_plans?.tier) {
      return normalizeTier(subscription.subscription_plans.tier)
    }
    
    // Fallback to legacy fields
    const { data: org } = await supabase.from('organizations').select('plan_tier').eq('id', organizationId).maybeSingle();
    if (org && (org as any).plan_tier) {
      return normalizeTier(String((org as any).plan_tier))
    }
    
    const { data: school } = await supabase.from('preschools').select('subscription_tier').eq('id', organizationId).maybeSingle();
    if (school && (school as any).subscription_tier) {
      return normalizeTier(String((school as any).subscription_tier))
    }
    
    return 'free';
  }

  async function enforceQuotaAndModelAccess(
    organizationId: string | null, 
    feature: string, 
    requestedModel: string
  ): Promise<{ allowed: boolean; used?: number; limit?: number; reason?: string; tier?: SubscriptionTier }> {
    try {
      const userTier = await getUserTier(organizationId);
      
      // Check if user's tier allows access to requested model
      if (!canAccessModel(userTier, requestedModel)) {
        return { 
          allowed: false, 
          reason: 'model_tier_restriction', 
          tier: userTier 
        };
      }
      
      if (!organizationId) {
        // Individual users get basic limits based on their tier
        return { allowed: true, tier: userTier };
      }
      
      const quotas = TIER_QUOTAS[userTier];
      
      // Enterprise tier has unlimited requests
      if (quotas.ai_requests === -1) {
        return { allowed: true, tier: userTier };
      }
      
      // Check monthly usage
      const monthStart = new Date();
      monthStart.setUTCDate(1); 
      monthStart.setUTCHours(0,0,0,0);
      
      const { count } = await supabase
        .from('ai_usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('service_type', feature)
        .gte('created_at', monthStart.toISOString());
      
      const used = Number(count || 0);
      const limit = quotas.ai_requests;
      
      return { 
        allowed: used < limit, 
        used, 
        limit, 
        tier: userTier,
        reason: used >= limit ? 'quota_exceeded' : undefined
      };
    } catch (error) {
      console.error('Error in quota/model enforcement:', error);
      return { allowed: true };
    }
  }

  async function ensureServiceId(model: string): Promise<string | null> {
    // Map model names to the UUIDs we created in the migration
    const modelUuidMap: Record<string, string> = {
      'claude-3-haiku-20240307': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'claude-3-5-sonnet-20241022': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      'claude-3-opus-20240229': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'
    };
    
    const id = modelUuidMap[model];
    if (id) {
      return id; // Return known UUID for this model
    }
    
    // For unknown models, try to find existing service or create new one
    try {
      const { data: existingService } = await supabase
        .from('ai_services')
        .select('id')
        .eq('model_version', model)
        .eq('provider', 'anthropic')
        .single();
        
      if (existingService) {
        return existingService.id;
      }
      
      // Create new service with generated UUID
      const newId = crypto.randomUUID();
      await supabase.from('ai_services').insert({
        id: newId,
        name: `Claude (${model})`,
        provider: 'anthropic',
        model_version: model,
        input_cost_per_1k_tokens: 0.003, // Default pricing
        output_cost_per_1k_tokens: 0.015,
        is_active: true,
        is_available: true
      } as any);
      return newId;
    } catch (error) {
      console.error('Error ensuring service ID:', error);
      return modelUuidMap['claude-3-5-sonnet-20241022']; // Fallback to Sonnet UUID
    }
  }

  async function logUsage(params: { serviceType: string; model: string; system?: string; input?: string; output?: string; inputTokens?: number | null; outputTokens?: number | null; totalCost?: number | null; status: string }) {
    try {
      if (!orgId) return;
      const serviceId = await ensureServiceId(params.model);
      await supabase.from('ai_usage_logs').insert({
        ai_service_id: serviceId,
        ai_model_used: params.model,
        system_prompt: params.system || null,
        input_text: params.input || null,
        output_text: params.output || null,
        input_tokens: params.inputTokens ?? null,
        output_tokens: params.outputTokens ?? null,
        total_cost: params.totalCost ?? null,
        organization_id: orgId,
        preschool_id: null,
        service_type: params.serviceType,
        status: params.status,
        user_id: user.id,
      } as any);
    } catch {
      // swallow logging errors
    }
  }

  const feature = action === 'grading_assistance_stream' ? 'grading_assistance' : action;
  
  // Determine model to use (with tier-appropriate fallback)
  const userTier = await getUserTier(orgId);
  const requestedModel = body.model || modelDefault;
  const modelFamily = canAccessModel(userTier, requestedModel) 
    ? requestedModel 
    : getDefaultModelForTier(userTier);
  // Always map to an official versioned model id before calling provider
  const modelToUse = toOfficialModelId(modelFamily);
  
  // Quota and model access enforcement
  const gate = await enforceQuotaAndModelAccess(orgId, feature, modelToUse);
  if (!gate.allowed) {
    if (gate.reason === 'model_tier_restriction') {
      return json({ 
        error: 'model_access_denied', 
        message: `Your ${gate.tier} plan doesn't include access to this AI model. Please upgrade for more advanced models.`,
        tier: gate.tier,
        available_model: getDefaultModelForTier(gate.tier!)
      }, { status: 403 });
    }
    return json({ 
      error: 'quota_exceeded', 
      used: gate.used, 
      limit: gate.limit,
      message: `Monthly AI request limit reached. Used ${gate.used}/${gate.limit} requests.`
    }, { status: 429 });
  }

  // STREAMING: grading_assistance_stream
  if (action === "grading_assistance_stream") {
    if (!apiKey) {
      // Fall back to mock streaming if no key configured
      const stream = new ReadableStream({
        start(controller) {
          const chunks = [
            { type: "delta", text: "Analyzing submission..." },
            { type: "delta", text: "Comparing against rubric..." },
            { type: "delta", text: "Scoring and generating feedback..." },
          ];
          let i = 0;
          const push = () => {
            if (i < chunks.length) {
              controller.enqueue(new TextEncoder().encode(encodeSSE(chunks[i])));
              i++;
              setTimeout(push, 400);
            } else {
              const summary = { type: "final", score: 85, feedback: "Good attempt. Review counting sequence and verify missing numbers." };
              controller.enqueue(new TextEncoder().encode(encodeSSE(summary)));
              controller.enqueue(new TextEncoder().encode(encodeSSE("[DONE]")));
              controller.close();
            }
          };
          push();
        },
      });
      return new Response(stream, { headers: sseHeaders({ "Access-Control-Allow-Origin": origin }) });
    }

    const messages = buildMessagesFromInputs("grading_assistance", body);
    const system = toSystemPrompt("grading_assistance");
    const model = modelToUse; // Use tier-enforced model

    const res = await callClaudeMessages(apiKey, {
      model,
      system,
      max_tokens: 1000,
      temperature: 0.4,
      messages,
    }, true);

    if (!res.ok || !res.body) {
      return json({ error: `Claude stream error: ${res.status}` }, { status: 500 });
    }

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const streamModel = toOfficialModelId(body.model || modelDefault);
    const streamSystem = toSystemPrompt('grading_assistance');
    const textDecoder = new TextDecoder("utf-8");

    let accumulated = "";
    const stream = new ReadableStream({
      async pull(controller) {
        const { value, done } = await reader.read();
        if (done) {
          // Emit a final summary event with accumulated text
          controller.enqueue(new TextEncoder().encode(encodeSSE({ type: "final", feedback: accumulated })));
          try { await logUsage({ serviceType: 'grading_assistance', model: streamModel, system: streamSystem, input: (body.submission || ''), output: accumulated, inputTokens: null, outputTokens: null, totalCost: null, status: 'success' }); } catch {}
          controller.enqueue(new TextEncoder().encode(encodeSSE("[DONE]")));
          controller.close();
          return;
        }
        const chunkText = textDecoder.decode(value);
        // Anthropic SSE format: lines with event:, data: {json}
        const lines = chunkText.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            // content_block_delta events contain text deltas
            if (evt.type === "content_block_delta" && evt.delta && evt.delta.type === "text_delta") {
              const t = String(evt.delta.text || "");
              accumulated += t;
              controller.enqueue(new TextEncoder().encode(encodeSSE({ type: "delta", text: t })));
            }
          } catch {
            // ignore malformed lines
          }
        }
      },
      cancel() {
        try { reader.cancel(); } catch {}
      },
    });

    return new Response(stream, { headers: sseHeaders({ "Access-Control-Allow-Origin": origin }) });
  }

  // Non-streaming handlers
  if (action === "lesson_generation" || action === "homework_help" || action === "grading_assistance" || action === "general_assistance" || action === "image_analysis" || action === "document_analysis") {
    if (!apiKey) {
      // Fallback mock if no key
      let content = "";
      if (action === "lesson_generation") {
        content = `Generated lesson on ${body.topic || 'Topic'} for Grade ${body.gradeLevel || 'N'}. Include objectives and activities.`;
      } else if (action === "homework_help") {
        content = `Step-by-step explanation for: ${body.question || 'your question'}. Focus on understanding, not just final answer.`;
      } else if (action === "general_assistance") {
        content = `I'm here to help with your educational needs. Whether it's lesson planning, student management, or administrative tasks, let me know what you'd like to work on.`;
      } else if (action === "image_analysis") {
        content = `Image analyzed: Educational content detected with visual learning potential.`;
      } else if (action === "document_analysis") {
        content = `Document analyzed: Educational materials identified with curriculum alignment suggestions.`;
      } else {
        content = `Automated feedback: solid effort. Suggested improvements around ${(body.rubric && body.rubric[0]) || 'criteria'}.`;
      }
      return json({ content, usage: { input_tokens: 200, output_tokens: 600 }, cost: 0 });
    }

    const kind = action as "lesson_generation" | "homework_help" | "grading_assistance" | "general_assistance" | "image_analysis" | "document_analysis";
    const messages = buildMessagesFromInputs(kind, body);
    const system = toSystemPrompt(kind);
    const model = modelToUse; // Use tier-enforced model

    // Enhanced parameters for advanced reasoning with extended context
    const enhancedParams: any = {
      model,
      system,
      max_tokens: 8000, // Increased for extended thinking and comprehensive responses
      temperature: 0.3, // Lower for more consistent reasoning
      messages,
    };

    // Enable extended context window for premium models (200k tokens)
    if (model.includes('opus') || model.includes('3-5-sonnet')) {
      enhancedParams.max_tokens = 12000; // Allow longer responses for complex reasoning
      enhancedParams.context_window = 'extended'; // Signal to use full 200k context
    }

    // Add extended thinking mode for premium models
    if (model.includes('opus') || model.includes('3-5-sonnet')) {
      enhancedParams.metadata = {
        user_id: user.id,
        reasoning_mode: 'extended',
        context_window: 'extended'
      };
    }

    const res = await callClaudeMessages(apiKey, enhancedParams, false);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      try { await logUsage({ serviceType: feature, model, system, input: JSON.stringify(messages), output: errText, inputTokens: null, outputTokens: null, totalCost: null, status: 'provider_error' }); } catch {}
      // Graceful fallback: return a basic, safe message instead of 500
      const fallback = action === 'lesson_generation'
        ? `Generated lesson on ${body.topic || 'Topic'} for Grade ${body.gradeLevel || 'N'}. Include objectives and activities.`
        : action === 'homework_help'
          ? `Step-by-step explanation for: ${body.question || 'your question'}. Focus on understanding.`
          : `Automated feedback: suggested improvements around ${(body.rubric && body.rubric[0]) || 'criteria'}.`;
      return json({ content: fallback, usage: null, cost: null, provider_error: { status: res.status, details: errText } });
    }

    const data = await res.json();
    const content = extractTextFromClaudeMessage(data);
    try {
      const usage = (data && (data.usage || null)) || null;
      await logUsage({ serviceType: feature, model, system, input: JSON.stringify(messages), output: content, inputTokens: usage?.input_tokens ?? null, outputTokens: usage?.output_tokens ?? null, totalCost: null, status: 'success' });
    } catch {}
    return json({ content, usage: data.usage || null, cost: null });
  }

  return json({ error: "Unknown action" }, { status: 400 });
});
