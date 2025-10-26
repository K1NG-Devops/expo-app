import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Minimal Deno/Edge handler sketch for RevenueCat webhook. This is a guide, not deployed code.
// - Verify signature per RC docs (HMAC header). Omitted here for brevity.
// - Use service role key to bypass RLS for DB writes.

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  // TODO: Validate RC signature header here

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const payload = await req.json().catch(() => null)
  if (!payload?.event) return new Response('Bad Request', { status: 400 })

  const ev = payload.event
  const eventId = String(ev.id)
  const appUserId = String(ev.app_user_id || '')
  const eventType = String(ev.type)
  const environment = String(ev.environment || 'UNKNOWN')

  // Idempotency: record or no-op
  const { error: insertErr } = await supabase
    .from('revenuecat_webhook_events')
    .insert({ event_id: eventId, app_user_id: appUserId, type: eventType, environment, raw: payload })
  if (insertErr && !String(insertErr.message).includes('duplicate')) {
    return new Response('DB error', { status: 500 })
  }

  const userId = appUserId
  const entitlements = Array.isArray(ev.entitlements) ? ev.entitlements : (ev.entitlements ? [ev.entitlements] : [])
  const platform = String(payload.platform || 'unknown')

  const grantTypes = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'BILLING_ISSUE_RESOLVED', 'PRODUCT_CHANGE'])
  const revokeTypes = new Set(['CANCELLATION', 'EXPIRATION'])

  try {
    if (grantTypes.has(eventType)) {
      for (const ent of entitlements) {
        const name = String(ent.name || ent.identifier || 'premium')
        const productId = String(ent.product_identifier || '')
        const expiresAt = ent.expires_at ? new Date(ent.expires_at).toISOString() : null
        await supabase.rpc('grant_user_entitlement', {
          p_user_id: userId,
          p_entitlement: name,
          p_product_id: productId,
          p_platform: platform,
          p_source: 'revenuecat',
          p_expires_at: expiresAt,
          p_rc_app_user_id: appUserId,
          p_rc_event_id: eventId,
          p_meta: { environment },
        })
      }
    }

    if (revokeTypes.has(eventType)) {
      for (const ent of entitlements) {
        const name = String(ent.name || ent.identifier || 'premium')
        await supabase.rpc('revoke_user_entitlement', {
          p_user_id: userId,
          p_entitlement: name,
          p_reason: eventType,
          p_rc_event_id: eventId,
        })
      }
    }

    await supabase
      .from('revenuecat_webhook_events')
      .update({ processed: true })
      .eq('event_id', eventId)

    return new Response('OK', { status: 200 })
  } catch (_e) {
    return new Response('Processing error', { status: 500 })
  }
}
