import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.224.0/hash/mod.ts";

// Supabase Edge Function: webhooks-payfast
// Purpose: Accept PayFast ITN (server-to-server) callbacks, verify signature,
// store raw payload in payfast_itn_logs for auditing, and return 200 quickly.
// Security: Deployed with --no-verify-jwt so PayFast can post without auth.
// Signature: Validated using MD5 of sorted params + passphrase (if provided).

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // PayFast sends application/x-www-form-urlencoded
    const text = await req.text();
    const params = new URLSearchParams(text);

    const payload: Record<string, string> = {};
    for (const [k, v] of params.entries()) payload[k] = v;

    const payment_status = payload["payment_status"] || null;
    const amount_gross = payload["amount_gross"] || null;

    // Verify PayFast signature if passphrase configured
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    const provided = String(payload["signature"] || "").toLowerCase();

    // Build param string: sorted, excluding signature, URL-encoded
    const keys = Object.keys(payload).filter((k) => k !== "signature").sort();
    const qp = new URLSearchParams();
    for (const k of keys) qp.append(k, payload[k] ?? "");
    let paramStr = qp.toString();
    if (passphrase) paramStr += `&passphrase=${encodeURIComponent(passphrase)}`;

    // MD5 hash
    const md5 = createHash("md5").update(paramStr).toString();
    const signature_valid = provided ? md5 === provided : false;

    const { error } = await supabase.from("payfast_itn_logs").insert({
      raw_data: payload,
      payment_status,
      amount_gross,
      signature_valid,
      processed: false,
    });

    if (error) {
      console.error("payfast_itn_logs insert error", error);
      return new Response("DB error", { status: 500, headers: corsHeaders });
    }

    // Return 200 quickly so PayFast stops retrying.
    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("webhooks-payfast handler error", e);
    return new Response("Server error", { status: 500, headers: corsHeaders });
  }
});
