import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase Edge Function: revenuecat-webhook
// Purpose: Accept RevenueCat webhook events and sync to user_entitlements
// Security: Deploy with --no-verify-jwt; validate RC signature in production.

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // TODO: Validate RevenueCat signature via shared secret header

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const payload = await req.json().catch(() => null);
    if (!payload?.event) return new Response("Bad Request", { status: 400, headers: corsHeaders });

    const ev = payload.event;
    const eventId = String(ev.id);
    const appUserId = String(ev.app_user_id || "");
    const eventType = String(ev.type);
    const environment = String(ev.environment || "UNKNOWN");
    const platform = String(payload.platform || "unknown");

    // Idempotency: insert the event; if duplicate, return 200
    const { error: insertErr } = await supabase
      .from("revenuecat_webhook_events")
      .insert({ event_id: eventId, app_user_id: appUserId, type: eventType, environment, raw: payload });

    if (insertErr && !String(insertErr.message || "").includes("duplicate")) {
      console.error("rc events insert error", insertErr);
      return new Response("DB error", { status: 500, headers: corsHeaders });
    }

    // Normalize entitlements array
    const entitlements = Array.isArray(ev.entitlements)
      ? ev.entitlements
      : ev.entitlements
      ? [ev.entitlements]
      : [];

    const grantTypes = new Set(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "BILLING_ISSUE_RESOLVED", "PRODUCT_CHANGE"]);
    const revokeTypes = new Set(["CANCELLATION", "EXPIRATION"]);

    if (grantTypes.has(eventType)) {
      for (const ent of entitlements) {
        const name = String(ent.name || ent.identifier || "premium");
        const productId = String(ent.product_identifier || "");
        const expiresAt = ent.expires_at ? new Date(ent.expires_at).toISOString() : null;
        const { error } = await supabase.rpc("grant_user_entitlement", {
          p_user_id: appUserId,
          p_entitlement: name,
          p_product_id: productId,
          p_platform: platform,
          p_source: "revenuecat",
          p_expires_at: expiresAt,
          p_rc_app_user_id: appUserId,
          p_rc_event_id: eventId,
          p_meta: { environment },
        });
        if (error) {
          console.error("grant_user_entitlement error", error);
          return new Response("Grant error", { status: 500, headers: corsHeaders });
        }
      }
    }

    if (revokeTypes.has(eventType)) {
      for (const ent of entitlements) {
        const name = String(ent.name || ent.identifier || "premium");
        const { error } = await supabase.rpc("revoke_user_entitlement", {
          p_user_id: appUserId,
          p_entitlement: name,
          p_reason: eventType,
          p_rc_event_id: eventId,
        });
        if (error) {
          console.error("revoke_user_entitlement error", error);
          return new Response("Revoke error", { status: 500, headers: corsHeaders });
        }
      }
    }

    await supabase
      .from("revenuecat_webhook_events")
      .update({ processed: true })
      .eq("event_id", eventId);

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("revenuecat-webhook handler error", e);
    return new Response("Server error", { status: 500, headers: corsHeaders });
  }
});
