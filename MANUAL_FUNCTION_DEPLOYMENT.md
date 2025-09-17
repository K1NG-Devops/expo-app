# Manual Deployment: ai-proxy Function

Since the Supabase CLI authentication is failing, here's how to deploy the `ai-proxy` function manually:

## Method 1: Create Function via Supabase Dashboard

### Step 1: Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project (`lvvvjywrmpcqrpvuptdi`)
3. Go to **Edge Functions** in the left sidebar
4. Click **"Create a new function"**

### Step 2: Create the Function
1. **Function Name**: `ai-proxy`
2. **Copy and paste this code**:

```typescript
// Supabase Edge Function: ai-proxy
// Simple proxy that forwards requests to ai-gateway with proper parameter mapping
// This maintains backward compatibility for code expecting 'ai-proxy' function

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
} as const;

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), { ...init, headers: { ...JSON_HEADERS, ...(init.headers || {}) } });
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

  // Create Supabase client to forward to ai-gateway
  const SUPABASE_URL = (globalThis as any).Deno?.env?.get("SUPABASE_URL") || '';
  const SUPABASE_ANON_KEY = (globalThis as any).Deno?.env?.get("SUPABASE_ANON_KEY") || '';
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  });

  try {
    // Map ai-proxy request format to ai-gateway format
    const feature = body.feature || 'grading_assistance';
    let action = feature;
    
    // Map feature names to action names expected by ai-gateway
    const featureActionMap: Record<string, string> = {
      'grading_assistance': 'grading_assistance',
      'lesson_generation': 'lesson_generation', 
      'homework_help': 'homework_help',
    };
    
    action = featureActionMap[feature] || feature;
    
    // Build the request body for ai-gateway
    const gatewayBody = {
      action,
      model: body.model,
      ...body // Include all original parameters
    };
    
    // If it's a homework grading request, map the parameters correctly
    if (feature === 'grading_assistance') {
      gatewayBody.submission = body.submission;
      gatewayBody.assignment_title = body.assignment_title;
      gatewayBody.gradeLevel = body.grade_level;
      gatewayBody.rubric = ['accuracy', 'completeness', 'effort'];
    }
    
    // Forward the request to ai-gateway
    const { data, error } = await supabase.functions.invoke('ai-gateway', {
      body: gatewayBody
    });
    
    if (error) {
      console.error('Error calling ai-gateway:', error);
      return json({ error: error.message || 'Gateway error' }, { status: 500 });
    }
    
    // Return the result in the expected format
    return json({ 
      result: data,
      success: true
    });
    
  } catch (error: any) {
    console.error('ai-proxy error:', error);
    return json({ 
      error: error.message || 'Internal server error',
      success: false
    }, { status: 500 });
  }
});
```

3. Click **"Deploy function"**

### Step 3: Verify Deployment
1. Go to **Edge Functions** list
2. You should see `ai-proxy` in the list
3. You can test it by clicking on the function name

## Method 2: Fix CLI Authentication (Alternative)

If you want to try fixing the CLI authentication:

### Update CLI to Latest Version
```bash
npm install -g @supabase/cli@latest
```

### Check Account Access
- Make sure you're logged into the Supabase account that owns project `lvvvjywrmpcqrpvuptdi`
- The account might be different from the one you're currently using
- Check in Supabase Dashboard > Settings > General to see the project owner

### Alternative Authentication
```bash
# Try with explicit token (if you have one)
SUPABASE_ACCESS_TOKEN="your_token_here" npx supabase functions deploy ai-proxy --project-ref lvvvjywrmpcqrpvuptdi
```

## Method 3: Use Different Project Reference

If you have access to a different Supabase project, you can:
1. Create a new project for testing
2. Use that project's reference ID
3. Deploy to that project instead

## Verification

After deploying via any method, verify it works by:

1. **Test Function Directly**:
   ```bash
   curl -X POST 'https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/ai-proxy' \
   -H 'Authorization: Bearer YOUR_ANON_KEY' \
   -H 'Content-Type: application/json' \
   -d '{
     "feature": "grading_assistance",
     "submission": "2+2=4",
     "assignment_title": "Math Test"
   }'
   ```

2. **Test from Mobile App**:
   - Launch your app
   - Try any AI-related feature (homework grading, etc.)
   - Check logs for successful AI proxy calls

## Next Steps

Once the function is deployed:
1. ✅ Apply the database migration (`FIX_AUTHENTICATION_ISSUES_COMPLETE.sql`)
2. ✅ Test mobile app authentication
3. ✅ Verify push notifications work
4. ✅ Check that all errors are resolved

The manual deployment method (Method 1) is the most reliable if CLI authentication continues to fail.