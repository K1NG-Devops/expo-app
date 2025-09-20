# RevenueCat → Supabase webhook contract (draft)

This document describes the minimal contract for syncing user-level in‑app entitlements from RevenueCat into Supabase.

## 1) Mapping
- We set RevenueCat `app_user_id` to the Supabase Auth user id (UUID).
  - In client code: `Purchases.logIn(<supabase_user_id>)` (or identify). Keep it stable across reinstalls.
- Entitlement names in RevenueCat (e.g., `premium`, `ad_free`, `ai_pro`) map 1:1 to `user_entitlements.entitlement`.

## 2) Tables (created in migration 20250920_user_entitlements_schema.sql)
- `user_entitlements` — canonical user-level perks.
  - One active row per (user_id, entitlement) enforced with a partial unique index.
- `revenuecat_webhook_events` — raw, idempotent copy of webhook events.

## 3) Webhook verification
- Configure RevenueCat webhook with a signing secret.
- The Edge Function should verify the request signature header (per RC docs). If verification fails, return 401.

## 4) Handler flow
1. Verify signature → 401 if invalid.
2. Parse payload:
   - `event.id` (string)
   - `event.type` (INITIAL_PURCHASE | RENEWAL | CANCELLATION | EXPIRATION | UNCANCELLATION | BILLING_ISSUE | PRODUCT_CHANGE)
   - `event.environment` (SANDBOX | PRODUCTION)
   - `event.app_user_id` (Supabase user id)
   - `event.entitlements` (array or single) → name, product_identifier, expires_at, platform
3. Idempotency: insert into `revenuecat_webhook_events` (event_id, app_user_id, type, environment, raw). If `event_id` exists, return 200 immediately.
4. For each entitlement in the event:
   - On INITIAL_PURCHASE, RENEWAL, UNCANCELLATION, BILLING_ISSUE_RESOLVED, PRODUCT_CHANGE → `select grant_user_entitlement(...)` with:
     - p_user_id = app_user_id::uuid
     - p_entitlement = entitlement.name
     - p_product_id = entitlement.product_identifier
     - p_platform = payload.platform or 'unknown'
     - p_expires_at = entitlement.expires_at (nullable)
     - p_rc_app_user_id = app_user_id
     - p_rc_event_id = event.id
     - p_meta = jsonb_build_object('environment', event.environment)
   - On CANCELLATION, EXPIRATION → `select revoke_user_entitlement(...)` with reason and rc_event_id.
5. Mark the event row `processed = true`.
6. Respond 200 quickly (under ~2s).

## 5) Security & RLS
- The Edge Function should use the service role key to bypass RLS for inserts/updates.
- Clients (authenticated users) can only SELECT their own rows from `user_entitlements`.
- `revenuecat_webhook_events` is readable only by super admins for audit.

## 6) Client gating (minimal)
- Read `user_entitlements` filtered by `user_id = auth.uid()`.
- Active row for `entitlement = 'ad_free'` → hide ads.
- Active row for `entitlement = 'premium'` or `ai_pro` → enable premium AI features.
- Keep existing school-level plan gating as-is; user-level entitlements are additive.

## 7) Failure modes & retries
- If the same RC event is delivered multiple times, the unique `event_id` prevents duplication.
- If DB is temporarily unavailable, return 500 so RC can retry.
- All grants/revocations are idempotent (previous active rows are deactivated when granting a new one).

## 8) Future extensions
- Map SKUs to entitlements server-side to avoid trusting client payload.
- Add `user_entitlements_history` for a full audit trail if required.
- Add scheduled job to expire entitlements whose `expires_at` passed but no subsequent `RENEWAL` arrived.
