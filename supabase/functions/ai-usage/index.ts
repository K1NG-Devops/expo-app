// Minimal ai-usage edge function to satisfy CORS and basic actions
// Deno Deploy style function using Supabase Edge Functions runtime

// deno-lint-ignore no-explicit-any
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function ok(data: any = {}): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function bad(msg: string, code = 400): Response {
  return new Response(JSON.stringify({ error: msg }), { status: code, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') return ok({ status: 'ai-usage function online' });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').toLowerCase();

    // No-op logger
    if (action === 'log') {
      // Accept and return success; optionally store in future
      return ok({ success: true });
    }

    if (action === 'org_limits') {
      // Return placeholder limits so UI can render
      return ok({ quotas: { lesson_generation: 1000, grading_assistance: 1000, homework_help: 1000 }, used: { lesson_generation: 0, grading_assistance: 0, homework_help: 0 } });
    }

    if (action === 'set_allocation') {
      // Accept and acknowledge allocations
      return ok({ success: true });
    }

    if (action === 'school_subscription_details') {
      const preschoolId = body.preschool_id;
      if (!preschoolId) return bad('preschool_id required', 400);
      
      // Return mock subscription details for now
      return ok({
        preschool_id: preschoolId,
        subscription_tier: 'enterprise',
        org_type: 'preschool',
        total_quotas: {
          lesson_generation: 1000,
          grading_assistance: 800,
          homework_help: 500
        },
        allocated_quotas: {
          lesson_generation: 300,
          grading_assistance: 200,
          homework_help: 150
        },
        available_quotas: {
          lesson_generation: 700,
          grading_assistance: 600,
          homework_help: 350
        },
        total_usage: {
          lesson_generation: 50,
          grading_assistance: 30,
          homework_help: 25
        },
        allow_teacher_self_allocation: false,
        default_teacher_quotas: {
          lesson_generation: 50,
          grading_assistance: 30,
          homework_help: 20
        },
        max_individual_quota: {
          lesson_generation: 200,
          grading_assistance: 150,
          homework_help: 100
        },
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system'
      });
    }

    if (action === 'teacher_allocations') {
      const preschoolId = body.preschool_id;
      if (!preschoolId) return bad('preschool_id required', 400);
      
      // For now, we'll need to fetch real teachers from the database
      // This is a temporary implementation until full AI system is ready
      const allocations = [];
      
      try {
        // Import Supabase client in the function
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Fetch teachers from the users table
        const { data: teachers, error } = await supabase
          .from('users')
          .select('id, auth_user_id, email, role, first_name, last_name')
          .eq('preschool_id', preschoolId)
          .eq('role', 'teacher');
        
        if (error) {
          console.error('Error fetching teachers:', error);
          return ok({ allocations: [] });
        }
        
        // Convert teachers to allocation format
        const teacherAllocations = (teachers || []).map((teacher, index) => ({
          id: `alloc-${teacher.id}`,
          preschool_id: preschoolId,
          user_id: teacher.auth_user_id || teacher.id,
          teacher_id: teacher.id,
          teacher_name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || teacher.email?.split('@')[0] || 'Unknown Teacher',
          teacher_email: teacher.email,
          role: teacher.role,
          allocated_quotas: {
            lesson_generation: 50 + (index * 10),
            grading_assistance: 30 + (index * 5),
            homework_help: 20 + (index * 3)
          },
          used_quotas: {
            lesson_generation: Math.floor(Math.random() * 25),
            grading_assistance: Math.floor(Math.random() * 15),
            homework_help: Math.floor(Math.random() * 10)
          },
          remaining_quotas: {
            lesson_generation: 40 - Math.floor(Math.random() * 15),
            grading_assistance: 25 - Math.floor(Math.random() * 10),
            homework_help: 15 - Math.floor(Math.random() * 5)
          },
          allocated_by: 'principal',
          allocated_at: new Date().toISOString(),
          allocation_reason: 'Initial allocation',
          is_active: true,
          is_suspended: false,
          auto_renew: true,
          priority_level: 'normal' as const,
          updated_at: new Date().toISOString()
        }));
        
        return ok({ allocations: teacherAllocations });
        
      } catch (dbError) {
        console.error('Database error:', dbError);
        return ok({ allocations: [] });
      }
    }

    // Default response
    return ok({ ok: true });
  } catch (e) {
    return bad((e as Error)?.message || 'Unexpected error', 500);
  }
});
